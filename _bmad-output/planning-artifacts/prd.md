---
stepsCompleted:
  [
    'step-01-init',
    'step-02-discovery',
    'step-03-success',
    'step-04-journeys',
    'step-05-domain',
    'step-06-innovation',
    'step-07-project-type',
    'step-08-scoping',
    'step-09-functional',
    'step-10-nonfunctional',
    'step-11-polish',
    'step-12-complete',
    'step-e-01-discovery',
    'step-e-03-edit'
  ]
inputDocuments: ['_bmad-output/planning-artifacts/product-brief.md']
lastEdited: '2026-02-13'
editHistory:
  - date: '2026-02-13'
    changes:
      'Validation-driven edits: added Migration Guide section, tightened FR11
      (removed subjective adjective), added coverage target to NFR16'
workflowType: 'prd'
documentCounts:
  briefs: 1
  research: 0
  brainstorming: 0
  projectDocs: 0
classification:
  projectType: developer_tool
  domain: general
  complexity: low
  projectContext: greenfield
---

# Product Requirements Document - Prompt2PR

**Author:** Davd **Date:** 2026-02-08

## Executive Summary

**Prompt2PR** is an open-source GitHub Action that turns plain-English prompts
into automated Pull Requests on a cron schedule.

**Vision:** Any developer can write a one-line maintenance instruction in a
workflow YAML, and Prompt2PR executes it periodically — opening labeled PRs when
changes are needed, staying silent when they're not.

**Differentiator:** The only tool that combines declarative natural-language
prompts + scheduled execution + automated PR creation. Zero scripting required.

**Target Users:** Open-source maintainers and engineering teams who want
automated repo hygiene (dead links, stale docs, copyright headers, deprecated
APIs) without writing custom scripts.

**Technology:** TypeScript GitHub Action, engine-agnostic LLM provider interface
(Mistral priority, OpenAI, Anthropic), direct API calls, no Docker required.

