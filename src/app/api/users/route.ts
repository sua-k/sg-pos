import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/auth'

export async function GET() {
  try {
    await requireRole('admin')

    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        branchId: true,
        createdAt: true,
        branch: { select: { id: true, name: true, code: true } },
      },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json({ users })
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

export async function POST(request: NextRequest) {
  try {
    await requireRole('admin')

    const body = await request.json()
    const { name, email, password, role, branchId } = body

    if (!name || !email || !password || !role || !branchId) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 })
    }

    if (!['admin', 'manager', 'staff'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
    }

    // Create Supabase Auth user via Admin API
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    const authRes = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${serviceRoleKey}`,
        'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        password,
        email_confirm: true,
        user_metadata: { name },
      }),
    })

    if (!authRes.ok) {
      const authError = await authRes.json()
      const message = authError?.msg || authError?.message || 'Failed to create auth user'
      return NextResponse.json({ error: message }, { status: 400 })
    }

    const authUser = await authRes.json()

    // Create user record in the database
    const user = await prisma.user.create({
      data: {
        authUserId: authUser.id,
        name,
        email,
        role,
        branchId,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        branchId: true,
        branch: { select: { id: true, name: true, code: true } },
      },
    })

    return NextResponse.json(user, { status: 201 })
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
