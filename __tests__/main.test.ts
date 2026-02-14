/**
 * Unit tests for the action's main functionality, src/main.ts
 *
 * Tests cover: happy path (PR created), skip path (no changes),
 * dry-run path, error path (provider failure), and output setting.
 */
import { jest } from '@jest/globals'
import * as core from '../__fixtures__/core.js'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockValidateConfig = jest.fn()
const mockScanFiles = jest.fn()
const mockBuildPrompt = jest.fn()
const mockCreateProvider = jest.fn()
const mockWithRetry = jest.fn()
const mockParseResponse = jest.fn()
const mockValidateChanges = jest.fn()
const mockCommitAndPush = jest.fn()
const mockBuildBranchName = jest.fn()
const mockCreatePullRequest = jest.fn()

jest.unstable_mockModule('@actions/core', () => core)
jest.unstable_mockModule('../src/config.js', () => ({
  validateConfig: mockValidateConfig
}))
jest.unstable_mockModule('../src/file-scanner.js', () => ({
  scanFiles: mockScanFiles
}))
jest.unstable_mockModule('../src/prompt-assembler.js', () => ({
  buildPrompt: mockBuildPrompt
}))
jest.unstable_mockModule('../src/providers/provider-factory.js', () => ({
  createProvider: mockCreateProvider
}))
jest.unstable_mockModule('../src/retry.js', () => ({
  withRetry: mockWithRetry
}))
jest.unstable_mockModule('../src/response-parser.js', () => ({
  parseResponse: mockParseResponse
}))
jest.unstable_mockModule('../src/guardrails.js', () => ({
  validateChanges: mockValidateChanges
}))
jest.unstable_mockModule('../src/git-manager.js', () => ({
  commitAndPush: mockCommitAndPush,
  buildBranchName: mockBuildBranchName
}))
jest.unstable_mockModule('../src/pr-creator.js', () => ({
  createPullRequest: mockCreatePullRequest
}))

