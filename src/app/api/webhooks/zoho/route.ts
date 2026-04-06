import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

function verifyZohoSignature(payload: string, signature: string | null): boolean {
  const secret = process.env.ZOHO_WEBHOOK_SECRET
  if (!secret) return true // Skip verification if not configured
  if (!signature) return false
  // Zoho uses a simple token comparison for webhook verification
  return signature === secret
}

export async function POST(request: NextRequest) {
  try {
    const signature = request.headers.get('x-zoho-webhook-token')
    const body = await request.text()

    if (!verifyZohoSignature(body, signature)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    let payload: unknown = null
    try {
      payload = JSON.parse(body)
    } catch {
      payload = body
    }

    // Log the event for audit trail
    await prisma.zohoSyncLog.create({
      data: {
        entityType: 'webhook',
        entityId: 'incoming',
        direction: 'pull',
        status: 'success',
        errorMsg: typeof payload === 'string' ? payload.slice(0, 500) : JSON.stringify(payload).slice(0, 500),
      },
    })

    return NextResponse.json({ received: true }, { status: 200 })
  } catch {
    // Return 200 to prevent Zoho from retrying
    return NextResponse.json({ received: true }, { status: 200 })
  }
}
