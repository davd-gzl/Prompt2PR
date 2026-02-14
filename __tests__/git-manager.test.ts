/**
 * Unit tests for the git manager — src/git-manager.ts
 *
 * Tests cover: successful flow, branch creation, file writing, staging,
 * committing, pushing, error handling for git failures and file write errors.
 */
import { jest } from '@jest/globals'
import * as core from '../__fixtures__/core.js'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockGetExecOutput =
  jest.fn<
    (
      cmd: string,
      args?: string[],
      opts?: object
    ) => Promise<{ exitCode: number; stdout: string; stderr: string }>
  >()

jest.unstable_mockModule('@actions/core', () => core)
jest.unstable_mockModule('@actions/exec', () => ({
  getExecOutput: mockGetExecOutput
}))

const mockWriteFile =
  jest.fn<(path: string, data: string, enc: string) => Promise<void>>()
const mockMkdir = jest.fn<(path: string, opts: object) => Promise<void>>()
const mockUnlink = jest.fn<(path: string) => Promise<void>>()

jest.unstable_mockModule('node:fs/promises', () => ({
  writeFile: mockWriteFile,
  mkdir: mockMkdir,
  unlink: mockUnlink
}))

const { commitAndPush, buildBranchName, applyChanges } =
  await import('../src/git-manager.js')
const { GitError } = await import('../src/errors.js')

import type { FileChange } from '../src/providers/types.js'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mockGitSuccess(stdout = ''): void {
  mockGetExecOutput.mockResolvedValueOnce({
    exitCode: 0,
    stdout,
    stderr: ''
  })
}

function mockGitFailure(stderr = 'fatal error'): void {
  mockGetExecOutput.mockResolvedValueOnce({
    exitCode: 1,
    stdout: '',
    stderr
  })
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('git-manager.ts — buildBranchName()', () => {
  it('generates a branch name with prefix, sanitized workflow name, and timestamp', () => {
    const name = buildBranchName('prompt2pr/', 'My Workflow')

    expect(name).toMatch(/^prompt2pr\/my-workflow-\d{14}$/)
  })

  it('sanitizes special characters in workflow name', () => {
    const name = buildBranchName('p2pr/', 'Fix: All the_Things!! (v2)')

    expect(name).toMatch(/^p2pr\/fix-all-the-things-v2-\d{14}$/)
  })

  it('handles empty workflow name', () => {
    const name = buildBranchName('prompt2pr/', '')

    expect(name).toMatch(/^prompt2pr\/-\d{14}$/)
  })
})

describe('git-manager.ts — applyChanges()', () => {
  afterEach(() => {
    jest.resetAllMocks()
  })

  it('writes files for create/modify actions', async () => {
    mockWriteFile.mockResolvedValue(undefined)
    mockMkdir.mockResolvedValue(undefined)

    const changes: FileChange[] = [
      { path: 'src/foo.ts', content: 'hello', action: 'modify' },
      { path: 'new/dir/bar.ts', content: 'world', action: 'create' }
    ]

    await applyChanges(changes, '/repo')

    expect(mockMkdir).toHaveBeenCalledTimes(2)
    expect(mockWriteFile).toHaveBeenCalledTimes(2)
    expect(mockWriteFile).toHaveBeenCalledWith(
      '/repo/src/foo.ts',
      'hello',
      'utf-8'
    )
  })

  it('deletes files for delete actions', async () => {
    mockUnlink.mockResolvedValue(undefined)

    const changes: FileChange[] = [
      { path: 'old-file.txt', content: '', action: 'delete' }
    ]

    await applyChanges(changes, '/repo')

    expect(mockUnlink).toHaveBeenCalledWith('/repo/old-file.txt')
  })

  it('throws GitError when file write fails', async () => {
    mockMkdir.mockResolvedValue(undefined)
    mockWriteFile.mockRejectedValue(new Error('permission denied'))

    const changes: FileChange[] = [
      { path: 'src/foo.ts', content: 'hello', action: 'modify' }
    ]

    await expect(applyChanges(changes, '/repo')).rejects.toThrow(GitError)
    await expect(applyChanges(changes, '/repo')).rejects.toThrow(
      /Failed to write file/
    )
  })

  it('throws GitError when file delete fails', async () => {
    mockUnlink.mockRejectedValueOnce(new Error('file not found'))

    const changes: FileChange[] = [
      { path: 'missing.txt', content: '', action: 'delete' }
    ]

    await expect(applyChanges(changes, '/repo')).rejects.toThrow(GitError)
  })

  it('throws GitError for path traversal attempts (defense-in-depth)', async () => {
    const changes: FileChange[] = [
      { path: '../../etc/passwd', content: 'malicious', action: 'create' }
    ]

    await expect(applyChanges(changes, '/repo')).rejects.toThrow(GitError)
    await expect(applyChanges(changes, '/repo')).rejects.toThrow(
      /Path traversal detected/
    )
  })
})

describe('git-manager.ts — commitAndPush()', () => {
  afterEach(() => {
    jest.resetAllMocks()
  })

  it('executes the full git workflow: checkout, apply, add, commit, push', async () => {
    // Mock: checkout -b, add, commit, push
    mockGitSuccess() // checkout -b
    mockGitSuccess() // git add
    mockGitSuccess() // git commit
    mockGitSuccess() // git push

    // Mock file operations
    mockMkdir.mockResolvedValue(undefined)
    mockWriteFile.mockResolvedValue(undefined)

    const changes: FileChange[] = [
      { path: 'src/main.ts', content: 'updated', action: 'modify' }
    ]

    await commitAndPush(
      changes,
      'prompt2pr/test-123',
      '[Prompt2PR] test',
      '/repo'
    )

    // Verify git commands were called in order
    expect(mockGetExecOutput).toHaveBeenCalledTimes(4)

    const calls = mockGetExecOutput.mock.calls
    expect(calls[0][0]).toBe('git')
    expect(calls[0][1]).toEqual(['checkout', '-b', 'prompt2pr/test-123'])
    expect(calls[1][1]).toEqual(['add', 'src/main.ts'])
    expect(calls[2][1]).toEqual(['commit', '-m', '[Prompt2PR] test'])
    expect(calls[3][1]).toEqual(['push', 'origin', 'prompt2pr/test-123'])
  })

  it('throws GitError when branch creation fails', async () => {
    mockGitFailure('fatal: a branch named "x" already exists')

    await expect(
      commitAndPush(
        [{ path: 'a.ts', content: 'x', action: 'modify' }],
        'x',
        'msg',
        '/repo'
      )
    ).rejects.toThrow(GitError)
  })

  it('throws GitError when push fails', async () => {
    mockGitSuccess() // checkout
    mockMkdir.mockResolvedValue(undefined)
    mockWriteFile.mockResolvedValue(undefined)
    mockGitSuccess() // add
    mockGitSuccess() // commit
    mockGitFailure('rejected: push rejected') // push

    await expect(
      commitAndPush(
        [{ path: 'a.ts', content: 'x', action: 'modify' }],
        'branch',
        'msg',
        '/repo'
      )
    ).rejects.toThrow(GitError)
  })
})
