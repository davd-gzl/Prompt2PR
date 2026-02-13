/**
 * Post-LLM guardrail enforcement for Prompt2PR.
 *
 * Validates LLM-generated file changes against safety limits before
 * any git operations are performed. Ensures `max_files`, `max_changes`,
 * `paths` scope, and `.github/` exclusion are enforced.
 *
 * @see _bmad-output/planning-artifacts/epics.md#Story 5.1
 */

import type { ActionConfig } from './config.js'
import { GuardrailError } from './errors.js'
import { createLogger } from './logger.js'
import type { FileChange } from './providers/types.js'

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

const log = createLogger('guardrails')

/**
 * Count the total number of lines changed across all file changes.
 * For creates/modifies, count the number of lines in the new content.
 * For deletes, count as 1 change (the deletion itself).
 */
function countLinesChanged(changes: FileChange[]): number {
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
 * Convert a simple glob pattern to a RegExp.
 * Supports `**` (match any path), `*` (match within segment), and `?` (match one char).
 */
function globToRegExp(pattern: string): RegExp {
  let regexStr = '^'
  let i = 0
  while (i < pattern.length) {
    const char = pattern[i]
    if (char === '*' && pattern[i + 1] === '*') {
      // ** matches any path segments
      regexStr += '.*'
      i += 2
      // Skip trailing slash after **
      if (pattern[i] === '/') i++
    } else if (char === '*') {
      // * matches anything except /
      regexStr += '[^/]*'
      i++
    } else if (char === '?') {
      regexStr += '[^/]'
      i++
    } else if (char === '.') {
      regexStr += '\\.'
      i++
    } else {
      regexStr += char
      i++
    }
  }
  regexStr += '$'
  return new RegExp(regexStr)
}

/**
 * Check if a file path matches any of the configured glob patterns.
 */
function matchesPatterns(filePath: string, patterns: string[]): boolean {
  return patterns.some((pattern) => globToRegExp(pattern).test(filePath))
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

  // --- Check .github/ exclusion (FR31) ---
  for (const change of changes) {
    if (change.path.startsWith('.github/') || change.path === '.github') {
      throw new GuardrailError(
        `File '${change.path}' targets the .github/ directory, which is always protected. ` +
          `The LLM must not modify files in .github/.`
      )
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
