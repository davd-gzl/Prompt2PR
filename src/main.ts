import * as core from '@actions/core'

import { validateConfig } from './config.js'
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
    log.info(`Scanned ${files.length} file(s)`)

    // Step 3: Build prompt
    const provider = createProvider(config)
    const resolvedModel = config.model || provider.defaultModel
    const request = buildPrompt(config.prompt, files, resolvedModel)

    // Step 4: Call LLM with retry
    log.info(`Calling ${config.provider} (model: ${resolvedModel})`)
    const llmResponse = await withRetry(() => provider.chat(request))

    // Step 5: Parse response
    const changes = parseResponse(llmResponse)

    // Step 6: Check for empty changes (FR4, FR23)
    if (changes.length === 0) {
      log.info('No changes needed — skipping PR creation')
      core.setOutput('pr_url', '')
      core.setOutput('pr_number', '')
      core.setOutput('files_changed', '0')
      core.setOutput('lines_changed', '0')
      core.setOutput('skipped', 'true')
      return
    }

    // Step 7: Validate changes against guardrails (FR14, FR15, FR29, FR30, FR31)
    const validated = validateChanges(changes, config)

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
      core.setOutput('skipped', 'true')
      return
    }

    // Step 10: Git operations — branch, write files, stage, commit, push (FR17, FR18)
    const workflowName = process.env.GITHUB_WORKFLOW ?? 'prompt2pr'
    const branchName = buildBranchName(config.branchPrefix, workflowName)
    const commitMessage = `[Prompt2PR] Update ${validated.length} file(s)`
    await commitAndPush(validated, branchName, commitMessage, process.cwd())

    // Step 11: Create Pull Request (FR19-FR22)
    const token = process.env.GITHUB_TOKEN ?? ''
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
      token
    )

    // Step 12: Set action outputs (FR28)
    core.setOutput('pr_url', pr.url)
    core.setOutput('pr_number', String(pr.number))
    core.setOutput('files_changed', String(validated.length))
    core.setOutput('lines_changed', String(linesChanged))
    core.setOutput('skipped', 'false')

    log.info(`Prompt2PR completed: PR #${pr.number} created — ${pr.url}`)
  } catch (error) {
    // Fail the workflow run if an error occurs
    // Must handle both Error objects and other thrown values (NFR11: fail loudly)
    if (error instanceof Error) {
      core.setFailed(error.message)
    } else {
      core.setFailed(String(error))
    }
  }
}
