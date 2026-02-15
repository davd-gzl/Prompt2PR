/**
 * Pull Request creator for Prompt2PR.
 *
 * Creates a Pull Request via the GitHub API (`@actions/github` / Octokit)
 * with a formatted title, body (prompt + summary + metadata), and labels.
 *
 * @see _bmad-output/planning-artifacts/epics.md#Story 4.2
 */

import * as github from '@actions/github'

import type { ActionConfig } from './config.js'
import { GitError } from './errors.js'
import { createLogger } from './logger.js'
import type { FileChange } from './providers/types.js'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Result of a successful PR creation.
 */
export interface PullRequestResult {
  /** The URL of the created Pull Request. */
  url: string
  /** The number of the created Pull Request. */
  number: number
}

/**
 * Metadata about the action run, included in the PR body.
 */
export interface RunMetadata {
  /** ISO 8601 timestamp of when the action ran. */
  timestamp: string
  /** The LLM model used. */
  model: string
  /** Number of files scanned. */
  filesScanned: number
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * Maximum length for the AI-generated summary in the PR body.
 * Prevents resource exhaustion from excessively long LLM summaries.
 */
const MAX_SUMMARY_LENGTH = 4096

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

const log = createLogger('pr-creator')

/**
 * Sanitize an AI-generated summary for safe inclusion in a GitHub PR body.
 *
 * - Strips HTML tags to prevent injection
 * - Escapes GitHub @mentions to prevent notification spam
 * - Escapes issue/PR references (#123) to prevent unintended cross-links
 * - Truncates to a reasonable length
 */
function sanitizeSummary(raw: string): string {
  let sanitized = raw
    // Strip HTML tags
    .replace(/<[^>]*>/g, '')
    // Escape @mentions: @ → @\u200B (zero-width space breaks mention)
    .replace(/@([a-zA-Z0-9_-])/g, '@\u200B$1')
    // Escape issue/PR references: #123 → #\u200B123
    .replace(/#(\d)/g, '#\u200B$1')

  if (sanitized.length > MAX_SUMMARY_LENGTH) {
    sanitized = sanitized.slice(0, MAX_SUMMARY_LENGTH) + '...'
  }

  return sanitized
}

/**
 * Sanitize a string for safe use in a GitHub PR title.
 *
 * Applies the same safety transforms as `sanitizeSummary` (HTML stripping,
 * @mention escaping, issue-ref escaping) to prevent injection via the title.
 */
function sanitizeForTitle(raw: string): string {
  return (
    raw
      // Strip HTML tags
      .replace(/<[^>]*>/g, '')
      // Escape @mentions
      .replace(/@([a-zA-Z0-9_-])/g, '@\u200B$1')
      // Escape issue/PR references
      .replace(/#(\d)/g, '#\u200B$1')
  )
}

/**
 * Maximum length for the PR title (GitHub truncates at 256).
 * We cap slightly below to leave room for the prefix.
 */
const MAX_TITLE_LENGTH = 200

/**
 * Build a fallback title from file change statistics.
 */
function buildFallbackTitle(changes: FileChange[]): string {
  const count = changes.length
  const actions = changes.map((c) => c.action)
  const modified = actions.filter((a) => a === 'modify').length
  const created = actions.filter((a) => a === 'create').length
  const deleted = actions.filter((a) => a === 'delete').length

  const parts: string[] = []
  if (modified > 0) parts.push(`${modified} modified`)
  if (created > 0) parts.push(`${created} created`)
  if (deleted > 0) parts.push(`${deleted} deleted`)

  return `[Prompt2PR] Update ${count} file(s): ${parts.join(', ')}`
}

/**
 * Build the PR title.
 *
 * When an AI summary is available, the first sentence (or first line) is used
 * as a descriptive title. Falls back to file-change statistics when no summary
 * is provided.
 */
function buildTitle(changes: FileChange[], summary?: string): string {
  if (!summary || summary.trim().length === 0) {
    return buildFallbackTitle(changes)
  }

  // Sanitize and extract first meaningful sentence from the summary
  const cleaned = sanitizeForTitle(summary)
    .replace(/\n+/g, ' ') // collapse newlines
    .trim()

  // Take the first sentence (up to first period, exclamation, or question mark followed by space)
  const sentenceMatch = cleaned.match(/^(.+?[.!?])(?:\s|$)/)
  const firstSentence = sentenceMatch ? sentenceMatch[1] : cleaned

  // Truncate if needed
  const maxContentLength = MAX_TITLE_LENGTH - '[Prompt2PR] '.length
  const truncated =
    firstSentence.length > maxContentLength
      ? firstSentence.slice(0, maxContentLength - 3) + '...'
      : firstSentence

  return `[Prompt2PR] ${truncated}`
}

/**
 * Build the PR body with prompt, AI summary, changes list, and metadata.
 */
function buildBody(
  prompt: string,
  changes: FileChange[],
  metadata: RunMetadata,
  summary?: string
): string {
  const fileList = changes
    .map((c) => `- \`${c.path}\` (${c.action})`)
    .join('\n')

  const summarySection = summary
    ? `## Summary

> [!NOTE]
> The summary below was generated by an AI model and may contain inaccuracies.

${sanitizeSummary(summary)}

`
    : ''

  return `## Prompt

> ${prompt.replace(/\n/g, '\n> ')}

${summarySection}## Changes

${fileList}

## Metadata

| Field | Value |
|-------|-------|
| Timestamp | ${metadata.timestamp} |
| Model | ${metadata.model} |
| Files Scanned | ${metadata.filesScanned} |
| Files Changed | ${changes.length} |

---
*Generated by [Prompt2PR](https://github.com/davd-gzl/Prompt2PR)*`
}

// ---------------------------------------------------------------------------
// Main exported function
// ---------------------------------------------------------------------------

/**
 * Create a Pull Request on GitHub with formatted title, body, and labels.
 *
 * @param changes - The file changes included in the PR.
 * @param branchName - The branch containing the changes.
 * @param config - The validated action configuration.
 * @param metadata - Run metadata for the PR body.
 * @param token - The GitHub token for API authentication.
 * @param summary - Optional AI-generated narrative summary (FR21).
 * @returns The URL and number of the created PR.
 * @throws {GitError} If the GitHub API call fails.
 */
export async function createPullRequest(
  changes: FileChange[],
  branchName: string,
  config: ActionConfig,
  metadata: RunMetadata,
  token: string,
  summary?: string
): Promise<PullRequestResult> {
  const { owner, repo } = github.context.repo
  const defaultBranch =
    (
      github.context.payload.repository as
        | { default_branch?: string }
        | undefined
    )?.default_branch ?? 'main'

  const title = buildTitle(changes, summary)
  const body = buildBody(config.prompt, changes, metadata, summary)

  log.info(`Creating PR: "${title}" (${branchName} → ${defaultBranch})`)

  const octokit = github.getOctokit(token)

  let prNumber: number
  let prUrl: string

  try {
    const { data: pr } = await octokit.rest.pulls.create({
      owner,
      repo,
      title,
      body,
      head: branchName,
      base: defaultBranch
    })

    prNumber = pr.number
    prUrl = pr.html_url
    log.info(`PR created: #${prNumber} — ${prUrl}`)
  } catch (error) {
    throw new GitError(
      `Failed to create Pull Request: ${error instanceof Error ? error.message : String(error)}`
    )
  }

  // Apply labels
  if (config.labels.length > 0) {
    log.info(`Applying labels: ${config.labels.join(', ')}`)
    try {
      await octokit.rest.issues.addLabels({
        owner,
        repo,
        issue_number: prNumber,
        labels: config.labels
      })
    } catch (error) {
      // Label failure is non-fatal — log a warning but don't fail the action
      log.warn(
        `Failed to apply labels: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }

  return { url: prUrl, number: prNumber }
}