**MVP Timeline:** 2-4 weeks, solo developer. Infrastructure cost: $0 (runs on
user's Actions minutes + API keys).

## Success Criteria

### User Success

- **The "aha!" moment:** A developer pushes a workflow YAML, and within the
  first scheduled run, finds a clean PR that genuinely fixes something they
  didn't know was broken
- **Instant comprehension:** Any developer landing on the Prompt2PR repo or
  Marketplace listing understands what it does and how to use it within 60
  seconds — no deep-diving required
- **YAML simplicity:** A working workflow can be set up in under 5 minutes by
  anyone comfortable with GitHub Actions
- **Trust through transparency:** Every PR has a clear description showing the
  original prompt, what was changed, and why — no black-box feeling
- **Graceful silence:** When nothing needs fixing, the tool stays quiet — no
  noise, no spam PRs

### Business Success

- **Primary metric:** Active usage — real workflows running on real repos
  producing real PRs. If people use it, it's working.
- **Community signal:** Contributors adding new LLM providers, sharing prompt
  templates, or opening feature requests indicates product-market fit
- **Organic growth:** Developers discover it through PRs (the prompt is visible
  in every PR body → built-in marketing)
- **6-month targets:**
  - 500+ Marketplace installs
  - 200+ GitHub stars
  - 100+ weekly active workflows
  - Community contributions from non-authors

### Technical Success

- **Reliability:** Scheduled runs execute consistently without silent failures
- **< 10% false positive rate** on generated PRs (changes that are
  wrong/unnecessary)
- **Clean logs:** When a run produces no PR, the Actions log clearly explains
  why (scanned X files, found 0 issues)
- **Engine-agnostic architecture holds:** Adding a new LLM provider takes < 1
  day of work
- **Safety guardrails work as advertised:** `max_files`, `max_changes`, `paths`
  scoping all enforced correctly

### Measurable Outcomes

| Metric                          | Target            | Timeframe    |
| ------------------------------- | ----------------- | ------------ |
| Time to first working workflow  | < 5 minutes       | From install |
| Time to first useful PR         | < 1 scheduled run | From setup   |
| Marketplace installs            | 500+              | 6 months     |
| GitHub stars                    | 200+              | 6 months     |
| False positive PR rate          | < 10%             | Ongoing      |
| New provider integration effort | < 1 day           | Ongoing      |

## Product Scope

### MVP - Minimum Viable Product

- GitHub Action accepting `prompt`, `provider`, `model`, `paths` via `with:`
  config
- 3 LLM providers: Mistral (priority), OpenAI, Anthropic
- Cron + manual trigger (`schedule` + `workflow_dispatch`)
- PR creation with prompt in body, AI summary, labels
- Safety guardrails: `max_files`, `max_changes`, `paths` scoping
- Silent skip when no changes (clean logs)
- Marketplace listing with README, examples, quick-start
- 5 example workflows (dead links, copyright year, README sync, secret scan,
  TODO cleanup)

### Growth (Post-MVP)

- GitHub Models provider (zero-setup via `GITHUB_TOKEN`)
- LiteLLM proxy mode
- Dry-run mode
- PR deduplication
- Auto-assign reviewers
- GitHub Pages docs site
- Bootstrap CLI for scaffolding workflows

### Vision

- Structured prompts DSL (`task`, `scope`, `rules`)
- Conditional execution (`only_if`)
- Chained prompts (multi-step workflows)
- Community prompt templates and marketplace
- Cross-repo dashboard
- Self-improving prompts (learn from rejected PRs)
- Organization-wide prompt policies

## User Journeys

### Journey 1: Maya the Maintainer (Primary — Happy Path)

**Maya** maintains `awesome-devtools`, a popular curated list with 2,000+ stars.
She's tired of getting issues saying "link X is broken" — she checks manually
once a month but always misses some.

**Opening Scene:** Maya sees Prompt2PR on Hacker News. She reads the README and
within 30 seconds thinks "wait, that's it? Just a prompt in a YAML?"

**Rising Action:** She creates `.github/workflows/fix-links.yml`, pastes the
example, changes the cron to weekly, adds her Mistral API key to Secrets. Total
time: 4 minutes. She pushes and manually triggers a test run.

**Climax:** 90 seconds later, a PR appears:
`[Prompt2PR] Fix 3 broken links in README.md`. She opens it — the description
shows the prompt she wrote, plus a clean summary: "Found 3 broken links.
Replaced 2 with updated URLs, removed 1 that no longer exists." The diff is
clean. She merges.

**Resolution:** Maya forgets about dead links entirely. Every Monday, either
nothing happens (silence), or a small PR appears. She spends 30 seconds
reviewing instead of 30 minutes hunting. She adds a second workflow for spelling
errors in docs.

### Journey 2: Carlos the Contributor (Secondary — PR Reviewer)

**Carlos** is a contributor to a repo that uses Prompt2PR. He's never heard of
the tool.

**Opening Scene:** Carlos opens the repo's PR tab and sees
`[Prompt2PR] Update copyright year in all source files`. The PR has a
`prompt2pr` label.

**Rising Action:** He clicks in. The PR body says: _"This PR was generated by
Prompt2PR. **Prompt:** Update the copyright year to 2026 in all files containing
copyright notices."_ Below that, a clean diff changing `2025` to `2026` in 8
files.

**Climax:** Carlos thinks "huh, that's pretty cool" — he immediately understands
what happened and why. No mystery, no confusion.

**Resolution:** He mentions it in the team Slack. Two other devs set it up on
their repos that afternoon. _The PR itself is marketing._

### Journey 3: Priya the Troubleshooter (Edge Case — Debug Path)

**Priya** set up Prompt2PR last week. It's been 2 scheduled runs and no PRs
appeared. She's not sure if it's working or if there's genuinely nothing to fix.

**Opening Scene:** Priya goes to the Actions tab in her repo. She finds the
Prompt2PR workflow runs — they show ✅ green (success).

**Rising Action:** She clicks into a run. The logs show:
`Scanned 12 files matching docs/**,README.md. Found 0 issues. No PR created.`
She now knows it's working — there's just nothing to fix.

**Climax:** She changes the prompt to something she _knows_ will produce
changes: "Update copyright year to 2026." She triggers manually. A PR appears
within 2 minutes. Confirmed working.

**Resolution:** Priya understands the feedback loop: green run + no PR = nothing
to fix. Green run + PR = changes found. Red run = something broke (API key, rate
limit, etc.). She trusts the tool.

### Journey 4: Tomás the Prompt Author (Power User — Advanced)

**Tomás** is a platform engineer. He wants to roll out Prompt2PR across 15 team
repos with standardized maintenance prompts.

**Opening Scene:** He starts with the example workflows in the Prompt2PR repo.
He copies the dead-link workflow and adapts it.

**Rising Action:** He experiments — scoping `paths` to only `docs/**`, setting
`max_files: 3` to keep PRs small, and adding custom labels per workflow:
`label: "prompt2pr,docs-team"`. He writes a more sophisticated prompt: "Check if
the API endpoint examples in docs/api/ still match the actual routes defined in
src/routes/."

**Climax:** His prompt produces a PR that correctly identifies 2 outdated API
examples. He realizes he can encode _team knowledge_ into scheduled prompts.

**Resolution:** Tomás creates a shared repo of workflow templates that any team
can copy. He becomes the internal champion. He opens a feature request for
community prompt templates.

### Journey Requirements Summary

| Journey                    | Key Capabilities Revealed                                                                              |
| -------------------------- | ------------------------------------------------------------------------------------------------------ |
| **Maya (Maintainer)**      | Simple YAML setup, quick first run, clean PR descriptions, silent when nothing to fix                  |
| **Carlos (Contributor)**   | Self-explanatory PR body, visible prompt traceability, clear labeling                                  |
| **Priya (Troubleshooter)** | Clear Action logs, status reporting, manual trigger for testing, transparent "nothing found" messaging |
| **Tomás (Power User)**     | Path scoping, configurable limits, custom labels, reusable workflow templates                          |

## Innovation & Novel Patterns

### Detected Innovation Areas

**1. Prompt-as-Job-Description Paradigm** Prompt2PR introduces a new paradigm
for repository maintenance: instead of writing scripts or code to automate
fixes, developers write plain-English prompts. This mirrors the broader industry
shift from imperative to declarative to natural language interfaces — applied
specifically to repo maintenance automation.

No existing tool offers this exact combination: **declarative prompt + cron
schedule → automated PR**.

**2. PR-as-Marketing Viral Loop** Every PR generated by Prompt2PR contains the
original prompt in its body. This means every PR is a live demo of the product
visible to all repo contributors and reviewers. The output format itself creates
organic discovery — contributors see the prompt, understand the value instantly,
and adopt it on their own repos.

**3. Simplicity as Competitive Moat** The entire product interface is a handful
of YAML keys. There's no dashboard, no CLI, no SaaS login. The barrier to entry
is writing one sentence. This radical simplicity is itself innovative in a
landscape of increasingly complex DevOps tooling.

### Market Context & Competitive Landscape

| Tool                        | What it does                       | What Prompt2PR adds                                                       |
| --------------------------- | ---------------------------------- | ------------------------------------------------------------------------- |
| Dependabot                  | Automated dependency PRs           | Prompt2PR generalizes this to _any_ maintenance task via natural language |
| Renovate                    | Configurable dependency management | Complex config vs. one-line prompts                                       |
| GitHub Copilot Coding Agent | AI-driven code changes from issues | Issue-driven & interactive, not scheduled/autonomous                      |
| Custom scripts + cron       | Anything you code                  | Requires coding; Prompt2PR requires zero code                             |

### Validation Approach

- **MVP validates the core hypothesis:** Can an LLM produce useful, merge-worthy
  PRs from a one-line prompt on a real repo?
- **First test:** Run dead-link and copyright-year prompts on popular
  open-source repos. If PRs are clean and mergeable, the paradigm works.
- **False positive rate < 10%** is the quality gate for trust.

### Innovation Risks

> See full risk mitigation matrix in
> [Risk Mitigation Strategy](#risk-mitigation-strategy) below.

### Vision: DSL Evolution

While MVP keeps the interface as flat YAML keys with a plain-English prompt, the
schema could evolve into a richer DSL:

- **Structured prompts** — break prompts into `task`, `scope`, and `rules` for
  more precision
- **Conditional execution** — `only_if: "january"` to control when prompts run
- **Chained prompts** — multi-step workflows where one prompt's output feeds the
  next
- **Community templates** — reference shared prompts by name:
  `prompt: community/dead-link-fixer`

These remain Vision-scope — simplicity is the MVP moat.

## Developer Tool Specific Requirements

### Project-Type Overview

Prompt2PR is a **GitHub Action** — a reusable automation unit distributed via
the GitHub Marketplace. It runs inside GitHub Actions runners, triggered by cron
schedules or manual dispatch. The action reads repo files, calls an LLM
provider, and creates PRs via the GitHub API.

### Technical Architecture Considerations

#### Runtime & Language

- **Language:** TypeScript
- **Runtime:** Node.js 20 (GitHub Actions native runtime — no Docker required)
- **Build:** Compiled and bundled with `ncc` for single-file distribution
  (standard for JS Actions)
- **Why TS:** Native Actions support, fastest cold start, GitHub toolkit
  compatibility, strong typing for provider interface

#### LLM Provider Interface

**Dual-mode architecture:**

1. **Direct API mode (default)** — The action calls each provider's REST API
   directly via `fetch`. Zero external dependencies. Full control over
   request/response handling.
   - Mistral: `https://api.mistral.ai/v1/chat/completions`
   - OpenAI: `https://api.openai.com/v1/chat/completions`
   - Anthropic: `https://api.anthropic.com/v1/messages`
   - GitHub Models: `https://models.inference.ai.azure.com/chat/completions`

2. **LiteLLM proxy mode (optional)** — Users who already run a LiteLLM proxy can
   point the action at it via `base_url`. This supports any provider LiteLLM
   supports without the action needing to know about them.

```yaml
# Direct mode (default)
with:
  provider: mistral
  model: mistral-large-latest
env:
  MISTRAL_API_KEY: ${{ secrets.MISTRAL_API_KEY }}

# LiteLLM proxy mode
with:
  provider: litellm
  model: mistral/mistral-large-latest
  base_url: http://my-litellm-proxy:4000
env:
  LITELLM_API_KEY: ${{ secrets.LITELLM_API_KEY }}
```

#### Provider Interface Design

```
┌─────────────┐
│  Action Core │
│  (prompt +   │──► ProviderInterface.chat(prompt, context)
│   context)   │         │
└─────────────┘         ├── MistralProvider (direct API)
                        ├── OpenAIProvider (direct API)
                        ├── AnthropicProvider (direct API)
                        ├── GitHubModelsProvider (direct API)
                        └── LiteLLMProvider (proxy passthrough)
```

Adding a new provider = implement one class with a `chat()` method. Target: < 1
day.

#### Git & PR Operations

- Use `@actions/github` (official Octokit wrapper) for PR creation
- Use `simple-git` or native `git` CLI for branch creation and commits
- Branch naming: `prompt2pr/<workflow-name>-<timestamp>`
- PR creation via GitHub REST API with labels, body template, and assignees

### Installation Methods

#### 1. Public Marketplace Action (Primary)

```yaml
uses: Davphla/Prompt2PR@v1
```

#### 2. Self-hosted (Fork)

Users can fork the repo and reference their own copy:

```yaml
uses: my-org/Prompt2PR@main
```

#### 3. Local development

```bash
git clone https://github.com/Davphla/Prompt2PR
npm install
npm run build
npm test
```

#### Versioning Strategy

- **Semver tags:** `@v1`, `@v1.2.0`, `@v1.2.3`
- **Major tag (`@v1`)** floats to latest minor/patch — standard for GitHub
  Actions
- **Branch-based (`@main`)** available for bleeding edge
- **Releases** via GitHub Releases with changelogs

#### Migration Guide

- **Minor/patch upgrades (`@v1`):** No action required — users pinning `@v1`
  receive updates automatically
- **Major upgrades (`@v1` → `@v2`):** Breaking changes documented in GitHub
  Release notes with a `MIGRATION.md` file listing: (1) removed/renamed inputs,
  (2) changed default behaviors, (3) step-by-step upgrade instructions
- **Deprecation policy:** Inputs or behaviors scheduled for removal are marked
  deprecated in one minor release before removal in the next major release
- **Multi-repo rollout:** Users managing Prompt2PR across multiple repos can use
  GitHub search (`uses: Davphla/Prompt2PR@v1` in org) to find all workflows
  needing updates

### API Surface (Action Inputs/Outputs)

#### Inputs

| Input           | Required | Type    | Default          | Description                                           |
| --------------- | -------- | ------- | ---------------- | ----------------------------------------------------- |
| `prompt`        | ✅       | string  | —                | Plain-English instruction for the AI                  |
| `provider`      | ✅       | string  | —                | `mistral`, `openai`, `anthropic`, `github`, `litellm` |
| `model`         | ❌       | string  | Provider default | Specific model identifier                             |
| `paths`         | ❌       | string  | `"**"`           | Comma-separated glob patterns                         |
| `max_files`     | ❌       | number  | `10`             | Max files the AI can modify                           |
| `max_changes`   | ❌       | number  | `200`            | Max total lines changed                               |
| `label`         | ❌       | string  | `"prompt2pr"`    | Comma-separated PR labels                             |
| `branch_prefix` | ❌       | string  | `"prompt2pr/"`   | Branch name prefix                                    |
| `dry_run`       | ❌       | boolean | `false`          | Log changes without creating PR                       |
| `base_url`      | ❌       | string  | —                | Custom API endpoint (for LiteLLM proxy)               |

#### Outputs

| Output          | Type    | Description                             |
| --------------- | ------- | --------------------------------------- |
| `pr_url`        | string  | URL of created PR (empty if no changes) |
| `pr_number`     | number  | PR number (0 if no changes)             |
| `files_changed` | number  | Count of files modified                 |
| `lines_changed` | number  | Total lines changed                     |
| `skipped`       | boolean | True if no changes were needed          |

### Documentation Strategy

#### README.md (Primary — must be exceptional)

- Hero section: one-sentence description + badge row
- Quick-start: copy-paste workflow example that works in 2 minutes
- Configuration reference: full table of all inputs/outputs
- Example prompts: 5+ real-world use cases with complete YAML
- Provider setup: how to get API keys for each provider
- FAQ / Troubleshooting
- Contributing guide

#### Example Workflows (in repo: `examples/`)

| Example               | File                            |
| --------------------- | ------------------------------- |
| Fix dead links        | `examples/fix-dead-links.yml`   |
| Update copyright year | `examples/update-copyright.yml` |
| Sync README with code | `examples/sync-readme.yml`      |
| Scan for secrets      | `examples/scan-secrets.yml`     |
| Clean up TODOs        | `examples/cleanup-todos.yml`    |

Each example is a complete, copy-paste-ready workflow file.

#### GitHub Pages Docs Site (Growth)

- Detailed guides, advanced usage, provider comparison
- Community prompt gallery
- Architecture docs for contributors

### Implementation Considerations

- **Context window management:** Read files matching `paths` glob, concatenate
  with size tracking, truncate or chunk if exceeding model context window
- **Deterministic diffs:** LLM returns modified file content, action computes
  diff against original — only commits actual changes
- **Error handling:** Clear error messages for common failures (invalid API key,
  rate limit, model not found, context too large)
- **Testing:** Unit tests for provider interface, integration tests with mock
  LLM responses, E2E test with real API call in CI

## Project Scoping & Phased Development

### MVP Strategy & Philosophy

**MVP Approach:** Problem-Solving MVP — ship the smallest thing that proves an
LLM can produce useful, merge-worthy PRs from a one-line prompt. If that works,
everything else follows.

**Resource Requirements:** Solo developer, 2-4 weeks. Skills: TypeScript, GitHub
Actions API, REST API calls. Infrastructure cost: $0 (runs on user's Actions
minutes + API keys).

### MVP Feature Set (Phase 1)

**Core User Journeys Supported:**

- Maya (Maintainer): Full happy path — setup → scheduled run → PR → merge
- Carlos (Contributor): PR review experience with clear prompt traceability
- Priya (Troubleshooter): Clean logs, manual trigger for testing

**Must-Have Capabilities:**

- Core action: prompt + repo context → LLM → PR creation
- 3 LLM providers: Mistral (priority), OpenAI, Anthropic (direct API calls)
- `paths` scoping (glob patterns for file filtering)
- `max_files` and `max_changes` safety guardrails
- PR body with original prompt quoted, AI-generated summary, run metadata
- Configurable labels (always includes `prompt2pr`)
- Silent skip when no changes detected (clean Action logs)
- `workflow_dispatch` support for manual triggering
- 5 example workflows (dead links, copyright year, README sync, secret scan,
  TODO cleanup)
- Exceptional README with quick-start, config reference, provider setup

### Post-MVP Features

**Phase 2 (Growth):**

- GitHub Models provider (zero-setup via `GITHUB_TOKEN`)
- LiteLLM proxy mode (support any provider via proxy)
- `dry_run` mode (preview without creating PR)
- PR deduplication (skip if identical open PR exists)
- Auto-assign PR reviewers
- GitHub Pages documentation site
- Bootstrap action / CLI for scaffolding workflows

**Phase 3 (Expansion / Vision):**

- Structured prompts DSL (`task`, `scope`, `rules`)
- Conditional execution (`only_if`)
- Chained prompts (multi-step workflows)
- Community prompt templates (`prompt: community/dead-link-fixer`)
- Prompt marketplace (browse, share, rate)
- Cross-repo dashboard
- Self-improving prompts (learn from rejected PRs)
- Organization-wide prompt policies

### Risk Mitigation Strategy

| Risk                         | Likelihood | Impact | Mitigation                                                                         |
| ---------------------------- | ---------- | ------ | ---------------------------------------------------------------------------------- |
| LLM output quality           | Medium     | High   | Safety guardrails + human review via PR. Start with simple prompts where AI excels |
| "Too simple" for power users | Low        | Medium | Keep MVP simple; structured prompts and chained steps in Vision                    |
| Context window overflow      | Medium     | Medium | `paths` scoping required. Document clearly. Chunk files if needed                  |
| GitHub Actions cron delays   | Low        | Low    | Document the caveat. Not controllable                                              |
| API rate limits              | Low        | Medium | Retry with backoff. Clear error messages                                           |
| Competitors emerge quickly   | Medium     | Low    | First-mover advantage + simplicity moat + community prompt ecosystem. Ship fast    |

## Functional Requirements

### Prompt Processing

- **FR1:** User can provide a plain-English prompt as a single string in the
  workflow YAML `with.prompt` field
- **FR2:** System can parse the user's prompt and construct an LLM request with
  the prompt and relevant repo file contents as context
- **FR3:** System can filter repo files to only those matching user-defined
  `paths` glob patterns before sending to the LLM
- **FR4:** System can detect when the LLM response contains no actionable
  changes and skip PR creation

### LLM Provider Integration

- **FR5:** User can select an LLM provider (`mistral`, `openai`, `anthropic`)
  via the `provider` input
- **FR6:** User can specify a model identifier via the `model` input, or use the
  provider's default
- **FR7:** System can authenticate with each supported provider using API keys
  from environment variables
- **FR8:** System can send a chat completion request to Mistral's API and parse
  the response
- **FR9:** System can send a chat completion request to OpenAI's API and parse
  the response
- **FR10:** System can send a chat completion request to Anthropic's API and
  parse the response
- **FR11:** System can handle provider API errors (invalid key, rate limit,
  model not found) by logging the provider-specific error code and message to
  Action output, setting the action exit code to non-zero, and setting the
  `skipped` output to false

### File Context Management

- **FR12:** System can check out the repository and read file contents from the
  working directory
- **FR13:** System can scope file reading to user-defined glob patterns (`paths`
  input)
- **FR14:** System can enforce a `max_files` limit on the number of files the AI
  can modify in a single run
- **FR15:** System can enforce a `max_changes` limit on the total lines changed
  across all files in a single run
- **FR16:** System can track file sizes and manage context window limits when
  assembling content for the LLM

### Pull Request Creation

- **FR17:** System can create a new Git branch with a configurable prefix
  (`branch_prefix`) and timestamp
- **FR18:** System can commit AI-generated file changes to the new branch
- **FR19:** System can open a Pull Request via the GitHub API targeting the
  default branch
- **FR20:** System can generate a PR title summarizing the changes (prefixed
  with `[Prompt2PR]`)
- **FR21:** System can generate a PR body containing: the original prompt
  (quoted), an AI-generated summary of changes, and run metadata (timestamp,
  model used, files scanned)
- **FR22:** System can apply user-configured labels to the PR (always including
  `prompt2pr`)
- **FR23:** System can skip PR creation entirely when no changes are detected,
  exiting successfully

### Scheduling & Triggering

- **FR24:** User can configure the action to run on a cron schedule via GitHub
  Actions `schedule` event
- **FR25:** User can manually trigger the action via `workflow_dispatch`

### Logging & Observability

- **FR26:** System can output structured logs to the GitHub Actions log,
  including: number of files scanned, files matching paths, issues found, and
  action taken (PR created or skipped)
- **FR27:** System can report clear error details when a run fails (provider
  errors, configuration errors, guardrail violations)
- **FR28:** System can output action outputs (`pr_url`, `pr_number`,
  `files_changed`, `lines_changed`, `skipped`) for downstream workflow steps

### Safety & Guardrails

- **FR29:** System enforces that files outside the `paths` scope are never
  modified
- **FR30:** System enforces `max_files` and `max_changes` limits, rejecting LLM
  responses that exceed them
- **FR31:** System never modifies files in the `.github/` directory

### Configuration & Setup

- **FR32:** User can configure all action inputs via the standard GitHub Actions
  `with:` syntax
- **FR33:** User can provide API keys via environment variables using GitHub
  Secrets
- **FR34:** User can configure the action in under 5 minutes using the README
  quick-start guide

### Documentation & Examples

- **FR35:** User can access a README with quick-start instructions,
  configuration reference, and provider setup guides
- **FR36:** User can copy complete example workflow files from the `examples/`
  directory for common use cases (dead links, copyright year, README sync,
  secret scan, TODO cleanup)

## Non-Functional Requirements

### Performance

- **NFR1:** A complete action run (checkout → LLM call → PR creation) should
  complete within 5 minutes for repos with ≤ 100 scoped files
- **NFR2:** The LLM API call should timeout after 120 seconds with a clear error
  message
- **NFR3:** File scanning and glob matching should complete within 10 seconds
  for repos with ≤ 10,000 files

### Security

- **NFR4:** API keys must never be logged, printed, or exposed in Action outputs
  or PR bodies
- **NFR5:** The action must only use permissions explicitly granted via the
  workflow's `permissions` block
- **NFR6:** The action must not transmit repo file contents to any endpoint
  other than the configured LLM provider API
- **NFR7:** The `GITHUB_TOKEN` used for PR creation must follow the principle of
  least privilege (only `contents: write` and `pull-requests: write`)

### Integration

- **NFR8:** The action must work with GitHub.com (github.com). GitHub Enterprise
  Server support is not required for MVP
- **NFR9:** LLM provider API calls must follow each provider's documented API
  contract and handle standard HTTP error codes
- **NFR10:** The action must be compatible with `ubuntu-latest` GitHub-hosted
  runners (the most common runner)

### Reliability

- **NFR11:** If the LLM provider API is unavailable, the action must fail with a
  clear error (not silently succeed)
- **NFR12:** If git operations fail (branch creation, push, PR creation), the
  action must fail with actionable error messages
- **NFR13:** The action must be idempotent — running the same prompt twice on
  unchanged content should produce no PR both times
- **NFR14:** Network failures to LLM providers should be retried once with a
  5-second backoff before failing

### Maintainability

- **NFR15:** Adding a new LLM provider must require implementing a single
  interface with no changes to core logic (target: < 1 day effort)
- **NFR16:** The codebase must have ≥80% line coverage for all provider
  implementations and core logic as measured by Istanbul/nyc
- **NFR17:** The action must be buildable and testable locally with
  `npm install && npm test`
