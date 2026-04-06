import { z } from 'zod'

export const createPrescriberSchema = z.object({
  name: z.string().min(1).max(200),
  licenseNo: z.string().min(1).max(50),
  licenseType: z.string().max(100).nullable().optional(),
  professionType: z.enum([
    'medical',
    'thai_traditional',
    'thai_applied',
    'dental',
    'pharmacy',
    'chinese_medicine',
    'folk_healer',
  ]),
  address: z.string().max(500).nullable().optional(),
  phone: z.string().max(20).nullable().optional(),
})

export const updatePrescriberSchema = createPrescriberSchema.partial()

export type CreatePrescriberInput = z.infer<typeof createPrescriberSchema>
export type UpdatePrescriberInput = z.infer<typeof updatePrescriberSchema>
