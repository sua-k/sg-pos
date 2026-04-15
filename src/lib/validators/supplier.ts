import { z } from 'zod'

export const createSupplierSchema = z.object({
  name: z.string().min(1).max(200),
  licenseNo: z.string().max(100).nullable().optional(),
  contactName: z.string().max(200).nullable().optional(),
  phone: z.string().max(50).nullable().optional(),
  email: z.string().email().nullable().optional(),
  address: z.string().max(500).nullable().optional(),
})

export const updateSupplierSchema = createSupplierSchema.partial()

export type CreateSupplierInput = z.infer<typeof createSupplierSchema>
export type UpdateSupplierInput = z.infer<typeof updateSupplierSchema>
