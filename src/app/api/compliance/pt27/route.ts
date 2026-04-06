import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/auth'
import * as XLSX from 'xlsx'

export async function GET(request: NextRequest) {
  try {
    await requireRole('admin', 'manager')

    const { searchParams } = request.nextUrl
    const month = searchParams.get('month') // e.g. "2026-04"
    const branchId = searchParams.get('branchId')

    if (!month || !branchId) {
      return NextResponse.json(
        { error: 'month and branchId are required' },
        { status: 400 }
      )
    }

    const [year, mon] = month.split('-').map(Number)
    const startDate = new Date(year, mon - 1, 1)
    const endDate = new Date(year, mon, 1)

    // PT.27 = Acquisition report — purchases received at this branch during the month
    const purchases = await prisma.purchase.findMany({
      where: {
        branchId,
        status: 'received',
        purchaseDate: { gte: startDate, lt: endDate },
      },
      include: {
        supplier: true,
        items: { include: { product: true } },
      },
      orderBy: { purchaseDate: 'asc' },
    })

    // Flatten to rows
    const rows: Record<string, unknown>[] = []
    let order = 1

    for (const purchase of purchases) {
      for (const item of purchase.items) {
        rows.push({
          order,
          datetimeReceived: purchase.purchaseDate.toISOString(),
          licenseNo_seller: purchase.supplier.licenseNo ?? '',
          name_seller: purchase.supplier.name,
          size: null,
          number: parseFloat(item.weightGrams?.toString() ?? item.quantity.toString()),
        })
        order++
      }
    }

    // Generate XLSX
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'PT27')
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })

    return new NextResponse(buf, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="PT27-${month}-${branchId}.xlsx"`,
      },
    })
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
