"use client"

import { useCallback, useEffect, useState } from "react"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Search, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { WeightEntryDialog } from "./WeightEntryDialog"

interface ProductData {
  id: string
  name: string
  priceTHB: string | number
  pricePerGram: string | number | null
  strainType: string | null
  soldByWeight: boolean
  expiryDate: string | null
  category: { id: string; name: string } | null
  inventory: Array<{ quantity: string | number }>
}

interface CategoryData {
  id: string
  name: string
}

interface ProductGridProps {
  branchId: string
  onAddToCart: (
    product: { id: string; name: string; priceTHB: number; pricePerGram: number | null; soldByWeight: boolean },
    quantity: number,
    weightGrams?: number
  ) => void
}

function formatCurrency(amount: number): string {
  return `\u0E3F${amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

export function ProductGrid({ branchId, onAddToCart }: ProductGridProps) {
  const [products, setProducts] = useState<ProductData[]>([])
  const [categories, setCategories] = useState<CategoryData[]>([])
  const [search, setSearch] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [loading, setLoading] = useState(true)

  // Weight dialog
  const [weightProduct, setWeightProduct] = useState<{
    id: string
    name: string
    pricePerGram: number
  } | null>(null)

  const fetchProducts = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ take: "200", branchId })
      if (selectedCategory !== "all") {
        params.set("category", selectedCategory)
      }
      const res = await fetch(`/api/products?${params}`)
      const data = await res.json()
      setProducts(data.products ?? [])
    } catch {
      setProducts([])
    } finally {
      setLoading(false)
    }
  }, [branchId, selectedCategory])

  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch("/api/categories")
      const data = await res.json()
      setCategories(data.categories ?? [])
    } catch {
      setCategories([])
    }
  }, [])

  useEffect(() => {
    fetchCategories()
  }, [fetchCategories])

  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  // Client-side filter by search term
  const filtered = search
    ? products.filter((p) =>
        p.name.toLowerCase().includes(search.toLowerCase())
      )
    : products

  function handleTileClick(product: ProductData) {
    const priceTHB = Number(product.priceTHB)
    const pricePerGram = product.pricePerGram ? Number(product.pricePerGram) : null

    if (product.soldByWeight && pricePerGram) {
      setWeightProduct({
        id: product.id,
        name: product.name,
        pricePerGram,
      })
    } else {
      onAddToCart(
        { id: product.id, name: product.name, priceTHB, pricePerGram, soldByWeight: product.soldByWeight },
        1
      )
    }
  }

  function handleWeightConfirm(weight: number) {
    if (!weightProduct) return
    onAddToCart(
      {
        id: weightProduct.id,
        name: weightProduct.name,
        priceTHB: 0,
        pricePerGram: weightProduct.pricePerGram,
        soldByWeight: true,
      },
      1,
      weight
    )
    setWeightProduct(null)
  }

  function getStock(product: ProductData): number {
    if (!product.inventory?.length) return 0
    return product.inventory.reduce((sum, inv) => sum + Number(inv.quantity), 0)
  }

  const strainColors: Record<string, string> = {
    indica: "bg-purple-100 text-purple-700 border-purple-200",
    sativa: "bg-amber-100 text-amber-700 border-amber-200",
    hybrid: "bg-green-100 text-green-700 border-green-200",
  }

  return (
    <div className="flex h-full flex-col gap-3">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search products..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-11 pl-9"
        />
      </div>

      {/* Category Tabs */}
      <Tabs
        value={selectedCategory}
        onValueChange={setSelectedCategory}
        className="w-full"
      >
        <TabsList className="h-auto w-full flex-wrap justify-start gap-1 bg-transparent p-0">
          <TabsTrigger
            value="all"
            className="h-8 rounded-full border px-3 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            All
          </TabsTrigger>
          {categories.map((cat) => (
            <TabsTrigger
              key={cat.id}
              value={cat.name}
              className="h-8 rounded-full border px-3 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              {cat.name}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Product Grid */}
      {loading ? (
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-1 items-center justify-center">
          <p className="text-sm text-muted-foreground">No products found</p>
        </div>
      ) : (
        <div className="flex-1 overflow-auto">
          <div className="grid auto-rows-min grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-2">
            {filtered.map((product) => {
              const stock = getStock(product)
              const outOfStock = stock <= 0
              const price = product.soldByWeight
                ? Number(product.pricePerGram ?? 0)
                : Number(product.priceTHB)

              return (
                <button
                  key={product.id}
                  onClick={() => !outOfStock && handleTileClick(product)}
                  disabled={outOfStock}
                  className={cn(
                    "flex flex-col items-start rounded-lg border p-3 text-left transition-colors",
                    "hover:border-primary hover:bg-accent",
                    "active:scale-[0.98]",
                    "min-h-[100px]",
                    outOfStock && "cursor-not-allowed opacity-50"
                  )}
                >
                  <p className="line-clamp-2 text-sm font-medium leading-tight">
                    {product.name}
                  </p>

                  <div className="mt-auto flex w-full flex-col gap-1 pt-2">
                    {product.strainType && (
                      <Badge
                        variant="outline"
                        className={cn(
                          "w-fit text-[10px] capitalize",
                          strainColors[product.strainType] ?? ""
                        )}
                      >
                        {product.strainType}
                      </Badge>
                    )}

                    <div className="flex items-end justify-between">
                      <span className="text-sm font-bold">
                        {formatCurrency(price)}
                        {product.soldByWeight ? "/g" : ""}
                      </span>
                      <span
                        className={cn(
                          "text-[10px]",
                          stock <= 5
                            ? "font-medium text-destructive"
                            : "text-muted-foreground"
                        )}
                      >
                        {stock > 0 ? `${stock}` : "Out"}
                      </span>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Weight Entry Dialog */}
      <WeightEntryDialog
        product={weightProduct}
        open={!!weightProduct}
        onConfirm={handleWeightConfirm}
        onClose={() => setWeightProduct(null)}
      />
    </div>
  )
}
