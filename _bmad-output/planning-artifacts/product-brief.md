# Product Brief: Prompt2PR

## Document Info

| Field          | Value                      |
| -------------- | -------------------------- |
| Product Name   | **Prompt2PR**              |
| Author         | John (PM Agent) × Davd     |
| Date           | 2026-02-08                 |
| Status         | Draft                      |
| stepsCompleted | [discovery, product-brief] |

---

## 1. Problem Statement

### The Pain

Repositories accumulate **silent rot** over time — dead links in READMEs,
outdated security dependencies, stale documentation, deprecated API references,
license headers that drift. These are small, repetitive maintenance tasks that:

- **Nobody owns** — they fall through the cracks until someone stumbles on them
- **Are tedious** — developers don't want to spend time on link-checking or
  boilerplate fixes
- **Compound over time** — one dead link becomes twenty, one outdated dep
  becomes a security vulnerability
- **Require manual effort** to even detect, let alone fix

### The Insight

These tasks are **perfectly suited for AI** — they're small, focused,
well-scoped, and low-risk. But today, setting up automated AI-driven maintenance
requires stitching together custom scripts, LLM APIs, git operations, and PR
creation logic. **There's no simple, declarative way to say "fix this thing in
my repo every Monday."**

---

## 2. Vision

**Prompt2PR** is an open-source GitHub Action that turns **plain-English prompts
into automated Pull Requests** on a schedule.

A developer writes a natural language instruction in their workflow YAML — just
like writing a comment to a colleague — and Prompt2PR executes it on a cron
schedule, opening a labeled PR when changes are needed.

> **One sentence:** "Cron jobs, but the job description is a prompt."

---

## 3. Target Users

### Primary: Open-Source Maintainers

- Maintain 1+ public repos with docs, READMEs, and dependencies
- Want repos to stay healthy without manual babysitting
- Comfortable with GitHub Actions and YAML

### Secondary: Engineering Teams

- Teams with internal repos that need ongoing maintenance hygiene
- DevOps/platform engineers who set up automation for their org
- Anyone who currently has "fix the README" sitting in a backlog forever

### User Skill Level

- **Minimum:** Can edit a YAML file and set up a GitHub Secret
- **No AI expertise required** — prompts are plain English

---

## 4. Core Use Cases (MVP)

| #   | Use Case                         | Example Prompt                                                                                   |
| --- | -------------------------------- | ------------------------------------------------------------------------------------------------ |
| 1   | **Dead Link Detection & Fix**    | "Scan all markdown files for broken links. Fix or remove any dead links you find."               |
| 2   | **Documentation Freshness**      | "Check if the README install instructions still match the actual setup process in package.json." |
| 3   | **Security / Dependency Checks** | "Review dependencies for known security advisories and suggest updates."                         |
| 4   | **License & Header Compliance**  | "Ensure all source files have the Apache 2.0 license header."                                    |
| 5   | **Code Style / Hygiene**         | "Find and fix TODO comments that reference resolved issues."                                     |

---

## 5. How It Works

### Developer Experience (The Happy Path)

**Step 1:** Add a workflow file to `.github/workflows/`:

```yaml
name: Fix Dead Links
on:
  schedule:
    - cron: '0 0 * * 1' # Every Monday
  workflow_dispatch: # Manual trigger too

jobs:
  prompt2pr:
    runs-on: ubuntu-latest
    steps:
      - uses: Davphla/Prompt2PR@v1
        with:
          prompt: |
            Scan all markdown files for broken links.
            Fix or remove any dead links you find.
          provider: mistral
          model: mistral-large-latest
          paths: 'docs/**,README.md'
          max_files: 5
          max_changes: 100
          label: 'prompt2pr,dead-links'
        env:
          MISTRAL_API_KEY: ${{ secrets.MISTRAL_API_KEY }}
```

**Step 2:** Commit and push. Done.

**Step 3:** Every Monday, Prompt2PR:

1. Checks out the repo
2. Scopes to the specified paths (or full repo if not set)
3. Sends the prompt + repo context to the chosen LLM
4. If changes are needed → creates a **new labeled PR** with:
   - The prompt quoted in the PR description (traceability)
   - A summary of what was changed and why
   - The `prompt2pr` label + any custom labels
5. If nothing to fix → **skips silently** (logs available in the Actions run)

---

## 6. Configuration Options (MVP)

| Parameter       | Required | Default          | Description                                               |
| --------------- | -------- | ---------------- | --------------------------------------------------------- |
| `prompt`        | ✅       | —                | The plain-English instruction for the AI                  |
| `provider`      | ✅       | —                | LLM provider: `openai`, `anthropic`, `github`             |
| `model`         | ❌       | Provider default | Specific model to use (e.g., `gpt-4o`, `claude-sonnet-4`) |
| `paths`         | ❌       | `"**"` (all)     | Comma-separated glob patterns to scope file access        |
| `max_files`     | ❌       | `10`             | Max number of files the AI can modify per run             |
| `max_changes`   | ❌       | `200`            | Max total lines changed across all files                  |
| `label`         | ❌       | `"prompt2pr"`    | Comma-separated labels to apply to the PR                 |
| `branch_prefix` | ❌       | `"prompt2pr/"`   | Prefix for auto-created branches                          |
| `dry_run`       | ❌       | `false`          | If true, logs what would change without creating a PR     |

