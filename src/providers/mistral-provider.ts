/**
 * Mistral LLM provider for Prompt2PR.
 *
 * Implements the `LLMProvider` interface for Mistral's chat completion API.
 * Uses the standard `Authorization: Bearer` header for authentication and
 * requests structured JSON responses via `response_format`.
 *
 * @see https://docs.mistral.ai/api/#tag/chat
 * @see _bmad-output/planning-artifacts/epics.md#Story 3.2
 */

import { ProviderError } from '../errors.js'
import { createLogger } from '../logger.js'
import type { ChatRequest, LLMResponse, FileChange } from './types.js'
import type { LLMProvider } from './types.js'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_BASE_URL = 'https://api.mistral.ai'
const DEFAULT_MODEL = 'mistral-large-latest'
const TIMEOUT_MS = 120_000 // 120 seconds (NFR2)

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

const log = createLogger('provider:mistral')

/**
 * Map Mistral API error responses to descriptive messages.
 */
function formatApiError(status: number, body: string): string {
  const prefix = `Mistral API error (HTTP ${status})`

  try {
    const parsed: unknown = JSON.parse(body)
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      'message' in parsed &&
      typeof (parsed as Record<string, unknown>).message === 'string'
    ) {
      return `${prefix}: ${(parsed as Record<string, string>).message}`
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
 * Mistral LLM provider.
 *
 * Sends chat completion requests to Mistral's API and parses responses
 * into the shared `LLMResponse` format.
 */
export class MistralProvider implements LLMProvider {
  readonly name = 'mistral'
  readonly defaultModel = DEFAULT_MODEL

  private readonly apiKey: string
  private readonly baseUrl: string

  constructor(apiKey: string, baseUrl?: string) {
    this.apiKey = apiKey
    this.baseUrl = baseUrl || DEFAULT_BASE_URL
  }

  /**
   * Send a chat completion request to Mistral's API.
   *
   * @param request - The chat request with model and messages.
   * @returns The parsed LLM response containing file changes.
   * @throws {ProviderError} On API errors, timeouts, or malformed responses.
   */
  async chat(request: ChatRequest): Promise<LLMResponse> {
    const model = request.model || this.defaultModel
    const url = `${this.baseUrl}/v1/chat/completions`

    log.info(`Sending request to ${url} with model '${model}'`)

    const body = JSON.stringify({
      model,
      messages: request.messages,
      response_format: { type: 'json_object' }
    })

    let response: Response

    try {
      response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`
        },
        body,
        signal: AbortSignal.timeout(TIMEOUT_MS)
      })
    } catch (error: unknown) {
      if (error instanceof DOMException && error.name === 'TimeoutError') {
        throw new ProviderError(
          `Mistral API request timed out after ${TIMEOUT_MS / 1000} seconds`,
          this.name
        )
      }
      if (error instanceof TypeError) {
        throw new ProviderError(
          `Mistral API network error: ${error.message}`,
          this.name
        )
      }
      throw new ProviderError(
        `Mistral API request failed: ${String(error)}`,
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
   * Transform Mistral's response format into the shared LLMResponse.
   */
  private parseResponse(body: unknown): LLMResponse {
    // Mistral response shape:
    // { choices: [{ message: { content: "..." } }] }
    if (
      typeof body !== 'object' ||
      body === null ||
      !('choices' in body) ||
      !Array.isArray((body as Record<string, unknown>).choices)
    ) {
      throw new ProviderError(
        'Malformed Mistral response: missing "choices" array',
        this.name
      )
    }

    const choices = (body as Record<string, unknown[]>).choices
    if (choices.length === 0) {
      throw new ProviderError(
        'Malformed Mistral response: empty "choices" array',
        this.name
      )
    }

    const firstChoice = choices[0] as Record<string, unknown>
    if (
      !firstChoice ||
      typeof firstChoice !== 'object' ||
      !('message' in firstChoice)
    ) {
      throw new ProviderError(
        'Malformed Mistral response: missing "message" in first choice',
        this.name
      )
    }

    const message = firstChoice.message as Record<string, unknown>
    if (typeof message.content !== 'string') {
      throw new ProviderError(
        'Malformed Mistral response: "content" is not a string',
        this.name
      )
    }

    // Parse the JSON content from the LLM
    let parsed: unknown
    try {
      parsed = JSON.parse(message.content)
    } catch {
      throw new ProviderError(
        `Malformed Mistral response: content is not valid JSON — ${message.content.slice(0, 200)}`,
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
        'Malformed Mistral response: expected { files: [...] } structure',
        this.name
      )
    }

    const files = (parsed as Record<string, unknown[]>).files as FileChange[]

    const summary =
      typeof (parsed as Record<string, unknown>).summary === 'string'
        ? ((parsed as Record<string, unknown>).summary as string)
        : undefined

    log.info(`Received ${files.length} file change(s) from Mistral`)

    return summary ? { files, summary } : { files }
  }
}
