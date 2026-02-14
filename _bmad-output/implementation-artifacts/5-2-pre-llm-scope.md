# Story 5.2: Pre-LLM File Scope Enforcement

**Status:** complete

## Story

Enforce path scope before sending content to LLM (defense-in-depth).

## Implementation

### Changes

- Enhanced `src/file-scanner.ts` with `.github/` exclusion at scan time, not
  just post-LLM
- Logs exclusion counts: "Excluded N files: X outside paths scope, Y in
  .github/"
- Post-LLM guardrails (Story 5.1) remain authoritative — this is
  defense-in-depth

### Tests

- Extended tests in `__tests__/file-scanner.test.ts` for `.github/` exclusion at
  scan time

## Design Rationale

Pre-LLM filtering reduces token usage and attack surface. Even if this layer
were bypassed, Story 5.1's post-LLM guardrails would still reject out-of-scope
changes. The two layers are complementary.

## File List

| File                             | Status   |
| -------------------------------- | -------- |
| `src/file-scanner.ts`            | modified |
| `__tests__/file-scanner.test.ts` | extended |

## Requirements Traced

- FR29: paths scope enforcement (defense-in-depth layer)
- FR31: .github/ exclusion (pre-LLM layer)
