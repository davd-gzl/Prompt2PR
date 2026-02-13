---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
inputDocuments:
  [
    '_bmad-output/planning-artifacts/prd.md',
    '_bmad-output/planning-artifacts/product-brief.md'
  ]
workflowType: 'architecture'
project_name: 'Prompt2PR'
user_name: 'Davd'
date: '2026-02-13'
lastStep: 8
status: 'complete'
completedAt: '2026-02-13'
---

# Architecture Decision Document

_This document builds collaboratively through step-by-step discovery. Sections
are appended as we work through each architectural decision together._

## Project Context Analysis

### Requirements Overview

**Functional Requirements (36 FRs in 8 categories):**

| Category                 | FRs       | Architectural Implication                                                                        |
| ------------------------ | --------- | ------------------------------------------------------------------------------------------------ |
| Prompt Processing        | FR1-FR4   | Core pipeline: parse prompt → assemble context → call LLM → evaluate response                    |
| LLM Provider Integration | FR5-FR11  | Engine-agnostic interface with per-provider implementations; error handling is provider-specific |
| File Context Management  | FR12-FR16 | File I/O layer with glob filtering, size tracking, and enforcement limits                        |
| Pull Request Creation    | FR17-FR23 | Git operations layer (branch, commit, push) + GitHub API layer (PR creation)                     |
| Scheduling & Triggering  | FR24-FR25 | Handled by GitHub Actions runtime — no architecture needed, just YAML config                     |
| Logging & Observability  | FR26-FR28 | Structured logging throughout pipeline; Action outputs for downstream steps                      |
| Safety & Guardrails      | FR29-FR31 | Enforcement layer that wraps file operations and LLM response processing                         |
| Configuration & Setup    | FR32-FR34 | Input parsing from Action YAML; environment variable handling                                    |
| Documentation & Examples | FR35-FR36 | Not architectural — repo content only                                                            |

**Non-Functional Requirements (17 NFRs in 4 areas):**

| Area            | NFRs     | Key Constraint                                                                  |
| --------------- | -------- | ------------------------------------------------------------------------------- |
| Performance     | NFR1-3   | 5-min total run, 120s LLM timeout, 10s file scan                                |
| Security        | NFR4-7   | API keys never exposed; least-privilege token; no data leakage                  |
| Integration     | NFR8-10  | GitHub.com only; standard HTTP API contracts; ubuntu-latest runner              |
| Reliability     | NFR11-14 | Fail loudly on errors; idempotent runs; retry once with 5s backoff              |
| Maintainability | NFR15-17 | Single-interface provider extensibility; ≥80% test coverage; local dev with npm |

**Scale & Complexity:**

- Primary domain: Developer Tool (GitHub Action)
- Complexity level: Low
- Execution model: Single-pass stateless pipeline (no server, no DB, no UI)
- Estimated architectural components: ~6 (input parser, file scanner, prompt
  assembler, provider interface, git/PR manager, guardrail enforcer)

### Technical Constraints & Dependencies

- **Runtime:** Node.js 20 on GitHub Actions ubuntu-latest runners
- **Language:** TypeScript, compiled with `ncc` to single-file distribution
- **GitHub SDKs:** `@actions/core`, `@actions/github` (Octokit wrapper)
- **Git operations:** `simple-git` or native git CLI
- **No Docker:** Runs as a JavaScript Action (fastest cold start)
- **No external state:** No database, no filesystem persistence between runs
- **Provider APIs:** Direct HTTP `fetch` calls — no SDK dependencies for LLM
  providers

### Cross-Cutting Concerns Identified

1. **Error Handling & Logging** — Every layer (file I/O, LLM calls, git ops,
   GitHub API) must produce structured, actionable logs. Errors must set
   non-zero exit codes and never silently succeed.
2. **API Key Security** — Keys flow from env vars through provider
   initialization. Must never appear in logs, PR bodies, or Action outputs.
   Requires explicit sanitization at logging boundaries.
3. **Context Window Management** — File content assembled for LLM must respect
   model token limits. Affects file scanner (size tracking), prompt assembler
   (truncation/chunking), and potentially provider layer (model-specific
   limits).
