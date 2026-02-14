# Story 1.4: Logger with Secret Masking

Status: done

## Story

As a developer using the action, I want structured, component-prefixed logs that
automatically mask API keys, So that every log line is traceable to its source
and secrets are never exposed (NFR4).

## Acceptance Criteria

1. **Given** the `src/logger.ts` module exists **When** any component calls
   `createLogger('scanner')` **Then** it returns a logger with `info`, `debug`,
   `error`, and `warn` methods
2. All log output is prefixed with `[component]` (e.g., `[scanner] Scanning files`)
3. `core.setSecret()` is called for all API keys during logger initialization
4. The logger delegates to `@actions/core` functions (`core.info`, `core.debug`,
   `core.error`, `core.warning`)
5. Tests in `__tests__/logger.test.ts` verify prefix formatting and secret
   masking
6. No module in the codebase uses `console.log` — only the logger

## Tasks / Subtasks

- [x] Task 1: Define Logger interface (AC: #1)
  - [x] 1.1: Create `Logger` interface in `src/logger.ts` with methods:
        `info(message: string): void`, `debug(message: string): void`,
        `warn(message: string): void`, `error(message: string): void`
  - [x] 1.2: Follow architecture pattern: named exports only, no default
        exports
- [x] Task 2: Implement `createLogger()` function (AC: #1, #2, #3, #4)
  - [x] 2.1: Accept `component: string` and optional `secrets?: string[]`
        parameters
  - [x] 2.2: Call `core.setSecret(secret)` for each secret in the array (AC:
        #3, NFR4)
  - [x] 2.3: Skip empty strings in secrets array (defensive coding)
  - [x] 2.4: Create prefix string: `[${component}]`
  - [x] 2.5: Return Logger object with all four methods
  - [x] 2.6: Implement `info()` → `core.info(${prefix} ${message})`
  - [x] 2.7: Implement `debug()` → `core.debug(${prefix} ${message})`
  - [x] 2.8: Implement `warn()` → `core.warning(${prefix} ${message})`
  - [x] 2.9: Implement `error()` → `core.error(${prefix} ${message})`
- [x] Task 3: Write tests in `__tests__/logger.test.ts` (AC: #5)
  - [x] 3.1: Mock `@actions/core` using `jest.unstable_mockModule()` pattern
  - [x] 3.2: Test: info messages are prefixed correctly
  - [x] 3.3: Test: debug messages are prefixed correctly
  - [x] 3.4: Test: warn messages are prefixed correctly
  - [x] 3.5: Test: error messages are prefixed correctly
  - [x] 3.6: Test: info delegates to `core.info`
  - [x] 3.7: Test: debug delegates to `core.debug`
  - [x] 3.8: Test: warn delegates to `core.warning`
  - [x] 3.9: Test: error delegates to `core.error`
  - [x] 3.10: Test: calls `core.setSecret` for each provided secret
  - [x] 3.11: Test: does not call `core.setSecret` when no secrets provided
  - [x] 3.12: Test: skips empty strings in secrets array
  - [x] 3.13: Test: multiple loggers can exist with independent prefixes
  - [x] 3.14: Verify 100% coverage for logger.ts
- [x] Task 4: Verify no console.log usage (AC: #6)
  - [x] 4.1: Search codebase for `console.log` → should find zero instances (or
        only in test fixtures)
  - [x] 4.2: Add ESLint rule to prevent `console.log` if not already present

## Implementation Notes

- Logger wraps `@actions/core` with component prefixes for traceability
- Secret masking is defense-in-depth (config.ts also calls setSecret, but logger
  provides a convenient place to do it for any component)
- All four log levels delegate to corresponding core methods
- Achieves 100% test coverage with 12 test cases

## Verification

```bash
# Run logger tests
npm test -- __tests__/logger.test.ts

# Test suite passes with 12 tests, 100% coverage
```

## Files Changed

- `src/logger.ts` - Logger implementation with createLogger function and Logger
  interface
- `__tests__/logger.test.ts` - Logger tests (12 tests, 100% coverage)

## Related Stories

- Story 1.2: ConfigError from errors.ts already implemented
- Story 1.3: All error types and retry utility already implemented
