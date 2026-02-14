/**
 * Unit tests for configuration validation — src/config.ts
 *
 * Tests cover: valid configs, missing/invalid inputs, parsing edge cases,
 * API key resolution, and secret masking.
 */
import { jest } from '@jest/globals'
import * as core from '../__fixtures__/core.js'

// Mock @actions/core before importing the module under test
jest.unstable_mockModule('@actions/core', () => core)

const {
  validateConfig,
  VALID_PROVIDERS,
  DEFAULT_MAX_FILES,
  DEFAULT_MAX_CHANGES
} = await import('../src/config.js')
const { ConfigError } = await import('../src/errors.js')

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Default env state for a valid Mistral configuration. */
const VALID_ENV = { MISTRAL_API_KEY: 'test-mistral-key-123' }

/**
 * Configure core.getInput / core.getBooleanInput mocks for a valid config.
 * Override individual inputs by passing a partial map.
 */
function mockValidInputs(overrides: Record<string, string> = {}): void {
  const inputs: Record<string, string> = {
    prompt: 'Fix all broken links in docs',
    provider: 'mistral',
    model: '',
    base_url: '',
    branch_prefix: 'prompt2pr/',
    max_files: '10',
    max_changes: '200',
    paths: '**',
    label: 'prompt2pr',
    dry_run: 'false',
    ...overrides
  }

  core.getInput.mockImplementation((name: string) => inputs[name] ?? '')
  core.getBooleanInput.mockImplementation((name: string) => {
    const val = inputs[name] ?? 'false'
    if (val === 'true') return true
    if (val === 'false') return false
    throw new TypeError(
      `Input does not meet YAML 1.2 "Core Schema" specification: ${name}`
    )
  })
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('config.ts — validateConfig()', () => {
  const originalEnv = process.env

  beforeEach(() => {
    // Isolate process.env per test
    process.env = { ...originalEnv, ...VALID_ENV }
  })

  afterEach(() => {
    process.env = originalEnv
    jest.resetAllMocks()
  })

  // -- 4.2: Valid config with all inputs ----------------------------------

  it('returns a fully populated ActionConfig when all inputs are valid', () => {
    mockValidInputs({
      prompt: 'Update copyright headers',
      provider: 'mistral',
      model: 'mistral-large-latest',
      paths: 'src/**,docs/**',
      max_files: '5',
      max_changes: '100',
      label: 'maintenance,prompt2pr',
      branch_prefix: 'auto/',
      dry_run: 'true',
      base_url: 'https://custom.api.example.com'
    })
    process.env.MISTRAL_API_KEY = 'sk-test-key'

    const config = validateConfig()

    expect(config).toEqual({
      prompt: 'Update copyright headers',
      provider: 'mistral',
      model: 'mistral-large-latest',
      paths: ['src/**', 'docs/**'],
      maxFiles: 5,
      maxChanges: 100,
      labels: ['maintenance', 'prompt2pr'],
      branchPrefix: 'auto/',
      dryRun: true,
      baseUrl: 'https://custom.api.example.com',
      apiKey: 'sk-test-key'
    })
  })

  // -- 4.3: Defaults for optional inputs ---------------------------------

  it('uses default values when only required inputs are provided', () => {
    mockValidInputs({
      prompt: 'Fix dead links',
      provider: 'mistral',
      model: '',
      base_url: '',
      branch_prefix: '',
      max_files: '',
      max_changes: '',
      paths: '',
      label: ''
    })

    const config = validateConfig()

    expect(config.model).toBe('')
    expect(config.baseUrl).toBe('')
    expect(config.branchPrefix).toBe('prompt2pr/')
    expect(config.maxFiles).toBe(DEFAULT_MAX_FILES)
    expect(config.maxChanges).toBe(DEFAULT_MAX_CHANGES)
    expect(config.paths).toEqual(['**'])
    expect(config.labels).toEqual(['prompt2pr'])
    expect(config.dryRun).toBe(false)
  })

  // -- 4.4: Missing prompt -----------------------------------------------

  it("throws ConfigError when 'prompt' is missing", () => {
    mockValidInputs({ prompt: '' })

    expect(() => validateConfig()).toThrow(ConfigError)
    expect(() => validateConfig()).toThrow(/prompt/)
  })

  // -- 4.5: Missing provider ----------------------------------------------

  it("throws ConfigError when 'provider' is missing", () => {
    mockValidInputs({ provider: '' })

    expect(() => validateConfig()).toThrow(ConfigError)
    expect(() => validateConfig()).toThrow(/provider/)
  })

  // -- 4.6: Invalid provider value ----------------------------------------

  it("throws ConfigError with valid options when 'provider' is invalid", () => {
    mockValidInputs({ provider: 'gemini' })

    expect(() => validateConfig()).toThrow(ConfigError)
    expect(() => validateConfig()).toThrow(/gemini/)
    expect(() => validateConfig()).toThrow(/mistral, openai, anthropic, github/)
  })

  // -- 4.7: max_files non-numeric -----------------------------------------

  it("throws ConfigError when 'max_files' is non-numeric", () => {
    mockValidInputs({ max_files: 'abc' })

    expect(() => validateConfig()).toThrow(ConfigError)
    expect(() => validateConfig()).toThrow(/max_files/)
  })

  // -- 4.8: max_files zero or negative ------------------------------------

  it("throws ConfigError when 'max_files' is zero", () => {
    mockValidInputs({ max_files: '0' })

    expect(() => validateConfig()).toThrow(ConfigError)
    expect(() => validateConfig()).toThrow(/max_files/)
  })

  it("throws ConfigError when 'max_files' is negative", () => {
    mockValidInputs({ max_files: '-5' })

    expect(() => validateConfig()).toThrow(ConfigError)
    expect(() => validateConfig()).toThrow(/max_files/)
  })

  // -- 4.9: max_changes non-numeric ---------------------------------------

  it("throws ConfigError when 'max_changes' is non-numeric", () => {
    mockValidInputs({ max_changes: 'xyz' })

    expect(() => validateConfig()).toThrow(ConfigError)
    expect(() => validateConfig()).toThrow(/max_changes/)
  })

  // -- 4.10: max_files empty string → default -----------------------------

  it("falls back to default when 'max_files' is empty string", () => {
    mockValidInputs({ max_files: '' })

    const config = validateConfig()

    expect(config.maxFiles).toBe(DEFAULT_MAX_FILES)
  })

  it("falls back to default when 'max_changes' is empty string", () => {
    mockValidInputs({ max_changes: '' })

    const config = validateConfig()

    expect(config.maxChanges).toBe(DEFAULT_MAX_CHANGES)
  })

  // -- 4.11: Missing API key ---------------------------------------------

  it('throws ConfigError naming the expected env var when API key is missing', () => {
    mockValidInputs({ provider: 'mistral' })
    delete process.env.MISTRAL_API_KEY

    expect(() => validateConfig()).toThrow(ConfigError)
    expect(() => validateConfig()).toThrow(/MISTRAL_API_KEY/)
  })

  it('throws ConfigError for missing OpenAI API key', () => {
    mockValidInputs({ provider: 'openai' })
    delete process.env.OPENAI_API_KEY

    expect(() => validateConfig()).toThrow(ConfigError)
    expect(() => validateConfig()).toThrow(/OPENAI_API_KEY/)
  })

  it('throws ConfigError for missing Anthropic API key', () => {
    mockValidInputs({ provider: 'anthropic' })
    delete process.env.ANTHROPIC_API_KEY

    expect(() => validateConfig()).toThrow(ConfigError)
    expect(() => validateConfig()).toThrow(/ANTHROPIC_API_KEY/)
  })

  it('throws ConfigError for missing GitHub token', () => {
    mockValidInputs({ provider: 'github' })
    delete process.env.GITHUB_TOKEN

    expect(() => validateConfig()).toThrow(ConfigError)
    expect(() => validateConfig()).toThrow(/GITHUB_TOKEN/)
  })

  // -- 4.12: Paths parsing -----------------------------------------------

  it('parses comma-separated paths with whitespace trimming', () => {
    mockValidInputs({ paths: ' src/** , docs/** , README.md ' })

    const config = validateConfig()

    expect(config.paths).toEqual(['src/**', 'docs/**', 'README.md'])
  })

  // -- 4.13: Label parsing ------------------------------------------------

  it("always includes 'prompt2pr' label even when not in input", () => {
    mockValidInputs({ label: 'maintenance,bugfix' })

    const config = validateConfig()

    expect(config.labels).toContain('prompt2pr')
    expect(config.labels).toEqual(['prompt2pr', 'maintenance', 'bugfix'])
  })

  it("does not duplicate 'prompt2pr' when already present in input", () => {
    mockValidInputs({ label: 'prompt2pr,maintenance' })

    const config = validateConfig()

    const count = config.labels.filter((l) => l === 'prompt2pr').length
    expect(count).toBe(1)
  })

  // -- 4.14: dry_run parsing ----------------------------------------------

  it("parses 'true' dry_run as boolean true", () => {
    mockValidInputs({ dry_run: 'true' })

    const config = validateConfig()

    expect(config.dryRun).toBe(true)
  })

  it("parses 'false' dry_run as boolean false", () => {
    mockValidInputs({ dry_run: 'false' })

    const config = validateConfig()

    expect(config.dryRun).toBe(false)
  })

  // -- 4.15: Optional base_url and model ----------------------------------

  it('defaults base_url and model to empty string', () => {
    mockValidInputs({ model: '', base_url: '' })

    const config = validateConfig()

    expect(config.model).toBe('')
    expect(config.baseUrl).toBe('')
  })

  // -- Secret masking (NFR4) ----------------------------------------------

  it('calls core.setSecret with the API key', () => {
    mockValidInputs()

    validateConfig()

    expect(core.setSecret).toHaveBeenCalledWith('test-mistral-key-123')
  })

  // -- VALID_PROVIDERS export ---------------------------------------------

  it('exports VALID_PROVIDERS with all four providers', () => {
    expect(VALID_PROVIDERS).toEqual([
      'mistral',
      'openai',
      'anthropic',
      'github'
    ])
  })
})
