# Story 2.2: Prompt Assembly with Context Window Management

## Status: complete

## Story

As a developer using the action, I want the user's prompt combined with scanned
file contents into a structured LLM request, So that the LLM has full context to
make informed code changes without exceeding token limits.

## Key Implementation Details

### `src/prompt-assembler.ts`

- Exports `buildPrompt(prompt, files, model)` which returns a `ChatRequest`
  containing system and user messages.
- **System message**: instructs the LLM to return strictly valid JSON in the
  shape `{ files: [{ path, content, action }] }`.
- **User message** is structured in two sections:
  1. **Repository Files** — each file's content is included with clear path
     delimiters.
  2. **Change Request** — the developer's prompt text.
- Exports `DEFAULT_MAX_CONTEXT_CHARS` defining the character budget for the
  context window.
- When the combined file content exceeds the budget:
  - Files are truncated to fit remaining capacity.
  - Files that cannot fit at all are excluded entirely.
  - Truncation and exclusion events are logged for transparency.

### `__tests__/prompt-assembler.test.ts`

13 tests covering:

- Normal assembly with files fitting within budget
- Truncation when a file partially exceeds the budget
- Complete exclusion when no budget remains
- Empty file array handling
- Prompt text formatting in the user message
- Budget overflow with many files
- System prompt contains JSON response format instructions
- File path delimiters are present and correct

## Acceptance Criteria

All criteria met:

| #   | Criterion                                          | Status |
| --- | -------------------------------------------------- | ------ |
| 1   | Returns `ChatRequest` with structured messages     | Done   |
| 2   | Respects context window limits                     | Done   |
| 3   | Files truncated/excluded when over budget          | Done   |
| 4   | JSON response format instructions in system prompt | Done   |
| 5   | File paths clearly delimited                       | Done   |

## File List

- `src/prompt-assembler.ts`
- `__tests__/prompt-assembler.test.ts`
