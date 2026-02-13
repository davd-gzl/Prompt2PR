import * as core from '@actions/core'

/**
 * The main function for the action.
 * Orchestrates the full pipeline: config → scan → prompt → LLM → parse → git → PR.
 *
 * @returns Resolves when the action is complete.
 */
export async function run(): Promise<void> {
  try {
    core.info('[main] Prompt2PR action started')

    // TODO: Epic 1 stories 1.2-1.4 will implement config, errors, retry, logger
    // TODO: Epic 2 will implement file scanning and prompt assembly
    // TODO: Epic 3 will implement LLM provider integration
    // TODO: Epic 4 will implement git operations and PR creation

    core.info('[main] Prompt2PR action completed')
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
