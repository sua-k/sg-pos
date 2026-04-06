import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/auth'
import { callClaude } from '@/lib/anthropic/client'

export async function POST() {
  try {
    await requireRole('admin')

    // Fetch unreconciled bank transactions
    const bankTxns = await prisma.bankTransaction.findMany({
      where: { reconciled: false },
      orderBy: { date: 'desc' },
      take: 100,
    })

    if (bankTxns.length === 0) {
      return NextResponse.json({ message: 'No unreconciled bank transactions found', matched: 0 })
    }

    // Fetch recent POS transactions
    const posTxns = await prisma.transaction.findMany({
      where: { status: 'completed' },
      orderBy: { createdAt: 'desc' },
      take: 200,
      select: {
        id: true,
        receiptNumber: true,
        totalTHB: true,
        paymentMethod: true,
        createdAt: true,
      },
    })

    const prompt = `You are a bank reconciliation assistant. Match bank transactions to POS transactions.

Bank transactions (unreconciled):
${JSON.stringify(
  bankTxns.map((b) => ({
    id: b.id,
    date: b.date.toISOString().split('T')[0],
    description: b.description,
    amount: parseFloat(b.amountTHB.toString()),
    type: b.type,
  })),
  null,
  2
)}

POS transactions (recent):
${JSON.stringify(
  posTxns.map((p) => ({
    id: p.id,
    receipt: p.receiptNumber,
    total: parseFloat(p.totalTHB.toString()),
    method: p.paymentMethod,
    date: p.createdAt.toISOString().split('T')[0],
  })),
  null,
  2
)}

Return a JSON array of matches. Each match must have:
- bankTransactionId: the bank transaction id
- invoiceId: the POS transaction id (use receipt number as label)
- confidenceScore: 0.0-1.0
- reasoning: brief explanation

Only include matches where confidence >= 0.5. Return ONLY valid JSON array, no other text.`

    const responseText = await callClaude(
      [{ role: 'user', content: prompt }],
      { maxTokens: 2048, model: 'claude-3-haiku-20240307' }
    )

    let matches: Array<{
      bankTransactionId: string
      invoiceId: string
      confidenceScore: number
      reasoning: string
    }> = []

    try {
      const cleaned = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      matches = JSON.parse(cleaned)
    } catch {
      return NextResponse.json(
        { error: 'Failed to parse AI response', raw: responseText },
        { status: 500 }
      )
    }

    let created = 0
    let autoAccepted = 0

    for (const match of matches) {
      const status = match.confidenceScore >= 0.85 ? 'auto_matched' : 'pending_review'

      await prisma.reconciliationMatch.create({
        data: {
          bankTransactionId: match.bankTransactionId,
          invoiceId: match.invoiceId,
          confidenceScore: match.confidenceScore,
          status,
          aiReasoning: match.reasoning,
        },
      })

      if (status === 'auto_matched') {
        await prisma.bankTransaction.update({
          where: { id: match.bankTransactionId },
          data: { reconciled: true },
        })
        autoAccepted++
      }

      created++
    }

    return NextResponse.json({
      message: 'Reconciliation run complete',
      matched: created,
      autoAccepted,
      pendingReview: created - autoAccepted,
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
