# Story 4.1: Git Manager — Branch, Stage, Commit, Push

**Status:** complete

## Story

As a developer using the action, I want AI-generated file changes committed to a
new branch and pushed, So that changes are ready for a Pull Request.

## Implementation Details

### `src/git-manager.ts`

Three exported functions:

1. **`buildBranchName(prefix, workflowName)`**
   - Format: `{prefix}{sanitized-workflow}-{YYYYMMDDHHMMSS}`
   - Workflow name sanitized to lowercase alphanumeric + hyphens

2. **`applyChanges(changes, workDir)`**
   - Writes files for `create` and `modify` actions
   - Creates parent directories with `mkdir -p`
   - Deletes files for `delete` actions
   - Defense-in-depth path traversal check — rejects paths resolving outside
     workDir

3. **`commitAndPush(changes, branchName, commitMessage, workDir)`**
   - `git checkout -b <branchName>`
   - Calls `applyChanges()` to write/delete files on disk
   - `git add` for created/modified files
   - `git rm` for deleted files
   - `git commit -m <commitMessage>`
   - `git push --set-upstream origin <branchName>`

All git operations use `@actions/exec` for native git CLI invocation.

### `__tests__/git-manager.test.ts`

11 tests covering:

- Branch name generation with prefix and sanitization
- Branch name timestamp format
- File creation with nested directories
- File modification (overwrite)
- File deletion
- Path traversal rejection (e.g., `../../etc/passwd`)
- Full git workflow (checkout, add, commit, push sequence)
- Git command failure handling
- Empty change set handling

## Acceptance Criteria

All met:

- [x] Branch created with configurable prefix and timestamp suffix
- [x] Created/modified files written to disk
- [x] Deleted files removed via `git rm`
- [x] Changes committed with provided message
- [x] Branch pushed to origin
- [x] Path traversal attacks rejected
- [x] Unit tests pass

## Files

- `src/git-manager.ts`
- `__tests__/git-manager.test.ts`
