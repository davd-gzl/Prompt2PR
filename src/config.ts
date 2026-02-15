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
  /** The prompt describing what changes to make. */
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
const MAX_FILES_UPPER_BOUND = 1000
const MAX_CHANGES_UPPER_BOUND = 100_000
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
  defaultValue: number,
  upperBound?: number
): number {
  const trimmed = value.trim()

  if (trimmed === '') {
    return defaultValue
  }

  // Strict integer format: reject scientific notation, floats, etc.
  if (!/^\d+$/.test(trimmed)) {
    throw new ConfigError(
      `Invalid value for '${name}': '${value}'. Must be a positive integer (digits only).`
    )
  }

  const parsed = Number(trimmed)

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new ConfigError(
      `Invalid value for '${name}': '${value}'. Must be a positive integer.`
    )
  }

  if (upperBound !== undefined && parsed > upperBound) {
    throw new ConfigError(
      `Invalid value for '${name}': ${parsed} exceeds the maximum allowed value of ${upperBound}.`
    )
  }

  return parsed
}

/**
 * Known LLM provider base URL domains. When `base_url` is set, its hostname
 * must either match one of these or be explicitly trusted by the user.
 * Blocking arbitrary URLs prevents SSRF and API-key exfiltration.
 */
const ALLOWED_BASE_URL_HOSTS = new Set([
  'api.mistral.ai',
  'api.openai.com',
  'api.anthropic.com',
  'models.github.ai',
  'models.inference.ai.azure.com'
])

/**
 * Validate a base URL for security: must be HTTPS and resolve to
 * a known LLM provider host. Blocks SSRF, credential exfiltration to
 * arbitrary endpoints, and plaintext-over-HTTP transmission.
 *
 * Self-hosted / proxy URLs can be allowed by adding the hostname to
 * the `allowed_hosts` action input (comma-separated).
 *
 * @throws {ConfigError} If the URL is malformed, not HTTPS, or targets
 *   an untrusted host.
 */
function validateBaseUrl(baseUrl: string, allowedHostsInput: string): void {
  let parsed: URL
  try {
    parsed = new URL(baseUrl)
  } catch {
    throw new ConfigError(
      `Invalid 'base_url': '${baseUrl}' is not a valid URL.`
    )
  }

  // Enforce HTTPS — API keys must never travel in plaintext
  if (parsed.protocol !== 'https:') {
    throw new ConfigError(
      `Invalid 'base_url': scheme must be 'https', got '${parsed.protocol.replace(':', '')}'. ` +
        `API keys must not be sent over unencrypted connections.`
    )
  }

  // Build the full allowlist: built-in providers + user-defined hosts
  const allowedHosts = new Set(ALLOWED_BASE_URL_HOSTS)
  const extraHosts = allowedHostsInput
    .split(',')
    .map((h) => h.trim().toLowerCase())
    .filter((h) => h.length > 0)
  for (const host of extraHosts) {
    allowedHosts.add(host)
  }

  const hostname = parsed.hostname.toLowerCase()

  if (!allowedHosts.has(hostname)) {
    throw new ConfigError(
      `Invalid 'base_url': host '${hostname}' is not a recognised LLM provider. ` +
        `Allowed hosts: ${[...allowedHosts].join(', ')}. ` +
        `For self-hosted endpoints, add the hostname to the 'allowed_hosts' action input.`
    )
  }
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
      "Missing required input: 'prompt'. Provide a prompt describing what changes to make."
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

  // Sanitize model name — only allow safe characters (alphanumeric, hyphens,
  // dots, slashes, underscores, colons) to prevent parameter injection.
  if (model && !/^[a-zA-Z0-9._/:@-]+$/.test(model)) {
    throw new ConfigError(
      `Invalid 'model': '${model}'. Model names may only contain ` +
        `alphanumeric characters, hyphens, dots, slashes, underscores, colons, and @.`
    )
  }

  const baseUrl = core.getInput('base_url')
  const allowedHosts = core.getInput('allowed_hosts')

  // Validate base_url if provided (SSRF + credential-exfiltration prevention)
  if (baseUrl) {
    validateBaseUrl(baseUrl, allowedHosts)
  }

  const branchPrefix = core.getInput('branch_prefix') || DEFAULT_BRANCH_PREFIX

  // Sanitize branch prefix — only allow safe git ref characters
  if (!/^[a-zA-Z0-9._/-]+$/.test(branchPrefix)) {
    throw new ConfigError(
      `Invalid 'branch_prefix': '${branchPrefix}'. ` +
        `Branch prefixes may only contain alphanumeric characters, hyphens, dots, underscores, and slashes.`
    )
  }

  const maxFiles = parsePositiveInt(
    core.getInput('max_files'),
    'max_files',
    DEFAULT_MAX_FILES,
    MAX_FILES_UPPER_BOUND
  )

  const maxChanges = parsePositiveInt(
    core.getInput('max_changes'),
    'max_changes',
    DEFAULT_MAX_CHANGES,
    MAX_CHANGES_UPPER_BOUND
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
