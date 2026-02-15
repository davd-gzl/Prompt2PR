/**
 * Unit tests for the Anthropic provider — src/providers/anthropic-provider.ts
 *
 * Tests cover: successful response, auth error, rate limit, timeout,
 * malformed response, message format transformation.
 */
import { jest } from '@jest/globals'
import * as core from '../../__fixtures__/core.js'

// Mock @actions/core before importing the module under test
jest.unstable_mockModule('@actions/core', () => core)

const { AnthropicProvider } =
  await import('../../src/providers/anthropic-provider.js')
const { ProviderError } = await import('../../src/errors.js')

import type { ChatRequest } from '../../src/providers/types.js'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** A valid ChatRequest for testing. */
const VALID_REQUEST: ChatRequest = {
  model: 'claude-sonnet-4-20250514',
  messages: [
    { role: 'system', content: 'You are a helpful assistant.' },
    { role: 'user', content: 'Fix broken links' }
  ]
}

/**
 * Create a mock successful Anthropic API response body.
 */
function makeAnthropicResponse(
  files: Array<{ path: string; content: string; action: string }>,
  summary?: string
): string {
  const inner: Record<string, unknown> = { files }
  if (summary !== undefined) inner.summary = summary
  return JSON.stringify({
    content: [
      {
        type: 'text',
        text: JSON.stringify(inner)
      }
    ],
    role: 'assistant',
    stop_reason: 'end_turn'
  })
}