4. **Testability Boundaries** — Provider interface, GitHub API client, git
   operations, and file system access all need dependency injection or mockable
   abstractions for ≥80% coverage target.
5. **Guardrail Enforcement** — `max_files`, `max_changes`, `paths` scoping, and
   `.github/` exclusion must be enforced at multiple points: before sending to
   LLM (file scoping) and after receiving response (change validation).

## Starter Template Evaluation

### Primary Technology Domain

GitHub Action (TypeScript) — single-execution automation tool distributed via
GitHub Marketplace.

### Starter Options Considered

| Option                      | Source          | Status                                 | Verdict                                    |
| --------------------------- | --------------- | -------------------------------------- | ------------------------------------------ |
| `actions/typescript-action` | GitHub official | Actively maintained (2026), 2.4k stars | ✅ Selected                                |
| Custom from scratch         | —               | Full control, more setup               | ❌ Unnecessary — template covers all needs |

### Selected Starter: `actions/typescript-action`

**Rationale:**

- Canonical GitHub Actions pattern maintained by GitHub's Actions team
- Encodes best practices for bundling, testing, CI/CD, and release management
- Provides Rollup bundling (tree-shaking, single-file dist), Jest testing (ESM),
  and local-action testing
- Includes release script for semver tag management (`v1` floating tag pattern
  from PRD)
- Minimizes "reinventing the wheel" for Action-specific boilerplate

**Initialization Command:**

```bash
# Use GitHub's "Use this template" to create repo, then:
git clone https://github.com/Davphla/Prompt2PR
cd Prompt2PR
npm install
```

### Architectural Decisions Provided by Starter

**Language & Runtime:**

- TypeScript with ESM modules (`"type": "module"`)
- Node.js 20 (pinned — overriding template's >=24 default to match GitHub
  Actions runner standard)
- Strict TypeScript configuration

**Bundling:**

- Rollup (replaces `ncc` mentioned in PRD — Rollup is the current best practice
  for Actions)
- Single-file output to `dist/index.js` — this IS the action entrypoint
- `dist/` committed to repo (required by GitHub Actions)

**Testing:**

- Jest with ESM support (`--experimental-vm-modules`)
- Coverage badge generation
- `__tests__/` directory structure

**Linting & Formatting:**

- ESLint with TypeScript parser
- Prettier for code formatting
- Markdown lint for docs

**CI/CD Workflows (from template):**

- `ci.yml` — Run tests on PR and push
- `check-dist.yml` — Verify `dist/` matches compiled source
- `linter.yml` — ESLint + Prettier checks
- `codeql-analysis.yml` — Security scanning

**Release Management:**

- `script/release` — Handles semver tagging and major tag floating
- Supports `v1`, `v1.x.x` versioning pattern specified in PRD

**Development Experience:**

- `@github/local-action` for local testing without pushing to GitHub
- VS Code launch configuration for debugging
- `npm run all` — format, lint, test, coverage, bundle in one command

**Deviation from PRD:** The PRD specifies `ncc` for bundling. The official
template has migrated to **Rollup**, which provides better tree-shaking, ESM
support, and is now the GitHub-recommended approach. **Decision: Use Rollup
instead of ncc.**

**Note:** Project initialization using this template should be the first
implementation story.

## Core Architectural Decisions

### Decision Priority Analysis

**Critical Decisions (Block Implementation):** All 6 decisions below are
critical — they define the internal architecture that every implementation story
will build on.

**Deferred Decisions (Post-MVP):**

- Caching strategy (no persistent state in MVP)
- LiteLLM proxy mode specifics (Growth phase)
- Dry-run mode implementation (Growth phase)
- PR deduplication logic (Growth phase)

### Decision 1: LLM Provider Interface — Interface + Factory Pattern

