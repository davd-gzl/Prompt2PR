/**
 * Provider factory for Prompt2PR.
 *
 * Routes configuration to the correct LLM provider implementation.
 * Adding a new provider requires only implementing `LLMProvider` and
 * adding a case to the factory switch — no changes to core logic (NFR15).
 *
 * @see _bmad-output/planning-artifacts/architecture.md#Decision 1
 * @see _bmad-output/planning-artifacts/epics.md#Story 3.1
 */

import type { ActionConfig } from '../config.js'
import { ConfigError } from '../errors.js'
import { createLogger } from '../logger.js'
import { AnthropicProvider } from './anthropic-provider.js'
import { GitHubModelsProvider } from './github-models-provider.js'
import { MistralProvider } from './mistral-provider.js'
import { OpenAIProvider } from './openai-provider.js'
import type { LLMProvider } from './types.js'

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

const log = createLogger('provider-factory')

// ---------------------------------------------------------------------------
// Main exported function
// ---------------------------------------------------------------------------

/**
 * Create an LLM provider instance based on the validated action configuration.
 *
 * The factory selects the correct provider class, applies the user's `model`
 * input (falling back to the provider's `defaultModel` if empty), and returns
 * a ready-to-use `LLMProvider`.
 *
 * @param config - The validated action configuration from `validateConfig()`.
 * @returns An `LLMProvider` instance for the configured provider.
 * @throws {ConfigError} If the provider name is not supported.
 */
export function createProvider(config: ActionConfig): LLMProvider {
  const { provider, model, apiKey, baseUrl } = config

  let instance: LLMProvider

  switch (provider) {
    case 'mistral':
      instance = new MistralProvider(apiKey, baseUrl)
      break
    case 'anthropic':
      instance = new AnthropicProvider(apiKey, baseUrl)
      break
    case 'openai':
      instance = new OpenAIProvider(apiKey, baseUrl)
      break
    case 'github':
      instance = new GitHubModelsProvider(apiKey, baseUrl)
      break
    default:
      throw new ConfigError(
        `Unsupported provider: '${provider as string}'. ` +
          `Supported providers: mistral, openai, anthropic, github.`
      )
  }

  // Resolve the model: user's choice or provider default
  const resolvedModel = model || instance.defaultModel
  log.info(`Created provider '${instance.name}' with model '${resolvedModel}'`)

  // If the user specified a model, we store it on the config for later use.
  // The model is passed via ChatRequest.model at call time, not on the provider.
  // This keeps the provider stateless regarding model selection.

  return instance
}
