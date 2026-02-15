---
layout: single
title: Roadmap
permalink: /roadmap/
---

# Roadmap

Where Prompt2PR is headed. This roadmap reflects the original product vision and
community feedback. Items are grouped by phase — not by timeline.

**Current state:** Prompt2PR v1 is a single-shot action. One LLM call, one
response, one PR. No iteration, no tool use, no internet access.

---

## Completed (v1.0 - v1.1)

Everything in the MVP and early Growth phases is shipped:

- Core pipeline: prompt + file context -> LLM -> PR
- 4 LLM providers: Mistral, OpenAI, Anthropic, GitHub Models
- Safety guardrails: `max_files`, `max_changes`, path scoping, `.github/` block
- Dry-run mode
- AI-generated PR summaries and descriptive titles
- Configurable labels, branch prefix, base URL override
- 13 example workflows across 4 categories
- GitHub Pages documentation site
- 97%+ test coverage (274 tests)

---

## Phase 2 — Growth

Near-term improvements that build on the current single-shot architecture.

### PR Deduplication

Skip PR creation if an identical open PR already exists. Prevents duplicate PRs
when a scheduled workflow runs multiple times before the previous PR is merged.

### Auto-Assign Reviewers

Automatically assign reviewers or teams to generated PRs. Configuration via a
new `reviewers` input:

```yaml
with:
  reviewers: 'alice,bob'
  team_reviewers: 'platform-team'
```

### LiteLLM Proxy Mode

Support any LLM provider via a [LiteLLM](https://github.com/BerriAI/litellm)
proxy. Users who run a LiteLLM gateway can point Prompt2PR at it:

```yaml
with:
  provider: litellm
  model: mistral/mistral-large-latest
  base_url: http://my-litellm-proxy:4000
```

### Bootstrap CLI

A command-line tool or companion action that scaffolds Prompt2PR workflows:

```bash
npx prompt2pr init
# Interactive prompt: What do you want to automate?
# Generates .github/workflows/prompt2pr.yml
```

### More Providers

- Google Gemini
- AWS Bedrock
- Azure OpenAI
- Ollama (local models)

---

## Phase 3 — Agentic Mode

The biggest architectural evolution. Instead of a single LLM call, Prompt2PR
would run an **agent loop** that can use tools between LLM calls.

### How It Would Work

1. The action calls the LLM with the prompt + file context + available tools
2. The LLM responds with a tool call (e.g., `read_file`, `run_tests`,
   `search_codebase`)
3. The action executes the tool and sends the result back to the LLM
4. Loop until the LLM returns a final answer (the file changes)
5. Submit the PR as usual

### Why This Matters

The single-shot model has a fundamental limitation: the LLM can only reason
about files it was given upfront. It cannot:

- Explore the codebase to find related files
- Run tests to verify its changes work
- Check if a URL is actually reachable
- Iterate on its output based on feedback

An agentic mode would unlock tasks that are currently impossible:

| Task                            | Single-shot            | Agentic              |
| ------------------------------- | ---------------------- | -------------------- |
| Add JSDoc to visible files      | Works well             | Works well           |
| Fix a bug described in an issue | Limited                | Can explore codebase |
| Refactor across many files      | Limited by context     | Can navigate freely  |
| Fix failing tests               | Cannot run tests       | Can run and iterate  |
| Verify link liveness            | Cannot make HTTP calls | Can check URLs       |

### What the API Could Look Like

```yaml
- uses: davd-gzl/Prompt2PR@v2
  with:
    prompt: 'Fix all failing tests in src/'
    provider: openai
    mode: 'agentic' # vs 'single-shot' (default)
    max_iterations: 10 # safety cap on agent loops
    tools: 'read_file,run_command' # which tools to expose
```

### Provider Support

All major providers already support tool use / function calling:

| Provider      | API           | Mechanism                                           |
| ------------- | ------------- | --------------------------------------------------- |
| OpenAI        | Responses API | `tool_calls` in response, loop on `requires_action` |
| Anthropic     | Messages API  | `tool_use` content blocks, return `tool_result`     |
| Mistral       | Chat API      | `tool_calls` field, same loop pattern               |
| GitHub Models | Inherited     | Depends on upstream model provider                  |

### Trade-offs

|                | Single-shot (current)          | Agentic                      |
| -------------- | ------------------------------ | ---------------------------- |
| Predictability | High                           | Lower — could loop 2x or 20x |
| Cost           | Fixed, proportional to context | Variable, needs caps         |
| Capability     | Reasons about given files only | Can explore, test, verify    |
| Latency        | Seconds                        | Minutes                      |
| Complexity     | Simple                         | Significantly more complex   |
| Safety         | Easy to guardrail              | Harder — agent takes actions |

Single-shot would remain the default. Agentic mode would be opt-in.

---

## Phase 4 — Structured Prompts & DSL

Evolve from plain-English prompts to a richer declarative language for precision
and reusability.

### Structured Prompts

Break prompts into semantic parts: `task`, `scope`, and `rules`:

```yaml
with:
  prompt:
    task: 'Update copyright year to 2026'
    scope: 'All files containing copyright notices'
    rules:
      - 'Use range format: 2024-2026'
      - 'Do not modify files in vendor/'
      - 'Preserve original author names'
```

### Conditional Execution

Control when prompts actually run, beyond cron schedules:

```yaml
with:
  prompt: 'Update copyright year'
  only_if: 'january' # Only run in January
```

### Chained Prompts

Multi-step workflows where one prompt's output feeds the next:

```yaml
jobs:
  step1:
    uses: davd-gzl/Prompt2PR@v2
    with:
      prompt: 'Identify all deprecated API calls'
      dry_run: true
  step2:
    needs: step1
    uses: davd-gzl/Prompt2PR@v2
    with:
      prompt:
        'Replace the deprecated calls found: ${{ steps.step1.outputs.summary }}'
```

---

## Phase 5 — Community & Scale

### Community Prompt Templates

Reference shared, curated prompts by name instead of writing your own:

```yaml
with:
  prompt: 'community/dead-link-fixer'
```

A public registry of prompts that the community can browse, share, and rate.

### Prompt Marketplace

A GitHub Pages-hosted gallery where users can:

- Browse prompts by category (code quality, docs, security, maintenance)
- See real-world results (example PRs generated by each prompt)
- Rate and review prompts
- Submit their own

### Cross-Repo Dashboard

A companion GitHub App or dashboard that shows:

- All Prompt2PR workflows across an organization
- PR creation rate, merge rate, rejection rate per prompt
- Cost tracking (estimated API usage per workflow)

### Self-Improving Prompts

Learn from rejected PRs to improve future runs:

- Track which PRs get merged vs. closed
- Analyze rejection patterns (what kinds of changes get rejected?)
- Suggest prompt refinements based on historical outcomes
- Optionally auto-adjust prompts over time

### Organization-Wide Prompt Policies

For teams managing Prompt2PR across many repositories:

- Central prompt library with org-level governance
- Mandatory guardrail policies (e.g., "all repos must use max_files <= 5")
- Audit log of all LLM-generated changes across the org
- Role-based access to prompt creation and modification

---

## Contributing to the Roadmap

Have an idea? Open an [issue](https://github.com/davd-gzl/Prompt2PR/issues) or
start a [discussion](https://github.com/davd-gzl/Prompt2PR/discussions).
Community input shapes what gets built next.