| Aspect        | Detail                                                                                                                                                                                           |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Decision**  | TypeScript `interface LLMProvider` with a factory function                                                                                                                                       |
| **Pattern**   | Interface defines contract; factory creates concrete providers; shared logic (retry, timeout) in utility functions                                                                               |
| **Rationale** | Zero runtime cost (interfaces erased at compile); factory enables test mocking; utility functions are independently testable; aligns with PRD's "implement one class" extensibility goal (NFR15) |
| **Affects**   | FR5-FR11 (all provider integration), NFR15 (extensibility)                                                                                                                                       |

```typescript
// Contract
interface LLMProvider {
  chat(prompt: string, context: FileContext[]): Promise<LLMResponse>
  readonly name: string
  readonly defaultModel: string
}

// Factory
function createProvider(config: ActionConfig): LLMProvider
```

Adding a new provider = implement the `LLMProvider` interface + add to factory
switch.

### Decision 2: Git Operations — `@actions/exec` + Native Git CLI

| Aspect        | Detail                                                                                                                                                   |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Decision**  | Use `@actions/exec` to call native `git` CLI commands                                                                                                    |
| **Pattern**   | A `GitManager` module wraps `@actions/exec` calls for branch creation, staging, committing, and pushing                                                  |
| **Rationale** | Git is pre-installed on all Actions runners; our git needs are simple (branch, add, commit, push); zero external dependencies; keeps bundle size minimal |
| **Affects**   | FR17-FR18 (branch creation, committing), NFR12 (git error handling)                                                                                      |
| **Trade-off** | More verbose than `simple-git`, but avoids a dependency for ~5 git commands                                                                              |

### Decision 3: LLM Response Parsing — Structured JSON Output

| Aspect        | Detail                                                                                                                                                                           |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | -------------------------------------------------------------- |
| **Decision**  | Instruct the LLM to return file changes as structured JSON                                                                                                                       |
| **Pattern**   | Define a response schema: `{ files: [{ path: string, content: string, action: "modify"                                                                                           | "create" | "delete" }] }`. Validate response structure before processing. |
| **Rationale** | JSON parsing is deterministic; no regex or diff-parsing edge cases; we control diff computation (compare original vs. returned content); modern LLMs handle structured JSON well |
| **Affects**   | FR2 (LLM request construction), FR4 (response evaluation), FR14-FR15 (guardrail enforcement on response)                                                                         |
| **Risk**      | LLM may occasionally return malformed JSON → mitigated by validation + clear error message                                                                                       |

### Decision 4: Error Handling — Centralized Retry Wrapper

| Aspect        | Detail                                                                                                                                                 |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Decision**  | Single `withRetry()` utility that wraps any async operation                                                                                            |
| **Pattern**   | `withRetry(fn, { retries: 1, backoffMs: 5000 })` — wraps provider calls, can also wrap GitHub API calls                                                |
| **Rationale** | One implementation, tested once, used everywhere; consistent retry behavior (NFR14: retry once, 5s backoff); separates retry logic from business logic |
| **Affects**   | NFR11 (fail loudly), NFR14 (retry with backoff), FR11 (provider error handling)                                                                        |

### Decision 5: Configuration Validation — Fail-Fast Manual Validation

| Aspect        | Detail                                                                                                                                                                |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Decision**  | Validate all Action inputs at startup with a dedicated validation function                                                                                            |
| **Pattern**   | `validateConfig()` runs before any operations; returns validated `ActionConfig` typed object or throws with descriptive error                                         |
| **Rationale** | Only ~10 inputs to validate — schema library is overkill; zero dependencies; custom error messages optimized for Actions log output; can add Zod later if inputs grow |
| **Affects**   | FR32-FR33 (configuration), FR27 (clear error details)                                                                                                                 |

### Decision 6: Logging — Custom Logger Wrapping `@actions/core`

| Aspect        | Detail                                                                                                                                                                                           |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Decision**  | Thin logger abstraction over `@actions/core` logging functions                                                                                                                                   |
| **Pattern**   | `createLogger(component: string)` returns a logger that prefixes all output with `[component]` and centralizes secret masking via `core.setSecret()`                                             |
| **Rationale** | Adds component context to every log line (e.g., `[provider:mistral]`, `[git]`, `[scanner]`); centralizes API key masking; still renders natively in Actions UI; trivial to implement (~20 lines) |
| **Affects**   | FR26-FR28 (logging & observability), NFR4 (API key secrecy)                                                                                                                                      |

