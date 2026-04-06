import { z } from 'zod'

export const openCashSessionSchema = z.object({
  branchId: z.string().min(1),
  openingFloat: z.number().min(0),
  deviceName: z.string().max(100).optional(),
})

export const closeCashSessionSchema = z.object({
  actualCash: z.number().min(0),
})

export type OpenCashSessionInput = z.infer<typeof openCashSessionSchema>
export type CloseCashSessionInput = z.infer<typeof closeCashSessionSchema>
