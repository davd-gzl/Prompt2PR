---
title: 'Prompt2PR — Documentation'
---

# Prompt2PR

> A GitHub Action that turns plain-English prompts into Pull Requests using
> LLMs. Point it at files, describe what to fix, and get an automated PR.

---

## Quick Example

```yaml
name: Fix Dead Links
on:
  schedule:
    - cron: '0 9 * * 1' # Every Monday
  workflow_dispatch:

permissions:
  contents: write
  pull-requests: write

jobs:
  prompt2pr:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: davd-gzl/Prompt2PR@v1
        with:
          prompt: |
            Scan all markdown files for broken links.
            Fix or remove any dead links you find.
          provider: mistral
          paths: '**/*.md'
        env:
          MISTRAL_API_KEY: ${{ secrets.MISTRAL_API_KEY }}
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

---

## Documentation

### Guides

- [Quick Start](guides/quick-start) — Get your first workflow running in 5
  minutes
- [Provider Setup](guides/providers) — Mistral, OpenAI, Anthropic, GitHub Models
- [Scheduling & Triggers](guides/scheduling) — Cron, manual, push, issue comment
- [Safety & Guardrails](guides/safety-and-guardrails) — Limits, scoping,
  protections
- [FAQ & Troubleshooting](guides/faq) — Common issues and solutions
- [Contributing](guides/contributing) — Development setup and guidelines

### Reference

- [Configuration](reference/configuration) — All inputs, outputs, and defaults
- [Outputs](reference/outputs) — Using action outputs in downstream steps
- [Architecture](reference/architecture) — How Prompt2PR works internally
- [Vision & Roadmap](reference/vision-and-roadmap) — What's next

### Examples

- [All Examples](examples/) — 13 ready-to-use workflows by category
- [Documentation](examples/documentation) — Dead links, README sync, copyright,
  translations
- [Code Quality](examples/code-quality) — TODOs, style guide, deprecations,
  error handling
- [Security](examples/security) — Secret scanning
- [Testing](examples/testing) — Test generation
- [Advanced Triggers](examples/advanced-triggers) — Dry run, issue comments
