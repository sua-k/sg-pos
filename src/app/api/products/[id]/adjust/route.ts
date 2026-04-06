import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/auth'
import { stockAdjustmentSchema } from '@/lib/validators/inventory'


export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireRole('admin', 'manager')
    const { id: productId } = await params

    const body = await request.json()
    const parsed = stockAdjustmentSchema.parse(body)

    const result = await prisma.$transaction(async (tx) => {
      // Verify product exists
      const product = await tx.product.findUnique({ where: { id: productId } })
      if (!product) {
        throw new Error('VALIDATION:Product not found')
      }

      // Upsert inventory
      const inventory = await tx.inventory.upsert({
        where: {
          productId_branchId: { productId, branchId: parsed.branchId },
        },
        create: {
          productId,
          branchId: parsed.branchId,
          quantity: Math.max(0, parsed.quantity),
        },
        update: {
          quantity: { increment: parsed.quantity },
        },
      })

      // Create stock adjustment record
      const adjustment = await tx.stockAdjustment.create({
        data: {
          productId,
          branchId: parsed.branchId,
          quantity: parsed.quantity,
          reason: parsed.reason,
          notes: parsed.notes,
          userId: user.id,
        },
      })

      // If reason is "received", create a CostLayer
      if (parsed.reason === 'received' && parsed.quantity > 0) {
        const unitCost = product.costTHB
          ? parseFloat(product.costTHB.toString())
          : 0
        await tx.costLayer.create({
          data: {
            productId,
            branchId: parsed.branchId,
            quantityInitial: parsed.quantity,
            quantityRemaining: parsed.quantity,
            unitCostTHB: unitCost,
            receivedAt: new Date(),
          },
        })
      }

      return { adjustment, inventory }
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (error instanceof Error && error.message === 'Forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    if (error instanceof Error && error.message.startsWith('VALIDATION:')) {
      return NextResponse.json(
        { error: error.message.replace('VALIDATION:', '') },
        { status: 400 }
      )
    }
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json({ error: 'Validation failed', details: error }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
