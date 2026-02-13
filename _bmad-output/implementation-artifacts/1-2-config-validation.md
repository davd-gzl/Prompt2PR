# Story 1.2: Configuration Validation & Input Parsing

Status: complete

## Story

As a developer using the action, I want all Action inputs validated at startup
with clear error messages, So that misconfiguration fails fast instead of
causing cryptic errors downstream.

## Acceptance Criteria

1. **Given** the action starts with inputs from `with:` syntax (FR32) **When**
   `validateConfig()` runs in `src/config.ts` **Then** it returns a typed
   `ActionConfig` object with all inputs parsed
2. Missing required inputs (`prompt`, `provider`) throw `ConfigError` with
   descriptive messages
3. `provider` values not in `['mistral', 'openai', 'anthropic']` throw
   `ConfigError`
4. `max_files` and `max_changes` parse as positive integers or use defaults
   (10, 200)
5. API keys are read from environment variables (FR33) and missing keys throw
   `ConfigError`
6. No other module in the codebase calls `core.getInput()` directly — only
   `config.ts`
7. Tests in `__tests__/config.test.ts` cover valid, invalid, and missing inputs
   with ≥80% coverage

## Tasks / Subtasks

- [ ] Task 1: Create `ConfigError` class (dependency from Story 1.3, minimal
      version) (AC: #2)
  - [ ] 1.1: Create `src/errors.ts` with `ConfigError` class extending `Error`
        with `name = 'ConfigError'`
  - [ ] 1.2: Follow the architecture pattern: named export, no default export,
        `.js` extension in imports
  - [ ] 1.3: Include placeholder stubs for `ProviderError`, `GitError`,
        `GuardrailError`, `ParseError` (Story 1.3 will flesh these out fully)
- [ ] Task 2: Define `ActionConfig` interface and constants (AC: #1)
  - [ ] 2.1: Define `ActionConfig` interface in `src/config.ts` with all typed
        fields:
    - `prompt: string` (required)
    - `provider: 'mistral' | 'openai' | 'anthropic'` (required)
    - `model: string` (optional, empty string = use provider default)
    - `paths: string[]` (parsed from comma-separated string)
    - `maxFiles: number` (default: 10)
    - `maxChanges: number` (default: 200)
    - `labels: string[]` (parsed from comma-separated string, always includes
      'prompt2pr')
    - `branchPrefix: string` (default: 'prompt2pr/')
    - `dryRun: boolean` (default: false)
    - `baseUrl: string` (optional, empty string = use provider default)
    - `apiKey: string` (from environment variable)
  - [ ] 2.2: Define constants: `VALID_PROVIDERS`, `DEFAULT_MAX_FILES = 10`,
        `DEFAULT_MAX_CHANGES = 200`, `DEFAULT_BRANCH_PREFIX = 'prompt2pr/'`,
        `DEFAULT_LABEL = 'prompt2pr'`
  - [ ] 2.3: Define `API_KEY_ENV_VARS` mapping:
        `{ mistral: 'MISTRAL_API_KEY', openai: 'OPENAI_API_KEY', anthropic: 'ANTHROPIC_API_KEY' }`
- [ ] Task 3: Implement `validateConfig()` function (AC: #1, #2, #3, #4, #5)
  - [ ] 3.1: Read all inputs via `core.getInput()` / `core.getBooleanInput()` —
        this is the ONLY module that calls these functions (AC: #6)
  - [ ] 3.2: Validate `prompt` is non-empty, throw `ConfigError` if missing
  - [ ] 3.3: Validate `provider` is one of `VALID_PROVIDERS`, throw
        `ConfigError` with list of valid values if invalid
  - [ ] 3.4: Parse `max_files` and `max_changes` as positive integers, throw
        `ConfigError` if non-numeric or ≤ 0. If the value is an empty string
        (user explicitly passed `max_files: ''`), fall back to the default value
        rather than throwing.
  - [ ] 3.5: Parse `paths` from comma-separated string to `string[]`, trim
        whitespace
  - [ ] 3.6: Parse `label` from comma-separated string to `string[]`, ensure
        'prompt2pr' is always included
  - [ ] 3.7: Parse `dry_run` as boolean via `core.getBooleanInput()`
  - [ ] 3.8: Read API key from environment variable based on provider
        (`process.env[API_KEY_ENV_VARS[provider]]`), throw `ConfigError` if
        missing or empty
  - [ ] 3.9: Call `core.setSecret(apiKey)` immediately after reading the API key
        to ensure it is masked in all subsequent log output (defense-in-depth
        for NFR4 — logger in Story 1.4 will also call `setSecret`, but this
        ensures coverage even before the logger exists)
  - [ ] 3.10: Read `base_url` and `model` as optional strings
  - [ ] 3.11: Return fully typed `ActionConfig` object
- [ ] Task 4: Write tests in `__tests__/config.test.ts` (AC: #7)
  - [ ] 4.1: Mock `@actions/core` using the `__fixtures__/core.ts` pattern from
        Story 1.1. **Must first add `getBooleanInput` and `setSecret` mocks to
        `__fixtures__/core.ts`** — they are not in the current fixture file but
        are required by `validateConfig()`.
  - [ ] 4.2: Test: valid config with all inputs provided → returns
        `ActionConfig`
  - [ ] 4.3: Test: valid config with only required inputs → uses defaults for
        optional fields
  - [ ] 4.4: Test: missing `prompt` → throws `ConfigError`
  - [ ] 4.5: Test: missing `provider` → throws `ConfigError`
  - [ ] 4.6: Test: invalid `provider` value (e.g., 'gemini') → throws
        `ConfigError` with valid options listed
  - [ ] 4.7: Test: `max_files` as non-numeric string → throws `ConfigError`
  - [ ] 4.8: Test: `max_files` as zero or negative → throws `ConfigError`
  - [ ] 4.9: Test: `max_changes` as non-numeric string → throws `ConfigError`
  - [ ] 4.10: Test: `max_files` as empty string → falls back to default (10)
  - [ ] 4.11: Test: missing API key for provider → throws `ConfigError` naming
        the expected env var
  - [ ] 4.12: Test: `paths` parsing — comma-separated with whitespace trimming
  - [ ] 4.13: Test: `label` parsing — always includes 'prompt2pr' even if not in
        input
  - [ ] 4.14: Test: `dry_run` parses 'true'/'false' as boolean
  - [ ] 4.15: Test: `base_url` and `model` are optional and default to empty
        string
  - [ ] 4.16: Verify ≥80% line coverage for `src/config.ts`
- [ ] Task 5: Verify build pipeline (AC: #1)
  - [ ] 5.1: Run `npm run all` — format, lint, test, coverage, bundle must all
        pass
  - [ ] 5.2: Verify no other file in `src/` calls `core.getInput()` (AC: #6)

## Dev Notes

### Architecture Requirements

- **Decision 5 (Fail-Fast Manual Validation):** Validate all Action inputs at
  startup with a dedicated validation function. Returns validated `ActionConfig`
  or throws with descriptive error.
- **Single Source of Truth Pattern:**
  ```
  Action YAML inputs → @actions/core.getInput() → validateConfig() → ActionConfig (typed)
                                                         ↓
                               Passed explicitly to all functions that need it
  ```
- **Rule:** No function should call `core.getInput()` directly except the config
  module. Everything else receives config as a parameter.

### Module/File Internal Structure Pattern

```typescript
// 1. Imports (external first, then internal, separated by blank line)
import * as core from '@actions/core'

import { ConfigError } from './errors.js'

// 2. Types/Interfaces (exported)
export interface ActionConfig { ... }

// 3. Constants
const VALID_PROVIDERS = ['mistral', 'openai', 'anthropic'] as const
const DEFAULT_MAX_FILES = 10

// 4. Main exported functions
export function validateConfig(): ActionConfig { ... }

// 5. Internal helper functions (not exported)
function parsePositiveInt(value: string, name: string): number { ... }
```

### API Key Environment Variable Mapping

| Provider    | Environment Variable |
| ----------- | -------------------- |
| `mistral`   | `MISTRAL_API_KEY`    |
| `openai`    | `OPENAI_API_KEY`     |
| `anthropic` | `ANTHROPIC_API_KEY`  |

### Action Inputs Reference (from `action.yml`)

| Input           | Required | Default        | Type   |
| --------------- | -------- | -------------- | ------ |
| `prompt`        | yes      | —              | string |
| `provider`      | yes      | —              | string |
| `model`         | no       | `''`           | string |
| `paths`         | no       | `'**'`         | string |
| `max_files`     | no       | `'10'`         | string |
| `max_changes`   | no       | `'200'`        | string |
| `label`         | no       | `'prompt2pr'`  | string |
| `branch_prefix` | no       | `'prompt2pr/'` | string |
| `dry_run`       | no       | `'false'`      | string |
| `base_url`      | no       | `''`           | string |

Note: All GitHub Actions inputs are strings. Numeric and boolean parsing is our
responsibility.

### Error Pattern (from Architecture)

```typescript
export class ConfigError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ConfigError'
  }
}
```

### Key Constraints

- Named exports only, no default exports
- `.js` extensions in all import paths
- No `any` types — use `unknown` if type is truly unknown
- `async/await` only, no `.then()` chains
- No `console.log` — use `@actions/core` (logger not yet available, comes in
  Story 1.4)
- All external I/O mocked in tests via `jest.fn()` / `jest.spyOn()`

### Dependencies on Other Stories

- **Story 1.3 (Error Types):** This story needs `ConfigError`. We create a
  minimal `src/errors.ts` with `ConfigError` here; Story 1.3 will add the
  remaining error types (`ProviderError`, `GitError`, `GuardrailError`,
  `ParseError`) and the retry utility.
- **Story 1.4 (Logger):** Not yet available. Config validation uses
  `core.info()` directly for any logging. Once the logger is implemented,
  `main.ts` will create a logger and pass it down.

### Previous Story Learnings

- From Story 1.1: `__fixtures__/core.ts` provides ESM-compatible mock for
  `@actions/core` — reuse this pattern for config tests
- From Story 1.1: Coverage threshold is 80% line coverage (NFR16)
- From Story 1.1: Rollup circular dependency warning for `@actions/core` is
  benign

### Security Considerations

- **NFR4:** API keys must never be logged, printed, or exposed. The config
  module reads API keys from `process.env` and stores them in `ActionConfig`.
  Keys should NOT be logged during validation — only log that the key was found
  or missing. Call `core.setSecret(apiKey)` immediately after reading to mask it
  in all subsequent log output.
- **NFR7:** `GITHUB_TOKEN` is NOT read by the config module — it's used directly
  by `@actions/github` (Octokit) in the PR creator.

### Provider Type Narrowing Pattern

`core.getInput()` returns `string`, but `ActionConfig.provider` is a union
literal type. Use a type guard to narrow safely:

```typescript
type ProviderName = (typeof VALID_PROVIDERS)[number]
// → 'mistral' | 'openai' | 'anthropic'

function isValidProvider(value: string): value is ProviderName {
  return (VALID_PROVIDERS as readonly string[]).includes(value)
}
```

This avoids an unsafe `as ProviderName` cast and gives the implementing agent a
clean pattern to follow.

### References

- [Source: _bmad-output/planning-artifacts/architecture.md#Decision 5]
- [Source: _bmad-output/planning-artifacts/architecture.md#Configuration Flow]
- [Source: _bmad-output/planning-artifacts/architecture.md#Error Handling
  Pattern]
- [Source: _bmad-output/planning-artifacts/architecture.md#Implementation
  Patterns & Consistency Rules]
- [Source: _bmad-output/planning-artifacts/epics.md#Story 1.2]
- [Source: action.yml — all inputs and outputs]

## Change Log

- 2026-02-13: Story created from epic breakdown and architecture specs
- 2026-02-13: Code review fixes applied — added getBooleanInput/setSecret
  fixture requirement, core.setSecret() defense-in-depth step, empty string
  default fallback for max_files/max_changes, ProviderName type guard dev note,
  Dev Agent Record template

## Dev Agent Record

### Agent Model Used

GitHub Copilot (Claude claude-sonnet-4-20250514)

### Debug Log References

- First `npm run all` failed on global function coverage threshold (66.66% <
  80%) because `errors.ts` placeholder stubs had 5 untested constructors.
  Resolved by adding `__tests__/errors.test.ts` with basic constructor tests for
  all 5 error types.
- Rollup circular dependency warning for `@actions/core` is benign (known
  upstream issue, same as Story 1.1).
- Prettier reformatted `src/config.ts` on first run (arrow function spacing) —
  no functional change.

### Completion Notes List

- ✅ `src/errors.ts` — 5 error classes: `ConfigError`, `ProviderError`,
  `GitError`, `GuardrailError`, `ParseError` (placeholders for 1.3)
- ✅ `src/config.ts` — `ActionConfig` interface, `ProviderName` type,
  `VALID_PROVIDERS`, constants, `API_KEY_ENV_VARS`, `validateConfig()` with full
  validation
- ✅ `__fixtures__/core.ts` — Added `getBooleanInput` and `setSecret` mocks
- ✅ `__tests__/config.test.ts` — 22 test cases covering all ACs
- ✅ `__tests__/errors.test.ts` — 5 test cases for error constructors
- ✅ `core.setSecret(apiKey)` called for defense-in-depth NFR4 masking
- ✅ `isValidProvider()` type guard avoids unsafe casts
- ✅ Empty string fallback for `max_files`/`max_changes` to defaults
- ✅ `npm run all` passes: format ✓ lint ✓ test ✓ coverage badge ✓ bundle ✓
- ✅ 100% coverage across all files (statements, branches, functions, lines)
- ✅ Only `config.ts` calls `core.getInput()` — verified via grep

### File List

- `src/errors.ts` (new)
- `src/config.ts` (new)
- `__fixtures__/core.ts` (modified — added `getBooleanInput`, `setSecret`)
- `__tests__/config.test.ts` (new)
- `__tests__/errors.test.ts` (new)
