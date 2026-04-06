import { z } from 'zod'

export const createTransferSchema = z.object({
  fromBranchId: z.string().min(1),
  toBranchId: z.string().min(1),
  productId: z.string().min(1),
  quantity: z.number().positive(),
  notes: z.string().max(500).optional(),
}).refine((data) => data.fromBranchId !== data.toBranchId, {
  message: 'Source and destination branches must be different',
  path: ['toBranchId'],
})

export type CreateTransferInput = z.infer<typeof createTransferSchema>
