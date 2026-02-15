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
import type { FileContext } from './file-scanner.js'
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
 * Compute a simple line-level diff count between two strings.
 *
 * Uses the Myers-style longest-common-subsequence (LCS) approach to count
 * the number of added and removed lines. This gives the same result as a
 * unified diff with no context: each line that appears only in `oldText` is
 * a removal, and each line that appears only in `newText` is an addition.
 *
 * @returns The total number of changed lines (additions + deletions).
 */
function diffLineCount(oldText: string, newText: string): number {
  const oldLines = oldText.split('\n')
  const newLines = newText.split('\n')

  // Compute LCS length using a classic DP approach (O(m*n) space,
  // but files are capped at 1 MB so this is bounded).
  const m = oldLines.length
  const n = newLines.length

  // Optimise: use two rows instead of full matrix
  let prev = new Uint32Array(n + 1)
  let curr = new Uint32Array(n + 1)

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (oldLines[i - 1] === newLines[j - 1]) {
        curr[j] = prev[j - 1] + 1
      } else {
        curr[j] = Math.max(prev[j], curr[j - 1])
      }
    }
    // Swap rows
    ;[prev, curr] = [curr, prev]
    curr.fill(0)
  }

  const lcsLength = prev[n]

  // Changed lines = lines removed from old + lines added in new
  const removals = m - lcsLength
  const additions = n - lcsLength
  return removals + additions
}

/**
 * Count the total number of actually changed lines across all file changes
 * by diffing against the original scanned file contents.
 *
 * - **create**: All lines in the new content are additions (no original).
 * - **delete**: All lines in the original file are removals. If the original
 *   was not in the scanned set, counts as 1 (the deletion operation itself).
 * - **modify**: Computes a line-level diff between original and new content.
 *   If the original was not in the scanned set (e.g. file wasn't matched by
 *   the configured paths), falls back to counting all new lines.
 *
 * @param changes - The file changes to measure.
 * @param scannedFiles - The original file contents from the repository scan.
 * @returns Total changed line count across all changes.
 */
export function countLinesChanged(
  changes: FileChange[],
  scannedFiles: FileContext[] = []
): number {
  // Build a lookup map for O(1) access to original content
  const originalByPath = new Map<string, string>()
  for (const file of scannedFiles) {
    originalByPath.set(file.path, file.content)
  }

  let total = 0
  for (const change of changes) {
    if (change.action === 'create') {
      // New file — every line is an addition
      total += change.content.split('\n').length
    } else if (change.action === 'delete') {
      const original = originalByPath.get(change.path)
      if (original !== undefined) {
        // Count lines being removed
        total += original.split('\n').length
      } else {
        // Original not in scan set — count as 1 (the deletion itself)
        total += 1
      }
    } else {
      // modify
      const original = originalByPath.get(change.path)
      if (original !== undefined) {
        total += diffLineCount(original, change.content)
      } else {
        // Original not available — fall back to counting all new lines
        total += change.content.split('\n').length
      }
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
 * @param scannedFiles - Original file contents for diff-based change counting.
 * @returns The validated file changes (unchanged if all pass).
 * @throws {GuardrailError} If any limit is violated.
 */
export function validateChanges(
  changes: FileChange[],
  config: ActionConfig,
  scannedFiles: FileContext[] = []
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

    // Reject paths starting with '-' (could be interpreted as git flags)
    if (change.path.startsWith('-')) {
      throw new GuardrailError(
        `File '${change.path}' starts with '-', which could be interpreted as a command-line flag. ` +
          `All file paths must not begin with a hyphen.`
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
  const totalLines = countLinesChanged(changes, scannedFiles)
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
