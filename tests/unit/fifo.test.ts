import { describe, it, expect } from 'vitest'
import Decimal from 'decimal.js'

// Pure-logic FIFO consumption test (no Prisma dependency)
interface MockLayer {
  id: string
  quantityRemaining: number
  unitCostTHB: number
  receivedAt: Date
}

interface Consumption {
  costLayerId: string
  quantity: number
  unitCostTHB: number
  totalCostTHB: number
}

function consumeFIFO(layers: MockLayer[], quantityNeeded: number): { consumptions: Consumption[]; totalCogs: number } {
  const sorted = [...layers].sort((a, b) => a.receivedAt.getTime() - b.receivedAt.getTime())
  const consumptions: Consumption[] = []
  let remaining = new Decimal(quantityNeeded)
  let totalCogs = new Decimal(0)

  for (const layer of sorted) {
    if (remaining.lte(0)) break
    const available = new Decimal(layer.quantityRemaining)
    const consumed = Decimal.min(remaining, available)
    const cost = consumed.mul(layer.unitCostTHB).toDecimalPlaces(2)

    consumptions.push({
      costLayerId: layer.id,
      quantity: consumed.toNumber(),
      unitCostTHB: layer.unitCostTHB,
      totalCostTHB: cost.toNumber(),
    })

    totalCogs = totalCogs.plus(cost)
    remaining = remaining.minus(consumed)
  }

  return { consumptions, totalCogs: totalCogs.toNumber() }
}

describe('FIFO cost layer consumption', () => {
  const layers: MockLayer[] = [
    { id: 'L1', quantityRemaining: 10, unitCostTHB: 200, receivedAt: new Date('2026-01-01') },
    { id: 'L2', quantityRemaining: 20, unitCostTHB: 250, receivedAt: new Date('2026-02-01') },
    { id: 'L3', quantityRemaining: 15, unitCostTHB: 300, receivedAt: new Date('2026-03-01') },
  ]

  it('consumes from oldest layer first', () => {
    const { consumptions } = consumeFIFO(layers, 5)
    expect(consumptions).toHaveLength(1)
    expect(consumptions[0].costLayerId).toBe('L1')
    expect(consumptions[0].quantity).toBe(5)
  })

  it('spans multiple layers when needed', () => {
    const { consumptions } = consumeFIFO(layers, 15)
    expect(consumptions).toHaveLength(2)
    expect(consumptions[0].costLayerId).toBe('L1')
    expect(consumptions[0].quantity).toBe(10)
    expect(consumptions[1].costLayerId).toBe('L2')
    expect(consumptions[1].quantity).toBe(5)
  })

  it('calculates COGS correctly across layers', () => {
    const { totalCogs } = consumeFIFO(layers, 15)
    // 10 × 200 + 5 × 250 = 2000 + 1250 = 3250
    expect(totalCogs).toBe(3250)
  })

  it('consumes all layers when quantity exceeds total', () => {
    const { consumptions, totalCogs } = consumeFIFO(layers, 50)
    expect(consumptions).toHaveLength(3)
    // 10×200 + 20×250 + 15×300 = 2000+5000+4500 = 11500
    expect(totalCogs).toBe(11500)
  })

  it('handles exact layer quantity', () => {
    const { consumptions } = consumeFIFO(layers, 10)
    expect(consumptions).toHaveLength(1)
    expect(consumptions[0].quantity).toBe(10)
    expect(consumptions[0].totalCostTHB).toBe(2000)
  })

  it('handles fractional grams', () => {
    const { consumptions, totalCogs } = consumeFIFO(layers, 2.5)
    expect(consumptions[0].quantity).toBe(2.5)
    expect(totalCogs).toBe(500) // 2.5 × 200
  })
})
