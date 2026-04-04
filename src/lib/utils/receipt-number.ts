import { Prisma } from '@prisma/client'
import { format } from 'date-fns'

/**
 * Generate receipt number: {BRANCH_CODE}-{YYYYMMDD}-{SEQ}
 * e.g., PP-20260403-0001
 * Uses count of today's transactions for the branch as sequence.
 */
export async function generateReceiptNumber(
  tx: Prisma.TransactionClient,
  branchCode: string,
  branchId: string
): Promise<string> {
  const today = new Date()
  const dateStr = format(today, 'yyyyMMdd')
  const prefix = `${branchCode}-${dateStr}-`

  // Count today's transactions for this branch
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000)

  const count = await tx.transaction.count({
    where: {
      branchId,
      createdAt: { gte: startOfDay, lt: endOfDay },
    },
  })

  const seq = String(count + 1).padStart(4, '0')
  return `${prefix}${seq}`
}
