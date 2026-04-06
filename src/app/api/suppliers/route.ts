import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

export async function GET() {
  try {
    await requireAuth()

    const suppliers = await prisma.supplier.findMany({
      select: { id: true, name: true, contactName: true, phone: true },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json({ suppliers })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
