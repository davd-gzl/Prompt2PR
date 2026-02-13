/**
 * Unit tests for the PR creator — src/pr-creator.ts
 *
 * Tests cover: successful PR creation, label application, API error handling,
 * body formatting.
 */
import { jest } from '@jest/globals'
import * as core from '../__fixtures__/core.js'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockCreate =
  jest.fn<() => Promise<{ data: { number: number; html_url: string } }>>()
const mockAddLabels = jest.fn<() => Promise<void>>()

jest.unstable_mockModule('@actions/core', () => core)
jest.unstable_mockModule('@actions/github', () => ({
  context: {
    repo: { owner: 'test-owner', repo: 'test-repo' },
    payload: { repository: { default_branch: 'main' } }
  },
  getOctokit: () => ({
    rest: {
      pulls: { create: mockCreate },
      issues: { addLabels: mockAddLabels }
    }
  })
}))

const { createPullRequest } = await import('../src/pr-creator.js')
const { GitError } = await import('../src/errors.js')

import type { ActionConfig } from '../src/config.js'
import type { FileChange } from '../src/providers/types.js'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeConfig(overrides: Partial<ActionConfig> = {}): ActionConfig {
  return {
    prompt: 'Fix broken links in documentation',
    provider: 'mistral',
    model: 'mistral-large-latest',
    paths: ['**'],
    maxFiles: 10,
    maxChanges: 200,
    labels: ['prompt2pr', 'automated'],
    branchPrefix: 'prompt2pr/',
    dryRun: false,
    baseUrl: '',
    apiKey: 'test-key',
    ...overrides
  }
}

const SAMPLE_CHANGES: FileChange[] = [
  { path: 'src/main.ts', content: 'console.log("hello")', action: 'modify' },
  { path: 'new-file.txt', content: 'new content', action: 'create' }
]

const SAMPLE_METADATA = {
  timestamp: '2026-02-13T23:00:00.000Z',
  model: 'mistral-large-latest',
  filesScanned: 42
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('pr-creator.ts — createPullRequest()', () => {
  afterEach(() => {
    jest.resetAllMocks()
  })

  it('creates a PR with formatted title, body, and returns url/number', async () => {
    mockCreate.mockResolvedValueOnce({
      data: {
        number: 123,
        html_url: 'https://github.com/test-owner/test-repo/pull/123'
      }
    })
    mockAddLabels.mockResolvedValueOnce(undefined)

    const result = await createPullRequest(
      SAMPLE_CHANGES,
      'prompt2pr/test-branch',
      makeConfig(),
      SAMPLE_METADATA,
      'fake-token'
    )

    expect(result.number).toBe(123)
    expect(result.url).toBe('https://github.com/test-owner/test-repo/pull/123')

    // Verify PR was created with correct params
    expect(mockCreate).toHaveBeenCalledTimes(1)
    const createCall = mockCreate.mock.calls[0][0] as Record<string, unknown>
    expect(createCall.owner).toBe('test-owner')
    expect(createCall.repo).toBe('test-repo')
    expect(createCall.head).toBe('prompt2pr/test-branch')
    expect(createCall.base).toBe('main')
    expect(createCall.title).toContain('[Prompt2PR]')
  })

  it('includes the original prompt in the PR body (blockquoted)', async () => {
    mockCreate.mockResolvedValueOnce({
      data: { number: 1, html_url: 'https://example.com/pr/1' }
    })
    mockAddLabels.mockResolvedValueOnce(undefined)

    await createPullRequest(
      SAMPLE_CHANGES,
      'branch',
      makeConfig({ prompt: 'Fix all broken links' }),
      SAMPLE_METADATA,
      'token'
    )

    const body = (mockCreate.mock.calls[0][0] as Record<string, unknown>)
      .body as string
    expect(body).toContain('> Fix all broken links')
  })

  it('includes metadata in the PR body', async () => {
    mockCreate.mockResolvedValueOnce({
      data: { number: 1, html_url: 'https://example.com/pr/1' }
    })
    mockAddLabels.mockResolvedValueOnce(undefined)

    await createPullRequest(
      SAMPLE_CHANGES,
      'branch',
      makeConfig(),
      SAMPLE_METADATA,
      'token'
    )

    const body = (mockCreate.mock.calls[0][0] as Record<string, unknown>)
      .body as string
    expect(body).toContain('2026-02-13')
    expect(body).toContain('mistral-large-latest')
    expect(body).toContain('42')
  })

  it('applies labels to the created PR', async () => {
    mockCreate.mockResolvedValueOnce({
      data: { number: 42, html_url: 'https://example.com/pr/42' }
    })
    mockAddLabels.mockResolvedValueOnce(undefined)

    await createPullRequest(
      SAMPLE_CHANGES,
      'branch',
      makeConfig({ labels: ['prompt2pr', 'docs'] }),
      SAMPLE_METADATA,
      'token'
    )

    expect(mockAddLabels).toHaveBeenCalledTimes(1)
    const labelCall = mockAddLabels.mock.calls[0][0] as Record<string, unknown>
    expect(labelCall.labels).toEqual(['prompt2pr', 'docs'])
    expect(labelCall.issue_number).toBe(42)
  })

  it('does not fail if label application fails (non-fatal)', async () => {
    mockCreate.mockResolvedValueOnce({
      data: { number: 1, html_url: 'https://example.com/pr/1' }
    })
    mockAddLabels.mockRejectedValueOnce(new Error('label not found'))

    const result = await createPullRequest(
      SAMPLE_CHANGES,
      'branch',
      makeConfig(),
      SAMPLE_METADATA,
      'token'
    )

    // Should still return the PR result
    expect(result.number).toBe(1)
  })

  it('throws GitError when PR creation fails', async () => {
    mockCreate.mockRejectedValueOnce(new Error('Validation Failed'))

    await expect(
      createPullRequest(
        SAMPLE_CHANGES,
        'branch',
        makeConfig(),
        SAMPLE_METADATA,
        'token'
      )
    ).rejects.toThrow(GitError)
  })

  it('includes file action summary in PR title', async () => {
    mockCreate.mockResolvedValueOnce({
      data: { number: 1, html_url: 'https://example.com/pr/1' }
    })
    mockAddLabels.mockResolvedValueOnce(undefined)

    await createPullRequest(
      SAMPLE_CHANGES,
      'branch',
      makeConfig(),
      SAMPLE_METADATA,
      'token'
    )

    const title = (mockCreate.mock.calls[0][0] as Record<string, unknown>)
      .title as string
    expect(title).toContain('[Prompt2PR]')
    expect(title).toContain('2 file(s)')
    expect(title).toContain('1 modified')
    expect(title).toContain('1 created')
  })

  it('skips label application when no labels configured', async () => {
    mockCreate.mockResolvedValueOnce({
      data: { number: 1, html_url: 'https://example.com/pr/1' }
    })

    await createPullRequest(
      SAMPLE_CHANGES,
      'branch',
      makeConfig({ labels: [] }),
      SAMPLE_METADATA,
      'token'
    )

    expect(mockAddLabels).not.toHaveBeenCalled()
  })
})
