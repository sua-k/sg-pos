import { z } from 'zod'

export const createPrescriptionSchema = z.object({
  customerId: z.string().min(1),
  prescriberId: z.string().min(1).nullable().optional(),
  branchId: z.string().min(1),
  issuedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD format'),
  expiryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD format'),
  dailyDosageG: z.number().positive().nullable().optional(),
  numDays: z.number().int().positive().nullable().optional(),
  totalAllowedG: z.number().positive().nullable().optional(),
  diagnosis: z.string().max(500).nullable().optional(),
  notes: z.string().max(500).nullable().optional(),
})

export const updatePrescriptionSchema = createPrescriptionSchema.partial()

export type CreatePrescriptionInput = z.infer<typeof createPrescriptionSchema>
export type UpdatePrescriptionInput = z.infer<typeof updatePrescriptionSchema>
