/**
 * Unit tests for file scanner — src/file-scanner.ts
 *
 * Tests cover: valid glob matching, no matches, .github/ exclusion,
 * binary file exclusion, size tracking, and read errors.
 */
import { jest } from '@jest/globals'
import * as path from 'node:path'
import * as core from '../__fixtures__/core.js'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

jest.unstable_mockModule('@actions/core', () => core)

// Mock node:fs/promises
const mockStat =
  jest.fn<
    (p: string) => Promise<{ isDirectory: () => boolean; size: number }>
  >()
const mockReadFile =
  jest.fn<(p: string, enc: BufferEncoding) => Promise<string>>()

jest.unstable_mockModule('node:fs/promises', () => ({
  stat: mockStat,
  readFile: mockReadFile
}))

// Mock @actions/glob
const mockGlob = jest.fn<() => Promise<string[]>>()
const mockCreate =
  jest.fn<
    (
      patterns: string,
      options?: object
    ) => Promise<{ glob: () => Promise<string[]> }>
  >()

jest.unstable_mockModule('@actions/glob', () => ({
  create: mockCreate
}))

// Import module under test after mocks
const { scanFiles } = await import('../src/file-scanner.js')

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const WORK_DIR = '/repo'

function setupGlob(matchedFiles: string[]): void {
  mockGlob.mockResolvedValue(matchedFiles)
  mockCreate.mockResolvedValue({ glob: mockGlob })
}

function setupStat(
  statMap: Record<string, { isDir: boolean; size: number }>
): void {
  mockStat.mockImplementation(async (p: string) => {
    const entry = statMap[p]
    if (!entry) {
      throw new Error(`ENOENT: no such file: ${p}`)
    }
    return { isDirectory: () => entry.isDir, size: entry.size }
  })
}

