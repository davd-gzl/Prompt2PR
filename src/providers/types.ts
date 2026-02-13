/**
 * Shared types for LLM providers.
 *
 * Defines the `LLMProvider` interface, `ChatRequest`, `LLMResponse`,
 * and `FileChange` types used across the provider layer and prompt assembler.
 *
 * @see _bmad-output/planning-artifacts/architecture.md#Decision 1
 * @see _bmad-output/planning-artifacts/epics.md#Story 3.1
 */

// ---------------------------------------------------------------------------
// Request / Response types
// ---------------------------------------------------------------------------

/**
 * A single message in a chat conversation.
 */
export interface ChatMessage {
  /** Role of the message author. */
  role: 'system' | 'user' | 'assistant'
  /** Text content of the message. */
  content: string
}

/**
 * A structured request to an LLM provider.
 */
export interface ChatRequest {
  /** The model to use (e.g. "mistral-large-latest"). */
  model: string
  /** Ordered list of chat messages (system prompt + user prompt). */
  messages: ChatMessage[]
}

/**
 * Describes a single file change proposed by the LLM.
 */
export interface FileChange {
  /** Relative file path from the repository root. */
  path: string
  /** Full replacement content of the file (empty for deletes). */
  content: string
  /** The kind of change. */
  action: 'modify' | 'create' | 'delete'
}

/**
 * The parsed response from an LLM provider.
 */
export interface LLMResponse {
  /** The file changes proposed by the LLM. Empty = no changes. */
  files: FileChange[]
}

// ---------------------------------------------------------------------------
// Provider interface
// ---------------------------------------------------------------------------

/**
 * Contract that every LLM provider implementation must satisfy.
 *
 * Adding a new provider = implement this interface + add to factory switch.
 */
export interface LLMProvider {
  /** Send a chat request and receive a parsed response. */
  chat(request: ChatRequest): Promise<LLMResponse>
  /** Human-readable provider name (e.g. "mistral"). */
  readonly name: string
  /** Default model identifier for this provider. */
  readonly defaultModel: string
}
