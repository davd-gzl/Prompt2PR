# Story 5.1: Post-LLM Guardrail Enforcement

**Status:** complete

## Story

Validate AI-generated changes against safety limits before git operations.

## Implementation

### Core Module

- `src/guardrails.ts` — `validateChanges(changes, config)` checks:
  - Path traversal (e.g., `../` sequences)
  - `.github/` exclusion (FR31)
  - `paths` scope enforcement (FR29)
  - `max_files` limit (FR14)
  - `max_changes` limit (FR15)

### Key Details

- `countLinesChanged()` counts total output lines (documented: not diff lines)
- Pattern matching uses `picomatch` for correct glob handling (replaced homebrew
  `globToRegExp`)

### Tests

- `__tests__/guardrails.test.ts` — 20 tests covering all validation rules

## File List

| File                           | Status |
| ------------------------------ | ------ |
| `src/guardrails.ts`            | new    |
| `src/picomatch.d.ts`           | new    |
| `__tests__/guardrails.test.ts` | new    |

## Requirements Traced

- FR14: max_files limit
- FR15: max_changes limit
- FR29: paths scope enforcement
- FR31: .github/ exclusion