const { run } = await import('../src/main.js')
const { ConfigError, ProviderError, GuardrailError, GitError, ParseError } =
  await import('../src/errors.js')

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Set up mocks for a successful full pipeline run. */
function mockHappyPath(): void {
  mockValidateConfig.mockReturnValue({
    prompt: 'Fix links',
    provider: 'mistral',
    model: '',
    paths: ['**'],
    maxFiles: 10,
    maxChanges: 200,
    labels: ['prompt2pr'],
    branchPrefix: 'prompt2pr/',
    dryRun: false,
    baseUrl: '',
    apiKey: 'test-key'
  })
  mockScanFiles.mockResolvedValue([
    { path: 'src/main.ts', content: 'hello', size: 5 }
  ])
  mockCreateProvider.mockReturnValue({
    name: 'mistral',
    defaultModel: 'mistral-large-latest',
    chat: jest.fn()
  })
  mockBuildPrompt.mockReturnValue({
    model: 'mistral-large-latest',
    messages: []
  })
  mockWithRetry.mockResolvedValue({
    files: [{ path: 'src/main.ts', content: 'updated', action: 'modify' }]
  })
  mockParseResponse.mockReturnValue([
    { path: 'src/main.ts', content: 'updated', action: 'modify' }
  ])
  mockValidateChanges.mockReturnValue([
    { path: 'src/main.ts', content: 'updated', action: 'modify' }
  ])
  mockBuildBranchName.mockReturnValue('prompt2pr/test-123')
  mockCommitAndPush.mockResolvedValue(undefined)
  mockCreatePullRequest.mockResolvedValue({
    url: 'https://github.com/owner/repo/pull/42',
    number: 42
  })
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('main.ts — run()', () => {
  const originalEnv = { ...process.env }

  afterEach(() => {
    jest.resetAllMocks()
    process.env = { ...originalEnv }
  })

  // -- Happy path -----------------------------------------------------------

  it('creates a PR on the happy path and sets outputs', async () => {
    process.env.GITHUB_WORKFLOW = 'test-workflow'
    process.env.GITHUB_TOKEN = 'test-token'

    mockHappyPath()

    await run()

    // Verify the full pipeline was called
    expect(mockValidateConfig).toHaveBeenCalledTimes(1)
    expect(mockScanFiles).toHaveBeenCalledTimes(1)
    expect(mockBuildPrompt).toHaveBeenCalledTimes(1)
    expect(mockWithRetry).toHaveBeenCalledTimes(1)
    expect(mockParseResponse).toHaveBeenCalledTimes(1)
    expect(mockValidateChanges).toHaveBeenCalledTimes(1)
    expect(mockCommitAndPush).toHaveBeenCalledTimes(1)
    expect(mockCreatePullRequest).toHaveBeenCalledTimes(1)

    // Verify outputs were set
    expect(core.setOutput).toHaveBeenCalledWith(
      'pr_url',
      'https://github.com/owner/repo/pull/42'
    )
    expect(core.setOutput).toHaveBeenCalledWith('pr_number', '42')
    expect(core.setOutput).toHaveBeenCalledWith('files_changed', '1')
    expect(core.setOutput).toHaveBeenCalledWith('skipped', 'false')

    // Verify no failure was set
    expect(core.setFailed).not.toHaveBeenCalled()

    // Verify structured summary log (FR26 — Story 7.2)
    expect(core.info).toHaveBeenCalledWith(
      expect.stringMatching(
        /Scanned 1 files matching \*\*\. Found 1 issue\(s\)\. PR #42 created/
      )
    )
  })

  // -- Skip path (no changes) -----------------------------------------------

  it('skips PR creation when no changes are returned (FR4, FR23)', async () => {
    mockHappyPath()
    mockParseResponse.mockReturnValue([]) // No changes

    await run()

    // Git and PR should not be called
    expect(mockCommitAndPush).not.toHaveBeenCalled()
    expect(mockCreatePullRequest).not.toHaveBeenCalled()

    // Outputs should indicate skip
    expect(core.setOutput).toHaveBeenCalledWith('skipped', 'true')
    expect(core.setOutput).toHaveBeenCalledWith('pr_url', '')
    expect(core.setOutput).toHaveBeenCalledWith('pr_number', '')
    expect(core.setOutput).toHaveBeenCalledWith('files_changed', '0')
    expect(core.setOutput).toHaveBeenCalledWith('lines_changed', '0')
    expect(core.setFailed).not.toHaveBeenCalled()

    // Verify structured log message (FR26 — Story 7.2)
    expect(core.info).toHaveBeenCalledWith(
      expect.stringMatching(
        /Scanned 1 files matching \*\*\. Found 0 issues\. No PR created\./
      )
    )
  })

  // -- Dry-run path ----------------------------------------------------------

  it('skips git and PR creation in dry-run mode', async () => {
    process.env.GITHUB_WORKFLOW = 'test-workflow'

    mockHappyPath()
    mockValidateConfig.mockReturnValue({
      prompt: 'Fix links',
      provider: 'mistral',
      model: '',
      paths: ['**'],
      maxFiles: 10,
      maxChanges: 200,
      labels: ['prompt2pr'],
      branchPrefix: 'prompt2pr/',
      dryRun: true,
      baseUrl: '',
      apiKey: 'test-key'
    })

    await run()

    // Git and PR should not be called
    expect(mockCommitAndPush).not.toHaveBeenCalled()
    expect(mockCreatePullRequest).not.toHaveBeenCalled()

    // Outputs should indicate skip
    expect(core.setOutput).toHaveBeenCalledWith('skipped', 'true')
    expect(core.setFailed).not.toHaveBeenCalled()
  })

  // -- Error path — structured error logging (FR27, Story 7.2) ---------------

  it('logs config error details and sets failed on ConfigError', async () => {
    mockValidateConfig.mockImplementation(() => {
      throw new ConfigError("Missing required input: 'prompt'")
    })

    await run()

    expect(core.error).toHaveBeenCalledWith(
      expect.stringMatching(/Configuration error:.*Missing required input/)
    )
    expect(core.setFailed).toHaveBeenCalledWith(
      "Missing required input: 'prompt'"
    )
  })

  it('logs provider error details with provider name and status', async () => {
    mockHappyPath()
    mockWithRetry.mockRejectedValue(
      new ProviderError('Rate limit exceeded', 'mistral', 429)
    )

    await run()

    expect(core.error).toHaveBeenCalledWith(
      expect.stringMatching(
        /Provider error \[mistral\] \(HTTP 429\):.*Rate limit exceeded/
      )
    )
    expect(core.setFailed).toHaveBeenCalledWith('Rate limit exceeded')
  })

  it('logs provider error without status code when not available', async () => {
    mockHappyPath()
    mockWithRetry.mockRejectedValue(
      new ProviderError('Network timeout', 'openai')
    )

    await run()

    expect(core.error).toHaveBeenCalledWith(
      expect.stringMatching(/Provider error \[openai\]:.*Network timeout/)
    )
    expect(core.setFailed).toHaveBeenCalledWith('Network timeout')
  })

  it('logs guardrail violation details and sets failed', async () => {
    mockHappyPath()
    mockValidateChanges.mockImplementation(() => {
      throw new GuardrailError(
        'LLM response contains 15 file change(s), which exceeds the max_files limit of 10'
      )
    })

    await run()

    expect(core.error).toHaveBeenCalledWith(
      expect.stringMatching(
        /Guardrail violation:.*exceeds the max_files limit of 10/
      )
    )
    expect(core.setFailed).toHaveBeenCalledWith(
      'LLM response contains 15 file change(s), which exceeds the max_files limit of 10'
    )
  })

  it('logs git error details and sets failed', async () => {
    mockHappyPath()
    mockCommitAndPush.mockRejectedValue(
      new GitError('git push failed (exit 128): rejected')
    )

    await run()

    expect(core.error).toHaveBeenCalledWith(
      expect.stringMatching(/Git operation failed:.*git push failed/)
    )
    expect(core.setFailed).toHaveBeenCalledWith(
      'git push failed (exit 128): rejected'
    )
  })

  it('logs parse error details and sets failed', async () => {
    mockHappyPath()
    mockParseResponse.mockImplementation(() => {
      throw new ParseError('content is not valid JSON')
    })

    await run()

    expect(core.error).toHaveBeenCalledWith(
      expect.stringMatching(/Response parse error:.*content is not valid JSON/)
    )
    expect(core.setFailed).toHaveBeenCalledWith('content is not valid JSON')
  })

  it('handles non-Error thrown values', async () => {
    mockValidateConfig.mockImplementation(() => {
      throw 'string error'
    })

    await run()

    expect(core.setFailed).toHaveBeenCalledWith('string error')
  })
})
