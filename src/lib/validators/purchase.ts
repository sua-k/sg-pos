import { z } from 'zod'

const purchaseItemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().positive(),
  unitCostTHB: z.number().positive(),
  batchNumber: z.string().max(50).optional(),
  expiryDate: z.string().optional(),
  weightGrams: z.number().positive().optional(),
})

export const createPurchaseSchema = z.object({
  supplierId: z.string().min(1),
  branchId: z.string().min(1),
  invoiceNumber: z.string().max(100).optional(),
  vatIncluded: z.boolean().default(true),
  notes: z.string().max(1000).optional(),
  items: z.array(purchaseItemSchema).min(1, 'At least one item is required'),
})

export const updatePurchaseSchema = z.object({
  invoiceNumber: z.string().max(100).optional(),
  vatIncluded: z.boolean().optional(),
  notes: z.string().max(1000).optional(),
  items: z.array(purchaseItemSchema).min(1).optional(),
})

export type CreatePurchaseInput = z.infer<typeof createPurchaseSchema>
export type UpdatePurchaseInput = z.infer<typeof updatePurchaseSchema>
