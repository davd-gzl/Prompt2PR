/**
 * Base class for OpenAI-compatible LLM providers.
 *
 * Provides shared `chat()` and response parsing logic for providers
 * that use the OpenAI chat completions API format (choices → message → content).
 * Mistral, OpenAI, and GitHub Models all share this format; Anthropic does not.
 *
 * Subclasses override only:
 * - `name` — provider name for error messages
 * - `defaultModel` — fallback model identifier
 * - `endpointPath` — API path appended to base URL
 * - `formatApiError()` — provider-specific error body parsing (optional)
 *
 * Extracted to eliminate ~200 lines of duplicated code across 3 providers
 * (see code review Finding #1).
 */

import { ProviderError } from '../errors.js'
import { createLogger } from '../logger.js'
import type { ChatRequest, LLMResponse, FileChange } from './types.js'
import type { LLMProvider } from './types.js'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TIMEOUT_MS = 120_000 // 120 seconds (NFR2)

// ---------------------------------------------------------------------------
// Base class
// ---------------------------------------------------------------------------

/**
 * Base class for providers using the OpenAI chat completions API format.
 *
 * Response shape: `{ choices: [{ message: { content: "..." } }] }`
 */
export abstract class BaseOpenAICompatibleProvider implements LLMProvider {
  abstract readonly name: string
  abstract readonly defaultModel: string

  /** API path appended to base URL (e.g., '/v1/chat/completions'). */
  protected abstract readonly endpointPath: string

  protected readonly apiKey: string
  protected readonly baseUrl: string
  protected readonly log: ReturnType<typeof createLogger>

  constructor(apiKey: string, baseUrl: string, logComponent: string) {
    this.apiKey = apiKey
    this.baseUrl = baseUrl
    this.log = createLogger(logComponent)
  }

  /**
   * Format an API error response body into a descriptive message.
   *
   * Default implementation handles the OpenAI error format:
   * `{ error: { message: "..." } }`
   *
   * Override in subclasses for different error formats (e.g., Mistral uses
   * `{ message: "..." }` at the top level).
   */
  protected formatApiError(status: number, body: string): string {
    const prefix = `${this.displayName} API error (HTTP ${status})`

    try {
      const parsed: unknown = JSON.parse(body)
      if (
        typeof parsed === 'object' &&
        parsed !== null &&
        'error' in parsed &&
        typeof (parsed as Record<string, unknown>).error === 'object'
      ) {
        const errorObj = (parsed as Record<string, Record<string, unknown>>)
          .error
        if (typeof errorObj.message === 'string') {
          return `${prefix}: ${errorObj.message}`
        }
      }
    } catch {
      // Body is not JSON — use raw body
    }

    return `${prefix}: ${body.slice(0, 200)}`
  }

  /** Human-readable display name for error messages (e.g., "Mistral", "OpenAI"). */
  protected get displayName(): string {
    return this.name.charAt(0).toUpperCase() + this.name.slice(1)
  }

  /**
   * Send a chat completion request to the provider's API.
   *
   * @param request - The chat request with model and messages.
   * @returns The parsed LLM response containing file changes.
   * @throws {ProviderError} On API errors, timeouts, or malformed responses.
   */
  async chat(request: ChatRequest): Promise<LLMResponse> {
    const model = request.model || this.defaultModel
    const url = `${this.baseUrl}${this.endpointPath}`

    this.log.info(`Sending request to ${url} with model '${model}'`)

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
          `${this.displayName} API request timed out after ${TIMEOUT_MS / 1000} seconds`,
          this.name
        )
      }
      if (error instanceof TypeError) {
        throw new ProviderError(
          `${this.displayName} API network error: ${error.message}`,
          this.name
        )
      }
      throw new ProviderError(
        `${this.displayName} API request failed: ${String(error)}`,
        this.name
      )
    }

    if (!response.ok) {
      const errorBody = await response.text()
      const message = this.formatApiError(response.status, errorBody)

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

    this.log.debug(
      `Raw response: ${JSON.stringify(responseBody).slice(0, 500)}`
    )

    return this.parseResponse(responseBody)
  }

  /**
   * Transform the OpenAI-compatible response format into the shared LLMResponse.
   *
   * Response shape: `{ choices: [{ message: { content: "..." } }] }`
   */
  private parseResponse(body: unknown): LLMResponse {
    if (
      typeof body !== 'object' ||
      body === null ||
      !('choices' in body) ||
      !Array.isArray((body as Record<string, unknown>).choices)
    ) {
      throw new ProviderError(
        `Malformed ${this.displayName} response: missing "choices" array`,
        this.name
      )
    }

    const choices = (body as Record<string, unknown[]>).choices
    if (choices.length === 0) {
      throw new ProviderError(
        `Malformed ${this.displayName} response: empty "choices" array`,
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
        `Malformed ${this.displayName} response: missing "message" in first choice`,
        this.name
      )
    }

    const message = firstChoice.message as Record<string, unknown>
    if (typeof message.content !== 'string') {
      throw new ProviderError(
        `Malformed ${this.displayName} response: "content" is not a string`,
        this.name
      )
    }

    // Parse the JSON content from the LLM
    let parsed: unknown
    try {
      parsed = JSON.parse(message.content)
    } catch {
      throw new ProviderError(
        `Malformed ${this.displayName} response: content is not valid JSON (raw content redacted for security)`,
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
        `Malformed ${this.displayName} response: expected { files: [...] } structure`,
        this.name
      )
    }

    const files = (parsed as Record<string, unknown[]>).files as FileChange[]

    const summary =
      typeof (parsed as Record<string, unknown>).summary === 'string'
        ? ((parsed as Record<string, unknown>).summary as string)
        : undefined

    this.log.info(
      `Received ${files.length} file change(s) from ${this.displayName}`
    )

    return summary ? { files, summary } : { files }
  }
}
