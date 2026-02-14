/**
 * Git operations manager for Prompt2PR.
 *
 * Handles local git operations: branch creation, file writing, staging,
 * committing, and pushing. Uses `@actions/exec` to call native git CLI.
 *
 * @see _bmad-output/planning-artifacts/architecture.md#Decision 2
 * @see _bmad-output/planning-artifacts/epics.md#Story 4.1
 */

import * as fs from 'node:fs/promises'
import * as path from 'node:path'

import * as exec from '@actions/exec'

import { GitError } from './errors.js'
import { createLogger } from './logger.js'
import type { FileChange } from './providers/types.js'

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

const log = createLogger('git')

/**
 * Run a git command and return the trimmed stdout.
 * Throws `GitError` on non-zero exit codes.
 */
async function git(args: string[], workDir: string): Promise<string> {
  try {
    const result = await exec.getExecOutput('git', args, {
      cwd: workDir,
      silent: true
    })

    if (result.exitCode !== 0) {
      throw new GitError(
        `git ${args[0]} failed (exit ${result.exitCode}): ${result.stderr.trim()}`
      )
    }

    return result.stdout.trim()
  } catch (error) {
    if (error instanceof GitError) {
      throw error
    }
    throw new GitError(
      `git ${args[0]} failed: ${error instanceof Error ? error.message : String(error)}`
    )
  }
}

// ---------------------------------------------------------------------------
// Main exported functions
// ---------------------------------------------------------------------------

/**
 * Generate a branch name from prefix, workflow name, and timestamp.
 *
 * @param branchPrefix - The configured branch prefix (e.g. 'prompt2pr/').
 * @param workflowName - The workflow name from the GitHub context.
 * @returns A branch name like `prompt2pr/my-workflow-20260213-234105`.
 */
export function buildBranchName(
  branchPrefix: string,
  workflowName: string
): string {
  const sanitized = workflowName
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')

  const now = new Date()
  const timestamp =
    now.getUTCFullYear().toString() +
    String(now.getUTCMonth() + 1).padStart(2, '0') +
    String(now.getUTCDate()).padStart(2, '0') +
    String(now.getUTCHours()).padStart(2, '0') +
    String(now.getUTCMinutes()).padStart(2, '0') +
    String(now.getUTCSeconds()).padStart(2, '0')

  return `${branchPrefix}${sanitized}-${timestamp}`
}

/**
 * Apply file changes to disk (create, modify, or delete files).
 *
 * @param changes - The validated file changes from the response parser.
 * @param workDir - The repository working directory.
 */
export async function applyChanges(
  changes: FileChange[],
  workDir: string
): Promise<void> {
  for (const change of changes) {
    const absPath = path.resolve(workDir, change.path)

    // Defense-in-depth: ensure resolved path stays within the working directory
    const resolvedWorkDir = path.resolve(workDir)
    const relativePath = path.relative(resolvedWorkDir, absPath)
    if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
      throw new GitError(
        `Path traversal detected: '${change.path}' resolves outside the working directory`
      )
    }

    if (change.action === 'delete') {
      log.info(`Deleting file: ${change.path}`)
      try {
        await fs.unlink(absPath)
      } catch (error) {
        throw new GitError(
          `Failed to delete file '${change.path}': ${error instanceof Error ? error.message : String(error)}`
        )
      }
    } else {
      // create or modify
      log.info(`Writing file: ${change.path} (${change.action})`)
      try {
        // Ensure parent directory exists
        await fs.mkdir(path.dirname(absPath), { recursive: true })
        await fs.writeFile(absPath, change.content, 'utf-8')
      } catch (error) {
        throw new GitError(
          `Failed to write file '${change.path}': ${error instanceof Error ? error.message : String(error)}`
        )
      }
    }
  }
}

/**
 * Execute the full git workflow: create branch, apply changes, stage, commit, push.
 *
 * @param changes - The validated file changes.
 * @param branchName - The branch name to create.
 * @param commitMessage - The commit message.
 * @param workDir - The repository working directory.
 */
export async function commitAndPush(
  changes: FileChange[],
  branchName: string,
  commitMessage: string,
  workDir: string
): Promise<void> {
  log.info(`Creating branch: ${branchName}`)

  // Configure git identity for the commit (required in GitHub Actions runners)
  await git(['config', 'user.name', 'prompt2pr[bot]'], workDir)
  await git(
    ['config', 'user.email', 'prompt2pr[bot]@users.noreply.github.com'],
    workDir
  )

  // Create and checkout new branch
  await git(['checkout', '-b', branchName], workDir)

  // Apply file changes to disk
  await applyChanges(changes, workDir)

  // Stage all changed files
  const deletedPaths = changes
    .filter((c) => c.action === 'delete')
    .map((c) => c.path)
  const addedOrModifiedPaths = changes
    .filter((c) => c.action !== 'delete')
    .map((c) => c.path)

  if (addedOrModifiedPaths.length > 0) {
    log.info(`Staging ${addedOrModifiedPaths.length} added/modified file(s)`)
    await git(['add', ...addedOrModifiedPaths], workDir)
  }

  if (deletedPaths.length > 0) {
    log.info(`Staging ${deletedPaths.length} deleted file(s)`)
    await git(['rm', ...deletedPaths], workDir)
  }

  // Commit
  log.info(`Committing: ${commitMessage}`)
  await git(['commit', '-m', commitMessage], workDir)

  // Push
  log.info(`Pushing branch ${branchName} to origin`)
  await git(['push', 'origin', branchName], workDir)

  log.info('Git operations completed successfully')
}
