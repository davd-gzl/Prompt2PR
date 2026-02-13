/**
 * Anthropic LLM provider for Prompt2PR.
 *
 * Implements the `LLMProvider` interface for Anthropic's Messages API.
 * Uses the `x-api-key` header for authentication (Anthropic convention)
 * and the `anthropic-version` header for API versioning.
 *
 * @see https://docs.anthropic.com/en/api/messages
 * @see _bmad-output/planning-artifacts/epics.md#Story 3.4
 */

import { ProviderError } from '../errors.js'
import { createLogger } from '../logger.js'
import type { ChatRequest, LLMResponse, FileChange } from './types.js'
import type { LLMProvider } from './types.js'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_BASE_URL = 'https://api.anthropic.com'
const DEFAULT_MODEL = 'claude-sonnet-4-20250514'
const ANTHROPIC_VERSION = '2023-06-01'
const TIMEOUT_MS = 120_000 // 120 seconds (NFR2)
const MAX_TOKENS = 4096

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

const log = createLogger('provider:anthropic')

/**
 * Map Anthropic API error responses to descriptive messages.
 */
function formatApiError(status: number, body: string): string {
  const prefix = `Anthropic API error (HTTP ${status})`

  try {
    const parsed: unknown = JSON.parse(body)
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      'error' in parsed &&
      typeof (parsed as Record<string, unknown>).error === 'object'
    ) {
      const errorObj = (parsed as Record<string, Record<string, unknown>>).error
      if (typeof errorObj.message === 'string') {
        return `${prefix}: ${errorObj.message}`
      }
    }
  } catch {
    // Body is not JSON — use raw body
  }

  return `${prefix}: ${body.slice(0, 200)}`
}

// ---------------------------------------------------------------------------
// Provider implementation
// ---------------------------------------------------------------------------

/**
 * Anthropic LLM provider.
 *
 * Sends messages requests to Anthropic's API, transforming the shared
 * `ChatRequest` format into Anthropic's system prompt + messages format.
 */
export class AnthropicProvider implements LLMProvider {
  readonly name = 'anthropic'
  readonly defaultModel = DEFAULT_MODEL

  private readonly apiKey: string
  private readonly baseUrl: string

  constructor(apiKey: string, baseUrl?: string) {
    this.apiKey = apiKey
    this.baseUrl = baseUrl || DEFAULT_BASE_URL
  }

  /**
   * Send a messages request to Anthropic's API.
   *
   * Transforms the shared ChatRequest into Anthropic's format:
   * - System prompt is extracted as a top-level field
   * - User messages are sent in the `messages` array
   *
   * @param request - The chat request with model and messages.
   * @returns The parsed LLM response containing file changes.
   * @throws {ProviderError} On API errors, timeouts, or malformed responses.
   */
  async chat(request: ChatRequest): Promise<LLMResponse> {
    const model = request.model || this.defaultModel
    const url = `${this.baseUrl}/v1/messages`

    log.info(`Sending request to ${url} with model '${model}'`)

    // Transform ChatRequest into Anthropic format
    // Extract system prompt from messages, send user messages separately
    const systemMessage = request.messages.find((m) => m.role === 'system')
    const userMessages = request.messages.filter((m) => m.role !== 'system')

    const body = JSON.stringify({
      model,
      max_tokens: MAX_TOKENS,
      system: systemMessage?.content ?? '',
      messages: userMessages.map((m) => ({
        role: m.role,
        content: m.content
      }))
    })

    let response: Response

    try {
      response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': ANTHROPIC_VERSION
        },
        body,
        signal: AbortSignal.timeout(TIMEOUT_MS)
      })
    } catch (error: unknown) {
      if (error instanceof DOMException && error.name === 'TimeoutError') {
        throw new ProviderError(
          `Anthropic API request timed out after ${TIMEOUT_MS / 1000} seconds`,
          this.name
        )
      }
      if (error instanceof TypeError) {
        throw new ProviderError(
          `Anthropic API network error: ${error.message}`,
          this.name
        )
      }
      throw new ProviderError(
        `Anthropic API request failed: ${String(error)}`,
        this.name
      )
    }

    if (!response.ok) {
      const errorBody = await response.text()
      const message = formatApiError(response.status, errorBody)

      if (response.status === 429) {
        const retryAfter = response.headers.get('retry-after')
        const retryInfo = retryAfter ? ` (retry after ${retryAfter}s)` : ''
        throw new ProviderError(
          `${message}${retryInfo}`,
          this.name,
          response.status
        )
      }

      throw new ProviderError(message, this.name, response.status)
    }

    // Parse the successful response
    const responseBody: unknown = await response.json()

    log.debug(`Raw response: ${JSON.stringify(responseBody).slice(0, 500)}`)

    return this.parseResponse(responseBody)
  }

  /**
   * Transform Anthropic's response format into the shared LLMResponse.
   *
   * Anthropic response shape:
   * ```json
   * {
   *   "content": [
   *     { "type": "text", "text": "..." }
   *   ],
   *   "role": "assistant",
   *   "stop_reason": "end_turn"
   * }
   * ```
   */
  private parseResponse(body: unknown): LLMResponse {
    if (
      typeof body !== 'object' ||
      body === null ||
      !('content' in body) ||
      !Array.isArray((body as Record<string, unknown>).content)
    ) {
      throw new ProviderError(
        'Malformed Anthropic response: missing "content" array',
        this.name
      )
    }

    const content = (body as Record<string, unknown[]>).content
    if (content.length === 0) {
      throw new ProviderError(
        'Malformed Anthropic response: empty "content" array',
        this.name
      )
    }

    // Find the first text block
    const textBlock = content.find(
      (block) =>
        typeof block === 'object' &&
        block !== null &&
        (block as Record<string, unknown>).type === 'text'
    ) as Record<string, unknown> | undefined

    if (!textBlock || typeof textBlock.text !== 'string') {
      throw new ProviderError(
        'Malformed Anthropic response: no text content block found',
        this.name
      )
    }

    // Parse the JSON content from the LLM
    let parsed: unknown
    try {
      parsed = JSON.parse(textBlock.text)
    } catch {
      throw new ProviderError(
        `Malformed Anthropic response: content is not valid JSON — ${textBlock.text.slice(0, 200)}`,
        this.name
      )
    }

    // Validate the expected shape: { files: [...] }
    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      !('files' in parsed) ||
      !Array.isArray((parsed as Record<string, unknown>).files)
    ) {
      throw new ProviderError(
        'Malformed Anthropic response: expected { files: [...] } structure',
        this.name
      )
    }

    const files = (parsed as Record<string, unknown[]>).files as FileChange[]

    log.info(`Received ${files.length} file change(s) from Anthropic`)

    return { files }
  }
}
