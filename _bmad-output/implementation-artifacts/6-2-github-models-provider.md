# Story 6.2: GitHub Models Provider Implementation

**Status:** complete

> **NOTE:** This story was not in the original epics.md plan. The GitHub Models
> provider was added organically to prove provider interface extensibility
> (NFR15). Documented retroactively (see code review Finding #5).

## Story

Support GitHub Models as an LLM provider.

## Implementation

### Provider

- `src/providers/github-models-provider.ts` — Extends
  `BaseOpenAICompatibleProvider`
- POST to `https://models.github.ai/inference/chat/completions` (different
  endpoint path from standard OpenAI)
- `defaultModel = 'openai/gpt-4o'` (publisher/model format)
- Auth via GitHub token (PAT with `models:read` or `GITHUB_TOKEN` with
  `models: read` permission)

### Integration

- Added `'github'` to `VALID_PROVIDERS` in config and factory

### Tests

- `__tests__/providers/github-models-provider.test.ts` — 20 tests

## File List

| File                                                 | Status   |
| ---------------------------------------------------- | -------- |
| `src/providers/github-models-provider.ts`            | new      |
| `__tests__/providers/github-models-provider.test.ts` | new      |
| `src/config.ts`                                      | modified |
| `src/providers/provider-factory.ts`                  | modified |

## Requirements Traced

- NFR15: Provider extensibility (additional proof point)
