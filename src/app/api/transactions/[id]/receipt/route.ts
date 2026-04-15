import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import Decimal from 'decimal.js'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAuth()
    const { id } = params

    const transaction = await prisma.transaction.findUnique({
      where: { id },
      include: {
        items: { include: { product: true } },
        customer: true,
        user: true,
        branch: true,
      },
    })

    if (!transaction) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })
    }

    return NextResponse.json({
      receiptNumber: transaction.receiptNumber,
      createdAt: transaction.createdAt.toISOString(),
      branch: {
        name: transaction.branch.name,
        code: transaction.branch.code,
        address: transaction.branch.address,
        phone: transaction.branch.phone,
      },
      customer: {
        name: transaction.customer?.name || '',
        maskedId: transaction.customer?.idNumber
          ? '•'.repeat(Math.max(0, transaction.customer.idNumber.length - 4)) + transaction.customer.idNumber.slice(-4)
          : '',
      },
      cashier: transaction.user.name,
      items: transaction.items.map(item => ({
        name: item.product.name,
        quantity: item.quantity.toString(),
        unitPrice: item.unitPriceTHB.toString(),
        weightGrams: item.weightGrams?.toString() || null,
        pricePerGram: item.pricePerGram?.toString() || null,
        subtotal: item.subtotalTHB.toString(),
        vat: item.vatTHB.toString(),
        total: item.totalTHB.toString(),
      })),
      subtotalTHB: transaction.subtotalTHB.toString(),
      vatTHB: transaction.vatTHB.toString(),
      vatRate: transaction.vatRate.toString(),
      totalTHB: transaction.totalTHB.toString(),
      discountType: transaction.discountType || null,
      discountValue: transaction.discountValue?.toString() || null,
      discountTHB: transaction.discountTHB?.toString() || null,
      originalTotalTHB: transaction.discountTHB
        ? new Decimal(transaction.totalTHB.toString()).plus(new Decimal(transaction.discountTHB.toString())).toString()
        : null,
      paymentMethod: transaction.paymentMethod,
      paymentSplit: transaction.paymentSplit ?? null,
      status: transaction.status,
      taxInfo: {
        companyName: transaction.branch.companyName || 'Siam Green Co., Ltd.',
        taxId: transaction.branch.taxId || process.env.COMPANY_TAX_ID || '0105XXXXXXXXX',
      },
      receiptHeader: transaction.branch.receiptHeader || null,
      receiptFooter: transaction.branch.receiptFooter || null,
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