### Decision Impact Analysis

**Implementation Sequence:**

1. Configuration validation (Decision 5) — must exist before anything else runs
2. Logger (Decision 6) — needed by all subsequent components
3. LLM Provider interface + factory (Decision 1) — core pipeline dependency
4. Retry wrapper (Decision 4) — used by providers and git operations
5. Git operations manager (Decision 2) — needed for PR creation
6. Response parser with JSON schema (Decision 3) — connects LLM output to git
   operations

**Cross-Component Dependencies:**

- Logger → used by all components
- Config validation → feeds into provider factory (provider name, model, API
  key) and git manager (branch prefix)
- Retry wrapper → wraps provider `chat()` calls and optionally GitHub API calls
- Response parser → output feeds into guardrail enforcement, then into git
  manager

## Implementation Patterns & Consistency Rules

### Critical Conflict Points Identified

12 areas where AI agents could write incompatible code, all addressed below.

### Naming Patterns

**Code Naming Conventions:**

| Element                 | Convention                             | Example                                    |
| ----------------------- | -------------------------------------- | ------------------------------------------ |
| Files                   | `kebab-case.ts`                        | `llm-provider.ts`, `git-manager.ts`        |
| Interfaces              | `PascalCase` (no `I` prefix)           | `LLMProvider`, `ActionConfig`              |
| Types                   | `PascalCase`                           | `FileContext`, `LLMResponse`               |
| Classes/Implementations | `PascalCase`                           | `MistralProvider`, `OpenAIProvider`        |
| Functions               | `camelCase`                            | `createProvider()`, `validateConfig()`     |
| Variables               | `camelCase`                            | `maxFiles`, `branchPrefix`                 |
| Constants               | `UPPER_SNAKE_CASE`                     | `DEFAULT_MAX_FILES`, `PROVIDER_TIMEOUT_MS` |
| Test files              | `*.test.ts` co-located in `__tests__/` | `__tests__/config.test.ts`                 |
| Enum values             | `PascalCase`                           | `ProviderName.Mistral`                     |

**JSON Field Naming Boundaries:**

- Internal TypeScript: `camelCase`
- LLM API requests/responses: match each provider's API convention — transform
  at the provider boundary
- GitHub API (Octokit): `camelCase`
- Action inputs (YAML): `snake_case` (GitHub Actions convention: `max_files`,
  `dry_run`)

### Structure Patterns

**Module/File Internal Structure:**

```typescript
// 1. Imports (external first, then internal, separated by blank line)
import * as core from '@actions/core'

import { ActionConfig } from './config.js'

// 2. Types/Interfaces (exported)
export interface LLMProvider { ... }

// 3. Constants
const DEFAULT_TIMEOUT_MS = 120_000

// 4. Main exported functions/classes
export function createProvider(config: ActionConfig): LLMProvider { ... }

// 5. Internal helper functions (not exported)
function buildHeaders(apiKey: string): Record<string, string> { ... }
```

**Test Structure:**

```
__tests__/
  providers/
    mistral-provider.test.ts
    openai-provider.test.ts
    anthropic-provider.test.ts
    provider-factory.test.ts
  git-manager.test.ts
  file-scanner.test.ts
  config.test.ts
  response-parser.test.ts
  guardrails.test.ts
  retry.test.ts
```

- Test naming:
  `describe('ComponentName', () => { it('should do specific thing', ...) })`
- Mocking rule: All external I/O (fetch, exec, file system) must be mocked via
  `jest.fn()` / `jest.spyOn()`

**Import Path Convention:**

```typescript
// ✅ Always use .js extension in imports (ESM requirement)
import { createProvider } from './providers/provider-factory.js'

// ❌ Never omit extension
import { createProvider } from './providers/provider-factory'
```

**Export Pattern:**

```typescript
// ✅ Named exports only (enables tree-shaking)
export function createProvider(...) { ... }
export interface LLMProvider { ... }

// ❌ No default exports
export default class MistralProvider { ... }
```

