---
stepsCompleted: [1, 2, 3, 4]
inputDocuments:
  [
    '_bmad-output/planning-artifacts/prd.md',
    '_bmad-output/planning-artifacts/architecture.md'
  ]
lastStep: 4
project_name: 'Prompt2PR'
user_name: 'Davd'
date: '2026-02-13'
status: 'complete'
completedAt: '2026-02-13'
---

# Prompt2PR - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for Prompt2PR,
decomposing the requirements from the PRD and Architecture into implementable
stories.

## Requirements Inventory

### Functional Requirements

- FR1: User can provide a plain-English prompt as a single string in the
  workflow YAML `with.prompt` field
- FR2: System can parse the user's prompt and construct an LLM request with the
  prompt and relevant repo file contents as context
- FR3: System can filter repo files to only those matching user-defined `paths`
  glob patterns before sending to the LLM
- FR4: System can detect when the LLM response contains no actionable changes
  and skip PR creation
- FR5: User can select an LLM provider (`mistral`, `openai`, `anthropic`) via
  the `provider` input
- FR6: User can specify a model identifier via the `model` input, or use the
  provider's default
- FR7: System can authenticate with each supported provider using API keys from
  environment variables
- FR8: System can send a chat completion request to Mistral's API and parse the
  response
- FR9: System can send a chat completion request to OpenAI's API and parse the
  response
- FR10: System can send a chat completion request to Anthropic's API and parse
  the response
- FR11: System can handle provider API errors (invalid key, rate limit, model
  not found) by logging the provider-specific error code and message to Action
  output, setting the action exit code to non-zero, and setting the `skipped`
  output to false
- FR12: System can check out the repository and read file contents from the
  working directory
- FR13: System can scope file reading to user-defined glob patterns (`paths`
  input)
- FR14: System can enforce a `max_files` limit on the number of files the AI can
  modify in a single run
- FR15: System can enforce a `max_changes` limit on the total lines changed
  across all files in a single run
- FR16: System can track file sizes and manage context window limits when
  assembling content for the LLM
- FR17: System can create a new Git branch with a configurable prefix
  (`branch_prefix`) and timestamp
- FR18: System can commit AI-generated file changes to the new branch
- FR19: System can open a Pull Request via the GitHub API targeting the default
  branch
- FR20: System can generate a PR title summarizing the changes (prefixed with
  `[Prompt2PR]`)
- FR21: System can generate a PR body containing: the original prompt (quoted),
  an AI-generated summary of changes, and run metadata (timestamp, model used,
  files scanned)
- FR22: System can apply user-configured labels to the PR (always including
  `prompt2pr`)
- FR23: System can skip PR creation entirely when no changes are detected,
  exiting successfully
- FR24: User can configure the action to run on a cron schedule via GitHub
  Actions `schedule` event
- FR25: User can manually trigger the action via `workflow_dispatch`
- FR26: System can output structured logs to the GitHub Actions log, including:
  number of files scanned, files matching paths, issues found, and action taken
  (PR created or skipped)
- FR27: System can report clear error details when a run fails (provider errors,
  configuration errors, guardrail violations)
- FR28: System can output action outputs (`pr_url`, `pr_number`,
  `files_changed`, `lines_changed`, `skipped`) for downstream workflow steps
- FR29: System enforces that files outside the `paths` scope are never modified
- FR30: System enforces `max_files` and `max_changes` limits, rejecting LLM
  responses that exceed them
- FR31: System never modifies files in the `.github/` directory
- FR32: User can configure all action inputs via the standard GitHub Actions
  `with:` syntax
- FR33: User can provide API keys via environment variables using GitHub Secrets
- FR34: User can configure the action in under 5 minutes using the README
  quick-start guide
- FR35: User can access a README with quick-start instructions, configuration
  reference, and provider setup guides
- FR36: User can copy complete example workflow files from the `examples/`
  directory for common use cases (dead links, copyright year, README sync,
  secret scan, TODO cleanup)

### NonFunctional Requirements

- NFR1: A complete action run (checkout → LLM call → PR creation) should
  complete within 5 minutes for repos with ≤ 100 scoped files
- NFR2: The LLM API call should timeout after 120 seconds with a clear error
  message
- NFR3: File scanning and glob matching should complete within 10 seconds for
  repos with ≤ 10,000 files
- NFR4: API keys must never be logged, printed, or exposed in Action outputs or
  PR bodies
- NFR5: The action must only use permissions explicitly granted via the
  workflow's `permissions` block