function setupReadFile(contentMap: Record<string, string>): void {
  mockReadFile.mockImplementation(async (p: string) => {
    const content = contentMap[p]
    if (content === undefined) {
      throw new Error(`ENOENT: no such file: ${p}`)
    }
    return content
  })
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('file-scanner.ts — scanFiles()', () => {
  afterEach(() => {
    jest.resetAllMocks()
  })

  // -- Valid glob matching with results -----------------------------------

  it('returns FileContext[] for matched files with correct path, content, size', async () => {
    const files = [
      path.join(WORK_DIR, 'src/main.ts'),
      path.join(WORK_DIR, 'README.md')
    ]
    setupGlob(files)
    setupStat({
      [files[0]]: { isDir: false, size: 100 },
      [files[1]]: { isDir: false, size: 50 }
    })
    setupReadFile({
      [files[0]]: 'console.log("hello")',
      [files[1]]: '# README'
    })

    const result = await scanFiles(['src/**', 'README.md'], WORK_DIR)

    expect(result).toHaveLength(2)
    expect(result[0]).toEqual({
      path: 'src/main.ts',
      content: 'console.log("hello")',
      size: 100
    })
    expect(result[1]).toEqual({
      path: 'README.md',
      content: '# README',
      size: 50
    })
  })

  // -- No matches ---------------------------------------------------------

  it('returns empty array when no files match', async () => {
    setupGlob([])

    const result = await scanFiles(['nonexistent/**'], WORK_DIR)

    expect(result).toEqual([])
  })

  // -- .github/ exclusion -------------------------------------------------

  it('excludes files in .github/ directory (defense-in-depth)', async () => {
    // Simulate .github/ file sneaking through the glob
    const files = [
      path.join(WORK_DIR, '.github/workflows/ci.yml'),
      path.join(WORK_DIR, 'src/main.ts')
    ]
    setupGlob(files)
    setupStat({
      [files[0]]: { isDir: false, size: 200 },
      [files[1]]: { isDir: false, size: 100 }
    })
    setupReadFile({
      [files[0]]: 'name: CI',
      [files[1]]: 'code here'
    })

    const result = await scanFiles(['**'], WORK_DIR)

    expect(result).toHaveLength(1)
    expect(result[0].path).toBe('src/main.ts')
  })

  // -- Glob pattern construction includes .github exclusion ---------------

  it('passes negation pattern for .github/** to glob.create', async () => {
    setupGlob([])

    await scanFiles(['src/**'], WORK_DIR)

    expect(mockCreate).toHaveBeenCalledTimes(1)
    const patternsArg = mockCreate.mock.calls[0][0] as string
    expect(patternsArg).toContain('!') // has negation pattern
    expect(patternsArg).toContain('.github')
  })

  // -- Binary file exclusion ----------------------------------------------

  it('skips binary files based on extension', async () => {
    const files = [
      path.join(WORK_DIR, 'image.png'),
      path.join(WORK_DIR, 'doc.pdf'),
      path.join(WORK_DIR, 'src/app.ts')
    ]
    setupGlob(files)
    setupStat({
      [files[0]]: { isDir: false, size: 5000 },
      [files[1]]: { isDir: false, size: 3000 },
      [files[2]]: { isDir: false, size: 200 }
    })
    setupReadFile({
      [files[2]]: 'export const app = true'
    })

    const result = await scanFiles(['**'], WORK_DIR)

    expect(result).toHaveLength(1)
    expect(result[0].path).toBe('src/app.ts')
  })

  // -- Directories are skipped --------------------------------------------

  it('skips directories from glob results', async () => {
    const files = [
      path.join(WORK_DIR, 'src'),
      path.join(WORK_DIR, 'src/index.ts')
    ]
    setupGlob(files)
    setupStat({
      [files[0]]: { isDir: true, size: 0 },
      [files[1]]: { isDir: false, size: 80 }
    })
    setupReadFile({
      [files[1]]: 'import { run } from "./main.js"'
    })

    const result = await scanFiles(['src/**'], WORK_DIR)

    expect(result).toHaveLength(1)
    expect(result[0].path).toBe('src/index.ts')
  })

  // -- File read error is handled gracefully ------------------------------

  it('skips files that cannot be read and logs a warning', async () => {
    const files = [
      path.join(WORK_DIR, 'unreadable.ts'),
      path.join(WORK_DIR, 'readable.ts')
    ]
    setupGlob(files)
    setupStat({
      [files[0]]: { isDir: false, size: 100 },
      [files[1]]: { isDir: false, size: 50 }
    })
    mockReadFile.mockImplementation(async (p: string) => {
      if (p === files[0]) throw new Error('EACCES: permission denied')
      return 'valid content'
    })

    const result = await scanFiles(['**'], WORK_DIR)

    expect(result).toHaveLength(1)
    expect(result[0].path).toBe('readable.ts')
    // Logger.warn was called (via core.warning)
    expect(core.warning).toHaveBeenCalled()
  })

  // -- Size tracking (FR16) -----------------------------------------------

  it('tracks file size in bytes from stat', async () => {
    const files = [path.join(WORK_DIR, 'large-file.ts')]
    setupGlob(files)
    setupStat({
      [files[0]]: { isDir: false, size: 12345 }
    })
    setupReadFile({
      [files[0]]: 'a'.repeat(100)
    })

    const result = await scanFiles(['**'], WORK_DIR)

    expect(result).toHaveLength(1)
    expect(result[0].size).toBe(12345)
  })

  // -- Uses forward slashes in paths --------------------------------------

  it('returns paths with forward slashes (POSIX-style)', async () => {
    const files = [path.join(WORK_DIR, 'src', 'utils', 'helper.ts')]
    setupGlob(files)
    setupStat({
      [files[0]]: { isDir: false, size: 50 }
    })
    setupReadFile({
      [files[0]]: 'export function helper() {}'
    })

    const result = await scanFiles(['src/**'], WORK_DIR)

    expect(result[0].path).toBe('src/utils/helper.ts')
    expect(result[0].path).not.toContain('\\')
  })

  // -- Lock files are excluded (binary extension list) --------------------

  it('skips lock files', async () => {
    const files = [
      path.join(WORK_DIR, 'package-lock.json.lock'),
      path.join(WORK_DIR, 'yarn.lock'),
      path.join(WORK_DIR, 'package.json')
    ]
    setupGlob(files)
    setupStat({
      [files[0]]: { isDir: false, size: 50000 },
      [files[1]]: { isDir: false, size: 80000 },
      [files[2]]: { isDir: false, size: 500 }
    })
    setupReadFile({
      [files[2]]: '{ "name": "test" }'
    })

    const result = await scanFiles(['**'], WORK_DIR)

    expect(result).toHaveLength(1)
    expect(result[0].path).toBe('package.json')
  })

  // -- Default workDir parameter ------------------------------------------

  it('defaults workDir to process.cwd() when not provided', async () => {
    const cwd = process.cwd()
    const files = [path.join(cwd, 'foo.ts')]
    setupGlob(files)
    setupStat({
      [files[0]]: { isDir: false, size: 10 }
    })
    setupReadFile({
      [files[0]]: 'export const foo = 1'
    })

    const result = await scanFiles(['**'])

    expect(result).toHaveLength(1)
    expect(result[0].path).toBe('foo.ts')
  })
})
