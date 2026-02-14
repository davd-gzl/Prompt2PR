# Story 4.2: PR Creator — GitHub API Integration

**Status:** complete

## Story

As a developer using the action, I want a Pull Request created automatically
with a clear description.

## Implementation Details

### `src/pr-creator.ts`

**`createPullRequest(changes, branchName, config, metadata, token, summary?)`**

Returns `{ url, number }`.

- Uses `@actions/github` (Octokit) to interact with GitHub API
- Creates PR via `octokit.rest.pulls.create()`
- Applies labels via `octokit.rest.issues.addLabels()` — non-fatal if label
  application fails (logged as warning, does not throw)

**PR title format:**

```
[Prompt2PR] {action summary} (N created, M modified, K deleted)
```

File action counts are computed from the changes array.

**PR body structure:**

1. Original prompt — rendered as a blockquote
2. AI summary — included when the optional `summary` parameter is provided
3. Metadata — timestamp, model used, number of files scanned
4. File change list — each file with its action type

### `__tests__/pr-creator.test.ts`

10 tests covering:

- Successful PR creation with correct title and body
- PR body contains blockquoted prompt
- PR body contains metadata fields
- PR body contains file change list
- Label application on created PR
- Label application failure handled gracefully
- API error propagation on PR creation failure
- Summary included in body when provided
- Summary omitted from body when not provided
- Correct owner/repo extraction from context

## Acceptance Criteria

All met:

- [x] PR created via GitHub API with descriptive title
- [x] PR body includes prompt, summary, metadata, and file list
- [x] Labels applied to PR
- [x] Label failure does not block PR creation
- [x] PR URL and number returned
- [x] Unit tests pass

## Files

- `src/pr-creator.ts`
- `__tests__/pr-creator.test.ts`