### Process Patterns

**Configuration Flow — Single Source of Truth:**

```
Action YAML inputs → @actions/core.getInput() → validateConfig() → ActionConfig (typed)
                                                        ↓
                              Passed explicitly to all functions that need it
```

Rule: No function should call `core.getInput()` directly except the config
module. Everything else receives config as a parameter.

**Error Handling Pattern:**

```typescript
// Custom error types for each domain
export class ProviderError extends Error {
  constructor(
    message: string,
    public readonly provider: string,
    public readonly statusCode?: number
  ) {
    super(message)
    this.name = 'ProviderError'
  }
}
```

Error types to define:

- `ConfigError` — invalid inputs
- `ProviderError` — LLM API failures
- `GitError` — git operation failures
- `GuardrailError` — safety limit violations
- `ParseError` — LLM response parsing failures

Rules:

- Always throw typed errors, catch at the top level in `main.ts`
- Never catch and swallow silently
- Never log and re-throw (log at catch site only)

**Function Signature Pattern:**

```typescript
// ✅ Pure functions with explicit dependencies
export function scanFiles(
  paths: string[],
  options: { maxFiles: number; excludePatterns: string[] }
): Promise<FileContext[]>

// ❌ Functions that reach into global state
export function scanFiles(): Promise<FileContext[]>

// ✅ Return typed results
export function createPR(
  changes: FileChange[]
): Promise<{ url: string; number: number }>

// ❌ Return untyped objects
export function createPR(changes: any): Promise<any>
```

**Async/Await Pattern:**

```typescript
// ✅ Always use async/await (no raw Promises)
async function fetchCompletion(url: string, body: object): Promise<LLMResponse> {
  const response = await fetch(url, { ... })
  if (!response.ok) {
    throw new ProviderError(`API returned ${response.status}`, provider, response.status)
  }
  return await response.json() as LLMResponse
}

// ❌ Never use .then()/.catch() chains
```

**Provider Implementation Pattern:**

Every provider must follow this exact structure:

```typescript
// src/providers/mistral-provider.ts
import { LLMProvider, LLMResponse, ChatRequest } from './types.js'

export function createMistralProvider(apiKey: string): LLMProvider {
  return {
    name: 'mistral',
    defaultModel: 'mistral-large-latest',
    async chat(request: ChatRequest): Promise<LLMResponse> {
      // 1. Build request headers and body
      // 2. Call fetch (no retry here — retry wrapper handles it)
      // 3. Parse response or throw ProviderError
      // 4. Return typed LLMResponse
    }
  }
}
```

**Logging Pattern:**

```typescript
// Every component creates its own logger
const log = createLogger('scanner')

log.info('Scanning files', { paths: ['docs/**'], maxFiles: 10 })
log.debug('File loaded', { path: 'README.md', size: 1234 })
log.error('Scan failed', { error: err.message })

// Secrets are masked at logger creation, not at call sites
```

### Enforcement Guidelines

**All AI Agents MUST:**

- Follow the naming conventions table exactly — no exceptions
- Use named exports only, never default exports
- Use `.js` extensions in all import paths
- Never call `core.getInput()` outside the config module
- Never catch errors without re-throwing or logging
- Mock all external I/O in tests
- Use `async/await`, never `.then()` chains
- Define typed error classes, never throw raw `Error` or strings

**Anti-Patterns to Reject:**

- `any` type usage (use `unknown` if type is truly unknown)
- Implicit `any` from missing return types
- Circular imports between modules
- Side effects at module top level (except constant definitions)
- Console.log (use the logger)

## Project Structure & Boundaries

### Complete Project Directory Structure

