/**
 * Custom error types for Prompt2PR.
 *
 * Each error class represents a distinct failure domain, enabling typed
 * catch handling and clear error messages in GitHub Actions output.
 *
 * Story 1.2: ConfigError implemented.
 * Story 1.3: ProviderError enhanced with provider/statusCode fields.
 *            GitError, GuardrailError, ParseError finalized.
 */

/**
 * Thrown when Action inputs are missing, invalid, or misconfigured.
 * Caught at the top level in main.ts to produce actionable error messages.
 */
export class ConfigError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ConfigError'
  }
}

/**
 * Thrown when an LLM provider API call fails.
 * Includes the provider name and optional HTTP status code for diagnostics.
 *
 * When `retryable` is `false`, the retry utility should **not** attempt
 * to re-execute the request (e.g., HTTP 429 rate limits that won't
 * resolve within a reasonable backoff window).
 */
export class ProviderError extends Error {
  constructor(
    message: string,
    public readonly provider: string,
    public readonly statusCode?: number,
    public readonly retryable: boolean = true
  ) {
    super(message)
    this.name = 'ProviderError'
  }
}

/**
 * Thrown when a git operation fails (branch, commit, push).
 */
export class GitError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'GitError'
  }
}

/**
 * Thrown when LLM-generated changes violate safety limits.
 */
export class GuardrailError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'GuardrailError'
  }
}

/**
 * Thrown when the LLM response cannot be parsed as valid JSON or
 * does not match the expected schema.
 */
export class ParseError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ParseError'
  }
}
