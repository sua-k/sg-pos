import { z } from 'zod'

export const createCustomerSchema = z.object({
  idNumber: z.string().min(1).max(20),
  idType: z.enum(['national_id', 'passport']),
  name: z.string().max(200).nullable().optional(),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD format'),
  nationality: z.string().max(50).nullable().optional(),
  phone: z.string().max(20).nullable().optional(),
  email: z.string().email().nullable().optional(),
  notes: z.string().max(500).nullable().optional(),
})

export const updateCustomerSchema = createCustomerSchema.partial().omit({ idNumber: true, idType: true })

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>
