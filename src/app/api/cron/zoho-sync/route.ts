import { NextRequest, NextResponse } from 'next/server'

// Called by Vercel cron — see vercel.json for schedule
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const base = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

    const [inventoryRes, booksRes, bankRes] = await Promise.allSettled([
      fetch(`${base}/api/zoho/sync/inventory`, { method: 'POST' }),
      fetch(`${base}/api/zoho/sync/books`, { method: 'POST' }),
      fetch(`${base}/api/zoho/sync/bank`, { method: 'POST' }),
    ])

    return NextResponse.json({
      message: 'Zoho sync cron complete',
      inventory: inventoryRes.status,
      books: booksRes.status,
      bank: bankRes.status,
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