```
Prompt2PR/
├── .github/
│   └── workflows/
│       ├── ci.yml                    # Run tests on PR and push
│       ├── check-dist.yml            # Verify dist/ matches compiled source
│       ├── linter.yml                # ESLint + Prettier checks
│       └── codeql-analysis.yml       # Security scanning
├── .vscode/
│   └── launch.json                   # Debug config for local-action
├── dist/
│   └── index.js                      # Bundled action (committed, auto-generated by Rollup)
├── src/
│   ├── main.ts                       # Action entrypoint: run() → validate → scan → prompt → LLM → PR
│   ├── config.ts                     # Input parsing (core.getInput) + validation → ActionConfig
│   ├── logger.ts                     # createLogger(component) wrapper over @actions/core
│   ├── errors.ts                     # ConfigError, ProviderError, GitError, GuardrailError, ParseError
│   ├── retry.ts                      # withRetry(fn, options) utility
│   ├── file-scanner.ts               # Glob matching, file reading, size tracking
│   ├── prompt-assembler.ts           # Builds LLM prompt from user prompt + file context
│   ├── response-parser.ts            # Parses JSON LLM response → FileChange[]
│   ├── guardrails.ts                 # Enforces max_files, max_changes, paths scope, .github/ exclusion
│   ├── git-manager.ts                # Branch creation, file writing, staging, committing, pushing
│   ├── pr-creator.ts                 # GitHub API PR creation (title, body, labels) via @actions/github
│   └── providers/
│       ├── types.ts                  # LLMProvider interface, ChatRequest, LLMResponse, FileChange types
│       ├── provider-factory.ts       # createProvider(config) → LLMProvider
│       ├── mistral-provider.ts       # Mistral API implementation
│       ├── openai-provider.ts        # OpenAI API implementation
│       └── anthropic-provider.ts     # Anthropic API implementation
├── __tests__/
│   ├── main.test.ts                  # Integration test: full pipeline with mocked I/O
│   ├── config.test.ts                # Input validation: valid/invalid/missing inputs
│   ├── logger.test.ts                # Logger output format, secret masking
│   ├── retry.test.ts                 # Retry behavior, backoff timing, failure propagation
│   ├── file-scanner.test.ts          # Glob matching, size limits, .github/ exclusion
│   ├── prompt-assembler.test.ts      # Prompt construction, context truncation
│   ├── response-parser.test.ts       # Valid JSON, malformed JSON, schema violations
│   ├── guardrails.test.ts            # max_files, max_changes, paths enforcement
│   ├── git-manager.test.ts           # Git CLI command construction, error handling
│   ├── pr-creator.test.ts            # PR creation, label application, body formatting
│   └── providers/
│       ├── provider-factory.test.ts  # Factory routing, unknown provider error
│       ├── mistral-provider.test.ts  # Mistral API request/response, error handling
│       ├── openai-provider.test.ts   # OpenAI API request/response, error handling
│       └── anthropic-provider.test.ts # Anthropic API request/response, error handling
├── examples/
│   ├── fix-dead-links.yml            # Dead link detection workflow
│   ├── update-copyright.yml          # Copyright year update workflow
│   ├── sync-readme.yml               # README sync with code workflow
│   ├── scan-secrets.yml              # Secret scanning workflow
│   └── cleanup-todos.yml             # TODO cleanup workflow
├── script/
│   └── release                       # Semver tag management (from template)
├── action.yml                        # GitHub Action metadata: inputs, outputs, entrypoint
├── package.json                      # Dependencies, scripts, engine config
├── package-lock.json                 # Locked dependency versions
├── tsconfig.json                     # TypeScript configuration (strict, ESM)
├── rollup.config.ts                  # Rollup bundler configuration
├── jest.config.js                    # Jest configuration (ESM mode)
├── eslint.config.mjs                 # ESLint configuration
├── .prettierrc.yml                   # Prettier configuration
├── .prettierignore                   # Prettier ignore patterns
├── .gitignore                        # Git ignore (node_modules, coverage, etc.)
├── .gitattributes                    # Git attributes (dist/ linguist-generated)
├── .node-version                     # Node.js version pin (20)
├── .env.example                      # Example env vars for local-action testing
├── LICENSE                           # MIT license
└── README.md                         # Primary docs: quick-start, config reference, examples
```

### Requirements to Structure Mapping

