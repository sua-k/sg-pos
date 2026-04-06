import { z } from 'zod'

export const stockAdjustmentSchema = z.object({
  branchId: z.string().min(1),
  quantity: z.number().refine((v) => v !== 0, 'Quantity cannot be zero'),
  reason: z.enum(['received', 'damaged', 'correction', 'waste', 'transfer_out', 'transfer_in']),
  notes: z.string().max(500).optional(),
})

export type StockAdjustmentInput = z.infer<typeof stockAdjustmentSchema>
