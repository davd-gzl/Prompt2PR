/**
 * Mistral LLM provider for Prompt2PR.
 *
 * Extends `BaseOpenAICompatibleProvider` since Mistral uses the same
 * chat completions API format as OpenAI (choices → message → content).
 *
 * The only Mistral-specific difference is the error body format:
 * Mistral uses `{ message: "..." }` at the top level instead of
 * OpenAI's `{ error: { message: "..." } }`.
 *
 * @see https://docs.mistral.ai/api/#tag/chat
 * @see _bmad-output/planning-artifacts/epics.md#Story 3.2
 */

import { BaseOpenAICompatibleProvider } from './base-openai-compatible-provider.js'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_BASE_URL = 'https://api.mistral.ai'
const DEFAULT_MODEL = 'mistral-large-latest'

// ---------------------------------------------------------------------------
// Provider implementation
// ---------------------------------------------------------------------------

/**
 * Mistral LLM provider.
 *
 * Sends chat completion requests to Mistral's API and parses responses
 * into the shared `LLMResponse` format.
 */
export class MistralProvider extends BaseOpenAICompatibleProvider {
  readonly name = 'mistral'
  readonly defaultModel = DEFAULT_MODEL
  protected readonly endpointPath = '/v1/chat/completions'

  constructor(apiKey: string, baseUrl?: string) {
    super(apiKey, baseUrl || DEFAULT_BASE_URL, 'provider:mistral')
  }

  /**
   * Override error formatting for Mistral's error body format.
   *
   * Mistral returns `{ message: "..." }` at the top level,
   * not `{ error: { message: "..." } }` like OpenAI.
   */
  protected override formatApiError(status: number, body: string): string {
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

  /** Override display name since 'mistral' → 'Mistral' is correct but
   *  the base class capitalizes generically. Keep explicit for clarity. */
  protected override get displayName(): string {
    return 'Mistral'
  }
}
