/**
 * Unit tests for the guardrails module — src/guardrails.ts
 *
 * Tests cover: within limits, exceeds max_files, exceeds max_changes,
 * out-of-scope path, .github/ path, edge cases (exactly at limit).
 */
import { jest } from '@jest/globals'
import * as core from '../__fixtures__/core.js'

// Mock @actions/core before importing the module under test
jest.unstable_mockModule('@actions/core', () => core)

const { validateChanges } = await import('../src/guardrails.js')
const { GuardrailError } = await import('../src/errors.js')

import type { ActionConfig } from '../src/config.js'
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

  // -- max_changes limit (FR15, FR30) --------------------------------------

  it('throws GuardrailError when total lines exceed max_changes', () => {
    // 201 lines should exceed limit of 200
    const longContent = Array.from({ length: 201 }, (_, i) => `line ${i}`).join(
      '\n'
    )
    const changes = [makeChange({ content: longContent })]
    const config = makeConfig({ maxChanges: 200 })

    expect(() => validateChanges(changes, config)).toThrow(GuardrailError)
    expect(() => validateChanges(changes, config)).toThrow(
      /exceeds the max_changes limit of 200/
    )
  })

  it('passes when total lines exactly equals max_changes', () => {
    // 5 lines of content = 5 lines changed
    const content = 'a\nb\nc\nd\ne'
    const changes = [makeChange({ content })]
    const config = makeConfig({ maxChanges: 5 })

    expect(validateChanges(changes, config)).toHaveLength(1)
  })

  it('counts delete actions as 1 line changed', () => {
    const changes = [makeChange({ action: 'delete', content: '' })]
    const config = makeConfig({ maxChanges: 1 })

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
