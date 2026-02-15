/**
 * Unit tests for the GitHub Models provider — src/providers/github-models-provider.ts
 *
 * Tests cover: successful response, auth error, rate limit, timeout,
 * malformed response, network error, custom base URL.
 */
import { jest } from '@jest/globals'
import * as core from '../../__fixtures__/core.js'

// Mock @actions/core before importing the module under test
jest.unstable_mockModule('@actions/core', () => core)

const { GitHubModelsProvider } =
  await import('../../src/providers/github-models-provider.js')
const { ProviderError } = await import('../../src/errors.js')

import type { ChatRequest } from '../../src/providers/types.js'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** A valid ChatRequest for testing. */
const VALID_REQUEST: ChatRequest = {
  model: 'openai/gpt-4o',
  messages: [
    { role: 'system', content: 'You are a helpful assistant.' },
    { role: 'user', content: 'Fix broken links' }
  ]
}

/**
 * Create a mock successful GitHub Models API response body.
 */
function makeGitHubModelsResponse(
  files: Array<{ path: string; content: string; action: string }>,
  summary?: string
): string {
  const inner: Record<string, unknown> = { files }
  if (summary !== undefined) inner.summary = summary
  return JSON.stringify({
    choices: [
      {
        message: {
          content: JSON.stringify(inner)
        }
      }
    ]
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

describe('GitHubModelsProvider', () => {
  let originalFetch: typeof globalThis.fetch

  beforeEach(() => {
    originalFetch = globalThis.fetch
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
    jest.resetAllMocks()
  })

  it('has correct name and defaultModel', () => {
    const provider = new GitHubModelsProvider('test-token')
    expect(provider.name).toBe('github')
    expect(provider.defaultModel).toBe('openai/gpt-4o')
  })

  // -- Successful response --------------------------------------------------

  it('returns parsed file changes on successful response', async () => {
    const responseBody = makeGitHubModelsResponse([
      { path: 'README.md', content: '# Updated', action: 'modify' }
    ])

    globalThis.fetch = jest
      .fn<typeof fetch>()
      .mockResolvedValue(mockFetchResponse(responseBody))

    const provider = new GitHubModelsProvider('test-token')
    const result = await provider.chat(VALID_REQUEST)

    expect(result.files).toHaveLength(1)
    expect(result.files[0]).toEqual({
      path: 'README.md',
      content: '# Updated',
      action: 'modify'
    })
  })

  it('returns empty files array when LLM signals no changes', async () => {
    const responseBody = makeGitHubModelsResponse([])

    globalThis.fetch = jest
      .fn<typeof fetch>()
      .mockResolvedValue(mockFetchResponse(responseBody))

    const provider = new GitHubModelsProvider('test-token')
    const result = await provider.chat(VALID_REQUEST)

    expect(result.files).toHaveLength(0)
  })

  it('sends correct headers, body, and uses /inference/chat/completions endpoint', async () => {
    const responseBody = makeGitHubModelsResponse([])

    const mockFetch = jest
      .fn<typeof fetch>()
      .mockResolvedValue(mockFetchResponse(responseBody))
    globalThis.fetch = mockFetch

    const provider = new GitHubModelsProvider('ghp_test-token')
    await provider.chat(VALID_REQUEST)

    expect(mockFetch).toHaveBeenCalledTimes(1)
    const [url, options] = mockFetch.mock.calls[0] as [string, RequestInit]

    expect(url).toBe('https://models.github.ai/inference/chat/completions')
    expect(options.method).toBe('POST')

    const headers = options.headers as Record<string, string>
    expect(headers['Authorization']).toBe('Bearer ghp_test-token')
    expect(headers['Content-Type']).toBe('application/json')

    const body = JSON.parse(options.body as string)
    expect(body.model).toBe('openai/gpt-4o')
    expect(body.response_format).toEqual({ type: 'json_object' })
    expect(body.messages).toEqual(VALID_REQUEST.messages)
  })

  it('uses provider default model when request model is empty', async () => {
    const responseBody = makeGitHubModelsResponse([])

    const mockFetch = jest
      .fn<typeof fetch>()
      .mockResolvedValue(mockFetchResponse(responseBody))
    globalThis.fetch = mockFetch

    const provider = new GitHubModelsProvider('test-token')
    await provider.chat({ ...VALID_REQUEST, model: '' })

    const body = JSON.parse(
      (mockFetch.mock.calls[0] as [string, RequestInit])[1].body as string
    )
    expect(body.model).toBe('openai/gpt-4o')
  })

  it('uses custom base URL when provided', async () => {
    const responseBody = makeGitHubModelsResponse([])

    const mockFetch = jest
      .fn<typeof fetch>()
      .mockResolvedValue(mockFetchResponse(responseBody))
    globalThis.fetch = mockFetch

    const provider = new GitHubModelsProvider(
      'test-token',
      'https://custom.models.example.com'
    )
    await provider.chat(VALID_REQUEST)

    const [url] = mockFetch.mock.calls[0] as [string, RequestInit]
    expect(url).toBe(
      'https://custom.models.example.com/inference/chat/completions'
    )
  })

  // -- Auth error (401) -----------------------------------------------------

  it('throws ProviderError on 401 auth error', async () => {
    globalThis.fetch = jest.fn<typeof fetch>().mockResolvedValue(
      mockFetchResponse(
        JSON.stringify({
          error: { message: 'Invalid token', type: 'invalid_request_error' }
        }),
        401
      )
    )

    const provider = new GitHubModelsProvider('bad-token')

    await expect(provider.chat(VALID_REQUEST)).rejects.toThrow(
      expect.objectContaining({
        name: 'ProviderError',
        message: expect.stringMatching(/GitHub Models API error \(HTTP 401\)/)
      })
    )
  })

  it('includes status code in ProviderError on API error', async () => {
    globalThis.fetch = jest.fn<typeof fetch>().mockResolvedValue(
      mockFetchResponse(
        JSON.stringify({
          error: { message: 'Unauthorized', type: 'invalid_request_error' }
        }),
        401
      )
    )

    const provider = new GitHubModelsProvider('bad-token')

    const error = (await provider
      .chat(VALID_REQUEST)
      .catch((e: unknown) => e)) as InstanceType<typeof ProviderError>

    expect(error).toBeInstanceOf(ProviderError)
    expect(error.statusCode).toBe(401)
    expect(error.provider).toBe('github')
  })

  // -- Rate limit (429) -----------------------------------------------------

  it('throws ProviderError with retry-after on 429 rate limit', async () => {
    globalThis.fetch = jest.fn<typeof fetch>().mockResolvedValue(
      mockFetchResponse(
        JSON.stringify({
          error: {
            message: 'Rate limit exceeded',
            type: 'rate_limit_error'
          }
        }),
        429,
        { 'retry-after': '30' }
      )
    )

    const provider = new GitHubModelsProvider('test-token')

    await expect(provider.chat(VALID_REQUEST)).rejects.toThrow(
      expect.objectContaining({
        name: 'ProviderError',
        message: expect.stringMatching(/retry after 30s/),
        retryable: false
      })
    )
  })

  // -- Server error (500) ---------------------------------------------------

  it('throws ProviderError on 500 server error', async () => {
    globalThis.fetch = jest
      .fn<typeof fetch>()
      .mockResolvedValue(mockFetchResponse('Internal Server Error', 500))

    const provider = new GitHubModelsProvider('test-token')

    await expect(provider.chat(VALID_REQUEST)).rejects.toThrow(
      expect.objectContaining({
        name: 'ProviderError',
        message: expect.stringMatching(/GitHub Models API error \(HTTP 500\)/)
      })
    )
  })

  // -- Timeout --------------------------------------------------------------

  it('throws ProviderError on timeout', async () => {
    const timeoutError = new DOMException('Signal timed out.', 'TimeoutError')
    globalThis.fetch = jest.fn<typeof fetch>().mockRejectedValue(timeoutError)

    const provider = new GitHubModelsProvider('test-token')

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

    const provider = new GitHubModelsProvider('test-token')

    await expect(provider.chat(VALID_REQUEST)).rejects.toThrow(
      expect.objectContaining({
        name: 'ProviderError',
        message: expect.stringMatching(/network error/)
      })
    )
  })

  // -- Malformed response ---------------------------------------------------

  it('throws ProviderError when response is missing choices', async () => {
    globalThis.fetch = jest
      .fn<typeof fetch>()
      .mockResolvedValue(mockFetchResponse(JSON.stringify({ result: 'bad' })))

    const provider = new GitHubModelsProvider('test-token')

    await expect(provider.chat(VALID_REQUEST)).rejects.toThrow(
      expect.objectContaining({
        name: 'ProviderError',
        message: expect.stringMatching(/missing "choices" array/)
      })
    )
  })

  it('throws ProviderError when choices array is empty', async () => {
    globalThis.fetch = jest
      .fn<typeof fetch>()
      .mockResolvedValue(mockFetchResponse(JSON.stringify({ choices: [] })))

    const provider = new GitHubModelsProvider('test-token')

    await expect(provider.chat(VALID_REQUEST)).rejects.toThrow(
      expect.objectContaining({
        name: 'ProviderError',
        message: expect.stringMatching(/empty "choices" array/)
      })
    )
  })

  it('throws ProviderError when content is not valid JSON', async () => {
    globalThis.fetch = jest.fn<typeof fetch>().mockResolvedValue(
      mockFetchResponse(
        JSON.stringify({
          choices: [{ message: { content: 'not json' } }]
        })
      )
    )

    const provider = new GitHubModelsProvider('test-token')

    await expect(provider.chat(VALID_REQUEST)).rejects.toThrow(
      expect.objectContaining({
        name: 'ProviderError',
        message: expect.stringMatching(/not valid JSON/)
      })
    )
  })

  it('throws ProviderError when content JSON has wrong structure', async () => {
    globalThis.fetch = jest.fn<typeof fetch>().mockResolvedValue(
      mockFetchResponse(
        JSON.stringify({
          choices: [{ message: { content: JSON.stringify({ changes: [] }) } }]
        })
      )
    )

    const provider = new GitHubModelsProvider('test-token')

    await expect(provider.chat(VALID_REQUEST)).rejects.toThrow(
      expect.objectContaining({
        name: 'ProviderError',
        message: expect.stringMatching(/expected \{ files: \[...\] \}/)
      })
    )
  })

  it('throws ProviderError when message content is not a string', async () => {
    globalThis.fetch = jest.fn<typeof fetch>().mockResolvedValue(
      mockFetchResponse(
        JSON.stringify({
          choices: [{ message: { content: 42 } }]
        })
      )
    )

    const provider = new GitHubModelsProvider('test-token')

    await expect(provider.chat(VALID_REQUEST)).rejects.toThrow(
      expect.objectContaining({
        name: 'ProviderError',
        message: expect.stringMatching(/not a string/)
      })
    )
  })

  it('throws ProviderError for generic fetch failures', async () => {
    globalThis.fetch = jest
      .fn<typeof fetch>()
      .mockRejectedValue(new Error('something went wrong'))

    const provider = new GitHubModelsProvider('test-token')

    await expect(provider.chat(VALID_REQUEST)).rejects.toThrow(
      expect.objectContaining({
        name: 'ProviderError',
        message: expect.stringMatching(/request failed/)
      })
    )
  })

  // -- Summary extraction (FR21) --------------------------------------------

  it('extracts summary when present in LLM response', async () => {
    const responseBody = makeGitHubModelsResponse(
      [{ path: 'README.md', content: '# Updated', action: 'modify' }],
      'Fixed broken links in docs.'
    )

    globalThis.fetch = jest
      .fn<typeof fetch>()
      .mockResolvedValue(mockFetchResponse(responseBody))

    const provider = new GitHubModelsProvider('test-token')
    const result = await provider.chat(VALID_REQUEST)

    expect(result.summary).toBe('Fixed broken links in docs.')
    expect(result.files).toHaveLength(1)
  })

  it('returns no summary when not present in LLM response', async () => {
    const responseBody = makeGitHubModelsResponse([
      { path: 'README.md', content: '# Updated', action: 'modify' }
    ])

    globalThis.fetch = jest
      .fn<typeof fetch>()
      .mockResolvedValue(mockFetchResponse(responseBody))

    const provider = new GitHubModelsProvider('test-token')
    const result = await provider.chat(VALID_REQUEST)

    expect(result.summary).toBeUndefined()
    expect(result.files).toHaveLength(1)
  })
})
