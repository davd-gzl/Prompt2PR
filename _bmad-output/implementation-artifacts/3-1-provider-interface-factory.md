# Story 3.1: Provider Interface & Factory

**Status:** complete

## Story

As a developer extending the action, I want a clean provider interface and
factory function, So that adding new LLM providers requires only implementing
one interface with no changes to core logic (NFR15).

## Key Implementation Details

### `src/providers/types.ts`

- `LLMProvider` interface with
  `chat(request: ChatRequest): Promise<LLMResponse>`, `name: string`,
  `defaultModel: string`
- `ChatRequest` — contains messages array and model config
- `ChatMessage` — `{ role: 'system' | 'user' | 'assistant', content: string }`
- `LLMResponse` — structured response with files and summary
- `FileChange` —
  `{ path: string, content: string, action: 'modify' | 'create' | 'delete' }`

### `src/providers/provider-factory.ts`

- `createProvider(config)` — factory function that switches on `config.provider`
- Supports all four providers: `openai`, `anthropic`, `mistral`, `gemini`
- Throws `ConfigError` for unknown/unsupported provider names
- Logs selected model info on creation
- Falls back to provider `defaultModel` when no model specified in config
- Passes `base_url` through to provider constructor when provided

### `__tests__/providers/provider-factory.test.ts`

- 8 tests covering:
  - Correct instance returned for each of the 4 providers
  - `ConfigError` thrown for unknown provider string
  - Model fallback to provider default when not specified
  - `base_url` passthrough to provider constructor
  - Named exports only (no default export)

## Acceptance Criteria

All met:

1. `LLMProvider` interface exported with `chat()`, `name`, `defaultModel`
2. Factory returns correct provider instance for each supported provider
3. `ConfigError` thrown for unsupported provider strings
4. Model falls back to provider default when omitted from config
5. Named exports only — no default exports

## File List

- `src/providers/types.ts`
- `src/providers/provider-factory.ts`
- `__tests__/providers/provider-factory.test.ts`