- NFR6: The action must not transmit repo file contents to any endpoint other
  than the configured LLM provider API
- NFR7: The `GITHUB_TOKEN` used for PR creation must follow the principle of
  least privilege (only `contents: write` and `pull-requests: write`)
- NFR8: The action must work with GitHub.com (github.com). GitHub Enterprise
  Server support is not required for MVP
- NFR9: LLM provider API calls must follow each provider's documented API
  contract and handle standard HTTP error codes
- NFR10: The action must be compatible with `ubuntu-latest` GitHub-hosted
  runners (the most common runner)
- NFR11: If the LLM provider API is unavailable, the action must fail with a
  clear error (not silently succeed)
- NFR12: If git operations fail (branch creation, push, PR creation), the action
  must fail with actionable error messages
- NFR13: The action must be idempotent — running the same prompt twice on
  unchanged content should produce no PR both times
- NFR14: Network failures to LLM providers should be retried once with a
  5-second backoff before failing
- NFR15: Adding a new LLM provider must require implementing a single interface
  with no changes to core logic (target: < 1 day effort)
- NFR16: The codebase must have ≥80% line coverage for all provider
  implementations and core logic as measured by Istanbul/nyc
- NFR17: The action must be buildable and testable locally with
  `npm install && npm test`

### Additional Requirements

- **Starter Template:** Architecture specifies `actions/typescript-action` as
  the project starter — project initialization from this template is the first
  implementation task
- **Bundling:** Rollup replaces `ncc` (Architecture Decision) — single-file
  output to `dist/index.js`
- **Node.js 20:** Pinned runtime (overriding template default of >=24 to match
  GitHub Actions runner standard)
- **ESM Modules:** TypeScript with `"type": "module"`, `.js` extensions in all
  imports, named exports only
- **6 Core Architectural Decisions:** LLM Provider Interface + Factory pattern,
  Git via `@actions/exec` (native CLI), JSON structured LLM response parsing,
  centralized `withRetry()` utility, fail-fast manual config validation, custom
  logger wrapping `@actions/core`
- **5 Custom Error Types:** `ConfigError`, `ProviderError`, `GitError`,
  `GuardrailError`, `ParseError`
- **Implementation Sequence:** Config validation → Logger → Provider Interface +
  Factory → Retry wrapper → Git Manager → Response Parser
- **CI/CD Workflows from Template:** `ci.yml`, `check-dist.yml`, `linter.yml`,
  `codeql-analysis.yml`
- **Testing:** Jest with ESM support (`--experimental-vm-modules`), `__tests__/`
  directory structure, all external I/O mocked via `jest.fn()` / `jest.spyOn()`
- **Code Quality:** ESLint + Prettier, strict TypeScript, no `any` types, no
  default exports, no `.then()` chains
- **Release Management:** `script/release` for semver tagging, `v1` floating tag
  pattern
- **Local Development:** `@github/local-action` for testing, VS Code debug
  config, `npm run all` for full pipeline

### FR Coverage Map

| FR   | Epic   | Description                             |
| ---- | ------ | --------------------------------------- |
| FR1  | Epic 2 | Prompt input from YAML                  |
| FR2  | Epic 2 | Parse prompt + construct LLM request    |
| FR3  | Epic 2 | Filter files by `paths` globs           |
| FR4  | Epic 3 | Detect no actionable changes            |
| FR5  | Epic 3 | Select provider via input               |
| FR6  | Epic 3 | Specify model or use default            |
| FR7  | Epic 3 | Authenticate with provider via env vars |
| FR8  | Epic 3 | Mistral API integration                 |
| FR9  | Epic 6 | OpenAI API integration                  |
| FR10 | Epic 3 | Anthropic API integration               |
| FR11 | Epic 3 | Provider error handling                 |
| FR12 | Epic 2 | Checkout and read files                 |
| FR13 | Epic 2 | Scope reading to globs                  |
| FR14 | Epic 5 | Enforce `max_files`                     |
| FR15 | Epic 5 | Enforce `max_changes`                   |
| FR16 | Epic 2 | Context window management               |
| FR17 | Epic 4 | Create branch                           |
| FR18 | Epic 4 | Commit changes                          |
| FR19 | Epic 4 | Open PR via GitHub API                  |
| FR20 | Epic 4 | PR title with `[Prompt2PR]` prefix      |
| FR21 | Epic 4 | PR body (prompt + summary + metadata)   |
| FR22 | Epic 4 | Apply labels                            |
| FR23 | Epic 4 | Skip PR when no changes                 |
| FR24 | Epic 7 | Cron scheduling                         |
| FR25 | Epic 7 | Manual trigger (`workflow_dispatch`)    |
| FR26 | Epic 7 | Structured Action logs                  |
| FR27 | Epic 7 | Clear error reporting                   |
| FR28 | Epic 4 | Action outputs                          |
| FR29 | Epic 5 | Path scope enforcement                  |
| FR30 | Epic 5 | Max limits enforcement                  |
| FR31 | Epic 5 | `.github/` exclusion                    |
| FR32 | Epic 1 | `with:` syntax config                   |
| FR33 | Epic 1 | API keys via env vars                   |
| FR34 | Epic 8 | 5-minute setup                          |
| FR35 | Epic 8 | README docs                             |
| FR36 | Epic 8 | Example workflows                       |

