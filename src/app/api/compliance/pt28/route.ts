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

    // PT.28 = Dispensing report — transactions at this branch during the month
    const transactions = await prisma.transaction.findMany({
      where: {
        branchId,
        status: 'completed',
        createdAt: { gte: startDate, lt: endDate },
      },
      include: {
        customer: true,
        items: { include: { product: true } },
      },
      orderBy: { createdAt: 'asc' },
    })

    // Map report type enum to PT.28 numeric codes
    const reportTypeMap: Record<string, number> = {
      self_use: 0,
      sell: 1,
      research: 2,
      process: 3,
      export_abroad: 4,
    }

    // Flatten to rows
    const rows: Record<string, unknown>[] = []
    let order = 1

    for (const tx of transactions) {
      // Sum cannabis grams in this transaction
      let totalGrams = 0
      for (const item of tx.items) {
        const weight = item.weightGrams
          ? parseFloat(item.weightGrams.toString())
          : parseFloat(item.quantity.toString())
        totalGrams += weight
      }

      rows.push({
        order,
        datetimeRecord: tx.createdAt.toISOString(),
        reportType: reportTypeMap[tx.reportType] ?? 1,
        idcard_buyer: tx.customer.idNumber,
        licenseNo_buyer: '',
        name_buyer: tx.customer.name ?? '',
        bdate_buyer: tx.customer.dateOfBirth.toISOString().slice(0, 10),
        number: totalGrams,
      })
      order++
    }

    // Generate XLSX
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'PT28')
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })

    return new NextResponse(buf, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="PT28-${month}-${branchId}.xlsx"`,
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
