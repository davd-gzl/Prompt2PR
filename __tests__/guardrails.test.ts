/**
 * Unit tests for the guardrails module — src/guardrails.ts
 *
 * Tests cover: within limits, exceeds max_files, exceeds max_changes,
 * out-of-scope path, .github/ path, edge cases (exactly at limit),
 * and diff-based change counting.
 */
import { jest } from '@jest/globals'
import * as core from '../__fixtures__/core.js'

// Mock @actions/core before importing the module under test
jest.unstable_mockModule('@actions/core', () => core)

const { validateChanges, countLinesChanged } =
  await import('../src/guardrails.js')
const { GuardrailError } = await import('../src/errors.js')

import type { ActionConfig } from '../src/config.js'
import type { FileContext } from '../src/file-scanner.js'
import type { FileChange } from '../src/providers/types.js'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a minimal valid ActionConfig for testing. */
function makeConfig(overrides: Partial<ActionConfig> = {}): ActionConfig {
  return {
    prompt: 'Fix broken links',
    provider: 'mistral',
    model: 'mistral-large-latest',
    paths: ['**'],
    maxFiles: 10,
    maxChanges: 200,
    labels: ['prompt2pr'],
    branchPrefix: 'prompt2pr/',
    dryRun: false,
    baseUrl: '',
    apiKey: 'test-key',
    ...overrides
  }
}

