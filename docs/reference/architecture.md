---
title: 'Architecture'
---

# Architecture

Prompt2PR is a stateless, single-pass pipeline that transforms a prompt +
repository context into a Pull Request. Understanding the architecture helps
contributors and power users reason about behavior.

---

## Pipeline Overview

```
action.yml trigger (cron / dispatch / push / comment)
       │
       ▼
   1. validateConfig()       → ActionConfig (typed, validated inputs)
       │
       ▼
   2. scanFiles(paths)       → FileContext[] (glob-matched files)
       │                        [guardrail: paths scope, .github/ exclusion]
       ▼
   3. createProvider(config) → LLMProvider instance (factory pattern)
       │
       ▼
   4. buildPrompt()          → ChatRequest (user prompt + file contents)
       │                        [200K char context budget, auto-truncation]
       ▼
   5. withRetry(provider.chat()) → LLMResponse (1 retry, 5s backoff)
       │
       ▼
   6. parseResponse()        → ParsedResponse (validated FileChange[])
       │
       ▼
   7. Empty check            → Skip PR if no changes needed
       │
       ▼
   8. validateChanges()      → Guardrail enforcement
       │                        [max_files, max_changes, paths re-check]
       ▼
   9. Dry-run check          → Skip git/PR if dry_run=true
       │
       ▼
  10. commitAndPush()        → Create branch, write files, commit, push
       │
       ▼
  11. createPullRequest()    → Open PR via GitHub API
       │
       ▼
  12. Set outputs            → pr_url, pr_number, files_changed, lines_changed
```

---

## Core Modules

| Module                | Responsibility                                   | Key Design Choice                                                  |
| --------------------- | ------------------------------------------------ | ------------------------------------------------------------------ |
| `config.ts`           | Input parsing and validation                     | **Single source of truth** — only module calling `core.getInput()` |
| `file-scanner.ts`     | Glob matching, file reading, binary exclusion    | Excludes `.github/` directory absolutely                           |
| `prompt-assembler.ts` | Build LLM prompt from user prompt + file context | 200K character budget with automatic truncation                    |
| `providers/*.ts`      | LLM API communication                            | Engine-agnostic interface — each provider is self-contained        |
| `response-parser.ts`  | Parse and validate JSON LLM responses            | Structured JSON schema validation                                  |
| `guardrails.ts`       | Safety limit enforcement                         | Enforced **after** LLM response (post-validation)                  |
| `git-manager.ts`      | Local git operations                             | Uses `@actions/exec` + native git CLI                              |
| `pr-creator.ts`       | GitHub API PR creation                           | Octokit via `@actions/github`                                      |
| `retry.ts`            | Generic async retry wrapper                      | Configurable backoff, wraps any async function                     |
| `logger.ts`           | Structured logging with secret masking           | Wraps `@actions/core`, adds component context                      |
| `errors.ts`           | Custom error types                               | 5 types: Config, Provider, Git, Guardrail, Parse                   |

---

## Provider Architecture

```
       ActionConfig
           │
           ▼
   createProvider(config) ─── Factory Pattern
           │
           ├── MistralProvider (extends BaseOpenAICompatible)
           ├── OpenAIProvider (extends BaseOpenAICompatible)
           ├── AnthropicProvider (standalone — different API format)
           └── GitHubModelsProvider (extends BaseOpenAICompatible)
```

### Adding a New Provider

1. Create `src/providers/your-provider.ts` implementing `LLMProvider`
2. Add to factory switch in `src/providers/provider-factory.ts`
3. Add API key env var to `src/config.ts`
4. Write tests in `__tests__/providers/your-provider.test.ts`

Target: **less than 1 day** of work for a new provider.

---

## Architectural Boundaries

### 1. Configuration Boundary

`config.ts` is the **only** module that reads Action inputs. Everything else
receives a typed `ActionConfig` object.

### 2. Provider Boundary

Each provider is self-contained. No provider knows about git, PRs, or file
scanning. Provider-specific API format differences are handled inside each
provider.

### 3. LLM I/O Boundary

`prompt-assembler.ts` prepares LLM input. `response-parser.ts` handles LLM
output. If the prompt format or response schema changes, only these two files
are affected.

### 4. Git/GitHub Boundary

`git-manager.ts` handles local git (branch, commit, push). `pr-creator.ts`
handles GitHub API (create PR, labels). Separated because they have different
error modes.

### 5. Safety Boundary

Guardrails are enforced at **two points**:

- **Pre-LLM:** `file-scanner.ts` respects `paths` scope and `.github/` exclusion
- **Post-LLM:** `guardrails.ts` validates the response before git operations

---

## Technology Stack

| Layer      | Technology                                          | Why                                             |
| ---------- | --------------------------------------------------- | ----------------------------------------------- |
| Language   | TypeScript (strict, ESM)                            | Native GitHub Actions support, strong typing    |
| Runtime    | Node.js 20                                          | GitHub Actions native runtime, no Docker needed |
| Bundler    | Rollup                                              | Tree-shaking, single-file output                |
| Testing    | Jest 30 (ESM mode)                                  | 98%+ coverage, fast execution                   |
| GitHub SDK | `@actions/core`, `@actions/github`, `@actions/exec` | Official toolkit                                |
| Git        | Native git CLI via `@actions/exec`                  | Zero dependencies, pre-installed on runners     |
| Linting    | ESLint + Prettier                                   | Consistent code style                           |

---

## Error Handling

Five custom error types provide clear, actionable messages:

| Error Type       | When Thrown               | Example                                                                             |
| ---------------- | ------------------------- | ----------------------------------------------------------------------------------- |
| `ConfigError`    | Invalid inputs at startup | `"Invalid provider: 'chatgpt'. Must be one of: mistral, openai, anthropic, github"` |
| `ProviderError`  | LLM API failures          | `"Mistral API returned 429: rate limit exceeded"`                                   |
| `ParseError`     | Malformed LLM response    | `"Failed to parse LLM response as JSON"`                                            |
| `GuardrailError` | Safety limit violations   | `"Number of changed files (15) exceeds max_files (10)"`                             |
| `GitError`       | Git operation failures    | `"Failed to push branch: permission denied"`                                        |

All errors are caught at the top level in `main.ts`, logged with full context,
and set the action exit code to non-zero.