| FR Category                 | Component Files                                     | Test Files                                                                |
| --------------------------- | --------------------------------------------------- | ------------------------------------------------------------------------- |
| Prompt Processing (FR1-FR4) | `src/prompt-assembler.ts`, `src/response-parser.ts` | `__tests__/prompt-assembler.test.ts`, `__tests__/response-parser.test.ts` |
| LLM Providers (FR5-FR11)    | `src/providers/*.ts`                                | `__tests__/providers/*.test.ts`                                           |
| File Context (FR12-FR16)    | `src/file-scanner.ts`, `src/guardrails.ts`          | `__tests__/file-scanner.test.ts`, `__tests__/guardrails.test.ts`          |
| PR Creation (FR17-FR23)     | `src/git-manager.ts`, `src/pr-creator.ts`           | `__tests__/git-manager.test.ts`, `__tests__/pr-creator.test.ts`           |
| Logging (FR26-FR28)         | `src/logger.ts`                                     | `__tests__/logger.test.ts`                                                |
| Configuration (FR32-FR34)   | `src/config.ts`                                     | `__tests__/config.test.ts`                                                |
| Documentation (FR35-FR36)   | `README.md`, `examples/*.yml`                       | —                                                                         |

### Architectural Boundaries

**Boundary 1: Configuration Boundary**

- `config.ts` is the ONLY module that calls `@actions/core.getInput()`
- Everything downstream receives a typed `ActionConfig` object
- API keys extracted here, passed to provider factory, never stored elsewhere

**Boundary 2: Provider Boundary**

- `providers/types.ts` defines the contract
- Each provider file is self-contained — knows only about its own API format
- Provider-specific JSON field naming transformed inside each provider
- No provider knows about git, PRs, or file scanning

**Boundary 3: LLM I/O Boundary**

- `prompt-assembler.ts` prepares input (prompt + file context → LLM request)
- `response-parser.ts` handles output (LLM response → FileChange[])
- If the prompt format or response schema changes, only these two files change

**Boundary 4: Git/GitHub Boundary**

- `git-manager.ts` handles local git operations (branch, add, commit, push) via
  `@actions/exec`
- `pr-creator.ts` handles GitHub API operations (create PR, add labels) via
  `@actions/github`
- Separated because git and API operations have different error modes and
  testing strategies

**Boundary 5: Safety Boundary**

- `guardrails.ts` is called at two points:
  1. **Pre-LLM:** `file-scanner.ts` respects `paths` scope and `.github/`
     exclusion
  2. **Post-LLM:** `guardrails.ts` validates response against `max_files`,
     `max_changes`, and `paths` before git operations
- This module can reject an LLM response entirely, preventing any git operations

### Data Flow

```
action.yml trigger (cron/dispatch)
       │
       ▼
   main.ts ─── run()
       │
       ▼
   config.ts ─── validateConfig() → ActionConfig
       │
       ▼
   file-scanner.ts ─── scanFiles(paths, maxFiles) → FileContext[]
       │                    [guardrail: paths scope, .github/ exclusion]
       ▼
   prompt-assembler.ts ─── buildPrompt(userPrompt, fileContexts) → ChatRequest
       │
       ▼
   provider-factory.ts ─── createProvider(config) → LLMProvider
       │
       ▼
   retry.ts ─── withRetry(() => provider.chat(request)) → LLMResponse
       │
       ▼
   response-parser.ts ─── parseResponse(llmResponse) → FileChange[]
       │
       ▼
   guardrails.ts ─── validateChanges(changes, config) → FileChange[] (validated)
       │                    [guardrail: max_files, max_changes, paths re-check]
       │
       ├── (no changes) → log "nothing to fix", exit success, set skipped=true
       │
       ▼
   git-manager.ts ─── createBranch() → stageChanges() → commit() → push()
       │
       ▼
   pr-creator.ts ─── createPullRequest(changes, config) → { url, number }
       │
       ▼
   main.ts ─── set outputs (pr_url, pr_number, files_changed, lines_changed, skipped)
```

### Development Workflow

- **Local dev:** `npm install` → edit `src/` → `npm test` → `npm run bundle`
- **Local action testing:** `npx @github/local-action . src/main.ts .env`
- **CI verification:** Push triggers `ci.yml` (tests) + `check-dist.yml` (bundle
  check) + `linter.yml`
