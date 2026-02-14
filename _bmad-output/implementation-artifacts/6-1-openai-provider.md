# Story 6.1: OpenAI Provider Implementation

**Status:** complete

## Story

Support OpenAI as an LLM provider.

## Implementation

### Provider

- `src/providers/openai-provider.ts` — Extends `BaseOpenAICompatibleProvider`
- POST to `https://api.openai.com/v1/chat/completions`, Bearer auth
- `defaultModel = 'gpt-4o'`
- 120s timeout
- Overrides `displayName` to `'OpenAI'` (not `'Openai'`)

### Tests

- `__tests__/providers/openai-provider.test.ts` — 20 tests

### NFR15 Extensibility Proof

Only ~43 lines of provider-specific code required, proving the base class
abstraction works as designed.

## File List

| File                                          | Status |
| --------------------------------------------- | ------ |
| `src/providers/openai-provider.ts`            | new    |
| `__tests__/providers/openai-provider.test.ts` | new    |

## Requirements Traced

- FR: OpenAI provider support
- NFR15: Provider extensibility (<50 lines for new provider)
