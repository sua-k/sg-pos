import { Prisma } from '@prisma/client'
import Decimal from 'decimal.js'

interface CostConsumption {
  costLayerId: string
  quantity: Decimal
  unitCostTHB: Decimal
  totalCostTHB: Decimal
}

/**
 * Consume cost layers using FIFO (First In, First Out).
 * Oldest layers (by receivedAt) are consumed first.
 * Returns array of consumptions and total COGS.
 *
 * MUST be called within a Prisma interactive transaction.
 */
export async function consumeCostLayers(
  tx: Prisma.TransactionClient,
  productId: string,
  branchId: string,
  quantity: Decimal
): Promise<{ consumptions: CostConsumption[]; totalCogs: Decimal }> {
  // 1. Query available cost layers, ordered by receivedAt ASC (FIFO)
  const layers = await tx.costLayer.findMany({
    where: {
      productId,
      branchId,
      quantityRemaining: { gt: 0 },
    },
    orderBy: { receivedAt: 'asc' },
  })

  const consumptions: CostConsumption[] = []
  let remaining = new Decimal(quantity)
  let totalCogs = new Decimal(0)

  for (const layer of layers) {
    if (remaining.lte(0)) break

    const available = new Decimal(layer.quantityRemaining.toString())
    const consumed = Decimal.min(remaining, available)
    const unitCost = new Decimal(layer.unitCostTHB.toString())
    const cost = consumed.mul(unitCost).toDecimalPlaces(2, Decimal.ROUND_HALF_UP)

    consumptions.push({
      costLayerId: layer.id,
      quantity: consumed,
      unitCostTHB: unitCost,
      totalCostTHB: cost,
    })

    // Update layer remaining quantity
    await tx.costLayer.update({
      where: { id: layer.id },
      data: { quantityRemaining: { decrement: consumed.toNumber() } },
    })

    totalCogs = totalCogs.plus(cost)
    remaining = remaining.minus(consumed)
  }

  // Fallback: if layers didn't cover full quantity, use Product.costTHB
  if (remaining.gt(0)) {
    const product = await tx.product.findUnique({ where: { id: productId } })
    if (product?.costTHB) {
      const fallbackCost = new Decimal(product.costTHB.toString())
      const cost = remaining.mul(fallbackCost).toDecimalPlaces(2, Decimal.ROUND_HALF_UP)
      totalCogs = totalCogs.plus(cost)
      console.warn(`FIFO: ${remaining.toString()} units of product ${productId} used fallback cost`)
    }
  }

  return { consumptions, totalCogs }
}