- **Release:** `script/release` → tag `v1.x.x` → float `v1` tag → create GitHub
  Release

## Architecture Validation Results

### Coherence Validation ✅

**Decision Compatibility:** All technology choices (TypeScript ESM, Rollup,
Jest, @actions/toolkit, native git, direct fetch) work together without
conflicts. Provider interface + factory + retry wrapper form a clean,
non-overlapping architecture.

**Pattern Consistency:** Naming conventions, module structure, error handling,
and logging patterns are consistent across all components. No contradictory
patterns.

**Structure Alignment:** Project directory structure directly supports all
architectural decisions. Every component has a defined location. Boundaries are
respected in the file organization.

**Note:** The Project Context section (step 2) references `ncc` and `simple-git`
from the original PRD. These were superseded by architectural decisions in steps
3-4 (Rollup bundler, native git via `@actions/exec`). The later decisions are
authoritative.

### Requirements Coverage ✅

**Functional Requirements:** 36/36 FRs covered (100%). Every FR category maps to
specific source files.

**Non-Functional Requirements:** 17/17 NFRs addressed (100%). Performance,
security, integration, reliability, and maintainability all have architectural
support.

### Implementation Readiness ✅

**Decision Completeness:** 6 core decisions documented with rationale, affected
requirements, and code examples.

**Pattern Completeness:** 12 implementation patterns with enforcement guidelines
and anti-patterns.

**Structure Completeness:** Full project tree with every file, 5 architectural
boundaries, and requirements-to-structure mapping.

### Gap Analysis

| Priority  | Gap                                              | Resolution                                                                                                                                       |
| --------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Important | Context window truncation strategy not specified | Implementation detail — correct components identified (`prompt-assembler.ts`, `file-scanner.ts`). Algorithm decided during story implementation. |
| Minor     | Step 2 references `ncc`/`simple-git` from PRD    | Later decisions (Rollup, native git) are authoritative. No action needed.                                                                        |
| Minor     | `action.yml` structure not detailed              | Standard boilerplate — not an architectural concern.                                                                                             |

### Architecture Completeness Checklist

**✅ Requirements Analysis**

- [x] Project context thoroughly analyzed
- [x] Scale and complexity assessed (Low — stateless pipeline)
- [x] Technical constraints identified (Node.js 20, GitHub Actions, no Docker)
- [x] Cross-cutting concerns mapped (5 concerns)

**✅ Starter Template**

- [x] Technology domain identified (GitHub Action)
- [x] Starter template selected and evaluated (`actions/typescript-action`)
- [x] Starter decisions documented (Rollup, Jest, ESLint, release scripts)
- [x] PRD deviation documented (Rollup replaces ncc)

**✅ Architectural Decisions**

- [x] 6 critical decisions documented with rationale
- [x] Technology versions specified
- [x] Implementation sequence defined
- [x] Cross-component dependencies mapped

**✅ Implementation Patterns**

- [x] 12 consistency patterns defined with code examples
- [x] Naming conventions comprehensive
- [x] Enforcement guidelines documented
- [x] Anti-patterns identified

**✅ Project Structure**

- [x] Complete directory tree defined
- [x] 5 architectural boundaries established
- [x] Requirements-to-structure mapping complete
- [x] Data flow diagram documented

### Architecture Readiness Assessment

**Overall Status: ✅ READY FOR IMPLEMENTATION**

**Confidence Level:** High — low-complexity project with well-defined boundaries
and comprehensive patterns.

**Key Strengths:**

- Clean pipeline architecture with clear data flow
- Provider interface enables painless extensibility (NFR15)
- Strong safety boundaries (pre-LLM + post-LLM guardrails)
- Every module is independently testable
- Zero unnecessary dependencies

**Areas for Future Enhancement (Post-MVP):**

- LiteLLM proxy provider (Growth phase — same interface, new implementation)
- Structured prompts DSL (Vision phase — extends `prompt-assembler.ts`)
- PR deduplication (Growth phase — new module in pipeline)
- Dry-run mode (Growth phase — conditional branch in `main.ts`)
