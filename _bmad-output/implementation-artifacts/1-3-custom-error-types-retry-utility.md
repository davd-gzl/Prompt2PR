# Story 1.3: Custom Error Types & Retry Utility

Status: done

## Story

As a developer implementing the action, I want typed error classes and a
centralized retry wrapper, So that every failure is identifiable by type and
retryable operations have consistent behavior.

## Acceptance Criteria

1. **Given** the `src/errors.ts` module exists **When** an error occurs in any
   component **Then** it throws one of: `ConfigError`, `ProviderError`,
   `GitError`, `GuardrailError`, or `ParseError`
2. Each error class extends `Error` with a descriptive `name` property
3. `ProviderError` includes `provider` and optional `statusCode` fields
4. `src/retry.ts` exports `withRetry(fn, { retries: 1, backoffMs: 5000 })`
   (NFR14)
5. `withRetry` retries once on failure, waits the backoff period, and re-throws
   on second failure
6. `withRetry` propagates the original error type (not a generic Error)
7. Tests in `__tests__/retry.test.ts` cover success, retry-then-success, and
   retry-then-fail paths with ≥80% coverage
8. Tests in `__tests__/errors.test.ts` verify all error classes

## Tasks / Subtasks

- [x] Task 1: Create custom error classes in `src/errors.ts` (AC: #1, #2, #3)
  - [x] 1.1: Implement `ConfigError` class extending `Error` with
        `name = 'ConfigError'`
  - [x] 1.2: Implement `ProviderError` class with `provider: string` and
        `statusCode?: number` fields
  - [x] 1.3: Implement `GitError` class extending `Error`
  - [x] 1.4: Implement `GuardrailError` class extending `Error`
  - [x] 1.5: Implement `ParseError` class extending `Error`
  - [x] 1.6: Follow architecture pattern: named exports only, no default
        exports, ESM with `.js` extensions in imports
- [x] Task 2: Create retry utility in `src/retry.ts` (AC: #4, #5, #6)
  - [x] 2.1: Define `RetryOptions` interface with `retries?: number` and
        `backoffMs?: number`
  - [x] 2.2: Implement `withRetry<T>(fn: () => Promise<T>, options?: RetryOptions): Promise<T>`
  - [x] 2.3: Use default values: `retries = 1`, `backoffMs = 5000` (NFR14)
  - [x] 2.4: Implement retry loop: initial attempt + up to N retries
  - [x] 2.5: Wait `backoffMs` milliseconds between attempts using `sleep()`
        helper
  - [x] 2.6: Re-throw the original error (preserving error type) after all
        retries exhausted
  - [x] 2.7: Export `sleep()` helper for testing purposes
- [x] Task 3: Write tests for retry utility in `__tests__/retry.test.ts` (AC:
      #7)
  - [x] 3.1: Mock timers using `jest.useFakeTimers()` to avoid real delays
  - [x] 3.2: Test: success on first attempt → returns result, fn called once
  - [x] 3.3: Test: fail once, succeed on retry → returns result, fn called
        twice
  - [x] 3.4: Test: fail on all attempts → throws original error, fn called
        retries+1 times
  - [x] 3.5: Test: error type preservation → ProviderError remains ProviderError
  - [x] 3.6: Test: default options (1 retry, 5000ms backoff) are used when not
        specified
  - [x] 3.7: Test: custom retry count (e.g., 3 retries)
  - [x] 3.8: Test: zero retries → immediate failure
  - [x] 3.9: Test: non-Error thrown values are preserved
  - [x] 3.10: Verify ≥80% coverage for retry.ts
- [x] Task 4: Write tests for error classes in `__tests__/errors.test.ts` (AC:
      #8)
  - [x] 4.1: Test: ConfigError has correct name and message
  - [x] 4.2: Test: ProviderError has correct name, message, provider, and
        statusCode
  - [x] 4.3: Test: ProviderError works without optional statusCode
  - [x] 4.4: Test: GitError has correct name and message
  - [x] 4.5: Test: GuardrailError has correct name and message
  - [x] 4.6: Test: ParseError has correct name and message
  - [x] 4.7: Verify 100% coverage for errors.ts

## Implementation Notes

- All error classes follow the same pattern: extend Error, set name property
- ProviderError is special with additional fields for diagnostics
- Retry utility uses fake timers in tests to avoid delays
- Both modules achieve 100% test coverage
- Code follows ESM standards with named exports and .js extensions

## Verification

```bash
# Run error tests
npm test -- __tests__/errors.test.ts

# Run retry tests  
npm test -- __tests__/retry.test.ts

# Both test suites pass with 100% coverage
```

## Files Changed

- `src/errors.ts` - Custom error classes (ConfigError, ProviderError, GitError,
  GuardrailError, ParseError)
- `src/retry.ts` - Retry utility with withRetry function and sleep helper
- `__tests__/errors.test.ts` - Error class tests (6 tests, 100% coverage)
- `__tests__/retry.test.ts` - Retry utility tests (8 tests, 100% coverage)
