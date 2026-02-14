---
title: 'Vision & Roadmap'
---

# Vision & Roadmap

Prompt2PR's vision is to make repository maintenance as simple as writing a
sentence.

---

## The Vision

> **"Cron jobs, but the job description is a prompt."**

Any developer can write a one-line maintenance instruction in a workflow YAML,
and Prompt2PR executes it periodically — opening labeled PRs when changes are
needed, staying silent when they're not.

Prompt2PR introduces a new paradigm: **Prompt-as-Job-Description**. Instead of
writing scripts or code to automate repo fixes, developers write plain-English
prompts. This mirrors the broader shift from imperative to declarative to
natural language interfaces — applied specifically to repository maintenance.

---

## Current State (v1.0)

Prompt2PR v1.0 is fully functional with:

- 4 LLM providers (Mistral, OpenAI, Anthropic, GitHub Models)
- Safety guardrails (max_files, max_changes, paths scoping, .github/ protection)
- 200K character context window management
- Retry with backoff
- Dry-run mode
- 13 example workflows
- 98%+ test coverage

---

## Roadmap

### Phase 2: Growth

Features planned for near-term development:

| Feature                   | Description                                               | Status      |
| ------------------------- | --------------------------------------------------------- | ----------- |
| **PR Deduplication**      | Skip PR creation if an identical open PR already exists   | Planned     |
| **Auto-assign Reviewers** | Automatically assign reviewers to created PRs             | Planned     |
| **GitHub Pages Docs**     | Comprehensive documentation site                          | In Progress |
| **Bootstrap CLI**         | Scaffolding tool to generate workflow files interactively | Planned     |
| **LiteLLM Proxy Mode**    | Support any provider via LiteLLM proxy                    | Planned     |

### Phase 3: Expansion

Longer-term vision features:

| Feature                        | Description                                                                   |
| ------------------------------ | ----------------------------------------------------------------------------- |
| **Structured Prompts DSL**     | Break prompts into `task`, `scope`, and `rules` for more precision            |
| **Conditional Execution**      | `only_if` conditions to control when prompts run (e.g., `only_if: "january"`) |
| **Chained Prompts**            | Multi-step workflows where one prompt's output feeds the next                 |
| **Community Prompt Templates** | Reference shared prompts by name: `prompt: community/dead-link-fixer`         |
| **Prompt Marketplace**         | Browse, share, and rate community prompts                                     |
| **Cross-repo Dashboard**       | Overview of Prompt2PR activity across multiple repositories                   |
| **Self-improving Prompts**     | Learn from rejected PRs to improve future suggestions                         |
| **Organization-wide Policies** | Define prompt policies that apply across all repos in an org                  |

---

## Design Principles

These principles guide all development decisions:

1. **Simplicity is the moat.** The entire interface is a handful of YAML keys.
   No dashboard, no CLI, no SaaS login. The barrier to entry is writing one
   sentence.

2. **PRs, not merges.** Prompt2PR creates PRs for human review. It never merges
   autonomously. Trust through transparency.

3. **Silence is golden.** When nothing needs fixing, the action stays quiet. No
   noise, no spam PRs.

4. **Zero infrastructure.** Runs entirely within GitHub Actions on the user's
   compute. No servers, no Docker, no external dependencies beyond the LLM API.

5. **Engine-agnostic.** Adding a new LLM provider takes less than a day. The
   architecture should never be locked to one vendor.

---

## Competitive Landscape

| Tool                            | What It Does                       | Prompt2PR's Edge                                        |
| ------------------------------- | ---------------------------------- | ------------------------------------------------------- |
| **Dependabot**                  | Automated dependency PRs           | Prompt2PR handles _any_ maintenance task, not just deps |
| **Renovate**                    | Configurable dependency management | Complex config vs. one-line prompts                     |
| **GitHub Copilot Coding Agent** | AI code changes from issues        | Issue-driven & interactive, not scheduled/autonomous    |
| **Custom scripts + cron**       | Anything you code                  | Requires coding; Prompt2PR requires zero code           |

**Prompt2PR is the only tool that combines:**

- Declarative natural-language prompts
- Scheduled execution (cron)
- Automated PR creation
- Zero scripting required

---

## Success Metrics

| Metric                          | Target       | Timeframe    |
| ------------------------------- | ------------ | ------------ |
| GitHub Marketplace installs     | 500+         | 6 months     |
| GitHub stars                    | 200+         | 6 months     |
| Weekly active workflows         | 100+         | 6 months     |
| Time from install to first PR   | < 10 minutes | From install |
| False positive PR rate          | < 10%        | Ongoing      |
| New provider integration effort | < 1 day      | Ongoing      |

---

## Contributing to the Vision

We welcome contributions! Whether it's:

- **New example workflows** — share your prompts with the community
- **New LLM providers** — extend provider support
- **Documentation improvements** — help others get started faster
- **Feature proposals** — open an issue to discuss new ideas

See the [Contributing Guide](../guides/contributing) to get started.
