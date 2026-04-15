'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
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
import { ArrowLeft, Loader2 } from 'lucide-react'
import Link from 'next/link'

interface Category {
  id: string
  name: string
  soldByWeight: boolean
}

export default function NewProductPage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [categories, setCategories] = useState<Category[]>([])

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
    fetch('/api/categories')
      .then((res) => res.json())
      .then((data) => setCategories(data.categories ?? []))
      .catch(() => {})
  }, [])

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
      }

      if (strainType) body.strainType = strainType
      if (pricePerGram) body.pricePerGram = parseFloat(pricePerGram)
      if (weightPerUnit) body.weightPerUnit = parseFloat(weightPerUnit)
      if (costTHB) body.costTHB = parseFloat(costTHB)
      if (costPerGram) body.costPerGram = parseFloat(costPerGram)
      if (description) body.description = description
      if (thcPercentage) body.thcPercentage = parseFloat(thcPercentage)
      if (cbdPercentage) body.cbdPercentage = parseFloat(cbdPercentage)
      if (expiryDate) body.expiryDate = new Date(expiryDate).toISOString()
      if (batchNumber) body.batchNumber = batchNumber
      if (categoryId) body.categoryId = categoryId
      if (imageUrl) body.imageUrl = imageUrl
      if (minStock) body.minStock = parseFloat(minStock)

      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? 'Failed to create product')
        return
      }

      router.push('/products')
    } catch {
      setError('Failed to create product')
    } finally {
      setSaving(false)
    }
  }

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto space-y-4">
        <div className="flex items-center gap-3">
          <Link href="/products">
            <Button variant="ghost" size="icon" className="min-h-[44px] min-w-[44px]">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">New Product</h1>
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
                  Save Product
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>
      </div>
    </AppShell>
  )
}
