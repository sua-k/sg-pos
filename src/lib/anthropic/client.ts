/**
 * Anthropic API client using raw fetch (no SDK dependency).
 */

interface AnthropicMessage {
  role: 'user' | 'assistant'
  content: string
}

interface AnthropicRequest {
  model: string
  max_tokens: number
  messages: AnthropicMessage[]
  system?: string
}

interface AnthropicResponse {
  id: string
  type: string
  role: string
  content: Array<{ type: string; text: string }>
  model: string
  stop_reason: string
  usage: { input_tokens: number; output_tokens: number }
}

export async function callClaude(
  messages: AnthropicMessage[],
  options?: {
    model?: string
    maxTokens?: number
    system?: string
  }
): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY is not configured')
  }

  const body: AnthropicRequest = {
    model: options?.model ?? 'claude-3-haiku-20240307',
    max_tokens: options?.maxTokens ?? 1024,
    messages,
    ...(options?.system ? { system: options.system } : {}),
  }

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Anthropic API error ${res.status}: ${text}`)
  }

  const data: AnthropicResponse = await res.json()
  const textContent = data.content.find((c) => c.type === 'text')
  if (!textContent) {
    throw new Error('No text content in Anthropic response')
  }

  return textContent.text
}
