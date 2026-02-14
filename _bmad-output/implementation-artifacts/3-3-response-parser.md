# Story 3.3: Response Parser — JSON to FileChanges

**Status:** complete

## Story

As a developer using the action, I want LLM responses parsed into a validated
list of file changes, So that malformed responses are caught before any git
operations.

## Key Implementation Details

### `src/response-parser.ts`

- `parseResponse(response: LLMResponse)` — primary entry point
  - Validates each `FileChange` entry in `response.files[]`:
    - `path` — must be a non-empty string
    - `content` — must be a string (empty string allowed)
    - `action` — must be one of `'modify' | 'create' | 'delete'`
  - Throws `ParseError` with index and field info for invalid entries
  - Empty `files[]` array is valid — signals no changes needed (FR4)
  - Passes through `summary` field from response unchanged
  - Logs change counts grouped by action type (e.g., "2 modify, 1 create")

- `parseRawResponse(raw: string)` — also exported
  - Parses a raw JSON string into an `LLMResponse`
  - Throws `ParseError` if JSON is malformed
  - Delegates to `parseResponse()` for validation

### Error Handling

- `ParseError` includes:
  - Index of the invalid entry in the files array
  - Name of the invalid field
  - Description of what was expected vs. received

### `__tests__/response-parser.test.ts`

- 23 tests covering:
  - Valid response with multiple file changes
  - Empty `files[]` array (no changes)
  - Missing required fields (`path`, `content`, `action`)
  - Invalid field types (number instead of string, etc.)
  - Invalid `action` values (e.g., `'rename'`)
  - Non-object entries in files array
  - Null entries in files array
  - Summary passthrough without modification
  - Raw JSON string parsing via `parseRawResponse()`

## Acceptance Criteria

All met:

1. Parses valid `LLMResponse` into validated `FileChange[]`
2. Throws `ParseError` with field-level detail for invalid entries
3. Empty files array is accepted as valid (no-op)
4. Summary passes through unchanged
5. `parseRawResponse()` handles raw JSON string input

## File List

- `src/response-parser.ts`
- `__tests__/response-parser.test.ts`
