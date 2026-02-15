/**
 * Prompt assembler for Prompt2PR.
 *
 * Combines the user's prompt with scanned file contents
 * into a structured `ChatRequest` ready for an LLM provider. Manages
 * context window limits by tracking character count and truncating
 * files that would exceed the budget (FR2, FR16).
 *
 * @see _bmad-output/planning-artifacts/architecture.md
 * @see _bmad-output/planning-artifacts/epics.md#Story 2.2
 */

import type { FileContext } from './file-scanner.js'
import { createLogger } from './logger.js'
import type { ChatMessage, ChatRequest } from './providers/types.js'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * Conservative default context-window budget in **characters**.
 *
 * ~200 000 characters ≈ ~50 000 tokens (rough 4:1 char-to-token ratio).
 * This fits comfortably inside the context windows of all three MVP
 * providers while leaving room for the LLM's response.
 */
export const DEFAULT_MAX_CONTEXT_CHARS = 200_000

/**
 * The system prompt that instructs the LLM on the expected response format.
 *
 * Kept as a constant so it can be asserted on in tests without duplication.
 */
export const SYSTEM_PROMPT = `You are a senior software engineer. The user will describe a code change and provide the current contents of relevant files.

Your task is to produce the requested changes. Respond with ONLY a JSON object in this exact format:

{
  "summary": "<brief narrative summary of what was changed and why>",
  "files": [
    {
      "path": "<relative file path>",
      "content": "<complete new file content>",
      "action": "modify" | "create" | "delete"
    }
  ]
}

Rules:
- "summary" should be 1-3 sentences describing the changes at a high level.
- "content" must contain the COMPLETE file content (not a diff).
- For "delete" actions, set "content" to an empty string.
- Do NOT include explanations or markdown fences — return raw JSON only.
- If no changes are needed, return: { "summary": "No changes needed.", "files": [] }
`

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

const log = createLogger('prompt-assembler')

/**
 * Format a single file's content as a clearly delimited block.
 */
function formatFileBlock(file: FileContext): string {
  return `--- FILE: ${file.path} (${file.size} bytes) ---\n${file.content}\n--- END FILE ---`
}

// ---------------------------------------------------------------------------
// Main exported function
// ---------------------------------------------------------------------------

/**
 * Build a `ChatRequest` from the user prompt and scanned file contexts.
 *
 * Files are included in order until the character budget is exhausted.
 * Files that would exceed the budget are truncated or excluded entirely,
 * with a logged warning.
 *
 * @param userPrompt - The prompt from the user (FR1).
 * @param files - Scanned file contexts from `scanFiles()`.
 * @param model - The model identifier to set on the request (may be empty).
 * @param maxContextChars - Maximum total characters for the assembled content.
 * @returns A `ChatRequest` ready to send to an LLM provider.
 */
export function buildPrompt(
  userPrompt: string,
  files: FileContext[],
  model: string = '',
  maxContextChars: number = DEFAULT_MAX_CONTEXT_CHARS
): ChatRequest {
  log.info(
    `Assembling prompt: ${files.length} files, ` +
      `budget=${maxContextChars} chars`
  )

  // Start with the fixed overhead of the system prompt + user prompt
  const systemMessage: ChatMessage = {
    role: 'system',
    content: SYSTEM_PROMPT
  }

  // Build the user message incrementally
  let userContent = `# Change Request\n\n${userPrompt}\n\n# Repository Files\n`
  let totalChars = SYSTEM_PROMPT.length + userContent.length
  let includedCount = 0
  let truncatedCount = 0
  let excludedCount = 0

  for (const file of files) {
    const block = formatFileBlock(file)
    const blockLength = block.length + 1 // +1 for the newline separator

    if (totalChars + blockLength <= maxContextChars) {
      // File fits within budget
      userContent += `\n${block}`
      totalChars += blockLength
      includedCount++
    } else {
      // See if we can include a truncated version (at least 200 chars)
      const remaining = maxContextChars - totalChars
      const headerLength = `--- FILE: ${file.path} (${file.size} bytes) ---\n`
        .length
      const footerLength = '\n--- END FILE ---'.length
      const minUseful = headerLength + footerLength + 200

      if (remaining >= minUseful) {
        const contentBudget = remaining - headerLength - footerLength - 1 // -1 for leading newline
        const truncatedContent = file.content.slice(0, contentBudget)
        const truncatedBlock =
          `--- FILE: ${file.path} (${file.size} bytes, TRUNCATED) ---\n` +
          `${truncatedContent}\n--- END FILE ---`
        userContent += `\n${truncatedBlock}`
        totalChars += truncatedBlock.length + 1
        truncatedCount++
        log.warn(
          `Truncated file ${file.path} (${file.size} bytes → ${contentBudget} chars)`
        )
      } else {
        excludedCount++
        log.warn(
          `Excluded file ${file.path} (${file.size} bytes) — context budget exhausted`
        )
      }
    }
  }

  log.info(
    `Prompt assembled: ${includedCount} included, ` +
      `${truncatedCount} truncated, ${excludedCount} excluded, ` +
      `${totalChars} total chars`
  )

  const userMessage: ChatMessage = {
    role: 'user',
    content: userContent
  }

  return {
    model,
    messages: [systemMessage, userMessage]
  }
}
