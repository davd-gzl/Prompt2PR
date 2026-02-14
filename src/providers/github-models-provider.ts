/**
 * GitHub Models LLM provider for Prompt2PR.
 *
 * Extends `BaseOpenAICompatibleProvider` since the GitHub Models inference
 * API is OpenAI-compatible. The key differences are the base URL, endpoint
 * path, and model naming format (`publisher/model-name`).
 *
 * Authentication uses a GitHub token (PAT with `models:read` or `GITHUB_TOKEN`
 * in Actions with `models: read` permission).
 *
 * @see https://docs.github.com/en/github-models
 */

import { BaseOpenAICompatibleProvider } from './base-openai-compatible-provider.js'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_BASE_URL = 'https://models.github.ai'
const DEFAULT_MODEL = 'openai/gpt-4o'

// ---------------------------------------------------------------------------
// Provider implementation
// ---------------------------------------------------------------------------

/**
 * GitHub Models LLM provider.
 *
 * Sends chat completion requests to the GitHub Models inference API and
 * parses OpenAI-compatible responses into the shared `LLMResponse` format.
 */
export class GitHubModelsProvider extends BaseOpenAICompatibleProvider {
  readonly name = 'github'
  readonly defaultModel = DEFAULT_MODEL
  protected readonly endpointPath = '/inference/chat/completions'

  constructor(apiKey: string, baseUrl?: string) {
    super(apiKey, baseUrl || DEFAULT_BASE_URL, 'provider:github')
  }

  /** Override display name: 'github' → 'GitHub Models'. */
  protected override get displayName(): string {
    return 'GitHub Models'
  }
}
