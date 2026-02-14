/**
 * Unit tests for prompt assembler — src/prompt-assembler.ts
 *
 * Tests cover: normal assembly, empty file list, prompt formatting,
 * context window truncation, and file exclusion.
 */
import { jest } from '@jest/globals'
import * as core from '../__fixtures__/core.js'

jest.unstable_mockModule('@actions/core', () => core)

const { buildPrompt, DEFAULT_MAX_CONTEXT_CHARS, SYSTEM_PROMPT } =
  await import('../src/prompt-assembler.js')

import type { FileContext } from '../src/file-scanner.js'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeFile(
  path: string,
  content: string,
  sizeOverride?: number
): FileContext {
  return {
    path,
    content,
    size: sizeOverride ?? Buffer.byteLength(content)
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('prompt-assembler.ts — buildPrompt()', () => {
  afterEach(() => {
    jest.resetAllMocks()
  })

  // -- Normal assembly with files -----------------------------------------

  it('returns a ChatRequest with system and user messages', () => {
    const files = [makeFile('src/main.ts', 'console.log("hello")')]
    const result = buildPrompt('Fix the bug', files, 'test-model')

    expect(result.model).toBe('test-model')
    expect(result.messages).toHaveLength(2)
    expect(result.messages[0].role).toBe('system')
    expect(result.messages[1].role).toBe('user')
  })

  it('includes the system prompt with JSON response format instructions', () => {
    const result = buildPrompt('Do stuff', [], 'model')

    expect(result.messages[0].content).toBe(SYSTEM_PROMPT)
    expect(result.messages[0].content).toContain('"files"')
    expect(result.messages[0].content).toContain('"path"')
    expect(result.messages[0].content).toContain('"content"')
    expect(result.messages[0].content).toContain('"action"')
    expect(result.messages[0].content).toContain('"summary"')
  })

  it('includes the user prompt in the user message', () => {
    const result = buildPrompt('Add a README', [], 'model')

    expect(result.messages[1].content).toContain('Add a README')
    expect(result.messages[1].content).toContain('# Change Request')
  })

  it('includes file contents with clear delimiters', () => {
    const files = [makeFile('src/app.ts', 'export const app = true', 23)]

    const result = buildPrompt('Update app', files, 'model')
    const userContent = result.messages[1].content

    expect(userContent).toContain('--- FILE: src/app.ts (23 bytes) ---')
    expect(userContent).toContain('export const app = true')
    expect(userContent).toContain('--- END FILE ---')
  })

  it('includes multiple files in order', () => {
    const files = [
      makeFile('a.ts', 'file-a'),
      makeFile('b.ts', 'file-b'),
      makeFile('c.ts', 'file-c')
    ]

    const result = buildPrompt('Update all', files, 'model')
    const userContent = result.messages[1].content

    const posA = userContent.indexOf('--- FILE: a.ts')
    const posB = userContent.indexOf('--- FILE: b.ts')
    const posC = userContent.indexOf('--- FILE: c.ts')

    expect(posA).toBeLessThan(posB)
    expect(posB).toBeLessThan(posC)
  })

  // -- Empty file list ----------------------------------------------------

  it('returns a valid ChatRequest with empty file list', () => {
    const result = buildPrompt('Create a new file', [], 'model')

    expect(result.messages).toHaveLength(2)
    expect(result.messages[1].content).toContain('# Repository Files')
    expect(result.messages[1].content).not.toContain('--- FILE:')
  })

  // -- Default parameters -------------------------------------------------

  it('defaults model to empty string', () => {
    const result = buildPrompt('Test', [])

    expect(result.model).toBe('')
  })

  it('exports DEFAULT_MAX_CONTEXT_CHARS as a positive number', () => {
    expect(DEFAULT_MAX_CONTEXT_CHARS).toBeGreaterThan(0)
    expect(typeof DEFAULT_MAX_CONTEXT_CHARS).toBe('number')
  })

  // -- Context window truncation ------------------------------------------

  it('truncates a file that partially fits within the budget', () => {
    // Use a very small budget to force truncation
    const longContent = 'x'.repeat(1000)
    const files = [makeFile('big.ts', longContent, 1000)]

    // Budget: system + header + some content but not all
    const smallBudget = SYSTEM_PROMPT.length + 300

    const result = buildPrompt('Fix it', files, 'model', smallBudget)
    const userContent = result.messages[1].content

    // Should be truncated (TRUNCATED marker in header)
    expect(userContent).toContain('TRUNCATED')
    expect(userContent).toContain('--- FILE: big.ts')
    expect(userContent).toContain('--- END FILE ---')
    // Content should be shorter than original
    expect(userContent.length).toBeLessThan(
      SYSTEM_PROMPT.length + longContent.length + 200
    )
    // Warning logged
    expect(core.warning).toHaveBeenCalled()
  })

  it('excludes a file entirely when there is no room at all', () => {
    const files = [makeFile('huge.ts', 'x'.repeat(5000), 5000)]

    // Budget so small that even the header doesn't fit
    const tinyBudget = SYSTEM_PROMPT.length + 50

    const result = buildPrompt('Fix it', files, 'model', tinyBudget)
    const userContent = result.messages[1].content

    expect(userContent).not.toContain('--- FILE: huge.ts')
    expect(core.warning).toHaveBeenCalled()
  })

  it('includes first files and excludes later ones when budget runs out', () => {
    const smallContent = 'a'.repeat(50)
    const files = [
      makeFile('first.ts', smallContent, 50),
      makeFile('second.ts', smallContent, 50),
      makeFile('third.ts', smallContent, 50)
    ]

    // Budget enough for system + user header + ~1 file block
    const block1Len =
      '--- FILE: first.ts (50 bytes) ---\n'.length +
      smallContent.length +
      '\n--- END FILE ---'.length
    const headerLen = '# Change Request\n\nFix\n\n# Repository Files\n'.length
    const budget = SYSTEM_PROMPT.length + headerLen + block1Len + 10 // +10 for newline

    const result = buildPrompt('Fix', files, 'model', budget)
    const userContent = result.messages[1].content

    expect(userContent).toContain('--- FILE: first.ts')
    // At least one later file should be excluded or truncated
    const secondIncluded = userContent.includes('--- FILE: second.ts')
    const thirdIncluded = userContent.includes('--- FILE: third.ts')
    expect(secondIncluded && thirdIncluded).toBe(false)
  })

  // -- Prompt formatting --------------------------------------------------

  it('contains a Repository Files section header', () => {
    const result = buildPrompt('Test', [makeFile('f.ts', 'code')])

    expect(result.messages[1].content).toContain('# Repository Files')
  })

  it('contains a Change Request section header with the user prompt', () => {
    const result = buildPrompt('Refactor the module', [])

    const content = result.messages[1].content
    expect(content).toContain('# Change Request')
    expect(content).toContain('Refactor the module')
  })
})
