/**
 * Response parser for Prompt2PR.
 *
 * Parses and validates LLM responses into a typed `FileChange[]` array.
 * Ensures that malformed or unexpected responses are caught before any
 * git operations are performed.
 *
 * @see _bmad-output/planning-artifacts/epics.md#Story 3.3
 */

import { ParseError } from './errors.js'
import { createLogger } from './logger.js'
import type { FileChange, LLMResponse } from './providers/types.js'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Result of parsing an LLM response — validated file changes plus optional summary.
 */
export interface ParsedResponse {
  /** Validated file changes. */
  files: FileChange[]
  /** Optional AI-generated narrative summary (FR21). */
  summary?: string
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const VALID_ACTIONS = new Set(['modify', 'create', 'delete'])

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

const log = createLogger('response-parser')

/**
 * Validate a single file change entry from the LLM response.
 *
 * @throws {ParseError} If the entry is missing required fields or has wrong types.
 */
function validateFileChange(entry: unknown, index: number): FileChange {
  if (typeof entry !== 'object' || entry === null) {
    throw new ParseError(
      `Invalid file change at index ${index}: expected an object, got ${typeof entry}`
    )
  }

  const obj = entry as Record<string, unknown>

  // Validate 'path' field
  if (typeof obj.path !== 'string' || obj.path.trim() === '') {
    throw new ParseError(
      `Invalid file change at index ${index}: 'path' must be a non-empty string`
    )
  }

  // Validate 'content' field
  if (typeof obj.content !== 'string') {
    throw new ParseError(
      `Invalid file change at index ${index}: 'content' must be a string`
    )
  }

  // Validate 'action' field
  if (typeof obj.action !== 'string' || !VALID_ACTIONS.has(obj.action)) {
    throw new ParseError(
      `Invalid file change at index ${index}: 'action' must be one of: modify, create, delete. ` +
        `Got: '${String(obj.action)}'`
    )
  }

  return {
    path: obj.path,
    content: obj.content,
    action: obj.action as FileChange['action']
  }
}

// ---------------------------------------------------------------------------
// Main exported function
// ---------------------------------------------------------------------------

/**
 * Parse and validate an LLM response into a `ParsedResponse`.
 *
 * Accepts the `LLMResponse` returned by a provider's `chat()` method,
 * validates each file change entry, and returns a typed result including
 * any AI-generated summary. An empty `files` array is valid and signals
 * "no changes needed" (FR4).
 *
 * @param response - The LLM response from a provider.
 * @returns A validated parsed response with file changes and optional summary.
 * @throws {ParseError} If the response structure is invalid or any entry is malformed.
 */
export function parseResponse(response: LLMResponse): ParsedResponse {
  log.info(`Parsing response with ${response.files.length} file change(s)`)

  if (!Array.isArray(response.files)) {
    throw new ParseError('Invalid LLM response: "files" is not an array')
  }

  // Empty files array is valid — signals "no changes" (FR4)
  if (response.files.length === 0) {
    log.info('LLM returned no changes')
    return { files: [], summary: response.summary }
  }

  const validated: FileChange[] = []

  for (let i = 0; i < response.files.length; i++) {
    validated.push(validateFileChange(response.files[i], i))
  }

  log.info(
    `Validated ${validated.length} file change(s): ` +
      `${validated.filter((f) => f.action === 'modify').length} modify, ` +
      `${validated.filter((f) => f.action === 'create').length} create, ` +
      `${validated.filter((f) => f.action === 'delete').length} delete`
  )

  return { files: validated, summary: response.summary }
}

/**
 * Parse a raw JSON string into a validated `ParsedResponse`.
 *
 * Useful when working with raw response bodies that need both JSON parsing
 * and schema validation.
 *
 * @param rawJson - The raw JSON string from the LLM.
 * @returns A validated parsed response with file changes and optional summary.
 * @throws {ParseError} If the JSON is invalid or the structure is unexpected.
 */
export function parseRawResponse(rawJson: string): ParsedResponse {
  let parsed: unknown

  try {
    parsed = JSON.parse(rawJson)
  } catch {
    throw new ParseError(
      `Failed to parse LLM response as JSON: ${rawJson.slice(0, 200)}`
    )
  }

  if (typeof parsed !== 'object' || parsed === null) {
    throw new ParseError(
      `Invalid LLM response: expected an object, got ${typeof parsed}`
    )
  }

  if (
    !('files' in parsed) ||
    !Array.isArray((parsed as Record<string, unknown>).files)
  ) {
    throw new ParseError(
      'Invalid LLM response: expected { files: [...] } structure'
    )
  }

  return parseResponse(parsed as LLMResponse)
}
