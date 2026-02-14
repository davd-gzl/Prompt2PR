/**
 * Post-LLM guardrail enforcement for Prompt2PR.
 *
 * Validates LLM-generated file changes against safety limits before
 * any git operations are performed. Ensures `max_files`, `max_changes`,
 * `paths` scope, `.github/` exclusion, and per-file size limits are enforced.
 *
 * @see _bmad-output/planning-artifacts/epics.md#Story 5.1
 */

import * as path from 'node:path'

import picomatch from 'picomatch'

import type { ActionConfig } from './config.js'
import { GuardrailError } from './errors.js'
import { createLogger } from './logger.js'
import type { FileChange } from './providers/types.js'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * Maximum allowed content size per file (1 MB).
 * Prevents resource exhaustion from LLM responses containing extremely
 * large single-line content that would pass the line-count check.
 */
const MAX_FILE_CONTENT_BYTES = 1_048_576

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

const log = createLogger('guardrails')

/**
 * Count the total number of output lines across all file changes.
 *
 * **Important:** This counts the total line count of the new file content,
 * NOT the number of lines that differ from the original. A one-line edit to
 * a 500-line file counts as 500 lines. This is because the LLM returns full
 * file content, not diffs, so we cannot compute a true diff without the
 * original file contents (which are not passed through to this layer).
 *
 * For deletes, each deletion counts as 1 change (the deletion itself).
 *
 * @param changes - The file changes to measure.
 * @returns Total output line count across all changes.
 */
export function countLinesChanged(changes: FileChange[]): number {
  let total = 0
  for (const change of changes) {
    if (change.action === 'delete') {
      total += 1
    } else {
      // Count lines in the new content
      const lines = change.content.split('\n').length
      total += lines
    }
  }
  return total
}

/**
 * Check if a file path matches any of the configured glob patterns.
 *
 * Uses `picomatch` for correct handling of brace expansion, character classes,
 * extglobs, and edge cases that the previous homebrew `globToRegExp` missed.
 * Dot-files are matched by default since repository paths frequently include
 * them (e.g. `.eslintrc.json`).
 */
function matchesPatterns(filePath: string, patterns: string[]): boolean {
  return patterns.some((pattern) =>
    picomatch.isMatch(filePath, pattern, { dot: true })
  )
}

// ---------------------------------------------------------------------------
// Main exported function
// ---------------------------------------------------------------------------

/**
 * Validate LLM-generated file changes against safety limits.
 *
 * Checks are performed in this order:
 * 1. `.github/` exclusion (FR31) — absolute, cannot be overridden
 * 2. `paths` scope (FR29) — files must match configured patterns
 * 3. `max_files` limit (FR14, FR30)
 * 4. `max_changes` limit (FR15, FR30)
 *
 * @param changes - The file changes from the response parser.
 * @param config - The validated action configuration.
 * @returns The validated file changes (unchanged if all pass).
 * @throws {GuardrailError} If any limit is violated.
 */
export function validateChanges(
  changes: FileChange[],
  config: ActionConfig
): FileChange[] {
  log.info(`Validating ${changes.length} file change(s) against guardrails`)

  // --- Check path traversal (security) ---
  for (const change of changes) {
    // Reject absolute paths
    if (path.isAbsolute(change.path)) {
      throw new GuardrailError(
        `File '${change.path}' is an absolute path. ` +
          `All file paths must be relative to the repository root.`
      )
    }

    // Reject paths containing '..' segments (directory traversal)
    const normalized = path.normalize(change.path)
    const segments = normalized.split(/[/\\]/)
    if (segments.includes('..')) {
      throw new GuardrailError(
        `File '${change.path}' contains path traversal ('..') and would escape the repository root. ` +
          `All file paths must resolve within the repository.`
      )
    }
  }

  // --- Check .github/ exclusion (FR31) — case-insensitive for safety ---
  for (const change of changes) {
    const lowerPath = change.path.toLowerCase()
    if (lowerPath.startsWith('.github/') || lowerPath === '.github') {
      throw new GuardrailError(
        `File '${change.path}' targets the .github/ directory, which is always protected. ` +
          `The LLM must not modify files in .github/.`
      )
    }
  }

  // --- Check per-file content size (resource exhaustion prevention) ---
  for (const change of changes) {
    if (change.action !== 'delete') {
      const contentBytes = new TextEncoder().encode(change.content).length
      if (contentBytes > MAX_FILE_CONTENT_BYTES) {
        throw new GuardrailError(
          `File '${change.path}' content is ${contentBytes} bytes, ` +
            `which exceeds the per-file limit of ${MAX_FILE_CONTENT_BYTES} bytes (1 MB). ` +
            `This may indicate a malformed LLM response.`
        )
      }
    }
  }

  // --- Check paths scope (FR29) ---
  for (const change of changes) {
    if (!matchesPatterns(change.path, config.paths)) {
      throw new GuardrailError(
        `File '${change.path}' is outside the configured paths scope. ` +
          `Allowed patterns: ${config.paths.join(', ')}. ` +
          `The LLM must not modify files outside the scoped paths.`
      )
    }
  }

  // --- Check max_files limit (FR14, FR30) ---
  if (changes.length > config.maxFiles) {
    throw new GuardrailError(
      `LLM response contains ${changes.length} file change(s), ` +
        `which exceeds the max_files limit of ${config.maxFiles}. ` +
        `Increase the 'max_files' input or ask the LLM to change fewer files.`
    )
  }

  // --- Check max_changes limit (FR15, FR30) ---
  const totalLines = countLinesChanged(changes)
  if (totalLines > config.maxChanges) {
    throw new GuardrailError(
      `LLM response contains ${totalLines} total lines changed, ` +
        `which exceeds the max_changes limit of ${config.maxChanges}. ` +
        `Increase the 'max_changes' input or ask the LLM to make smaller changes.`
    )
  }

  log.info(
    `Guardrails passed: ${changes.length} file(s), ${totalLines} line(s) changed`
  )

  return changes
}
