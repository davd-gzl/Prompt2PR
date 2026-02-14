# Story 2.1: File Scanner with Glob Matching

## Status: complete

## Story

As a developer using the action, I want the action to scan repository files
matching my `paths` glob patterns, So that only relevant files are included as
context for the LLM.

## Key Implementation Details

### `src/file-scanner.ts`

- Exports `scanFiles(paths, workDir?)` which uses `@actions/glob` to resolve
  glob patterns against the repository working directory.
- Returns `FileContext[]` where each entry contains `{ path, content, size }`.
- Exclusion rules (defense-in-depth):
  - `.github/` files are always excluded (FR31).
  - Binary files are excluded by extension (images, executables, archives,
    etc.).
  - Lock files (e.g. `package-lock.json`, `yarn.lock`) are excluded.
  - Directories are skipped (only regular files are returned).
- All returned paths use POSIX forward-slash format regardless of OS.
- Logs a path-scope summary showing matched / excluded / included counts.

### `__tests__/file-scanner.test.ts`

13 tests covering:

- Valid glob patterns returning expected files
- No-match globs returning empty array
- `.github/` directory exclusion
- Binary file skip by extension
- Directory entry skip
- Graceful handling of file-read errors
- Lock file exclusion
- POSIX path normalization
- Default `workDir` behavior (falls back to `process.cwd()`)

## Acceptance Criteria

All criteria met:

| #   | Criterion                                                | Status |
| --- | -------------------------------------------------------- | ------ |
| 1   | Returns `FileContext[]` with path, content, size         | Done   |
| 2   | Glob patterns resolve relative to repo working directory | Done   |
| 3   | `.github/` always excluded                               | Done   |
| 4   | File sizes tracked in bytes                              | Done   |
| 5   | Tests mock file system with ≥80% coverage                | Done   |

## File List

- `src/file-scanner.ts`
- `__tests__/file-scanner.test.ts`
