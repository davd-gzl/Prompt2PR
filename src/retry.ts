/**
 * Centralized retry utility for Prompt2PR.
 *
 * Wraps any async operation with configurable retry count and backoff.
 * Used primarily for LLM provider API calls (NFR14: retry once, 5s backoff).
 *
 * @see _bmad-output/planning-artifacts/architecture.md#Decision 4
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Configuration options for the retry wrapper.
 */
export interface RetryOptions {
  /** Number of retry attempts after the initial failure. Default: 1. */
  retries?: number
  /** Milliseconds to wait between retries. Default: 5000. */
  backoffMs?: number
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_RETRIES = 1
const DEFAULT_BACKOFF_MS = 5_000

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Sleep for the given number of milliseconds.
 * Extracted for testability (can be mocked in tests).
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// ---------------------------------------------------------------------------
// Main exported function
// ---------------------------------------------------------------------------

/**
 * Retry an async function with configurable attempts and backoff.
 *
 * On failure, retries the function up to `retries` times, waiting
 * `backoffMs` between attempts. On final failure, re-throws the
 * **original error** (preserving its type — e.g., ProviderError).
 *
 * @param fn - The async function to execute and potentially retry.
 * @param options - Retry configuration (retries, backoffMs).
 * @returns The result of `fn` on success.
 * @throws The original error from the last failed attempt.
 *
 * @example
 * ```typescript
 * const response = await withRetry(
 *   () => provider.chat(request),
 *   { retries: 1, backoffMs: 5000 }
 * )
 * ```
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const { retries = DEFAULT_RETRIES, backoffMs = DEFAULT_BACKOFF_MS } = options

  let lastError: unknown

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error

      // If we have retries remaining, wait and try again
      if (attempt < retries) {
        await sleep(backoffMs)
      }
    }
  }

  // Re-throw the original error (preserves error type, e.g., ProviderError)
  throw lastError
}
