/**
 * Zoho API Client
 * Handles OAuth2 token management and authenticated requests.
 * Tokens stored in env vars (ZOHO_ACCESS_TOKEN / ZOHO_REFRESH_TOKEN) or
 * optionally persisted to the zoho_tokens table if present.
 */

interface ZohoTokens {
  accessToken: string
  refreshToken: string
  expiresAt: number // Unix ms
}

// In-memory token cache (refreshed at startup / on expiry)
let tokenCache: ZohoTokens | null = null

function buildTokenFromEnv(): ZohoTokens | null {
  const accessToken = process.env.ZOHO_ACCESS_TOKEN
  const refreshToken = process.env.ZOHO_REFRESH_TOKEN
  const expiresAt = process.env.ZOHO_TOKEN_EXPIRES_AT

  if (!accessToken || !refreshToken) return null

  return {
    accessToken,
    refreshToken,
    expiresAt: expiresAt ? parseInt(expiresAt, 10) : Date.now() + 60 * 60 * 1000,
  }
}

async function refreshAccessToken(refreshToken: string): Promise<ZohoTokens> {
  const clientId = process.env.ZOHO_CLIENT_ID
  const clientSecret = process.env.ZOHO_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    throw new Error('ZOHO_CLIENT_ID and ZOHO_CLIENT_SECRET are required')
  }

  const params = new URLSearchParams({
    refresh_token: refreshToken,
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: 'refresh_token',
  })

  const res = await fetch('https://accounts.zoho.com/oauth/v2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Zoho token refresh failed: ${text}`)
  }

  const data = await res.json()

  if (data.error) {
    throw new Error(`Zoho token refresh error: ${data.error}`)
  }

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? refreshToken,
    expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000,
  }
}

export async function getZohoTokens(): Promise<ZohoTokens> {
  // Use in-memory cache first
  if (tokenCache && tokenCache.expiresAt > Date.now() + 60_000) {
    return tokenCache
  }

  // Fall back to env vars
  const envTokens = buildTokenFromEnv()
  if (envTokens && envTokens.expiresAt > Date.now() + 60_000) {
    tokenCache = envTokens
    return tokenCache
  }

  // Attempt refresh
  const refreshToken = envTokens?.refreshToken ?? process.env.ZOHO_REFRESH_TOKEN
  if (!refreshToken) {
    throw new Error('No Zoho tokens available. Please complete OAuth authorization first.')
  }

  tokenCache = await refreshAccessToken(refreshToken)
  return tokenCache
}

export function setZohoTokens(tokens: ZohoTokens): void {
  tokenCache = tokens
}

export function clearZohoTokens(): void {
  tokenCache = null
}

export function isZohoConfigured(): boolean {
  return !!(
    process.env.ZOHO_CLIENT_ID &&
    process.env.ZOHO_CLIENT_SECRET &&
    process.env.ZOHO_REDIRECT_URI
  )
}

export function isZohoConnected(): boolean {
  if (tokenCache && tokenCache.expiresAt > Date.now()) return true
  const envTokens = buildTokenFromEnv()
  return !!(envTokens?.accessToken)
}

/**
 * Authenticated fetch wrapper for Zoho APIs.
 * Automatically injects access token and org header.
 */
export async function zohoFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const tokens = await getZohoTokens()
  const orgId = process.env.ZOHO_ORGANIZATION_ID

  const headers: Record<string, string> = {
    Authorization: `Zoho-oauthtoken ${tokens.accessToken}`,
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  }

  if (orgId) {
    headers['X-com-zoho-invoice-organizationid'] = orgId
  }

  const response = await fetch(url, { ...options, headers })

  // If unauthorized, try refreshing once
  if (response.status === 401 && tokenCache?.refreshToken) {
    try {
      tokenCache = await refreshAccessToken(tokenCache.refreshToken)
      const retryHeaders = {
        ...headers,
        Authorization: `Zoho-oauthtoken ${tokenCache.accessToken}`,
      }
      return fetch(url, { ...options, headers: retryHeaders })
    } catch {
      throw new Error('Zoho token refresh failed during request retry')
    }
  }

  return response
}

export function buildZohoAuthUrl(): string {
  const clientId = process.env.ZOHO_CLIENT_ID
  const redirectUri = process.env.ZOHO_REDIRECT_URI

  if (!clientId || !redirectUri) {
    throw new Error('ZOHO_CLIENT_ID and ZOHO_REDIRECT_URI are required')
  }

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    scope: 'ZohoInventory.FullAccess.all,ZohoBooks.fullaccess.all',
    redirect_uri: redirectUri,
    access_type: 'offline',
    prompt: 'consent',
  })

  return `https://accounts.zoho.com/oauth/v2/auth?${params.toString()}`
}

export async function exchangeCodeForTokens(code: string): Promise<ZohoTokens> {
  const clientId = process.env.ZOHO_CLIENT_ID
  const clientSecret = process.env.ZOHO_CLIENT_SECRET
  const redirectUri = process.env.ZOHO_REDIRECT_URI

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error('Zoho OAuth environment variables are not configured')
  }

  const params = new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    grant_type: 'authorization_code',
  })

  const res = await fetch('https://accounts.zoho.com/oauth/v2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Zoho code exchange failed: ${text}`)
  }

  const data = await res.json()

  if (data.error) {
    throw new Error(`Zoho auth error: ${data.error}`)
  }

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000,
  }
}
