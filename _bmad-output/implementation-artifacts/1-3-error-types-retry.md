# Story 1.3: Custom Error Types & Retry Utility

Status: complete

## Story

As a developer implementing the action, I want typed error classes and a
centralized retry wrapper, So that every failure is identifiable by type and
retryable operations have consistent behavior.

## Acceptance Criteria

1. Each error class extends `Error` with a descriptive `name` property
2. `ProviderError` includes `provider` and optional `statusCode` fields
3. `withRetry` retries once on failure, waits backoff, re-throws on second
   failure
4. `withRetry` propagates the original error type (not a generic `Error`)
5. Tests cover all error constructors and retry paths with >=80% coverage

## Tasks / Subtasks

- [x] Task 1: Flesh out error classes in `src/errors.ts` (AC: #1, #2)
  - [x] 1.1: `ConfigError` — already exists from Story 1.2, no changes needed
  - [x] 1.2: `ProviderError` — add `provider: string` and optional
        `statusCode?: number` fields
  - [x] 1.3: `GitError`, `GuardrailError`, `ParseError` — each extends `Error`
        with descriptive `name`
- [x] Task 2: Implement `withRetry()` in `src/retry.ts` (AC: #3, #4)
  - [x] 2.1: Signature: `withRetry<T>(fn: () => Promise<T>, opts?)` with
        defaults `{ retries: 1, backoffMs: 5000 }`
  - [x] 2.2: Async/await loop — call `fn`, on failure wait `backoffMs` then
        retry up to `retries` times
  - [x] 2.3: On final failure, re-throw the original error (preserving type)
- [x] Task 3: Write tests for error classes (AC: #1, #2, #5)
  - [x] 3.1: Test all 5 error constructors set correct `name` and `message`
  - [x] 3.2: Test `ProviderError` stores `provider` and `statusCode` fields
  - [x] 3.3: Test `instanceof Error` for all error classes
- [x] Task 4: Write tests for retry utility (AC: #3, #4, #5)
  - [x] 4.1: Test: successful function returns result immediately
  - [x] 4.2: Test: function fails once then succeeds on retry
  - [x] 4.3: Test: function fails all retries, throws original error
  - [x] 4.4: Test: thrown error preserves original type (e.g., `ProviderError`)
  - [x] 4.5: Test: zero retries means no retry attempt
- [x] Task 5: Verify build pipeline
  - [x] 5.1: Run `npm run all` — all checks pass

## Dev Notes

### Architecture Requirements

- **Error Hierarchy:** Flat class hierarchy — all error classes extend `Error`
  directly. No deep inheritance chains.
- **Retry Pattern:** Simple retry with constant backoff. Used for LLM API calls
  and Git operations in later stories.
- **Key Constraint:** `withRetry` must preserve the original error type so
  callers can catch specific errors (e.g., `ProviderError` with `statusCode`).

### Error Classes Summary

| Class            | Fields                               | Used By          |
| ---------------- | ------------------------------------ | ---------------- |
| `ConfigError`    | `message`                            | `config.ts`      |
| `ProviderError`  | `message`, `provider`, `statusCode?` | LLM providers    |
| `GitError`       | `message`                            | `git-manager.ts` |
| `GuardrailError` | `message`                            | `guardrails.ts`  |
| `ParseError`     | `message`                            | Response parsing |

### Previous Story Learnings

- From Story 1.2: `src/errors.ts` already had placeholder stubs for all 5
  classes and basic constructor tests in `__tests__/errors.test.ts`. This story
  fleshed out `ProviderError` fields and added the retry utility.

## Change Log

- 2026-02-13: Story implemented — error classes finalized, retry utility created

## Dev Agent Record

### Agent Model Used

GitHub Copilot (Claude claude-sonnet-4-20250514)

### Debug Log References

- No blocking issues encountered during implementation.
- `ProviderError` required adding `provider` and `statusCode` fields to the
  existing placeholder from Story 1.2.

### Completion Notes List

- ✅ `src/errors.ts` — 5 error classes: `ConfigError`, `ProviderError` (with
  `provider` + `statusCode`), `GitError`, `GuardrailError`, `ParseError`
- ✅ `src/retry.ts` — `withRetry(fn, { retries: 1, backoffMs: 5000 })`,
  async/await, preserves error type
- ✅ `__tests__/errors.test.ts` — 6 tests covering all constructors and fields
- ✅ `__tests__/retry.test.ts` — 8 tests covering success, retry-then-success,
  retry-then-fail, error type preservation, zero retries
- ✅ `npm run all` passes: format ✓ lint ✓ test ✓ coverage badge ✓ bundle ✓

### File List

- `src/errors.ts` (modified — added `ProviderError` fields)
- `src/retry.ts` (new)
- `__tests__/errors.test.ts` (modified — expanded to 6 tests)
- `__tests__/retry.test.ts` (new)
