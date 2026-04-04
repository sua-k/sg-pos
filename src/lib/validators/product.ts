import { z } from 'zod'

export const createProductSchema = z.object({
  name: z.string().min(1).max(200),
  strainType: z.enum(['indica', 'sativa', 'hybrid']).nullable().optional(),
  sku: z.string().min(1).max(50),
  priceTHB: z.number().positive(),
  pricePerGram: z.number().positive().nullable().optional(),
  costTHB: z.number().positive().nullable().optional(),
  costPerGram: z.number().positive().nullable().optional(),
  costVatIncluded: z.boolean().optional().default(true),
  soldByWeight: z.boolean().optional().default(false),
  description: z.string().max(1000).nullable().optional(),
  thcPercentage: z.number().min(0).max(100).nullable().optional(),
  cbdPercentage: z.number().min(0).max(100).nullable().optional(),
  expiryDate: z.string().datetime().nullable().optional(),
  batchNumber: z.string().max(50).nullable().optional(),
  weightPerUnit: z.number().positive().nullable().optional(),
  categoryId: z.string().nullable().optional(),
  supplierId: z.string().nullable().optional(),
  imageUrl: z.string().url().nullable().optional(),
})

export const updateProductSchema = createProductSchema.partial()

export type CreateProductInput = z.infer<typeof createProductSchema>
export type UpdateProductInput = z.infer<typeof updateProductSchema>