## Epic List

### Epic 1: Project Foundation & Configuration

After this epic: A developer can clone the repo, install dependencies, build,
test, and run the action locally. All inputs are parsed and validated with clear
errors. **FRs covered:** FR32, FR33, FR34 **NFRs covered:** NFR17, NFR4

### Epic 2: File Scanning & Context Assembly

After this epic: The action can read repo files matching glob patterns, track
sizes, respect context window limits, and assemble content ready for an LLM
request. **FRs covered:** FR1, FR2, FR3, FR12, FR13, FR16 **NFRs covered:**
NFR3, NFR6

### Epic 3: LLM Integration — Mistral & Anthropic Providers

After this epic: The action can send a prompt + file context to Mistral's or
Anthropic's API, parse the structured JSON response, detect "no changes," and
handle provider errors with retry. The full pipeline works end-to-end with both
MVP providers. **FRs covered:** FR4, FR5, FR6, FR7, FR8, FR10, FR11 **NFRs
covered:** NFR2, NFR9, NFR11, NFR14, NFR15

### Epic 4: Pull Request Creation & Output

After this epic: The action can create a branch, commit changes, push, open a PR
with a formatted body (prompt + summary + metadata), apply labels, and set
action outputs. If no changes, it silently skips. Maya's full happy path works.
**FRs covered:** FR17, FR18, FR19, FR20, FR21, FR22, FR23, FR28 **NFRs
covered:** NFR1, NFR12, NFR13

### Epic 5: Safety Guardrails

After this epic: The action enforces all safety limits — `max_files`,
`max_changes`, `paths` scoping, `.github/` exclusion. LLM responses that violate
limits are rejected before any git operations. **FRs covered:** FR14, FR15,
FR29, FR30, FR31 **NFRs covered:** NFR5, NFR7

### Epic 6: Additional LLM Providers

After this epic: Users can also choose OpenAI as a provider. The provider
interface proves its extensibility — adding a new provider is a self-contained
implementation. **FRs covered:** FR9 **NFRs covered:** NFR15

### Epic 7: Scheduling, Logging & Observability

After this epic: The action runs on cron schedules and manual triggers, produces
structured logs showing scan results, and provides clear feedback for the
"nothing found" case. Priya's debug journey works perfectly. **FRs covered:**
FR24, FR25, FR26, FR27 **NFRs covered:** NFR8, NFR10, NFR11

### Epic 8: Documentation, Examples & Marketplace Launch

After this epic: The README is exceptional, 5 example workflows are ready to
copy-paste, and the action is published to GitHub Marketplace. Any developer can
set up Prompt2PR in under 5 minutes. Tomás can roll out templates across his
org. **FRs covered:** FR34, FR35, FR36 **NFRs covered:** NFR16

## Epic 1: Project Foundation & Configuration

After this epic: A developer can clone the repo, install dependencies, build,
test, and run the action locally. All inputs are parsed and validated with clear
errors.

### Story 1.1: Initialize Project from Starter Template

As a developer, I want a fully initialized TypeScript GitHub Action project with
build, test, lint, and bundle tooling, So that I have a working development
environment with CI/CD from day one.

**Acceptance Criteria:**

**Given** the `actions/typescript-action` template has been used to create the
repo **When** I run `npm install && npm run all` **Then** the project compiles,
lints, tests, and bundles to `dist/index.js` without errors **And** the
following CI workflows exist and pass: `ci.yml`, `check-dist.yml`, `linter.yml`,
`codeql-analysis.yml` **And** Node.js 20 is pinned in `.node-version` and
`action.yml` **And** ESM is configured (`"type": "module"` in `package.json`,
`.js` extensions in imports) **And** `@github/local-action` is available for
local testing with a `.env.example` file **And** `action.yml` declares all
inputs (prompt, provider, model, paths, max_files, max_changes, label,
branch_prefix, dry_run, base_url) and outputs (pr_url, pr_number, files_changed,
lines_changed, skipped)

