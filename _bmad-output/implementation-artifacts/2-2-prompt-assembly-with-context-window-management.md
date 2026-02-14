# Story 2.2: Prompt Assembly with Context Window Management

Status: done

## Story

As a developer using the action, I want the user's prompt combined with scanned
file contents into a structured LLM request, So that the LLM has full context to
make informed code changes without exceeding token limits.

## Acceptance Criteria

1. **Given** a user prompt string (FR1) and a `FileContext[]` from the file
   scanner **When** `buildPrompt()` in `src/prompt-assembler.ts` executes
   (FR2) **Then** it returns a `ChatRequest` object with the prompt and file
   contents structured for the LLM
2. The assembled content respects context window limits by tracking total
   character/token count (FR16)
3. If total content exceeds the limit, files are truncated or excluded with a
   logged warning
4. The prompt instructs the LLM to return changes as structured JSON:
   `{ files: [{ path, content, action }] }`
5. File paths and contents are clearly delimited in the prompt so the LLM can
   reference them
6. Tests in `__tests__/prompt-assembler.test.ts` cover: normal assembly,
   truncation, empty file list, and prompt formatting

## Tasks / Subtasks

- [x] Task 1: Define types and interfaces (AC: #1)
  - [x] 1.1: Define `ChatRequest` interface with fields: `systemPrompt: string`,
        `userMessage: string`, `model?: string`
  - [x] 1.2: Export `ChatRequest` type for use by provider implementations
  - [x] 1.3: Define `DEFAULT_MAX_CONTEXT_CHARS` constant for context window
        limit
- [x] Task 2: Create system prompt template (AC: #4)
  - [x] 2.1: Write system prompt instructing LLM to return JSON format
  - [x] 2.2: Specify expected JSON schema:
        `{ files: [{ path: string, content: string, action: "modify"|"create"|"delete" }] }`
  - [x] 2.3: Include examples of valid responses
  - [x] 2.4: Emphasize returning empty files array when no changes needed
- [x] Task 3: Implement `buildPrompt()` function (AC: #1, #2, #3, #5)
  - [x] 3.1: Accept parameters: `prompt: string`, `files: FileContext[]`,
        `model?: string`
  - [x] 3.2: Format user message with clear file delimiters
  - [x] 3.3: Include file path and content for each file
  - [x] 3.4: Track total character count as files are added
  - [x] 3.5: If approaching context limit, truncate files with warning message
  - [x] 3.6: If exceeding limit, exclude files with logged warning (AC: #3)
  - [x] 3.7: Append user prompt at end of user message
  - [x] 3.8: Return `ChatRequest` with systemPrompt and userMessage
  - [x] 3.9: Include optional model parameter if provided
- [x] Task 4: Handle edge cases (AC: #2, #3)
  - [x] 4.1: Handle empty file list (valid case, no context provided)
  - [x] 4.2: Handle very large files (truncate with warning)
  - [x] 4.3: Handle prompt exceeding context window (log warning, proceed with
        truncation)
  - [x] 4.4: Ensure total content stays under DEFAULT_MAX_CONTEXT_CHARS
- [x] Task 5: Write tests in `__tests__/prompt-assembler.test.ts` (AC: #6)
  - [x] 5.1: Test: returns ChatRequest with system and user messages
  - [x] 5.2: Test: includes system prompt with JSON response format
        instructions
  - [x] 5.3: Test: includes user prompt in user message
  - [x] 5.4: Test: includes file contents with clear delimiters
  - [x] 5.5: Test: includes multiple files in order
  - [x] 5.6: Test: returns valid ChatRequest with empty file list
  - [x] 5.7: Test: defaults model to empty string
  - [x] 5.8: Test: exports DEFAULT_MAX_CONTEXT_CHARS as positive number
  - [x] 5.9: Test: truncates file that partially fits within budget
  - [x] 5.10: Verify ≥80% coverage for prompt-assembler.ts

## Implementation Notes

- System prompt is carefully crafted to elicit structured JSON responses
- File contents are delimited with clear markers for LLM parsing
- Context window management prevents API errors from oversized requests
- Truncation strategy: include as many complete files as possible, then
  partially include next file if space allows
- Achieves 100% test coverage with 9 comprehensive test cases

## Verification

```bash
# Run prompt-assembler tests
npm test -- __tests__/prompt-assembler.test.ts

# Test suite passes with 9 tests
```

## Files Changed

- `src/prompt-assembler.ts` - Prompt assembler implementation with buildPrompt
  function and ChatRequest interface
- `__tests__/prompt-assembler.test.ts` - Prompt assembler tests (9 tests, 100%
  coverage)

## Related Requirements

- FR1: User can provide a plain-English prompt
- FR2: System can parse prompt and construct LLM request with file context
- FR16: System can track file sizes and manage context window limits

## Integration Points

- Uses `FileContext` from Story 2.1 (file-scanner)
- `ChatRequest` consumed by Story 3.1 (provider interface)
- System prompt defines contract for Story 3.3 (response parser)
