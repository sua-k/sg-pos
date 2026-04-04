'use client'

import { useState, useEffect, useCallback } from 'react'
import { AppShell } from '@/components/layout/AppShell'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAuth } from '@/components/providers/AuthProvider'
import { Search, Plus, Package } from 'lucide-react'
import Link from 'next/link'

interface Product {
  id: string
  name: string
  sku: string
  priceTHB: string
  strainType: string | null
  soldByWeight: boolean
  imageUrl: string | null
  category: { id: string; name: string } | null
  inventory: { quantity: string; branchId: string }[]
}

interface ProductsResponse {
  products: Product[]
  total: number
}

const CATEGORY_TABS = [
  { label: 'All', value: '' },
  { label: 'Flowers', value: 'Flowers' },
  { label: 'Edibles', value: 'Edibles' },
  { label: 'CBD Oil', value: 'CBD Oil' },
  { label: 'Beverages', value: 'Beverages' },
  { label: 'Papers', value: 'Papers' },
  { label: 'Bongs & Pipes', value: 'Bongs & Pipes' },
]

const STRAIN_COLORS: Record<string, string> = {
  indica: 'bg-purple-100 text-purple-800',
  sativa: 'bg-amber-100 text-amber-800',
  hybrid: 'bg-emerald-100 text-emerald-800',
}

function formatTHB(amount: string | number): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount
  return `\u0E3F${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function getStockCount(inventory: { quantity: string }[]): number {
  return inventory.reduce((sum, inv) => sum + parseFloat(inv.quantity), 0)
}

function SkeletonCard() {
  return (
    <Card className="animate-pulse">
      <div className="aspect-square bg-muted rounded-t-xl" />
      <CardContent className="p-4 space-y-2">
        <div className="h-4 bg-muted rounded w-3/4" />
        <div className="h-3 bg-muted rounded w-1/2" />
        <div className="h-5 bg-muted rounded w-1/3" />
      </CardContent>
    </Card>
  )
}

export default function ProductsPage() {
  const { user } = useAuth()
  const [products, setProducts] = useState<Product[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')

  const isManager = user?.role === 'admin' || user?.role === 'manager'

  const fetchProducts = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (category) params.set('category', category)
      params.set('take', '100')

      const res = await fetch(`/api/products?${params.toString()}`)
      if (res.ok) {
        const data: ProductsResponse = await res.json()
        setProducts(data.products)
        setTotal(data.total)
      }
    } finally {
      setLoading(false)
    }
  }, [search, category])

  useEffect(() => {
    const timeout = setTimeout(fetchProducts, 300)
    return () => clearTimeout(timeout)
  }, [fetchProducts])

  return (
    <AppShell>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-2xl font-bold">Products</h1>
          {isManager && (
            <Link href="/products/new">
              <Button className="min-h-[44px] min-w-[44px]">
                <Plus className="h-4 w-4 mr-2" />
                Add Product
              </Button>
            </Link>
          )}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 min-h-[44px]"
          />
        </div>

        {/* Category Tabs */}
        <Tabs value={category} onValueChange={setCategory}>
          <TabsList className="w-full justify-start overflow-x-auto flex-nowrap">
            {CATEGORY_TABS.map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="min-h-[44px] whitespace-nowrap"
              >
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {/* Results count */}
        <p className="text-sm text-muted-foreground">
          {loading ? 'Loading...' : `${total} product${total !== 1 ? 's' : ''}`}
        </p>

        {/* Product Grid */}
        <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-4">
          {loading
            ? Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)
            : products.map((product) => {
                const stock = getStockCount(product.inventory)
                return (
                  <Link key={product.id} href={`/products/${product.id}`}>
                    <Card className="cursor-pointer hover:shadow-md transition-shadow h-full">
                      {/* Image placeholder */}
                      <div className="aspect-square bg-muted rounded-t-xl flex items-center justify-center">
                        {product.imageUrl ? (
                          <img
                            src={product.imageUrl}
                            alt={product.name}
                            className="w-full h-full object-cover rounded-t-xl"
                          />
                        ) : (
                          <Package className="h-10 w-10 text-muted-foreground/40" />
                        )}
                      </div>
                      <CardContent className="p-3 space-y-1.5">
                        <p className="font-medium text-sm leading-tight line-clamp-2">
                          {product.name}
                        </p>
                        <p className="text-xs text-muted-foreground">{product.sku}</p>
                        <p className="font-semibold text-sm">
                          {formatTHB(product.priceTHB)}
                          {product.soldByWeight && (
                            <span className="text-xs font-normal text-muted-foreground">/g</span>
                          )}
                        </p>
                        <div className="flex items-center gap-1 flex-wrap">
                          {product.strainType && (
                            <span
                              className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium ${STRAIN_COLORS[product.strainType] ?? ''}`}
                            >
                              {product.strainType}
                            </span>
                          )}
                          <Badge
                            variant={stock > 0 ? 'secondary' : 'destructive'}
                            className="text-[10px] px-1.5 py-0"
                          >
                            {stock > 0 ? `${stock} in stock` : 'Out of stock'}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                )
              })}
        </div>

        {!loading && products.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <Package className="h-12 w-12 mx-auto mb-4 opacity-40" />
            <p>No products found</p>
          </div>
        )}
      </div>
    </AppShell>
  )
}
