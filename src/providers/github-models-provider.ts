/**
 * GitHub Models LLM provider for Prompt2PR.
 *
 * Implements the `LLMProvider` interface for the GitHub Models inference API.
 * The API is OpenAI-compatible but uses a different base URL and endpoint path.
 * Models are referenced with a `publisher/model-name` format (e.g. `openai/gpt-4o`).
 *
 * Authentication uses a GitHub token (PAT with `models:read` or `GITHUB_TOKEN`
 * in Actions with `models: read` permission).
 *
 * @see https://docs.github.com/en/github-models
 */

import { ProviderError } from '../errors.js'
import { createLogger } from '../logger.js'
import type { ChatRequest, LLMResponse, FileChange } from './types.js'
import type { LLMProvider } from './types.js'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_BASE_URL = 'https://models.github.ai'
const ENDPOINT_PATH = '/inference/chat/completions'
const DEFAULT_MODEL = 'openai/gpt-4o'
const TIMEOUT_MS = 120_000 // 120 seconds (NFR2)

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

const log = createLogger('provider:github')

/**
 * Map GitHub Models API error responses to descriptive messages.
 */
function formatApiError(status: number, body: string): string {
  const prefix = `GitHub Models API error (HTTP ${status})`

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
 * GitHub Models LLM provider.
 *
 * Sends chat completion requests to the GitHub Models inference API and
 * parses OpenAI-compatible responses into the shared `LLMResponse` format.
 */
export class GitHubModelsProvider implements LLMProvider {
  readonly name = 'github'
  readonly defaultModel = DEFAULT_MODEL

  private readonly apiKey: string
  private readonly baseUrl: string

  constructor(apiKey: string, baseUrl?: string) {
    this.apiKey = apiKey
    this.baseUrl = baseUrl || DEFAULT_BASE_URL
  }

  /**
   * Send a chat completion request to GitHub Models API.
   *
   * @param request - The chat request with model and messages.
   * @returns The parsed LLM response containing file changes.
   * @throws {ProviderError} On API errors, timeouts, or malformed responses.
   */
  async chat(request: ChatRequest): Promise<LLMResponse> {
    const model = request.model || this.defaultModel
    const url = `${this.baseUrl}${ENDPOINT_PATH}`

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
          `GitHub Models API request timed out after ${TIMEOUT_MS / 1000} seconds`,
          this.name
        )
      }
      if (error instanceof TypeError) {
        throw new ProviderError(
          `GitHub Models API network error: ${error.message}`,
          this.name
        )
      }
      throw new ProviderError(
        `GitHub Models API request failed: ${String(error)}`,
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
   * Transform the OpenAI-compatible response format into the shared LLMResponse.
   */
  private parseResponse(body: unknown): LLMResponse {
    // Response shape (OpenAI-compatible):
    // { choices: [{ message: { content: "..." } }] }
    if (
      typeof body !== 'object' ||
      body === null ||
      !('choices' in body) ||
      !Array.isArray((body as Record<string, unknown>).choices)
    ) {
      throw new ProviderError(
        'Malformed GitHub Models response: missing "choices" array',
        this.name
      )
    }

    const choices = (body as Record<string, unknown[]>).choices
    if (choices.length === 0) {
      throw new ProviderError(
        'Malformed GitHub Models response: empty "choices" array',
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
        'Malformed GitHub Models response: missing "message" in first choice',
        this.name
      )
    }

    const message = firstChoice.message as Record<string, unknown>
    if (typeof message.content !== 'string') {
      throw new ProviderError(
        'Malformed GitHub Models response: "content" is not a string',
        this.name
      )
    }

    // Parse the JSON content from the LLM
    let parsed: unknown
    try {
      parsed = JSON.parse(message.content)
    } catch {
      throw new ProviderError(
        `Malformed GitHub Models response: content is not valid JSON — ${message.content.slice(0, 200)}`,
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
        'Malformed GitHub Models response: expected { files: [...] } structure',
        this.name
      )
    }

    const files = (parsed as Record<string, unknown[]>).files as FileChange[]

    const summary =
      typeof (parsed as Record<string, unknown>).summary === 'string'
        ? ((parsed as Record<string, unknown>).summary as string)
        : undefined

    log.info(`Received ${files.length} file change(s) from GitHub Models`)

    return summary ? { files, summary } : { files }
  }
}
