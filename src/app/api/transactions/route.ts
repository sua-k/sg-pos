import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { Prisma } from '@prisma/client'
import Decimal from 'decimal.js'
import { calculateVAT } from '@/lib/utils/vat'
import { consumeCostLayers } from '@/lib/utils/fifo'
import { generateReceiptNumber } from '@/lib/utils/receipt-number'
import { isMinimumAge, calculateAge } from '@/lib/utils/age'

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()

    const { searchParams } = request.nextUrl
    const branchId = searchParams.get('branchId')
    const userId = searchParams.get('userId')
    const status = searchParams.get('status')
    const paymentMethod = searchParams.get('paymentMethod')
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')
    const skip = parseInt(searchParams.get('skip') ?? '0', 10)
    const take = parseInt(searchParams.get('take') ?? '50', 10)

    const where: Prisma.TransactionWhereInput = {}

    // Branch-scope for non-admin users
    if (user.role !== 'admin') {
      where.branchId = user.branchId
    } else if (branchId) {
      where.branchId = branchId
    }

    if (userId) where.userId = userId
    if (status) where.status = status as Prisma.TransactionWhereInput['status']
    if (paymentMethod) where.paymentMethod = paymentMethod as Prisma.TransactionWhereInput['paymentMethod']

    if (dateFrom || dateTo) {
      where.createdAt = {}
      if (dateFrom) where.createdAt.gte = new Date(dateFrom)
      if (dateTo) where.createdAt.lte = new Date(dateTo)
    }

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        include: {
          customer: true,
          user: { select: { id: true, name: true, email: true } },
          branch: { select: { id: true, name: true, code: true } },
          items: { include: { product: true } },
        },
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.transaction.count({ where }),
    ])

    return NextResponse.json({ transactions, total, skip, take })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (error instanceof Error && error.message === 'Forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

interface CheckoutItem {
  productId: string
  quantity: number
  weightGrams?: number
  pricePerGram?: number
}

interface CheckoutBody {
  customerId: string
  branchId: string
  items: CheckoutItem[]
  paymentMethod: 'cash' | 'card' | 'transfer'
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()

    const body: CheckoutBody = await request.json()
    const { customerId, branchId, items, paymentMethod } = body

    if (!customerId || !branchId || !items?.length || !paymentMethod) {
      return NextResponse.json(
        { error: 'Missing required fields: customerId, branchId, items, paymentMethod' },
        { status: 400 }
      )
    }

    const result = await prisma.$transaction(
      async (tx) => {
        // 1. Validate customer exists and age >= 20
        const customer = await tx.customer.findUnique({ where: { id: customerId } })
        if (!customer) {
          throw new Error('VALIDATION:Customer not found')
        }
        if (!isMinimumAge(customer.dateOfBirth)) {
          throw new Error('VALIDATION:Customer must be at least 20 years old')
        }
        const customerAge = calculateAge(customer.dateOfBirth)

        // 2. Get branch for receipt number
        const branch = await tx.branch.findUnique({ where: { id: branchId } })
        if (!branch) {
          throw new Error('VALIDATION:Branch not found')
        }

        // 3. Process each item
        let transactionTotal = new Decimal(0)
        let transactionVat = new Decimal(0)

        const processedItems: Array<{
          productId: string
          quantity: Decimal
          unitPriceTHB: Decimal
          subtotalTHB: Decimal
          vatTHB: Decimal
          totalTHB: Decimal
          weightGrams: Decimal | null
          pricePerGram: Decimal | null
          cogsTHB: Decimal
          consumptions: Array<{
            costLayerId: string
            quantity: Decimal
            unitCostTHB: Decimal
            totalCostTHB: Decimal
          }>
        }> = []

        for (const item of items) {
          // a. Validate product exists and is not expired
          const product = await tx.product.findUnique({ where: { id: item.productId } })
          if (!product) {
            throw new Error(`VALIDATION:Product ${item.productId} not found`)
          }
          if (product.expiryDate && product.expiryDate < new Date()) {
            throw new Error(`VALIDATION:Product ${product.name} is expired`)
          }

          // b. Check inventory sufficient
          const inventory = await tx.inventory.findUnique({
            where: { productId_branchId: { productId: item.productId, branchId } },
          })
          const quantityDec = new Decimal(item.quantity)
          const currentStock = inventory ? new Decimal(inventory.quantity.toString()) : new Decimal(0)

          if (currentStock.lt(quantityDec)) {
            throw new Error(
              `VALIDATION:Insufficient stock for ${product.name}. Available: ${currentStock.toString()}, Requested: ${quantityDec.toString()}`
            )
          }

          // c. Calculate item total
          let itemTotal: Decimal
          let unitPrice: Decimal
          let weightGrams: Decimal | null = null
          let pricePerGram: Decimal | null = null

          if (product.soldByWeight && item.weightGrams && item.pricePerGram) {
            weightGrams = new Decimal(item.weightGrams)
            pricePerGram = new Decimal(item.pricePerGram)
            itemTotal = weightGrams.mul(pricePerGram).toDecimalPlaces(2, Decimal.ROUND_HALF_UP)
            unitPrice = pricePerGram
          } else {
            unitPrice = new Decimal(product.priceTHB.toString())
            itemTotal = quantityDec.mul(unitPrice).toDecimalPlaces(2, Decimal.ROUND_HALF_UP)
          }

          // d. Back-calculate VAT per item
          const vatBreakdown = calculateVAT(itemTotal)

          // e. Consume FIFO cost layers
          const { consumptions, totalCogs } = await consumeCostLayers(
            tx,
            item.productId,
            branchId,
            quantityDec
          )

          // f. Decrement inventory
          await tx.inventory.update({
            where: { productId_branchId: { productId: item.productId, branchId } },
            data: { quantity: { decrement: quantityDec.toNumber() } },
          })

          processedItems.push({
            productId: item.productId,
            quantity: quantityDec,
            unitPriceTHB: unitPrice,
            subtotalTHB: vatBreakdown.subtotal,
            vatTHB: vatBreakdown.vat,
            totalTHB: itemTotal,
            weightGrams,
            pricePerGram,
            cogsTHB: totalCogs,
            consumptions,
          })

          transactionTotal = transactionTotal.plus(itemTotal)
          transactionVat = transactionVat.plus(vatBreakdown.vat)
        }

        // 4. Generate receipt number
        const receiptNumber = await generateReceiptNumber(tx, branch.code, branchId)

        // 5. Calculate transaction subtotal
        const transactionSubtotal = transactionTotal.minus(transactionVat)

        // 6. Create Transaction + TransactionItems + CostLayerConsumptions
        const transaction = await tx.transaction.create({
          data: {
            customerId,
            userId: user.id,
            branchId,
            subtotalTHB: transactionSubtotal.toNumber(),
            vatTHB: transactionVat.toNumber(),
            totalTHB: transactionTotal.toNumber(),
            paymentMethod: paymentMethod as 'cash' | 'card' | 'transfer',
            receiptNumber,
            ageVerified: true,
            customerAge,
            items: {
              create: processedItems.map((pi) => ({
                productId: pi.productId,
                quantity: pi.quantity.toNumber(),
                unitPriceTHB: pi.unitPriceTHB.toNumber(),
                subtotalTHB: pi.subtotalTHB.toNumber(),
                vatTHB: pi.vatTHB.toNumber(),
                totalTHB: pi.totalTHB.toNumber(),
                weightGrams: pi.weightGrams?.toNumber() ?? null,
                pricePerGram: pi.pricePerGram?.toNumber() ?? null,
                cogsTHB: pi.cogsTHB.toNumber(),
                costConsumptions: {
                  create: pi.consumptions.map((c) => ({
                    costLayerId: c.costLayerId,
                    quantity: c.quantity.toNumber(),
                    unitCostTHB: c.unitCostTHB.toNumber(),
                    totalCostTHB: c.totalCostTHB.toNumber(),
                  })),
                },
              })),
            },
          },
          include: {
            items: {
              include: {
                product: true,
                costConsumptions: true,
              },
            },
            customer: true,
            user: { select: { id: true, name: true, email: true } },
          },
        })

        return transaction
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      }
    )

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Unauthorized') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      if (error.message === 'Forbidden') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
      if (error.message.startsWith('VALIDATION:')) {
        return NextResponse.json(
          { error: error.message.replace('VALIDATION:', '') },
          { status: 400 }
        )
      }
    }
    console.error('Checkout error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
