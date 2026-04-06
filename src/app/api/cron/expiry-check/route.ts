import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Called by Vercel cron — see vercel.json for schedule
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const today = new Date()
    const thirtyDaysOut = new Date(today)
    thirtyDaysOut.setDate(thirtyDaysOut.getDate() + 30)

    const expiringProducts = await prisma.product.findMany({
      where: {
        expiryDate: {
          gte: today,
          lte: thirtyDaysOut,
        },
      },
      include: { category: true },
      orderBy: { expiryDate: 'asc' },
    })

    const expiredProducts = await prisma.product.findMany({
      where: {
        expiryDate: {
          lt: today,
        },
      },
      orderBy: { expiryDate: 'asc' },
    })

    return NextResponse.json({
      message: 'Expiry check complete',
      expiringSoon: expiringProducts.length,
      expired: expiredProducts.length,
      expiringSoonProducts: expiringProducts.map((p) => ({
        id: p.id,
        name: p.name,
        sku: p.sku,
        expiryDate: p.expiryDate,
      })),
      expiredProducts: expiredProducts.map((p) => ({
        id: p.id,
        name: p.name,
        sku: p.sku,
        expiryDate: p.expiryDate,
      })),
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