### Story 1.2: Configuration Validation & Input Parsing

As a developer using the action, I want all Action inputs validated at startup
with clear error messages, So that misconfiguration fails fast instead of
causing cryptic errors downstream.

**Acceptance Criteria:**

**Given** the action starts with inputs from `with:` syntax (FR32) **When**
`validateConfig()` runs in `src/config.ts` **Then** it returns a typed
`ActionConfig` object with all inputs parsed **And** missing required inputs
(`prompt`, `provider`) throw `ConfigError` with descriptive messages **And**
`provider` values not in `['mistral', 'openai', 'anthropic']` throw
`ConfigError` **And** `max_files` and `max_changes` parse as positive integers
or use defaults (10, 200) **And** API keys are read from environment variables
(FR33) and missing keys throw `ConfigError` **And** no other module in the
codebase calls `core.getInput()` directly — only `config.ts` **And** tests in
`__tests__/config.test.ts` cover valid, invalid, and missing inputs with ≥80%
coverage

### Story 1.3: Custom Error Types & Retry Utility

As a developer implementing the action, I want typed error classes and a
centralized retry wrapper, So that every failure is identifiable by type and
retryable operations have consistent behavior.

**Acceptance Criteria:**

**Given** the `src/errors.ts` module exists **When** an error occurs in any
component **Then** it throws one of: `ConfigError`, `ProviderError`, `GitError`,
`GuardrailError`, or `ParseError` **And** each error class extends `Error` with
a descriptive `name` property **And** `ProviderError` includes `provider` and
optional `statusCode` fields **And** `src/retry.ts` exports
`withRetry(fn, { retries: 1, backoffMs: 5000 })` (NFR14) **And** `withRetry`
retries once on failure, waits the backoff period, and re-throws on second
failure **And** `withRetry` propagates the original error type (not a generic
Error) **And** tests in `__tests__/retry.test.ts` cover success,
retry-then-success, and retry-then-fail paths

### Story 1.4: Logger with Secret Masking

As a developer using the action, I want structured, component-prefixed logs that
automatically mask API keys, So that every log line is traceable to its source
and secrets are never exposed (NFR4).

**Acceptance Criteria:**

**Given** the `src/logger.ts` module exists **When** any component calls
`createLogger('scanner')` **Then** it returns a logger with `info`, `debug`,
`error`, and `warn` methods **And** all log output is prefixed with
`[component]` (e.g., `[scanner] Scanning files`) **And** `core.setSecret()` is
called for all API keys during logger initialization **And** the logger
delegates to `@actions/core` functions (`core.info`, `core.debug`, `core.error`)
**And** tests in `__tests__/logger.test.ts` verify prefix formatting and secret
masking **And** no module in the codebase uses `console.log` — only the logger

## Epic 2: File Scanning & Context Assembly

After this epic: The action can read repo files matching glob patterns, track
sizes, respect context window limits, and assemble content ready for an LLM
request.

### Story 2.1: File Scanner with Glob Matching

As a developer using the action, I want the action to scan repository files
matching my `paths` glob patterns, So that only relevant files are included as
context for the LLM.

**Acceptance Criteria:**

**Given** the action has a validated `ActionConfig` with `paths` (e.g.,
`"docs/**,README.md"`) **When** `scanFiles()` in `src/file-scanner.ts` executes
(FR12, FR13) **Then** it returns a `FileContext[]` array containing
`{ path, content, size }` for each matching file **And** glob patterns are
comma-separated and resolve relative to the repo working directory **And** files
not matching any glob pattern are excluded (FR3) **And** files in `.github/` are
always excluded regardless of glob patterns **And** file sizes are tracked in
bytes for each file (FR16) **And** scanning completes within 10 seconds for
repos with ≤ 10,000 files (NFR3) **And** file contents are never transmitted
anywhere during scanning — only held in memory (NFR6) **And** tests in
`__tests__/file-scanner.test.ts` mock the file system and cover: valid globs, no
matches, `.github/` exclusion, and size tracking

### Story 2.2: Prompt Assembly with Context Window Management

As a developer using the action, I want the user's prompt combined with scanned
file contents into a structured LLM request, So that the LLM has full context to
make informed code changes without exceeding token limits.

**Acceptance Criteria:**

