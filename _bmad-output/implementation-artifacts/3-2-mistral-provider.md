# Story 3.2: Mistral Provider Implementation

**Status:** complete

## Story

As a developer using the action with Mistral, I want the action to call
Mistral's chat completion API and return structured results.

## Key Implementation Details

### `src/providers/mistral-provider.ts`

- Extends `BaseOpenAICompatibleProvider` (refactored during code review to share
  logic with OpenAI and Gemini providers)
- POST to `https://api.mistral.ai/v1/chat/completions`
- Auth via `Authorization: Bearer <api_key>` header
- Requests `response_format: { type: 'json_object' }` for structured JSON output
- `defaultModel = 'mistral-large-latest'`
- 120-second request timeout (NFR2)
- Overrides `formatApiError()` to handle Mistral's error shape
  `{ message: "..." }`

### `src/providers/base-openai-compatible-provider.ts`

- Shared base class for OpenAI-compatible chat completion APIs
- Handles common request/response structure, timeout, error handling
- Subclasses override endpoint URL, auth headers, and error formatting

### `__tests__/providers/mistral-provider.test.ts`

- 20 tests covering:
  - Successful chat completion with structured JSON response
  - Authentication error (401) handling
  - Rate limit (429) handling
  - Timeout after 120s
  - Network error handling
  - Malformed/non-JSON response handling
  - Summary extraction from response

## Acceptance Criteria

All met:

1. Calls Mistral chat completions endpoint with correct auth
2. Sends `response_format: { type: 'json_object' }` for structured output
3. Returns parsed `LLMResponse` on success
4. Handles API errors (auth, rate limit, server errors) gracefully
5. Enforces 120s timeout per NFR2
6. Uses `mistral-large-latest` as default model

## File List

- `src/providers/mistral-provider.ts`
- `src/providers/base-openai-compatible-provider.ts`
- `__tests__/providers/mistral-provider.test.ts`