/** Create a mock fetch Response. */
function mockFetchResponse(
  body: string,
  status: number = 200,
  headers: Record<string, string> = {}
): Response {
  return new Response(body, {
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    headers: new Headers({ 'Content-Type': 'application/json', ...headers })
  })
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('AnthropicProvider', () => {
  let originalFetch: typeof globalThis.fetch

  beforeEach(() => {
    originalFetch = globalThis.fetch
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
    jest.resetAllMocks()
  })

  it('has correct name and defaultModel', () => {
    const provider = new AnthropicProvider('test-key')
    expect(provider.name).toBe('anthropic')
    expect(provider.defaultModel).toBe('claude-sonnet-4-20250514')
  })

  // -- Successful response --------------------------------------------------

  it('returns parsed file changes on successful response', async () => {
    const responseBody = makeAnthropicResponse([
      { path: 'README.md', content: '# Updated', action: 'modify' }
    ])

    globalThis.fetch = jest
      .fn<typeof fetch>()
      .mockResolvedValue(mockFetchResponse(responseBody))

    const provider = new AnthropicProvider('test-key')
    const result = await provider.chat(VALID_REQUEST)

    expect(result.files).toHaveLength(1)
    expect(result.files[0]).toEqual({
      path: 'README.md',
      content: '# Updated',
      action: 'modify'
    })
  })

  it('returns empty files array when LLM signals no changes', async () => {
    const responseBody = makeAnthropicResponse([])

    globalThis.fetch = jest
      .fn<typeof fetch>()
      .mockResolvedValue(mockFetchResponse(responseBody))

    const provider = new AnthropicProvider('test-key')
    const result = await provider.chat(VALID_REQUEST)

    expect(result.files).toHaveLength(0)
  })

  it('sends correct headers and body (x-api-key, anthropic-version)', async () => {
    const responseBody = makeAnthropicResponse([])

    const mockFetch = jest
      .fn<typeof fetch>()
      .mockResolvedValue(mockFetchResponse(responseBody))
    globalThis.fetch = mockFetch

    const provider = new AnthropicProvider('my-api-key')
    await provider.chat(VALID_REQUEST)

    expect(mockFetch).toHaveBeenCalledTimes(1)
    const [url, options] = mockFetch.mock.calls[0] as [string, RequestInit]

    expect(url).toBe('https://api.anthropic.com/v1/messages')
    expect(options.method).toBe('POST')

    const headers = options.headers as Record<string, string>
    expect(headers['x-api-key']).toBe('my-api-key')
    expect(headers['anthropic-version']).toBe('2023-06-01')
    expect(headers['Content-Type']).toBe('application/json')

    const body = JSON.parse(options.body as string)
    expect(body.model).toBe('claude-sonnet-4-20250514')
    expect(body.system).toBe('You are a helpful assistant.')
    expect(body.messages).toEqual([
      { role: 'user', content: 'Fix broken links' }
    ])
    expect(body.max_tokens).toBe(4096)
  })

  it('transforms system prompt to top-level field correctly', async () => {
    const responseBody = makeAnthropicResponse([])

    const mockFetch = jest
      .fn<typeof fetch>()
      .mockResolvedValue(mockFetchResponse(responseBody))
    globalThis.fetch = mockFetch

    const request: ChatRequest = {
      model: 'claude-sonnet-4-20250514',
      messages: [
        { role: 'system', content: 'System instructions here' },
        { role: 'user', content: 'User message 1' },
        { role: 'assistant', content: 'Assistant reply' },
        { role: 'user', content: 'User message 2' }
      ]
    }

    const provider = new AnthropicProvider('test-key')
    await provider.chat(request)

    const body = JSON.parse(
      (mockFetch.mock.calls[0] as [string, RequestInit])[1].body as string
    )

    // System prompt should be a top-level field
    expect(body.system).toBe('System instructions here')
    // Messages should exclude the system message
    expect(body.messages).toEqual([
      { role: 'user', content: 'User message 1' },
      { role: 'assistant', content: 'Assistant reply' },
      { role: 'user', content: 'User message 2' }
    ])
  })

  it('uses provider default model when request model is empty', async () => {
    const responseBody = makeAnthropicResponse([])

    const mockFetch = jest
      .fn<typeof fetch>()
      .mockResolvedValue(mockFetchResponse(responseBody))
    globalThis.fetch = mockFetch

    const provider = new AnthropicProvider('test-key')
    await provider.chat({ ...VALID_REQUEST, model: '' })

    const body = JSON.parse(
      (mockFetch.mock.calls[0] as [string, RequestInit])[1].body as string
    )
    expect(body.model).toBe('claude-sonnet-4-20250514')
  })

  it('uses custom base URL when provided', async () => {
    const responseBody = makeAnthropicResponse([])

    const mockFetch = jest
      .fn<typeof fetch>()
      .mockResolvedValue(mockFetchResponse(responseBody))
    globalThis.fetch = mockFetch

    const provider = new AnthropicProvider(
      'test-key',
      'https://custom.example.com'
    )
    await provider.chat(VALID_REQUEST)

    const [url] = mockFetch.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('https://custom.example.com/v1/messages')
  })

  // -- Auth error (401) -----------------------------------------------------

  it('throws ProviderError on 401 auth error', async () => {
    globalThis.fetch = jest.fn<typeof fetch>().mockResolvedValue(
      mockFetchResponse(
        JSON.stringify({
          error: { type: 'authentication_error', message: 'Invalid API key' }
        }),
        401
      )
    )

    const provider = new AnthropicProvider('bad-key')

    await expect(provider.chat(VALID_REQUEST)).rejects.toThrow(
      expect.objectContaining({
        name: 'ProviderError',
        message: expect.stringMatching(/Anthropic API error \(HTTP 401\)/)
      })
    )
  })

  it('includes status code and provider in ProviderError', async () => {
    globalThis.fetch = jest.fn<typeof fetch>().mockResolvedValue(
      mockFetchResponse(
        JSON.stringify({
          error: {
            type: 'authentication_error',
            message: 'Unauthorized'
          }
        }),
        401
      )
    )

    const provider = new AnthropicProvider('bad-key')

    const error = (await provider
      .chat(VALID_REQUEST)
      .catch((e: unknown) => e)) as InstanceType<typeof ProviderError>

    expect(error).toBeInstanceOf(ProviderError)
    expect(error.statusCode).toBe(401)
    expect(error.provider).toBe('anthropic')
  })

  // -- Rate limit (429) -----------------------------------------------------

  it('throws ProviderError with retry-after on 429 rate limit', async () => {
    globalThis.fetch = jest.fn<typeof fetch>().mockResolvedValue(
      mockFetchResponse(
        JSON.stringify({
          error: { type: 'rate_limit_error', message: 'Rate limit exceeded' }
        }),
        429,
        { 'retry-after': '60' }
      )
    )

    const provider = new AnthropicProvider('test-key')

    await expect(provider.chat(VALID_REQUEST)).rejects.toThrow(
      expect.objectContaining({
        name: 'ProviderError',
        message: expect.stringMatching(/retry after 60s/),
        retryable: false
      })
    )
  })

  // -- Server error (500) ---------------------------------------------------

  it('throws ProviderError on 500 server error', async () => {
    globalThis.fetch = jest
      .fn<typeof fetch>()
      .mockResolvedValue(mockFetchResponse('Internal Server Error', 500))

    const provider = new AnthropicProvider('test-key')

    await expect(provider.chat(VALID_REQUEST)).rejects.toThrow(
      expect.objectContaining({
        name: 'ProviderError',
        message: expect.stringMatching(/Anthropic API error \(HTTP 500\)/)
      })
    )
  })

  // -- Timeout --------------------------------------------------------------

  it('throws ProviderError on timeout', async () => {
    const timeoutError = new DOMException('Signal timed out.', 'TimeoutError')
    globalThis.fetch = jest.fn<typeof fetch>().mockRejectedValue(timeoutError)

    const provider = new AnthropicProvider('test-key')

    await expect(provider.chat(VALID_REQUEST)).rejects.toThrow(
      expect.objectContaining({
        name: 'ProviderError',
        message: expect.stringMatching(/timed out after 120 seconds/)
      })
    )
  })

  // -- Network error --------------------------------------------------------

  it('throws ProviderError on network error', async () => {
    globalThis.fetch = jest
      .fn<typeof fetch>()
      .mockRejectedValue(new TypeError('fetch failed'))

    const provider = new AnthropicProvider('test-key')

    await expect(provider.chat(VALID_REQUEST)).rejects.toThrow(
      expect.objectContaining({
        name: 'ProviderError',
        message: expect.stringMatching(/network error/)
      })
    )
  })

  // -- Malformed response ---------------------------------------------------

  it('throws ProviderError when response is missing content', async () => {
    globalThis.fetch = jest
      .fn<typeof fetch>()
      .mockResolvedValue(mockFetchResponse(JSON.stringify({ result: 'bad' })))

    const provider = new AnthropicProvider('test-key')

    await expect(provider.chat(VALID_REQUEST)).rejects.toThrow(
      expect.objectContaining({
        name: 'ProviderError',
        message: expect.stringMatching(/missing "content" array/)
      })
    )
  })

  it('throws ProviderError when content array is empty', async () => {
    globalThis.fetch = jest
      .fn<typeof fetch>()
      .mockResolvedValue(mockFetchResponse(JSON.stringify({ content: [] })))

    const provider = new AnthropicProvider('test-key')

    await expect(provider.chat(VALID_REQUEST)).rejects.toThrow(
      expect.objectContaining({
        name: 'ProviderError',
        message: expect.stringMatching(/empty "content" array/)
      })
    )
  })

  it('throws ProviderError when no text block found', async () => {
    globalThis.fetch = jest.fn<typeof fetch>().mockResolvedValue(
      mockFetchResponse(
        JSON.stringify({
          content: [{ type: 'image', source: {} }]
        })
      )
    )

    const provider = new AnthropicProvider('test-key')

    await expect(provider.chat(VALID_REQUEST)).rejects.toThrow(
      expect.objectContaining({
        name: 'ProviderError',
        message: expect.stringMatching(/no text content block/)
      })
    )
  })

  it('throws ProviderError when text content is not valid JSON', async () => {
    globalThis.fetch = jest.fn<typeof fetch>().mockResolvedValue(
      mockFetchResponse(
        JSON.stringify({
          content: [{ type: 'text', text: 'not json' }]
        })
      )
    )

    const provider = new AnthropicProvider('test-key')

    await expect(provider.chat(VALID_REQUEST)).rejects.toThrow(
      expect.objectContaining({
        name: 'ProviderError',
        message: expect.stringMatching(/not valid JSON/)
      })
    )
  })

  it('throws ProviderError when text JSON has wrong structure', async () => {
    globalThis.fetch = jest.fn<typeof fetch>().mockResolvedValue(
      mockFetchResponse(
        JSON.stringify({
          content: [{ type: 'text', text: JSON.stringify({ changes: [] }) }]
        })
      )
    )

    const provider = new AnthropicProvider('test-key')

    await expect(provider.chat(VALID_REQUEST)).rejects.toThrow(
      expect.objectContaining({
        name: 'ProviderError',
        message: expect.stringMatching(/expected \{ files: \[...\] \}/)
      })
    )
  })

  it('throws ProviderError for generic fetch failures', async () => {
    globalThis.fetch = jest
      .fn<typeof fetch>()
      .mockRejectedValue(new Error('something went wrong'))

    const provider = new AnthropicProvider('test-key')

    await expect(provider.chat(VALID_REQUEST)).rejects.toThrow(
      expect.objectContaining({
        name: 'ProviderError',
        message: expect.stringMatching(/request failed/)
      })
    )
  })

  // -- Summary extraction (FR21) --------------------------------------------

  it('extracts summary when present in LLM response', async () => {
    const responseBody = makeAnthropicResponse(
      [{ path: 'README.md', content: '# Updated', action: 'modify' }],
      'Fixed broken links in docs.'
    )

    globalThis.fetch = jest
      .fn<typeof fetch>()
      .mockResolvedValue(mockFetchResponse(responseBody))

    const provider = new AnthropicProvider('test-key')
    const result = await provider.chat(VALID_REQUEST)

    expect(result.summary).toBe('Fixed broken links in docs.')
    expect(result.files).toHaveLength(1)
  })

  it('returns no summary when not present in LLM response', async () => {
    const responseBody = makeAnthropicResponse([
      { path: 'README.md', content: '# Updated', action: 'modify' }
    ])

    globalThis.fetch = jest
      .fn<typeof fetch>()
      .mockResolvedValue(mockFetchResponse(responseBody))

    const provider = new AnthropicProvider('test-key')
    const result = await provider.chat(VALID_REQUEST)

    expect(result.summary).toBeUndefined()
    expect(result.files).toHaveLength(1)
  })
})
