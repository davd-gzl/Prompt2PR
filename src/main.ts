import * as core from '@actions/core'

import { validateConfig } from './config.js'
import {
  ConfigError,
  GuardrailError,
  ProviderError,
  GitError,
  ParseError
} from './errors.js'
import { scanFiles } from './file-scanner.js'
import { commitAndPush, buildBranchName } from './git-manager.js'
import { validateChanges, countLinesChanged } from './guardrails.js'
import { createLogger } from './logger.js'
import { createPullRequest } from './pr-creator.js'
import { buildPrompt } from './prompt-assembler.js'
import { createProvider } from './providers/provider-factory.js'
import { parseResponse } from './response-parser.js'
import { withRetry } from './retry.js'

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

const log = createLogger('main')

/**
 * Log structured error details based on the error type (FR27, NFR11).
 */
function logErrorDetails(error: unknown): void {
  if (error instanceof ConfigError) {
    log.error(`Configuration error: ${error.message}`)
  } else if (error instanceof ProviderError) {
    const statusInfo = error.statusCode ? ` (HTTP ${error.statusCode})` : ''
    log.error(
      `Provider error [${error.provider}]${statusInfo}: ${error.message}`
    )
  } else if (error instanceof GuardrailError) {
    log.error(`Guardrail violation: ${error.message}`)
  } else if (error instanceof GitError) {
    log.error(`Git operation failed: ${error.message}`)
  } else if (error instanceof ParseError) {
    log.error(`Response parse error: ${error.message}`)
  } else if (error instanceof Error) {
    log.error(`Unexpected error: ${error.message}`)
  } else {
    log.error(`Unexpected error: ${String(error)}`)
  }
}

// ---------------------------------------------------------------------------
// Main exported function
// ---------------------------------------------------------------------------

/**
 * The main function for the action.
 * Orchestrates the full pipeline: config → scan → prompt → LLM → parse → guardrails → git → PR.
 *
 * @returns Resolves when the action is complete.
 */
export async function run(): Promise<void> {
  try {
    log.info('Prompt2PR action started')

    // Step 1: Validate configuration
    const config = validateConfig()
    log.info(
      `Config validated: provider=${config.provider}, model=${config.model || '(default)'}, ` +
        `paths=${config.paths.join(',')}, maxFiles=${config.maxFiles}, maxChanges=${config.maxChanges}`
    )

    // Step 2: Scan files
    const files = await scanFiles(config.paths)
    log.info(
      `Scanned ${files.length} files matching ${config.paths.join(', ')}`
    )

    // Step 3: Build prompt
    const provider = createProvider(config)
    const resolvedModel = config.model || provider.defaultModel
    const request = buildPrompt(config.prompt, files, resolvedModel)

    // Step 4: Call LLM with retry
    log.info(`Calling ${config.provider} (model: ${resolvedModel})`)
    const llmResponse = await withRetry(() => provider.chat(request))

    // Step 5: Parse response
    const parsed = parseResponse(llmResponse)

    // Step 6: Check for empty changes (FR4, FR23)
    if (parsed.files.length === 0) {
      log.info(
        `Scanned ${files.length} files matching ${config.paths.join(', ')}. ` +
          `Found 0 issues. No PR created.`
      )
      core.setOutput('pr_url', '')
      core.setOutput('pr_number', '')
      core.setOutput('files_changed', '0')
      core.setOutput('lines_changed', '0')
      core.setOutput('skipped', 'no_changes')
      return
    }

    // Step 7: Validate changes against guardrails (FR14, FR15, FR29, FR30, FR31)
    const validated = validateChanges(parsed.files, config)

    // Step 8: Calculate metrics for outputs
    const linesChanged = countLinesChanged(validated)

    // Step 9: Handle dry-run mode
    if (config.dryRun) {
      log.info(
        `Dry run: would create PR with ${validated.length} file(s), ${linesChanged} line(s) changed`
      )
      core.setOutput('pr_url', '')
      core.setOutput('pr_number', '')
      core.setOutput('files_changed', String(validated.length))
      core.setOutput('lines_changed', String(linesChanged))
      core.setOutput('skipped', 'dry_run')
      return
    }

    // Step 10: Git operations — branch, write files, stage, commit, push (FR17, FR18)
    const workflowName = process.env.GITHUB_WORKFLOW ?? 'prompt2pr'
    const branchName = buildBranchName(config.branchPrefix, workflowName)
    const commitMessage = `[Prompt2PR] Update ${validated.length} file(s)`
    await commitAndPush(validated, branchName, commitMessage, process.cwd())

    // Step 11: Create Pull Request (FR19-FR22)
    const token = process.env.GITHUB_TOKEN ?? ''
    if (!token) {
      throw new ConfigError(
        'Missing GITHUB_TOKEN: the environment variable is required for PR creation. ' +
          "Pass it via the 'env' block in your workflow YAML."
      )
    }
    const metadata = {
      timestamp: new Date().toISOString(),
      model: resolvedModel,
      filesScanned: files.length
    }
    const pr = await createPullRequest(
      validated,
      branchName,
      config,
      metadata,
      token,
      parsed.summary
    )

    // Step 12: Set action outputs (FR28)
    core.setOutput('pr_url', pr.url)
    core.setOutput('pr_number', String(pr.number))
    core.setOutput('files_changed', String(validated.length))
    core.setOutput('lines_changed', String(linesChanged))
    core.setOutput('skipped', 'false')

    // Step 13: Structured run summary (FR26)
    log.info(
      `Scanned ${files.length} files matching ${config.paths.join(', ')}. ` +
        `Found ${validated.length} issue(s). ` +
        `PR #${pr.number} created — ${pr.url} ` +
        `(${validated.length} file(s), ${linesChanged} line(s) changed)`
    )
  } catch (error) {
    // Log structured error details for observability (FR27, NFR11)
    logErrorDetails(error)

    // Set skipped output to false on error (FR11)
    core.setOutput('skipped', 'false')

    // Fail the workflow run if an error occurs
    // Must handle both Error objects and other thrown values (NFR11: fail loudly)
    if (error instanceof Error) {
      core.setFailed(error.message)
    } else {
      core.setFailed(String(error))
    }
  }
}