/** Build a simple FileChange for testing. */
function makeChange(overrides: Partial<FileChange> = {}): FileChange {
  return {
    path: 'src/main.ts',
    content: 'console.log("hello")\n',
    action: 'modify',
    ...overrides
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('guardrails.ts — validateChanges()', () => {
  afterEach(() => {
    jest.resetAllMocks()
  })

  // -- Happy path -----------------------------------------------------------

  it('returns changes unchanged when all guardrails pass', () => {
    const changes: FileChange[] = [
      makeChange({ path: 'src/main.ts' }),
      makeChange({ path: 'src/utils.ts', action: 'create' })
    ]
    const config = makeConfig()

    const result = validateChanges(changes, config)

    expect(result).toEqual(changes)
    expect(result).toHaveLength(2)
  })

  it('returns empty array for empty changes', () => {
    const result = validateChanges([], makeConfig())
    expect(result).toEqual([])
  })

  // -- Path traversal protection (security) --------------------------------

  it('throws GuardrailError for paths containing ".." traversal', () => {
    const changes = [makeChange({ path: '../../etc/passwd' })]
    const config = makeConfig()

    expect(() => validateChanges(changes, config)).toThrow(GuardrailError)
    expect(() => validateChanges(changes, config)).toThrow(/path traversal/)
  })

  it('throws GuardrailError for paths with ".." in the middle', () => {
    const changes = [makeChange({ path: 'src/../../../etc/passwd' })]
    const config = makeConfig()

    expect(() => validateChanges(changes, config)).toThrow(GuardrailError)
    expect(() => validateChanges(changes, config)).toThrow(/path traversal/)
  })

  it('throws GuardrailError for absolute paths', () => {
    const changes = [makeChange({ path: '/etc/passwd' })]
    const config = makeConfig()

    expect(() => validateChanges(changes, config)).toThrow(GuardrailError)
    expect(() => validateChanges(changes, config)).toThrow(/absolute path/)
  })

  it('allows paths that contain ".." as part of a filename', () => {
    const changes = [makeChange({ path: 'src/..hidden-file.ts' })]
    const config = makeConfig()

    expect(validateChanges(changes, config)).toHaveLength(1)
  })

  it('throws GuardrailError for paths starting with "-" (flag injection prevention)', () => {
    const changes = [makeChange({ path: '-malicious' })]
    const config = makeConfig()

    expect(() => validateChanges(changes, config)).toThrow(GuardrailError)
    expect(() => validateChanges(changes, config)).toThrow(/starts with '-'/)
  })

  // -- .github/ exclusion (FR31) -------------------------------------------

  it('throws GuardrailError for files in .github/ directory', () => {
    const changes = [makeChange({ path: '.github/workflows/ci.yml' })]
    const config = makeConfig()

    expect(() => validateChanges(changes, config)).toThrow(GuardrailError)
    expect(() => validateChanges(changes, config)).toThrow(/\.github\//)
  })

  it('throws GuardrailError for .github path itself', () => {
    const changes = [makeChange({ path: '.github' })]
    const config = makeConfig()

    expect(() => validateChanges(changes, config)).toThrow(GuardrailError)
  })

  it('throws GuardrailError for .GitHub/ with different casing (case-insensitive)', () => {
    const changes = [makeChange({ path: '.GitHub/workflows/evil.yml' })]
    const config = makeConfig()

    expect(() => validateChanges(changes, config)).toThrow(GuardrailError)
    expect(() => validateChanges(changes, config)).toThrow(/\.github\//)
  })

  it('throws GuardrailError for .GITHUB/ uppercase variant', () => {
    const changes = [makeChange({ path: '.GITHUB' })]
    const config = makeConfig()

    expect(() => validateChanges(changes, config)).toThrow(GuardrailError)
  })

  it('does not reject files that merely contain "github" in the path', () => {
    const changes = [makeChange({ path: 'src/github-utils.ts' })]
    const config = makeConfig()

    expect(validateChanges(changes, config)).toHaveLength(1)
  })

  // -- Paths scope (FR29) --------------------------------------------------

  it('throws GuardrailError for files outside configured paths scope', () => {
    const changes = [makeChange({ path: 'docs/readme.md' })]
    const config = makeConfig({ paths: ['src/**'] })

    expect(() => validateChanges(changes, config)).toThrow(GuardrailError)
    expect(() => validateChanges(changes, config)).toThrow(
      /outside the configured paths scope/
    )
  })

  it('allows files matching configured paths scope', () => {
    const changes = [makeChange({ path: 'src/main.ts' })]
    const config = makeConfig({ paths: ['src/**'] })

    expect(validateChanges(changes, config)).toHaveLength(1)
  })

  it('supports ** wildcard matching all paths', () => {
    const changes = [
      makeChange({ path: 'src/main.ts' }),
      makeChange({ path: 'docs/readme.md' }),
      makeChange({ path: 'deep/nested/path/file.js' })
    ]
    const config = makeConfig({ paths: ['**'] })

    expect(validateChanges(changes, config)).toHaveLength(3)
  })

  it('supports multiple path patterns', () => {
    const changes = [
      makeChange({ path: 'src/main.ts' }),
      makeChange({ path: 'docs/readme.md' })
    ]
    const config = makeConfig({ paths: ['src/**', 'docs/**'] })

    expect(validateChanges(changes, config)).toHaveLength(2)
  })

  // -- max_files limit (FR14, FR30) ----------------------------------------

  it('throws GuardrailError when file count exceeds max_files', () => {
    const changes = Array.from({ length: 11 }, (_, i) =>
      makeChange({ path: `src/file${i}.ts` })
    )
    const config = makeConfig({ maxFiles: 10 })

    expect(() => validateChanges(changes, config)).toThrow(GuardrailError)
    expect(() => validateChanges(changes, config)).toThrow(
      /exceeds the max_files limit of 10/
    )
  })

  it('passes when file count exactly equals max_files', () => {
    const changes = Array.from({ length: 10 }, (_, i) =>
      makeChange({ path: `src/file${i}.ts` })
    )
    const config = makeConfig({ maxFiles: 10 })

    expect(validateChanges(changes, config)).toHaveLength(10)
  })

  // -- max_changes limit (FR15, FR30) — diff-based counting ----------------

  it('throws GuardrailError when total lines exceed max_changes (create action)', () => {
    // 201 new lines in a create action should exceed limit of 200
    const longContent = Array.from({ length: 201 }, (_, i) => `line ${i}`).join(
      '\n'
    )
    const changes = [makeChange({ content: longContent, action: 'create' })]
    const config = makeConfig({ maxChanges: 200 })

    expect(() => validateChanges(changes, config)).toThrow(GuardrailError)
    expect(() => validateChanges(changes, config)).toThrow(
      /exceeds the max_changes limit of 200/
    )
  })

  it('passes when total lines exactly equals max_changes (create action)', () => {
    // 5 lines of content in a create = 5 lines changed
    const content = 'a\nb\nc\nd\ne'
    const changes = [makeChange({ content, action: 'create' })]
    const config = makeConfig({ maxChanges: 5 })

    expect(validateChanges(changes, config)).toHaveLength(1)
  })

  it('counts delete actions as original file line count when scanned', () => {
    const originalContent = 'line1\nline2\nline3'
    const scannedFiles: FileContext[] = [
      { path: 'src/main.ts', content: originalContent, size: 100 }
    ]
    const changes = [makeChange({ action: 'delete', content: '' })]
    const config = makeConfig({ maxChanges: 3 })

    expect(validateChanges(changes, config, scannedFiles)).toHaveLength(1)
  })

  it('counts delete actions as 1 when original not in scanned files', () => {
    const changes = [makeChange({ action: 'delete', content: '' })]
    const config = makeConfig({ maxChanges: 1 })

    expect(validateChanges(changes, config)).toHaveLength(1)
  })

  it('counts only diff lines for modify when original is available', () => {
    // Original has 100 lines, new content changes 1 line → 2 changed (1 remove + 1 add)
    const originalLines = Array.from({ length: 100 }, (_, i) => `line ${i}`)
    const newLines = [...originalLines]
    newLines[50] = 'CHANGED LINE 50'

    const scannedFiles: FileContext[] = [
      {
        path: 'src/main.ts',
        content: originalLines.join('\n'),
        size: 1000
      }
    ]
    const changes = [makeChange({ content: newLines.join('\n') })]
    // 2 changed lines (1 removal + 1 addition) should be well under 200
    const config = makeConfig({ maxChanges: 200 })

    expect(validateChanges(changes, config, scannedFiles)).toHaveLength(1)
  })

  it('rejects modify that exceeds max_changes via diff', () => {
    // Original has 10 lines, new content replaces all 10 → 20 diff lines
    const originalLines = Array.from({ length: 10 }, (_, i) => `old ${i}`)
    const newLines = Array.from({ length: 10 }, (_, i) => `new ${i}`)

    const scannedFiles: FileContext[] = [
      {
        path: 'src/main.ts',
        content: originalLines.join('\n'),
        size: 100
      }
    ]
    const changes = [makeChange({ content: newLines.join('\n') })]
    // 20 diff lines (10 removals + 10 additions), limit is 10
    const config = makeConfig({ maxChanges: 10 })

    expect(() => validateChanges(changes, config, scannedFiles)).toThrow(
      GuardrailError
    )
    expect(() => validateChanges(changes, config, scannedFiles)).toThrow(
      /exceeds the max_changes limit of 10/
    )
  })

  it('falls back to full line count for modify without scanned original', () => {
    // No scanned files → falls back to counting all new content lines
    const content = 'a\nb\nc\nd\ne' // 5 lines
    const changes = [makeChange({ content })]
    const config = makeConfig({ maxChanges: 5 })

    // Should pass: 5 lines <= 5 max
    expect(validateChanges(changes, config)).toHaveLength(1)
  })

  // -- Error message quality -----------------------------------------------

  it('includes the actual count and limit in max_files error messages', () => {
    const changes = Array.from({ length: 5 }, (_, i) =>
      makeChange({ path: `src/file${i}.ts` })
    )
    const config = makeConfig({ maxFiles: 3 })

    expect(() => validateChanges(changes, config)).toThrow(
      /5 file change\(s\).*max_files limit of 3/
    )
  })

  it('includes the file path and allowed patterns in scope error messages', () => {
    const changes = [makeChange({ path: 'lib/other.ts' })]
    const config = makeConfig({ paths: ['src/**'] })

    expect(() => validateChanges(changes, config)).toThrow(
      /lib\/other\.ts.*outside the configured paths scope.*src\/\*\*/
    )
  })

  // -- Per-file content size limit (resource exhaustion prevention) --------

  it('throws GuardrailError when a file content exceeds 1 MB', () => {
    // Create content slightly over 1 MB
    const largeContent = 'x'.repeat(1_048_577)
    const changes = [makeChange({ content: largeContent })]
    const config = makeConfig({ maxChanges: 2_000_000 })

    expect(() => validateChanges(changes, config)).toThrow(GuardrailError)
    expect(() => validateChanges(changes, config)).toThrow(
      /exceeds the per-file limit/
    )
  })

  it('allows file content at exactly 1 MB', () => {
    const content = 'x'.repeat(1_048_576)
    const changes = [makeChange({ content })]
    const config = makeConfig({ maxChanges: 2_000_000 })

    expect(validateChanges(changes, config)).toHaveLength(1)
  })

  it('skips content size check for delete actions', () => {
    const changes = [makeChange({ action: 'delete', content: '' })]
    const config = makeConfig({ maxChanges: 1 })

    expect(validateChanges(changes, config)).toHaveLength(1)
  })
})

// ---------------------------------------------------------------------------
// countLinesChanged — diff-based counting
// ---------------------------------------------------------------------------

describe('guardrails.ts — countLinesChanged()', () => {
  it('counts all lines for create action (no original)', () => {
    const changes: FileChange[] = [
      { path: 'new-file.ts', content: 'a\nb\nc', action: 'create' }
    ]
    expect(countLinesChanged(changes)).toBe(3)
  })

  it('counts 0 for modify with identical content', () => {
    const content = 'line1\nline2\nline3'
    const scannedFiles: FileContext[] = [
      { path: 'src/main.ts', content, size: 100 }
    ]
    const changes: FileChange[] = [
      { path: 'src/main.ts', content, action: 'modify' }
    ]
    expect(countLinesChanged(changes, scannedFiles)).toBe(0)
  })

  it('counts only changed lines for modify (single line edit)', () => {
    const original = 'line1\nline2\nline3'
    const modified = 'line1\nLINE2_CHANGED\nline3'
    const scannedFiles: FileContext[] = [
      { path: 'src/main.ts', content: original, size: 100 }
    ]
    const changes: FileChange[] = [
      { path: 'src/main.ts', content: modified, action: 'modify' }
    ]
    // 1 line removed + 1 line added = 2
    expect(countLinesChanged(changes, scannedFiles)).toBe(2)
  })

  it('counts additions when lines are added', () => {
    const original = 'line1\nline2'
    const modified = 'line1\nline2\nline3\nline4'
    const scannedFiles: FileContext[] = [
      { path: 'src/main.ts', content: original, size: 50 }
    ]
    const changes: FileChange[] = [
      { path: 'src/main.ts', content: modified, action: 'modify' }
    ]
    // 2 lines added, 0 removed = 2
    expect(countLinesChanged(changes, scannedFiles)).toBe(2)
  })

  it('counts removals when lines are deleted from content', () => {
    const original = 'line1\nline2\nline3\nline4'
    const modified = 'line1\nline4'
    const scannedFiles: FileContext[] = [
      { path: 'src/main.ts', content: original, size: 50 }
    ]
    const changes: FileChange[] = [
      { path: 'src/main.ts', content: modified, action: 'modify' }
    ]
    // 2 lines removed, 0 added = 2
    expect(countLinesChanged(changes, scannedFiles)).toBe(2)
  })

  it('counts original file lines for delete action when scanned', () => {
    const scannedFiles: FileContext[] = [
      { path: 'src/main.ts', content: 'a\nb\nc\nd\ne', size: 50 }
    ]
    const changes: FileChange[] = [
      { path: 'src/main.ts', content: '', action: 'delete' }
    ]
    // 5 lines being deleted
    expect(countLinesChanged(changes, scannedFiles)).toBe(5)
  })

  it('counts 1 for delete action when original not in scanned files', () => {
    const changes: FileChange[] = [
      { path: 'src/unknown.ts', content: '', action: 'delete' }
    ]
    expect(countLinesChanged(changes)).toBe(1)
  })

  it('falls back to full line count for modify without scanned original', () => {
    const changes: FileChange[] = [
      { path: 'src/main.ts', content: 'a\nb\nc', action: 'modify' }
    ]
    // No scanned files → counts all 3 lines
    expect(countLinesChanged(changes)).toBe(3)
  })

  it('handles multiple files with mixed actions', () => {
    const scannedFiles: FileContext[] = [
      { path: 'src/a.ts', content: 'old1\nold2\nold3', size: 50 },
      { path: 'src/b.ts', content: 'x\ny\nz', size: 30 }
    ]
    const changes: FileChange[] = [
      // modify: change 1 line → 2 diff lines
      { path: 'src/a.ts', content: 'old1\nNEW2\nold3', action: 'modify' },
      // delete: 3 original lines
      { path: 'src/b.ts', content: '', action: 'delete' },
      // create: 2 new lines
      { path: 'src/c.ts', content: 'new1\nnew2', action: 'create' }
    ]
    // 2 (modify diff) + 3 (delete original lines) + 2 (create) = 7
    expect(countLinesChanged(changes, scannedFiles)).toBe(7)
  })

  it('counts 0 for empty changes array', () => {
    expect(countLinesChanged([])).toBe(0)
  })
})
