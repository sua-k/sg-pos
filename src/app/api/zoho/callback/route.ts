import { NextRequest, NextResponse } from 'next/server'
import { exchangeCodeForTokens, setZohoTokens } from '@/lib/zoho/client'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const code = searchParams.get('code')
    const error = searchParams.get('error')

    if (error) {
      return NextResponse.redirect(new URL(`/zoho?error=${encodeURIComponent(error)}`, request.url))
    }

    if (!code) {
      return NextResponse.redirect(new URL('/zoho?error=no_code', request.url))
    }

    const tokens = await exchangeCodeForTokens(code)
    setZohoTokens(tokens)

    // Redirect back to Zoho settings page with success
    return NextResponse.redirect(new URL('/zoho?connected=1', request.url))
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.redirect(
      new URL(`/zoho?error=${encodeURIComponent(msg)}`, request.url)
    )
  }
}