API keys are passed via `env:` using GitHub Secrets (standard Actions pattern).

---

## 7. Supported LLM Providers (MVP)

| Provider      | Config Value | Auth Secret               |
| ------------- | ------------ | ------------------------- |
| Mistral       | `mistral`    | `MISTRAL_API_KEY`         |
| OpenAI        | `openai`     | `OPENAI_API_KEY`          |
| Anthropic     | `anthropic`  | `ANTHROPIC_API_KEY`       |
| GitHub Models | `github`     | `GITHUB_TOKEN` (built-in) |

**Mistral is the priority/default provider.** Architecture is
**engine-agnostic** — a provider interface makes adding new engines
straightforward post-MVP.

---

## 8. PR Behavior

- **Always creates a new PR** when changes are detected (no updating existing
  PRs in MVP)
- **PR title:** Auto-generated from prompt summary (e.g.,
  `[Prompt2PR] Fix dead links in markdown files`)
- **PR body contains:**
  - The original prompt (quoted block)
  - AI-generated summary of changes
  - Run metadata (timestamp, model used, files scanned)
- **Labels:** Applied as configured, always includes `prompt2pr`
- **Branch naming:** `prompt2pr/<workflow-name>-<timestamp>`
- **No changes detected:** No PR created, action exits with success, summary
  logged in Actions output

---

## 9. Safety Guardrails

| Guardrail            | Description                                                 |
| -------------------- | ----------------------------------------------------------- |
| `max_files` limit    | Hard cap on files modified per run                          |
| `max_changes` limit  | Hard cap on total lines changed                             |
| `paths` scoping      | AI can only read/modify files matching the glob patterns    |
| No self-modification | The action **never** modifies `.github/` directory contents |
| Dry run mode         | Preview changes without creating PRs                        |
| Human review gate    | Changes go through PRs — always requires human merge        |

---

## 10. Name Alternatives

**Prompt2PR** is strong — it's descriptive, memorable, and says what it does.
But here are alternatives considered:

| Name               | Vibe                                      |
| ------------------ | ----------------------------------------- |
| **Prompt2PR** ✅   | Direct, clear, action-oriented            |
| **CronPrompt**     | Emphasizes the scheduling aspect          |
| **RepoSweep**      | Emphasizes the maintenance/cleaning angle |
| **AutoFix Action** | Generic but clear                         |
| **PromptOps**      | Aligns with DevOps/GitOps naming          |

**Recommendation:** Stick with **Prompt2PR**. It's unique, Googleable, and
immediately communicates the value.

---

## 11. Success Metrics

| Metric                            | Target (6 months post-launch) |
| --------------------------------- | ----------------------------- |
| GitHub Marketplace installs       | 500+                          |
| Stars on repo                     | 200+                          |
| Weekly active workflows           | 100+                          |
| Avg time from install to first PR | < 10 minutes                  |
| User-reported false positive rate | < 10% of PRs                  |

---

## 12. What This Is NOT (Anti-Scope)

- ❌ **Not a full refactoring tool** — scoped to small, focused fixes
- ❌ **Not a code review bot** — it makes changes, not comments
- ❌ **Not a CI/CD replacement** — it complements existing pipelines
- ❌ **Not an autonomous merge tool** — always creates PRs for human review
- ❌ **Not a hosted service** — runs entirely within GitHub Actions (user's
  compute + API keys)

---

## 13. Technical Risks & Open Questions

| Risk                                               | Mitigation                                                                      |
| -------------------------------------------------- | ------------------------------------------------------------------------------- |
| LLM hallucinating changes                          | Safety guardrails (max_files, max_changes, paths scoping) + human review via PR |
| API cost for large repos                           | Path scoping, context windowing, clear docs on cost implications                |
| Rate limiting from LLM providers                   | Graceful retry with backoff, clear error messages in logs                       |
| Different providers returning inconsistent quality | Document recommended models, provide prompt tips                                |
| GitHub Actions token permissions                   | Clear setup docs, minimal required permissions                                  |

### Open Questions

- Should we support **multi-step prompts** (chain of operations) in v2?
- Should there be a **marketplace of community prompts** (shared prompt
  templates)?
- How do we handle repos with **large file counts** efficiently (context window
  limits)?

---

## 14. Competitive Landscape

| Tool                        | Difference from Prompt2PR                                     |
| --------------------------- | ------------------------------------------------------------- |
| Dependabot                  | Dependency-only, no custom prompts                            |
| Renovate                    | Dependency-only, complex config                               |
| GitHub Copilot Coding Agent | Powerful but task-driven (issues), not cron-scheduled prompts |
| Custom scripts + cron       | Requires coding, no AI, no declarative prompts                |

**Prompt2PR's edge:** The only tool that lets you **describe maintenance in
plain English** and get **automated, scheduled PRs** with zero scripting.

---

_Generated by PM Agent John — Prompt2PR product discovery session with Davd,
2026-02-08_
