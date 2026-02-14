# Story 7.2: Structured Logging & Observability

**Status:** complete

## Story

Detailed, structured logs for debugging.

## Implementation

### Error Logging

- `src/main.ts` — `logErrorDetails()` provides structured error logging by type:
  - `ConfigError` — configuration validation failures
  - `ProviderError` — with HTTP status code
  - `GuardrailError` — safety limit violations
  - `GitError` — git operation failures
  - `ParseError` — LLM response parsing failures

### Pipeline Logging

Structured log messages at each pipeline stage:

1. Config validated
2. Files scanned
3. Provider call made
4. Changes validated
5. PR created

### Outcome Logging

- No-changes: "Scanned N files matching paths. Found 0 issues. No PR created."
- Success: "PR #N created — URL (X file(s), Y line(s) changed)"

### Infrastructure

- All logging uses component-prefixed logger from Story 1.4

### Tests

- `__tests__/main.test.ts` tests verify error logging for each error type

## File List

| File                     | Status                      |
| ------------------------ | --------------------------- |
| `src/main.ts`            | modified (logging sections) |
| `__tests__/main.test.ts` | modified (error path tests) |

## Requirements Traced

- NFR: Structured logging for observability
- NFR: Debuggable error output
