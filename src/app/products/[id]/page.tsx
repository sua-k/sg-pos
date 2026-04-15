'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { AppShell } from '@/components/layout/AppShell'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ArrowLeft, Loader2, Trash2 } from 'lucide-react'
import Link from 'next/link'

interface Category {
  id: string
  name: string
  soldByWeight: boolean
}

interface InventoryItem {
  id: string
  quantity: string
  room: string
  branch: { id: string; name: string; code: string }
}

interface ProductDetail {
  id: string
  name: string
  sku: string
  priceTHB: string
  strainType: string | null
  pricePerGram: string | null
  costTHB: string | null
  costPerGram: string | null
  costVatIncluded: boolean
  soldByWeight: boolean
  description: string | null
  thcPercentage: string | null
  cbdPercentage: string | null
  expiryDate: string | null
  batchNumber: string | null
  weightPerUnit: string | null
  categoryId: string | null
  supplierId: string | null
  imageUrl: string | null
  minStock: string | null
  category: { id: string; name: string } | null
  supplier: { id: string; name: string } | null
  inventory: InventoryItem[]
}

export default function EditProductPage() {
  const router = useRouter()
  const params = useParams()
  const productId = params.id as string

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')
  const [deleteError, setDeleteError] = useState('')
  const [categories, setCategories] = useState<Category[]>([])
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  const [name, setName] = useState('')
  const [sku, setSku] = useState('')
  const [priceTHB, setPriceTHB] = useState('')
  const [strainType, setStrainType] = useState<string>('')
  const [soldByWeight, setSoldByWeight] = useState(false)
  const [pricePerGram, setPricePerGram] = useState('')
  const [weightPerUnit, setWeightPerUnit] = useState('')
  const [costTHB, setCostTHB] = useState('')
  const [costPerGram, setCostPerGram] = useState('')
  const [costVatIncluded, setCostVatIncluded] = useState(true)
  const [description, setDescription] = useState('')
  const [thcPercentage, setThcPercentage] = useState('')
  const [cbdPercentage, setCbdPercentage] = useState('')
  const [expiryDate, setExpiryDate] = useState('')
  const [batchNumber, setBatchNumber] = useState('')
  const [categoryId, setCategoryId] = useState<string>('')
  const [imageUrl, setImageUrl] = useState('')
  const [minStock, setMinStock] = useState('')

  useEffect(() => {
    async function load() {
      try {
        const [productRes, catRes] = await Promise.all([
          fetch(`/api/products/${productId}`),
          fetch('/api/categories'),
        ])

        if (catRes.ok) {
          const catData = await catRes.json()
          setCategories(catData.categories ?? [])
        }

        if (!productRes.ok) {
          setError('Product not found')
          setLoading(false)
          return
        }

        const product: ProductDetail = await productRes.json()
        setName(product.name)
        setSku(product.sku)
        setPriceTHB(product.priceTHB)
        setStrainType(product.strainType ?? '')
        setSoldByWeight(product.soldByWeight)
        setPricePerGram(product.pricePerGram ?? '')
        setWeightPerUnit(product.weightPerUnit ?? '')
        setCostTHB(product.costTHB ?? '')
        setCostPerGram(product.costPerGram ?? '')
        setCostVatIncluded(product.costVatIncluded)
        setDescription(product.description ?? '')
        setThcPercentage(product.thcPercentage ?? '')
        setCbdPercentage(product.cbdPercentage ?? '')
        setExpiryDate(product.expiryDate ? product.expiryDate.split('T')[0] : '')
        setBatchNumber(product.batchNumber ?? '')
        setCategoryId(product.categoryId ?? '')
        setImageUrl(product.imageUrl ?? '')
        setMinStock(product.minStock ?? '')
        setInventory(product.inventory)
      } catch {
        setError('Failed to load product')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [productId])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSaving(true)

    try {
      const body: Record<string, unknown> = {
        name,
        sku,
        priceTHB: parseFloat(priceTHB),
        soldByWeight,
        costVatIncluded,
        strainType: strainType || null,
        description: description || null,
        batchNumber: batchNumber || null,
        categoryId: categoryId || null,
        imageUrl: imageUrl || null,
        minStock: minStock ? parseFloat(minStock) : null,
      }

      if (pricePerGram) body.pricePerGram = parseFloat(pricePerGram)
      else body.pricePerGram = null

      if (weightPerUnit) body.weightPerUnit = parseFloat(weightPerUnit)
      else body.weightPerUnit = null

      if (costTHB) body.costTHB = parseFloat(costTHB)
      else body.costTHB = null

      if (costPerGram) body.costPerGram = parseFloat(costPerGram)
      else body.costPerGram = null

      if (thcPercentage) body.thcPercentage = parseFloat(thcPercentage)
      else body.thcPercentage = null

      if (cbdPercentage) body.cbdPercentage = parseFloat(cbdPercentage)
      else body.cbdPercentage = null

      if (expiryDate) body.expiryDate = new Date(expiryDate).toISOString()
      else body.expiryDate = null

      const res = await fetch(`/api/products/${productId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? 'Failed to update product')
        return
      }

      router.push('/products')
    } catch {
      setError('Failed to update product')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    setDeleteError('')
    setDeleting(true)

    try {
      const res = await fetch(`/api/products/${productId}`, { method: 'DELETE' })

      if (!res.ok) {
        const data = await res.json()
        setDeleteError(data.error ?? 'Failed to delete product')
        return
      }

      router.push('/products')
    } catch {
      setDeleteError('Failed to delete product')
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <AppShell>
        <div className="max-w-2xl mx-auto space-y-4">
          <div className="h-8 w-48 bg-muted rounded animate-pulse" />
          <Card>
            <CardContent className="p-6 space-y-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-10 bg-muted rounded animate-pulse" />
              ))}
            </CardContent>
          </Card>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link href="/products">
              <Button variant="ghost" size="icon" className="min-h-[44px] min-w-[44px]">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <h1 className="text-2xl font-bold">Edit Product</h1>
          </div>

          <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
            <DialogTrigger asChild>
              <Button variant="destructive" size="icon" className="min-h-[44px] min-w-[44px]">
                <Trash2 className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete Product</DialogTitle>
                <DialogDescription>
                  Are you sure you want to delete &quot;{name}&quot;? This action cannot be undone.
                </DialogDescription>
              </DialogHeader>
              {deleteError && (
                <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                  {deleteError}
                </div>
              )}
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setShowDeleteDialog(false)}
                  className="min-h-[44px]"
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={deleting}
                  className="min-h-[44px]"
                >
                  {deleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Delete
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <form onSubmit={handleSubmit}>
          <Card>
            <CardHeader>
              <CardTitle>Product Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {error && (
                <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="min-h-[44px]"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sku">SKU *</Label>
                  <Input
                    id="sku"
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    required
                    className="min-h-[44px]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select value={categoryId} onValueChange={setCategoryId}>
                    <SelectTrigger className="min-h-[44px]">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="strainType">Strain Type</Label>
                  <Select value={strainType} onValueChange={setStrainType}>
                    <SelectTrigger className="min-h-[44px]">
                      <SelectValue placeholder="Select strain" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="indica">Indica</SelectItem>
                      <SelectItem value="sativa">Sativa</SelectItem>
                      <SelectItem value="hybrid">Hybrid</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="priceTHB">Price (THB) *</Label>
                  <Input
                    id="priceTHB"
                    type="number"
                    step="0.01"
                    min="0"
                    value={priceTHB}
                    onChange={(e) => setPriceTHB(e.target.value)}
                    required
                    className="min-h-[44px]"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="costTHB">Cost (THB)</Label>
                  <Input
                    id="costTHB"
                    type="number"
                    step="0.01"
                    min="0"
                    value={costTHB}
                    onChange={(e) => setCostTHB(e.target.value)}
                    className="min-h-[44px]"
                  />
                </div>
              </div>

              {/* Sold by weight toggle */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  role="switch"
                  aria-checked={soldByWeight}
                  onClick={() => setSoldByWeight(!soldByWeight)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                    soldByWeight ? 'bg-primary' : 'bg-muted'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-background shadow-lg transition-transform ${
                      soldByWeight ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
                <Label>Sold by weight</Label>
              </div>

              {soldByWeight && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pl-4 border-l-2 border-primary/20">
                  <div className="space-y-2">
                    <Label htmlFor="pricePerGram">Price per gram (THB)</Label>
                    <Input
                      id="pricePerGram"
                      type="number"
                      step="0.01"
                      min="0"
                      value={pricePerGram}
                      onChange={(e) => setPricePerGram(e.target.value)}
                      className="min-h-[44px]"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="weightPerUnit">Weight per unit (g)</Label>
                    <Input
                      id="weightPerUnit"
                      type="number"
                      step="0.001"
                      min="0"
                      value={weightPerUnit}
                      onChange={(e) => setWeightPerUnit(e.target.value)}
                      className="min-h-[44px]"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="costPerGram">Cost per gram (THB)</Label>
                    <Input
                      id="costPerGram"
                      type="number"
                      step="0.01"
                      min="0"
                      value={costPerGram}
                      onChange={(e) => setCostPerGram(e.target.value)}
                      className="min-h-[44px]"
                    />
                  </div>
                </div>
              )}

              {/* Cost VAT toggle */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  role="switch"
                  aria-checked={costVatIncluded}
                  onClick={() => setCostVatIncluded(!costVatIncluded)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                    costVatIncluded ? 'bg-primary' : 'bg-muted'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-background shadow-lg transition-transform ${
                      costVatIncluded ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
                <Label>Cost includes VAT</Label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="thcPercentage">THC %</Label>
                  <Input
                    id="thcPercentage"
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={thcPercentage}
                    onChange={(e) => setThcPercentage(e.target.value)}
                    className="min-h-[44px]"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cbdPercentage">CBD %</Label>
                  <Input
                    id="cbdPercentage"
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={cbdPercentage}
                    onChange={(e) => setCbdPercentage(e.target.value)}
                    className="min-h-[44px]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="expiryDate">Expiry Date</Label>
                  <Input
                    id="expiryDate"
                    type="date"
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                    className="min-h-[44px]"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="batchNumber">Batch Number</Label>
                  <Input
                    id="batchNumber"
                    value={batchNumber}
                    onChange={(e) => setBatchNumber(e.target.value)}
                    className="min-h-[44px]"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  maxLength={1000}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="imageUrl">Image URL</Label>
                  <Input
                    id="imageUrl"
                    type="url"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="https://..."
                    className="min-h-[44px]"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="minStock">Min Stock Threshold</Label>
                  <Input
                    id="minStock"
                    type="number"
                    step="0.001"
                    min="0"
                    value={minStock}
                    onChange={(e) => setMinStock(e.target.value)}
                    placeholder="e.g. 10"
                    className="min-h-[44px]"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <Button
                  type="submit"
                  disabled={saving}
                  className="min-h-[44px] min-w-[120px]"
                >
                  {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Save Changes
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>

        {/* Inventory per branch */}
        {inventory.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Inventory by Branch</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Branch</TableHead>
                    <TableHead>Room</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inventory.map((inv) => (
                    <TableRow key={inv.id}>
                      <TableCell>{inv.branch.name}</TableCell>
                      <TableCell>{inv.room}</TableCell>
                      <TableCell className="text-right">{parseFloat(inv.quantity)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </AppShell>
  )
}
