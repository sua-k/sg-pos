import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { buildZohoAuthUrl, isZohoConfigured } from '@/lib/zoho/client'

export async function GET() {
  try {
    await requireRole('admin')

    if (!isZohoConfigured()) {
      return NextResponse.json(
        { error: 'Zoho OAuth is not configured. Set ZOHO_CLIENT_ID, ZOHO_CLIENT_SECRET, and ZOHO_REDIRECT_URI.' },
        { status: 503 }
      )
    }

    const authUrl = buildZohoAuthUrl()
    return NextResponse.redirect(authUrl)
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