**Given** a user prompt string (FR1) and a `FileContext[]` from the file scanner
**When** `buildPrompt()` in `src/prompt-assembler.ts` executes (FR2) **Then** it
returns a `ChatRequest` object with the prompt and file contents structured for
the LLM **And** the assembled content respects context window limits by tracking
total character/token count (FR16) **And** if total content exceeds the limit,
files are truncated or excluded with a logged warning **And** the prompt
instructs the LLM to return changes as structured JSON:
`{ files: [{ path, content, action }] }` **And** file paths and contents are
clearly delimited in the prompt so the LLM can reference them **And** tests in
`__tests__/prompt-assembler.test.ts` cover: normal assembly, truncation, empty
file list, and prompt formatting

## Epic 3: LLM Integration — Mistral & Anthropic Providers

After this epic: The action can send a prompt + file context to Mistral's or
Anthropic's API, parse the structured JSON response, detect "no changes," and
handle provider errors with retry. The full pipeline works end-to-end with both
MVP providers.

### Story 3.1: Provider Interface & Factory

As a developer extending the action, I want a clean provider interface and
factory function, So that adding new LLM providers requires only implementing
one interface with no changes to core logic (NFR15).

**Acceptance Criteria:**

**Given** `src/providers/types.ts` defines the `LLMProvider` interface,
`ChatRequest`, `LLMResponse`, and `FileChange` types **When**
`createProvider(config)` in `src/providers/provider-factory.ts` is called (FR5)
**Then** it returns an `LLMProvider` instance matching the `config.provider`
value **And** the `LLMProvider` interface requires
`chat(request: ChatRequest): Promise<LLMResponse>`, `name: string`, and
`defaultModel: string` **And** `FileChange` type has
`{ path: string, content: string, action: "modify" | "create" | "delete" }`
**And** the factory throws `ConfigError` for unsupported provider names **And**
the factory uses the user's `model` input or falls back to the provider's
`defaultModel` (FR6) **And** all types use named exports only, no default
exports **And** tests in `__tests__/providers/provider-factory.test.ts` cover:
valid provider routing, unknown provider error, model fallback

### Story 3.2: Mistral Provider Implementation

As a developer using the action with Mistral, I want the action to call
Mistral's chat completion API and return structured results, So that I get
AI-generated code changes from my prompt.

**Acceptance Criteria:**

**Given** `src/providers/mistral-provider.ts` implements the `LLMProvider`
interface **When** `chat(request)` is called with a `ChatRequest` (FR8) **Then**
it sends a POST to `https://api.mistral.ai/v1/chat/completions` with the correct
headers and body **And** authentication uses the API key from `ActionConfig` via
the `Authorization: Bearer` header (FR7) **And** the request includes
`response_format: { type: "json_object" }` to request structured JSON **And**
the `defaultModel` is `"mistral-large-latest"` **And** requests timeout after
120 seconds (NFR2) with a `ProviderError` **And** API errors (401, 429, 500)
throw `ProviderError` with provider name and status code (FR11) **And** rate
limit errors (429) include the retry-after info in the error message **And** the
provider does NOT implement retry logic — that's handled by `withRetry` at the
call site **And** tests in `__tests__/providers/mistral-provider.test.ts` mock
`fetch` and cover: successful response, auth error, rate limit, timeout,
malformed response

### Story 3.3: Response Parser — JSON to FileChanges

As a developer using the action, I want LLM responses parsed into a validated
list of file changes, So that malformed or unexpected responses are caught
before any git operations.

**Acceptance Criteria:**

**Given** an `LLMResponse` from any provider **When** `parseResponse()` in
`src/response-parser.ts` executes **Then** it extracts the JSON content and
returns a `FileChange[]` array **And** it validates the JSON structure matches
`{ files: [{ path: string, content: string, action: "modify" | "create" | "delete" }] }`
**And** malformed JSON throws `ParseError` with the raw content excerpt for
debugging **And** valid JSON with unexpected schema (missing fields, wrong
types) throws `ParseError` **And** an empty `files` array is valid and signals
"no changes" (FR4) **And** tests in `__tests__/response-parser.test.ts` cover:
valid response, empty files, malformed JSON, missing fields, wrong types

### Story 3.4: Anthropic Provider Implementation

As a developer using the action with Anthropic, I want the action to call
Anthropic's messages API, So that I can use Claude models to generate code
changes.

**Acceptance Criteria:**

