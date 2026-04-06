import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/auth'
import { zohoFetch } from '@/lib/zoho/client'

export async function POST() {
  try {
    await requireRole('admin')

    const orgId = process.env.ZOHO_ORGANIZATION_ID

    // Fetch bank transactions from Zoho Books
    const res = await zohoFetch(
      `https://books.zoho.com/api/v3/banktransactions?organization_id=${orgId}&filter_by=Status.All&per_page=200`
    )

    if (!res.ok) {
      const text = await res.text()
      return NextResponse.json(
        { error: `Zoho API error: ${text}` },
        { status: 502 }
      )
    }

    const data = await res.json()
    const zohoTxns: Array<{
      transaction_id: string
      date: string
      description: string
      debit_amount?: number
      credit_amount?: number
      transaction_type: string
    }> = data.banktransactions ?? []

    let imported = 0
    let skipped = 0

    for (const zt of zohoTxns) {
      const existing = await prisma.bankTransaction.findUnique({
        where: { zohoTransactionId: zt.transaction_id },
      })

      if (existing) {
        skipped++
        continue
      }

      const amount = (zt.credit_amount ?? 0) - (zt.debit_amount ?? 0)

      await prisma.bankTransaction.create({
        data: {
          zohoTransactionId: zt.transaction_id,
          date: new Date(zt.date),
          description: zt.description,
          amountTHB: amount,
          type: zt.transaction_type,
          reconciled: false,
        },
      })

      imported++
    }

    await prisma.zohoSyncLog.create({
      data: {
        entityType: 'bank_transactions',
        entityId: 'bulk',
        direction: 'pull',
        status: 'success',
        errorMsg: null,
      },
    })

    return NextResponse.json({ message: 'Bank sync complete', imported, skipped })
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
