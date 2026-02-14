# Story 1.4: Logger with Secret Masking

Status: complete

## Story

As a developer using the action, I want structured, component-prefixed logs that
automatically mask API keys, So that every log line is traceable to its source
and secrets are never exposed (NFR4).

## Acceptance Criteria

1. `createLogger()` returns a logger object with `info`, `debug`, `error`,
   `warn` methods
2. All log output is prefixed with `[component]` (e.g.,
   `[scanner] Scanning files`)
3. `core.setSecret()` is called for each provided API key during logger
   initialization
4. Logger delegates to `@actions/core` functions (`core.info`, `core.debug`,
   `core.warning`, `core.error`)
5. No `console.log` calls anywhere in the codebase — all logging through
   `@actions/core`

## Tasks / Subtasks

- [x] Task 1: Implement `createLogger()` in `src/logger.ts` (AC: #1, #2, #3, #4)
  - [x] 1.1: Factory function signature:
        `createLogger(component: string, secrets?: string[])`
  - [x] 1.2: Return object with `{ info, debug, warn, error }` methods
  - [x] 1.3: Each method prefixes message with `[component] ` before delegating
        to `core.*`
  - [x] 1.4: Map `warn` to `core.warning` (GitHub Actions uses `warning` not
        `warn`)
  - [x] 1.5: On initialization, call `core.setSecret(s)` for each non-empty
        string in `secrets` array
- [x] Task 2: Write tests in `__tests__/logger.test.ts` (AC: #1–#5)
  - [x] 2.1: Test: `info()` delegates to `core.info` with `[component]` prefix
  - [x] 2.2: Test: `debug()` delegates to `core.debug` with prefix
  - [x] 2.3: Test: `warn()` delegates to `core.warning` with prefix
  - [x] 2.4: Test: `error()` delegates to `core.error` with prefix
  - [x] 2.5: Test: `core.setSecret()` called for each secret during init
  - [x] 2.6: Test: empty secrets array — no `core.setSecret()` calls
  - [x] 2.7: Test: no secrets parameter — no `core.setSecret()` calls
  - [x] 2.8: Test: multiple loggers with different components format correctly
  - [x] 2.9: Verify no `console.log` in source files
- [x] Task 3: Verify build pipeline
  - [x] 3.1: Run `npm run all` — all checks pass
  - [x] 3.2: Verify no `console.log` in `src/` via grep

## Dev Notes

### Architecture Requirements

- **NFR4 (Secret Protection):** API keys must never appear in logs. Defense in
  depth: `core.setSecret()` is called both in `config.ts` (Story 1.2) and in
  `createLogger()` when secrets are passed.
- **Logger Pattern:** Factory function, not a class. Each module creates its own
  logger instance with a descriptive component name.
- **Delegation:** Logger is a thin wrapper around `@actions/core` — no custom
  log levels, no file output, no buffering.

### Usage Pattern (from Architecture)

```typescript
import { createLogger } from './logger.js'

const logger = createLogger('scanner', [config.apiKey])
logger.info('Scanning files') // → [scanner] Scanning files
logger.debug('Found 5 files') // → [scanner] Found 5 files
logger.warn('Large file skipped') // → [scanner] Large file skipped
logger.error('Scan failed') // → [scanner] Scan failed
```

### Method Mapping

| Logger Method | `@actions/core` Function |
| ------------- | ------------------------ |
| `info()`      | `core.info()`            |
| `debug()`     | `core.debug()`           |
| `warn()`      | `core.warning()`         |
| `error()`     | `core.error()`           |

### Previous Story Learnings

- From Story 1.2: `core.setSecret()` is already called in `config.ts` as
  defense-in-depth. The logger provides a second layer of protection.
- From Story 1.2: `__fixtures__/core.ts` already has `setSecret` mock available.
- From Story 1.3: Error classes are finalized — logger can be used alongside
  typed errors in later stories.

## Change Log

- 2026-02-13: Story implemented — logger factory with secret masking

## Dev Agent Record

### Agent Model Used

GitHub Copilot (Claude claude-sonnet-4-20250514)

### Debug Log References

- No blocking issues encountered during implementation.
- `core.warning` vs `warn` naming mismatch handled in logger mapping.

### Completion Notes List

- ✅ `src/logger.ts` — `createLogger(component, secrets?)` factory returning
  `{ info, debug, warn, error }` with `[component]` prefix
- ✅ Delegates to `core.info`, `core.debug`, `core.warning`, `core.error`
- ✅ `core.setSecret()` called for each provided secret on initialization
- ✅ `__tests__/logger.test.ts` — 12 tests covering prefix formatting,
  delegation, secret masking, empty secrets, multiple loggers
- ✅ No `console.log` in codebase — verified via grep
- ✅ `npm run all` passes: format ✓ lint ✓ test ✓ coverage badge ✓ bundle ✓

### File List

- `src/logger.ts` (new)
- `__tests__/logger.test.ts` (new)
