# Story 4.3: Main Pipeline — End-to-End Orchestration

**Status:** complete

## Story

As a developer using the action, I want the entire pipeline wired together, So
that a single action run produces a complete PR or silently skips.

## Implementation Details

### `src/main.ts`

**`run()`** orchestrates the full pipeline:

1. `validateConfig()` — read and validate action inputs
2. `scanFiles()` — collect repository files matching config
3. `buildPrompt()` — assemble the LLM prompt
4. `withRetry(provider.chat)` — call AI provider with retry logic
5. `parseResponse()` — extract structured changes from AI response
6. `validateChanges()` — run guardrail checks on proposed changes
7. `commitAndPush()` — branch, apply, commit, push
8. `createPullRequest()` — open PR via GitHub API

**Action outputs set:**

| Output          | Description                        |
| --------------- | ---------------------------------- |
| `pr_url`        | URL of the created pull request    |
| `pr_number`     | Number of the created pull request |
| `files_changed` | Count of files changed             |
| `lines_changed` | Count of lines changed             |
| `skipped`       | Skip reason or `'false'`           |

**`skipped` values:**

- `'no_changes'` — AI returned an empty change set
- `'dry_run'` — dry-run mode enabled in config
- `'false'` — PR was created successfully

**Error handling:**

Top-level try/catch with structured error logging by type:

- `ConfigError` — invalid inputs
- `ProviderError` — AI provider failures
- `GuardrailError` — change validation failures
- `GitError` — git operation failures
- `ParseError` — response parsing failures

Each error type logs a specific, actionable message before calling
`core.setFailed()`.

### `src/index.ts`

Minimal entrypoint — imports and calls `run()`.

### `__tests__/main.test.ts`

11 tests covering:

- Happy path: full pipeline produces PR URL and number outputs
- Skip path: empty AI response sets `skipped = 'no_changes'`
- Dry-run path: sets `skipped = 'dry_run'`, no git/PR calls
- ConfigError handling
- ProviderError handling
- GuardrailError handling
- GitError handling
- ParseError handling
- Unknown error handling
- Output values set correctly on success
- Output values set correctly on skip

## Acceptance Criteria

All met:

- [x] Pipeline executes all steps in order
- [x] All action outputs set correctly
- [x] Empty response handled as skip
- [x] Dry-run mode skips git and PR steps
- [x] Each error type caught and reported with actionable message
- [x] Unit tests pass

## Files

- `src/main.ts`
- `src/index.ts`
- `__tests__/main.test.ts`
