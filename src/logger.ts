/**
 * Structured logger for Prompt2PR with component prefixes and secret masking.
 *
 * Every component creates its own logger via `createLogger('component')`.
 * All output is prefixed with `[component]` and delegates to `@actions/core`
 * logging functions. API keys are masked via `core.setSecret()` during
 * logger creation.
 *
 * No module should use `console.log` — only this logger.
 *
 * @see _bmad-output/planning-artifacts/architecture.md#Decision 6
 */

import * as core from '@actions/core'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Logger interface returned by `createLogger()`.
 * Mirrors the relevant `@actions/core` log methods with component prefixing.
 */
export interface Logger {
  /** Informational message — visible in Actions UI by default. */
  info(message: string): void
  /** Debug message — only visible when `ACTIONS_STEP_DEBUG=true`. */
  debug(message: string): void
  /** Warning message — creates an annotation in the Actions UI. */
  warn(message: string): void
  /** Error message — creates an annotation in the Actions UI. */
  error(message: string): void
}

// ---------------------------------------------------------------------------
// Main exported function
// ---------------------------------------------------------------------------

/**
 * Create a component-scoped logger.
 *
 * All log messages are prefixed with `[component]` for traceability.
 * Optionally masks secrets (API keys) via `core.setSecret()` during creation.
 *
 * @param component - The component name (e.g., 'scanner', 'provider:mistral', 'git').
 * @param secrets - Optional array of secret strings to mask in all log output.
 * @returns A Logger object with `info`, `debug`, `warn`, and `error` methods.
 *
 * @example
 * ```typescript
 * const log = createLogger('scanner')
 * log.info('Scanning files')   // Output: [scanner] Scanning files
 * log.debug('File loaded')     // Output: [scanner] File loaded (debug only)
 * ```
 */
export function createLogger(component: string, secrets?: string[]): Logger {
  // Mask any provided secrets (defense-in-depth for NFR4)
  if (secrets) {
    for (const secret of secrets) {
      if (secret) {
        core.setSecret(secret)
      }
    }
  }

  const prefix = `[${component}]`

  return {
    info(message: string): void {
      core.info(`${prefix} ${message}`)
    },
    debug(message: string): void {
      core.debug(`${prefix} ${message}`)
    },
    warn(message: string): void {
      core.warning(`${prefix} ${message}`)
    },
    error(message: string): void {
      core.error(`${prefix} ${message}`)
    }
  }
}
