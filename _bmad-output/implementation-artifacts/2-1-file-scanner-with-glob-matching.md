# Story 2.1: File Scanner with Glob Matching

Status: done

## Story

As a developer using the action, I want the action to scan repository files
matching my `paths` glob patterns, So that only relevant files are included as
context for the LLM.

## Acceptance Criteria

1. **Given** the action has a validated `ActionConfig` with `paths` (e.g.,
   `"docs/**,README.md"`) **When** `scanFiles()` in `src/file-scanner.ts`
   executes (FR12, FR13) **Then** it returns a `FileContext[]` array containing
   `{ path, content, size }` for each matching file
2. Glob patterns are comma-separated and resolve relative to the repo working
   directory
3. Files not matching any glob pattern are excluded (FR3)
4. Files in `.github/` are always excluded regardless of glob patterns
5. File sizes are tracked in bytes for each file (FR16)
6. Scanning completes within 10 seconds for repos with ≤ 10,000 files (NFR3)
7. File contents are never transmitted anywhere during scanning — only held in
   memory (NFR6)
8. Tests in `__tests__/file-scanner.test.ts` mock the file system and cover:
   valid globs, no matches, `.github/` exclusion, and size tracking

## Tasks / Subtasks

- [x] Task 1: Define types and interfaces (AC: #1)
  - [x] 1.1: Define `FileContext` interface with fields: `path: string`,
        `content: string`, `size: number`
  - [x] 1.2: Export `FileContext` type for use by other modules
- [x] Task 2: Implement `scanFiles()` function (AC: #1, #2, #3, #4, #5)
  - [x] 2.1: Accept `paths: string[]` and `workingDirectory: string` parameters
  - [x] 2.2: Use `@actions/glob` to create glob matcher
  - [x] 2.3: Add negation pattern `!.github/**` to exclude .github directory
        (AC: #4, defense-in-depth)
  - [x] 2.4: For each path pattern, call `glob.create()` with combined patterns
  - [x] 2.5: Use `globber.glob()` to get matching file paths
  - [x] 2.6: For each matched file:
    - Read file stats to get size in bytes (AC: #5)
    - Skip directories
    - Skip binary files based on extension
    - Read file content using `fs.readFileSync()`
    - Skip files that cannot be read, log warning
    - Create `FileContext` object with path, content, size
  - [x] 2.7: Track and log count of `.github/` files excluded (AC: #4)
  - [x] 2.8: Return `FileContext[]` array
- [x] Task 3: Add performance and security measures (AC: #6, #7)
  - [x] 3.1: Use synchronous file operations for simplicity and performance
  - [x] 3.2: Ensure file contents stay in memory only (NFR6)
  - [x] 3.3: Optimize for repos with ≤ 10,000 files (NFR3)
- [x] Task 4: Write tests in `__tests__/file-scanner.test.ts` (AC: #8)
  - [x] 4.1: Mock `@actions/glob` using `jest.unstable_mockModule()`
  - [x] 4.2: Mock `fs` module for file operations
  - [x] 4.3: Test: returns FileContext[] with correct path, content, size
  - [x] 4.4: Test: returns empty array when no files match
  - [x] 4.5: Test: excludes files in .github/ directory
  - [x] 4.6: Test: logs .github/ exclusion count
  - [x] 4.7: Test: passes negation pattern for .github/** to glob.create
  - [x] 4.8: Test: skips binary files based on extension
  - [x] 4.9: Test: skips directories from glob results
  - [x] 4.10: Test: skips files that cannot be read and logs warning
  - [x] 4.11: Test: tracks file size in bytes from stat
  - [x] 4.12: Verify ≥80% coverage for file-scanner.ts

## Implementation Notes

- Uses `@actions/glob` for glob pattern matching
- Synchronous file operations for simplicity and performance
- Defense-in-depth: `.github/` exclusion at scan time (guardrails also enforce
  this)
- Binary files are skipped based on file extension
- Achieves 100% test coverage with 9 comprehensive test cases

## Verification

```bash
# Run file-scanner tests
npm test -- __tests__/file-scanner.test.ts

# Test suite passes with 9 tests
```

## Files Changed

- `src/file-scanner.ts` - File scanner implementation with scanFiles function
  and FileContext interface
- `__tests__/file-scanner.test.ts` - File scanner tests (9 tests, 100%
  coverage)

## Related Requirements

- FR12: System can check out the repository and read file contents
- FR13: System can scope file reading to user-defined glob patterns
- FR16: System can track file sizes
- NFR3: File scanning completes within 10 seconds for repos with ≤ 10,000 files
- NFR6: File contents never transmitted except to LLM provider
