import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    await requireRole('admin')

    const { searchParams } = request.nextUrl
    const take = parseInt(searchParams.get('take') ?? '20', 10)

    const logs = await prisma.zohoSyncLog.findMany({
      orderBy: { syncedAt: 'desc' },
      take,
    })

    return NextResponse.json({ logs })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (error instanceof Error && error.message === 'Forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
