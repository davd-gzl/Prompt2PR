---
title: 'Vision & Roadmap'
---

# Vision & Roadmap

---

## Current State (v1.0)

- 4 LLM providers (Mistral, OpenAI, Anthropic, GitHub Models)
- Safety guardrails (max_files, max_changes, paths scoping, .github/ protection)
- 200K character context window management
- Retry with backoff
- Dry-run mode
- 13 example workflows
- 98%+ test coverage

---

## Roadmap

### Phase 2: Near-term

| Feature                   | Description                                               | Status      |
| ------------------------- | --------------------------------------------------------- | ----------- |
| **PR Deduplication**      | Skip PR creation if an identical open PR already exists   | Planned     |
| **Auto-assign Reviewers** | Automatically assign reviewers to created PRs             | Planned     |
| **GitHub Pages Docs**     | Documentation site                                        | In Progress |
| **Bootstrap CLI**         | Scaffolding tool to generate workflow files interactively | Planned     |
| **LiteLLM Proxy Mode**    | Support any provider via LiteLLM proxy                    | Planned     |

### Phase 3: Longer-term

| Feature                        | Description                                                                   |
| ------------------------------ | ----------------------------------------------------------------------------- |
| **Structured Prompts DSL**     | Break prompts into `task`, `scope`, and `rules` for more precision            |
| **Conditional Execution**      | `only_if` conditions to control when prompts run (e.g., `only_if: "january"`) |
| **Chained Prompts**            | Multi-step workflows where one prompt's output feeds the next                 |
| **Community Prompt Templates** | Reference shared prompts by name: `prompt: community/dead-link-fixer`         |

---

## Design Principles

1. **Simplicity.** The entire interface is a handful of YAML keys. No dashboard,
   no CLI, no SaaS login.

2. **PRs, not merges.** Prompt2PR creates PRs for human review. It never merges
   autonomously.

3. **Silence is golden.** When nothing needs fixing, the action stays quiet.

4. **Zero infrastructure.** Runs entirely within GitHub Actions. No servers, no
   Docker, no external dependencies beyond the LLM API.

5. **Engine-agnostic.** Adding a new LLM provider takes less than a day.

---

## Contributing

See the [Contributing Guide](../guides/contributing) to get started.
