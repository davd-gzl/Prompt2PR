# Story 3.4: Anthropic Provider Implementation

**Status:** complete

## Story

As a developer using the action with Anthropic, I want the action to call
Anthropic's messages API.

## Key Implementation Details

### `src/providers/anthropic-provider.ts`

- Implements `LLMProvider` interface directly — does NOT extend
  `BaseOpenAICompatibleProvider` because the Anthropic API format differs
  significantly from the OpenAI-compatible shape
- POST to `https://api.anthropic.com/v1/messages`
- Auth headers:
  - `x-api-key: <api_key>` (Anthropic-specific, not Bearer token)
  - `anthropic-version` header included for API versioning
- System prompt handling:
  - Transforms system message from the messages array into a top-level `system`
    field in the request body (Anthropic convention)
  - Remaining messages sent in the `messages` array
- Response parsing:
  - Anthropic returns a `content` blocks array
  - Extracts first text block from the content array
  - Parses the text block content as JSON for structured output
- `defaultModel = 'claude-sonnet-4-20250514'`
- 120-second request timeout (NFR2)

### Design Decision

Anthropic's API differs from OpenAI's in several ways:

- Different auth mechanism (`x-api-key` vs `Authorization: Bearer`)
- System prompt is a top-level field, not a message role
- Response is a content blocks array, not a `choices[0].message` structure

These differences made it cleaner to implement `LLMProvider` directly rather
than force-fit the base class with excessive overrides.

### `__tests__/providers/anthropic-provider.test.ts`

- 21 tests covering:
  - Successful chat completion with content block parsing
  - System prompt extraction to top-level field
  - Authentication error (401) handling
  - Rate limit (429) handling
  - Timeout after 120s
  - Network error handling
  - Malformed response handling
  - Empty content blocks array
  - Model and API version header verification

## Acceptance Criteria

All met:

1. Calls Anthropic messages endpoint with correct auth headers
2. Transforms system prompt to top-level `system` field
3. Parses content blocks response format correctly
4. Returns parsed `LLMResponse` on success
5. Handles API errors gracefully
6. Enforces 120s timeout per NFR2
7. Uses `claude-sonnet-4-20250514` as default model

## File List

- `src/providers/anthropic-provider.ts`
- `__tests__/providers/anthropic-provider.test.ts`
