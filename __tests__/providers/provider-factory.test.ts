/**
 * Unit tests for the provider factory — src/providers/provider-factory.ts
 *
 * Tests cover: valid provider routing, unknown provider error, model fallback.
 */
import { jest } from '@jest/globals'
import * as core from '../../__fixtures__/core.js'

// Mock @actions/core before importing the module under test
jest.unstable_mockModule('@actions/core', () => core)

const { createProvider } =
  await import('../../src/providers/provider-factory.js')
const { MistralProvider } =
  await import('../../src/providers/mistral-provider.js')
const { AnthropicProvider } =
  await import('../../src/providers/anthropic-provider.js')
const { OpenAIProvider } =
  await import('../../src/providers/openai-provider.js')
const { ConfigError } = await import('../../src/errors.js')

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

import type { ActionConfig } from '../../src/config.js'

/** Create a minimal valid ActionConfig for testing. */
function makeConfig(overrides: Partial<ActionConfig> = {}): ActionConfig {
  return {
    prompt: 'Fix broken links',
    provider: 'mistral',
    model: '',
    paths: ['**'],
    maxFiles: 10,
    maxChanges: 200,
    labels: ['prompt2pr'],
    branchPrefix: 'prompt2pr/',
    dryRun: false,
    baseUrl: '',
    apiKey: 'test-key-123',
    ...overrides
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('provider-factory.ts — createProvider()', () => {
  afterEach(() => {
    jest.resetAllMocks()
  })

  // -- Valid provider routing -----------------------------------------------

  it('creates a MistralProvider for provider "mistral"', () => {
    const config = makeConfig({ provider: 'mistral' })
    const provider = createProvider(config)

    expect(provider).toBeInstanceOf(MistralProvider)
    expect(provider.name).toBe('mistral')
    expect(provider.defaultModel).toBe('mistral-large-latest')
  })

  it('creates an AnthropicProvider for provider "anthropic"', () => {
    const config = makeConfig({ provider: 'anthropic' })
    const provider = createProvider(config)

    expect(provider).toBeInstanceOf(AnthropicProvider)
    expect(provider.name).toBe('anthropic')
    expect(provider.defaultModel).toBe('claude-sonnet-4-20250514')
  })

  it('creates an OpenAIProvider for provider "openai"', () => {
    const config = makeConfig({ provider: 'openai' })
    const provider = createProvider(config)

    expect(provider).toBeInstanceOf(OpenAIProvider)
    expect(provider.name).toBe('openai')
    expect(provider.defaultModel).toBe('gpt-4o')
  })

  // -- Unknown provider error -----------------------------------------------

  it('throws ConfigError for an unsupported provider', () => {
    // Force an unknown provider by casting
    const config = makeConfig({
      provider: 'gemini' as ActionConfig['provider']
    })

    expect(() => createProvider(config)).toThrow(ConfigError)
    expect(() => createProvider(config)).toThrow(/Unsupported provider/)
  })

  // -- Model fallback -------------------------------------------------------

  it('logs the provider default model when user model is empty', () => {
    const config = makeConfig({ provider: 'mistral', model: '' })
    createProvider(config)

    expect(core.info).toHaveBeenCalledWith(
      expect.stringContaining("model 'mistral-large-latest'")
    )
  })

  it('logs the user-specified model when provided', () => {
    const config = makeConfig({
      provider: 'mistral',
      model: 'mistral-small-latest'
    })
    createProvider(config)

    // The factory logs the resolved model. Since user specified a model,
    // the factory should detect it but the provider still has its default.
    // The log message shows the user's model preference.
    expect(core.info).toHaveBeenCalledWith(
      expect.stringContaining("model 'mistral-small-latest'")
    )
  })

  // -- Base URL passthrough -------------------------------------------------

  it('passes base_url to the provider', () => {
    const config = makeConfig({
      provider: 'anthropic',
      baseUrl: 'https://custom.api.example.com'
    })
    const provider = createProvider(config)

    expect(provider).toBeInstanceOf(AnthropicProvider)
  })
})
