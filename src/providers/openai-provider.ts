/**
 * OpenAI LLM provider for Prompt2PR.
 *
 * Extends `BaseOpenAICompatibleProvider` since the base class implements
 * the exact OpenAI chat completions API format.
 *
 * @see https://platform.openai.com/docs/api-reference/chat
 * @see _bmad-output/planning-artifacts/epics.md#Story 6.1
 */

import { BaseOpenAICompatibleProvider } from './base-openai-compatible-provider.js'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_BASE_URL = 'https://api.openai.com'
const DEFAULT_MODEL = 'gpt-4o'

// ---------------------------------------------------------------------------
// Provider implementation
// ---------------------------------------------------------------------------

/**
 * OpenAI LLM provider.
 *
 * Sends chat completion requests to OpenAI's API and parses responses
 * into the shared `LLMResponse` format.
 */
export class OpenAIProvider extends BaseOpenAICompatibleProvider {
  readonly name = 'openai'
  readonly defaultModel = DEFAULT_MODEL
  protected readonly endpointPath = '/v1/chat/completions'

  constructor(apiKey: string, baseUrl?: string) {
    super(apiKey, baseUrl || DEFAULT_BASE_URL, 'provider:openai')
  }

  /** Override display name: 'openai' → 'OpenAI' (not 'Openai'). */
  protected override get displayName(): string {
    return 'OpenAI'
  }
}
