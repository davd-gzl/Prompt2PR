/**
 * Configuration validation and input parsing for Prompt2PR.
 *
 * This is the ONLY module that calls `core.getInput()` / `core.getBooleanInput()`.
 * All other modules receive a typed `ActionConfig` object as a parameter.
 *
 * @see _bmad-output/planning-artifacts/architecture.md#Decision 5
 */

import * as core from '@actions/core'

import { ConfigError } from './errors.js'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Valid LLM provider names.
 */
export const VALID_PROVIDERS = [
  'mistral',
  'openai',
  'anthropic',
  'github'
] as const

/**
 * Union type derived from VALID_PROVIDERS.
 */
export type ProviderName = (typeof VALID_PROVIDERS)[number]

/**
 * Fully validated and typed action configuration.
 * Returned by `validateConfig()` and passed to all downstream modules.
 */
export interface ActionConfig {
  /** The plain-English prompt describing what changes to make. */
  prompt: string
  /** The LLM provider to use. */
  provider: ProviderName
  /** Model identifier (empty string = use provider default). */
  model: string
  /** Glob patterns for files to include as LLM context. */
  paths: string[]
  /** Maximum number of files the LLM is allowed to modify. */
  maxFiles: number
  /** Maximum total lines changed across all files. */
  maxChanges: number
  /** Labels to apply to the created PR (always includes 'prompt2pr'). */
  labels: string[]
  /** Prefix for the branch name created for the PR. */
  branchPrefix: string
  /** When true, skip branch creation and PR submission. */
  dryRun: boolean
  /** Override base URL for the LLM provider API. */
  baseUrl: string
  /** API key for the configured LLM provider. */
  apiKey: string
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const DEFAULT_MAX_FILES = 10
export const DEFAULT_MAX_CHANGES = 200
const DEFAULT_BRANCH_PREFIX = 'prompt2pr/'
const DEFAULT_LABEL = 'prompt2pr'

/**
 * Maps each provider name to its expected environment variable for the API key.
 */
const API_KEY_ENV_VARS: Record<ProviderName, string> = {
  mistral: 'MISTRAL_API_KEY',
  openai: 'OPENAI_API_KEY',
  anthropic: 'ANTHROPIC_API_KEY',
  github: 'GITHUB_TOKEN'
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Type guard to narrow a string to a valid ProviderName.
 */
function isValidProvider(value: string): value is ProviderName {
  return (VALID_PROVIDERS as readonly string[]).includes(value)
}

/**
 * Parse a string as a positive integer. Returns the default if the value is
 * empty. Throws ConfigError for non-numeric or non-positive values.
 */
function parsePositiveInt(
  value: string,
  name: string,
  defaultValue: number
): number {
  const trimmed = value.trim()

  if (trimmed === '') {
    return defaultValue
  }

  const parsed = Number(trimmed)

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new ConfigError(
      `Invalid value for '${name}': '${value}'. Must be a positive integer.`
    )
  }

  return parsed
}

/**
 * Parse a comma-separated string into a trimmed, non-empty string array.
 */
function parseCommaSeparated(value: string): string[] {
  return value
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
}

// ---------------------------------------------------------------------------
// Main exported function
// ---------------------------------------------------------------------------

/**
 * Validate and parse all Action inputs into a typed ActionConfig.
 *
 * This function is the single source of truth for configuration. It reads
 * inputs via `@actions/core`, validates them, and returns a fully typed object.
 * Any validation failure throws a `ConfigError` with a descriptive message.
 *
 * @throws {ConfigError} If any required input is missing or any input is invalid.
 */
export function validateConfig(): ActionConfig {
  // --- Required inputs ---

  const prompt = core.getInput('prompt', { required: true })
  if (!prompt) {
    throw new ConfigError(
      "Missing required input: 'prompt'. Provide a plain-English prompt describing what changes to make."
    )
  }

  const providerRaw = core.getInput('provider', { required: true })
  if (!providerRaw) {
    throw new ConfigError(
      "Missing required input: 'provider'. Supported values: mistral, openai, anthropic, github."
    )
  }

  if (!isValidProvider(providerRaw)) {
    throw new ConfigError(
      `Invalid provider: '${providerRaw}'. Supported values: ${VALID_PROVIDERS.join(', ')}.`
    )
  }
  const provider: ProviderName = providerRaw

  // --- Optional inputs with defaults ---

  const model = core.getInput('model')
  const baseUrl = core.getInput('base_url')
  const branchPrefix = core.getInput('branch_prefix') || DEFAULT_BRANCH_PREFIX

  const maxFiles = parsePositiveInt(
    core.getInput('max_files'),
    'max_files',
    DEFAULT_MAX_FILES
  )

  const maxChanges = parsePositiveInt(
    core.getInput('max_changes'),
    'max_changes',
    DEFAULT_MAX_CHANGES
  )

  // --- Paths ---

  const pathsRaw = core.getInput('paths')
  const paths = pathsRaw ? parseCommaSeparated(pathsRaw) : ['**']

  // --- Labels (always include 'prompt2pr') ---

  const labelRaw = core.getInput('label')
  const labels = labelRaw ? parseCommaSeparated(labelRaw) : []
  if (!labels.includes(DEFAULT_LABEL)) {
    labels.unshift(DEFAULT_LABEL)
  }

  // --- Boolean inputs ---

  const dryRun = core.getBooleanInput('dry_run')

  // --- API key from environment ---

  const envVar = API_KEY_ENV_VARS[provider]
  const apiKey = process.env[envVar] ?? ''

  if (!apiKey) {
    throw new ConfigError(
      `Missing API key: environment variable '${envVar}' is not set. ` +
        `Add it as a GitHub Secret and pass it via the 'env' block in your workflow YAML.`
    )
  }

  // Mask the API key so it never appears in logs (NFR4 defense-in-depth)
  core.setSecret(apiKey)

  return {
    prompt,
    provider,
    model,
    paths,
    maxFiles,
    maxChanges,
    labels,
    branchPrefix,
    dryRun,
    baseUrl,
    apiKey
  }
}