**Given** `src/providers/anthropic-provider.ts` implements the `LLMProvider`
interface **When** `chat(request)` is called with a `ChatRequest` (FR10)
**Then** it sends a POST to `https://api.anthropic.com/v1/messages` with correct
headers and body **And** authentication uses `ANTHROPIC_API_KEY` from
environment via `x-api-key` header (Anthropic's convention) **And** the
`anthropic-version` header is set to the current API version **And** the request
uses Anthropic's message format (system prompt + user messages) and requests
JSON output **And** the `defaultModel` is `"claude-sonnet-4-20250514"` **And**
requests timeout after 120 seconds (NFR2) with a `ProviderError` **And** API
errors throw `ProviderError` with provider name `"anthropic"` and status code
(FR11) **And** the provider transforms Anthropic's response format to the shared
`LLMResponse` type **And** no changes to `provider-factory.ts` core logic are
needed — only adding the factory case (NFR15) **And** tests in
`__tests__/providers/anthropic-provider.test.ts` mock `fetch` and cover:
successful response, auth error, rate limit, timeout

## Epic 4: Pull Request Creation & Output

After this epic: The action can create a branch, commit changes, push, open a PR
with a formatted body (prompt + summary + metadata), apply labels, and set
action outputs. If no changes, it silently skips. Maya's full happy path works.

### Story 4.1: Git Manager — Branch, Stage, Commit, Push

As a developer using the action, I want AI-generated file changes committed to a
new branch and pushed, So that changes are ready for a Pull Request without
manual git operations.

**Acceptance Criteria:**

**Given** a validated `FileChange[]` array from the response parser **When**
`GitManager` in `src/git-manager.ts` executes **Then** it creates a new branch
named `{branch_prefix}{workflow-name}-{timestamp}` (FR17) **And** it writes each
`FileChange` to disk (create, modify, or delete files based on `action` field)
**And** it stages all changed files with `git add` **And** it commits with a
descriptive message: `[Prompt2PR] {summary of changes}` (FR18) **And** it pushes
the branch to origin **And** all git operations use `@actions/exec` to call
native `git` CLI **And** git failures (branch exists, push rejected, auth error)
throw `GitError` with actionable messages (NFR12) **And** tests in
`__tests__/git-manager.test.ts` mock `@actions/exec` and cover: successful flow,
branch creation failure, push failure, file write errors

### Story 4.2: PR Creator — GitHub API Integration

As a developer using the action, I want a Pull Request created automatically
with a clear description, So that I can review AI-generated changes with full
context (prompt, summary, metadata).

**Acceptance Criteria:**

**Given** changes have been pushed to a new branch **When**
`createPullRequest()` in `src/pr-creator.ts` executes (FR19) **Then** it opens a
PR via `@actions/github` (Octokit) targeting the default branch **And** the PR
title is prefixed with `[Prompt2PR]` followed by an AI summary (FR20) **And**
the PR body contains: the original prompt (blockquoted), an AI-generated
summary, and run metadata (timestamp, model used, files scanned) (FR21) **And**
user-configured labels are applied, always including `prompt2pr` (FR22) **And**
the function returns `{ url: string, number: number }` for the created PR
**And** GitHub API failures throw `GitError` with the HTTP status and response
body **And** tests in `__tests__/pr-creator.test.ts` mock Octokit and cover:
successful PR creation, label application, API error handling

### Story 4.3: Main Pipeline — End-to-End Orchestration

As a developer using the action, I want the entire pipeline (config → scan →
prompt → LLM → parse → git → PR) wired together, So that a single action run
produces a complete PR or silently skips.

**Acceptance Criteria:**

**Given** `src/main.ts` implements the `run()` function as the action entrypoint
**When** the action executes **Then** it follows the pipeline:
`validateConfig()` → `scanFiles()` → `buildPrompt()` →
`withRetry(provider.chat())` → `parseResponse()` → `GitManager` →
`createPullRequest()` **And** if `parseResponse()` returns an empty
`FileChange[]`, the action skips PR creation, logs "No changes needed", exits
successfully, and sets `skipped=true` (FR4, FR23) **And** action outputs are
set: `pr_url`, `pr_number`, `files_changed`, `lines_changed`, `skipped` (FR28)
**And** all errors are caught at the top level, logged via the logger, and set
`core.setFailed()` with the error message **And** the full pipeline completes
within 5 minutes for repos with ≤ 100 scoped files (NFR1) **And** running the
same prompt on unchanged content produces no PR (idempotent) (NFR13) **And**
tests in `__tests__/main.test.ts` mock all dependencies and cover: happy path
(PR created), skip path (no changes), error path (provider failure), and
idempotency

## Epic 5: Safety Guardrails

After this epic: The action enforces all safety limits — `max_files`,
`max_changes`, `paths` scoping, `.github/` exclusion. LLM responses that violate
limits are rejected before any git operations.

### Story 5.1: Post-LLM Guardrail Enforcement

As a developer using the action, I want AI-generated changes validated against
safety limits before any git operations, So that the LLM can never modify more
files or lines than I allow, and protected paths are never touched.

**Acceptance Criteria:**

**Given** a `FileChange[]` array from the response parser and a validated
`ActionConfig` **When** `validateChanges()` in `src/guardrails.ts` executes
**Then** it rejects the entire response with `GuardrailError` if the number of
changed files exceeds `max_files` (FR14, FR30) **And** it rejects the entire
response with `GuardrailError` if total lines changed exceeds `max_changes`
(FR15, FR30) **And** it rejects any `FileChange` with a path outside the
configured `paths` scope (FR29) **And** it rejects any `FileChange` targeting
files in `.github/` regardless of configuration (FR31) **And** `GuardrailError`
messages include: which limit was violated, the actual count, and the configured
limit **And** validated changes are returned as `FileChange[]` (unchanged if all
pass) **And** the action uses only permissions explicitly granted via workflow
`permissions` block (NFR5) **And** `GITHUB_TOKEN` follows least privilege — only
`contents: write` and `pull-requests: write` (NFR7) **And** tests in
`__tests__/guardrails.test.ts` cover: within limits, exceeds max_files, exceeds
max_changes, out-of-scope path, `.github/` path, edge cases (exactly at limit)

### Story 5.2: Pre-LLM File Scope Enforcement

As a developer using the action, I want file scanning to enforce path scope
before sending content to the LLM, So that the LLM never even receives files
outside my intended scope.

**Acceptance Criteria:**

**Given** the file scanner from Epic 2 (Story 2.1) **When** `scanFiles()` is
enhanced with guardrail awareness **Then** files outside the `paths` glob scope
are never read or included in `FileContext[]` (FR29) **And** files in `.github/`
are excluded at scan time, not just at post-LLM validation (FR31) **And** the
scanner logs how many files were excluded and why (e.g., "Excluded 3 files: 2
outside paths scope, 1 in .github/") **And** this is a defense-in-depth measure
— post-LLM guardrails (Story 5.1) remain the authoritative enforcement **And**
tests in `__tests__/file-scanner.test.ts` are extended to cover: `.github/`
exclusion at scan time, logging of excluded files

## Epic 6: Additional LLM Providers

After this epic: Users can also choose OpenAI as a provider. The provider
interface proves its extensibility — adding a new provider is a self-contained
implementation.

### Story 6.1: OpenAI Provider Implementation

As a developer using the action with OpenAI, I want the action to call OpenAI's
chat completion API, So that I can use GPT models to generate code changes.

**Acceptance Criteria:**

**Given** `src/providers/openai-provider.ts` implements the `LLMProvider`
interface **When** `chat(request)` is called with a `ChatRequest` (FR9) **Then**
it sends a POST to `https://api.openai.com/v1/chat/completions` with correct
headers and body **And** authentication uses `OPENAI_API_KEY` from environment
via `Authorization: Bearer` header **And** the request includes
`response_format: { type: "json_object" }` for structured output **And** the
`defaultModel` is `"gpt-4o"` **And** requests timeout after 120 seconds (NFR2)
with a `ProviderError` **And** API errors (401, 429, 500) throw `ProviderError`
with provider name `"openai"` and status code (FR11) **And** the provider
transforms OpenAI's response format to the shared `LLMResponse` type **And** no
changes to `provider-factory.ts` core logic are needed — only adding the factory
case (NFR15) **And** tests in `__tests__/providers/openai-provider.test.ts` mock
`fetch` and cover: successful response, auth error, rate limit, timeout

## Epic 7: Scheduling, Logging & Observability

After this epic: The action runs on cron schedules and manual triggers, produces
structured logs showing scan results, and provides clear feedback for the
"nothing found" case. Priya's debug journey works perfectly.

### Story 7.1: Scheduling & Trigger Configuration

As a developer using the action, I want the action to run on a cron schedule and
be manually triggerable, So that repo maintenance happens automatically and I
can test on demand.

**Acceptance Criteria:**

**Given** a user's workflow YAML with `on: schedule` and `on: workflow_dispatch`
(FR24, FR25) **When** the action is triggered by either event **Then** it
executes the full pipeline identically regardless of trigger type **And** the
example workflows in `examples/` demonstrate both `schedule` (cron) and
`workflow_dispatch` triggers **And** the action is compatible with
`ubuntu-latest` GitHub-hosted runners (NFR10) **And** the action works with
GitHub.com (NFR8) **And** the `action.yml` does not restrict trigger types — any
event that provides the required inputs works **And** the README documents cron
syntax examples and `workflow_dispatch` usage with input overrides

### Story 7.2: Structured Logging & Observability

As a developer debugging the action, I want detailed, structured logs showing
what the action scanned, found, and did, So that I can understand exactly what
happened on every run — especially when no PR is created.

**Acceptance Criteria:**

**Given** the action executes any pipeline step **When** the run completes
(success or failure) **Then** logs include: number of files scanned, number
matching `paths`, number of issues found, and action taken (PR created or
skipped) (FR26) **And** when no changes are detected, the log clearly states:
`"Scanned {N} files matching {paths}. Found 0 issues. No PR created."` (Priya's
journey) **And** when a PR is created, the log includes the PR URL and number of
files/lines changed **And** error details are clear and actionable: provider
name, HTTP status, specific error message (FR27, NFR11) **And** configuration
errors report which input is invalid and what was expected **And** guardrail
violations report which limit was hit and the actual vs. configured values
**And** all log output uses the component-prefixed logger from Story 1.4 **And**
tests verify log output format for: successful PR, skipped run, provider error,
config error, guardrail violation

## Epic 8: Documentation, Examples & Marketplace Launch

After this epic: The README is exceptional, 5 example workflows are ready to
copy-paste, and the action is published to GitHub Marketplace. Any developer can
set up Prompt2PR in under 5 minutes. Tomás can roll out templates across his
org.

### Story 8.1: README — Quick-Start, Config Reference & Provider Setup

As a developer discovering Prompt2PR, I want a README that explains what it
does, how to set it up, and how to configure every option, So that I can go from
zero to a working workflow in under 5 minutes (FR34).

**Acceptance Criteria:**

**Given** the `README.md` in the project root **When** a developer reads it
**Then** it includes a hero section with a one-sentence description and badge
row (build status, coverage, Marketplace link) **And** a quick-start section
with a complete, copy-paste workflow YAML that works immediately **And** a full
configuration reference table listing all inputs with types, defaults, and
descriptions (FR35) **And** a full outputs reference table **And** provider
setup instructions for Mistral, OpenAI, and Anthropic (how to get API keys,
where to store them as GitHub Secrets) **And** a FAQ/Troubleshooting section
covering: "no PR created" (check logs), API key errors, rate limits, and context
too large **And** a Contributing guide with development setup instructions
**And** setup can be completed in under 5 minutes by anyone comfortable with
GitHub Actions (FR34)

### Story 8.2: Example Workflows

As a developer looking for prompt ideas, I want 5 ready-to-use workflow files
covering common maintenance tasks, So that I can copy them directly into my repo
and start automating immediately (FR36).

**Acceptance Criteria:**

**Given** the `examples/` directory in the project root **When** a developer
copies any example file to `.github/workflows/` **Then** each example is a
complete, working workflow YAML with `schedule`, `workflow_dispatch`,
`permissions`, and Prompt2PR action configuration **And** the following 5
examples exist:

- `fix-dead-links.yml` — Detect and fix broken links in markdown files
- `update-copyright.yml` — Update copyright year in all source files
- `sync-readme.yml` — Sync README with code (e.g., API examples match actual
  routes)
- `scan-secrets.yml` — Scan for accidentally committed secrets or tokens
- `cleanup-todos.yml` — Clean up resolved TODO comments **And** each example
  includes comments explaining what it does and how to customize it **And** each
  example uses `paths` scoping appropriate to the task **And** the README
  references all examples with brief descriptions

### Story 8.3: Test Coverage Gate & Release

As a maintainer of Prompt2PR, I want ≥80% test coverage enforced in CI and a
working release process, So that every release is reliable and the Marketplace
listing stays up to date.

**Acceptance Criteria:**

**Given** the CI pipeline (`ci.yml`) **When** tests run on PR or push **Then**
Jest generates a coverage report and the build fails if line coverage is below
80% (NFR16) **And** the coverage badge in README reflects the current coverage
percentage **And** `script/release` handles semver tagging (`v1.x.x`) and floats
the major tag (`v1`) **And** a GitHub Release is created with a changelog
summarizing changes **And** `dist/index.js` is verified by `check-dist.yml` to
match compiled source **And** the `action.yml` metadata is complete for GitHub
Marketplace listing (name, description, icon, color, branding)
