---
layout: default
title: Home
nav_order: 1
permalink: /
---

# Prompt2PR

A GitHub Action that turns prompts into Pull Requests using LLMs. {: .fs-6
.fw-300 }

Point it at files, describe what to fix, and get an automated PR. {: .fs-5
.fw-300 }

[Get Started]({% link getting-started.md %}){: .btn .btn-primary .fs-5 .mb-4
.mb-md-0 .mr-2 } [View on GitHub](https://github.com/davd-gzl/Prompt2PR){: .btn
.fs-5 .mb-4 .mb-md-0 }

---

## What is Prompt2PR?

Prompt2PR is a GitHub Action that automates code changes using Large Language
Models. You write a prompt, point it at your codebase, and it:

1. **Scans** your files based on glob patterns
2. **Sends** your prompt + file contents to an LLM provider
3. **Parses** the structured response into file changes
4. **Validates** changes against safety guardrails
5. **Opens** a Pull Request with the changes applied

## Key Features

- **Four LLM providers** — Mistral, OpenAI, Anthropic, and GitHub Models
- **Safety guardrails** — Limits on files changed, lines changed, and path
  scope. Blocks `.github/` modifications.
- **Dry-run mode** — Preview what the LLM would change without creating a PR
- **Flexible triggers** — Works with cron schedules, manual dispatch, push
  events, issue comments, or any GitHub Actions trigger
- **Automatic retry** — Retries failed LLM calls with backoff
- **Context management** — Auto-truncates file contents to fit within the LLM's
  context window

## Quick Example

```yaml
name: Prompt2PR
on:
  workflow_dispatch:
    inputs:
      prompt:
        description: 'What should the AI fix?'
        required: true

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
          prompt: ${{ github.event.inputs.prompt }}
          provider: mistral
        env:
          MISTRAL_API_KEY: ${{ secrets.MISTRAL_API_KEY }}
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

## Supported Providers

| Provider      | Default Model              | API Key Required          |
| :------------ | :------------------------- | :------------------------ |
| Mistral       | `mistral-large-latest`     | `MISTRAL_API_KEY`         |
| OpenAI        | `gpt-4o`                   | `OPENAI_API_KEY`          |
| Anthropic     | `claude-sonnet-4-20250514` | `ANTHROPIC_API_KEY`       |
| GitHub Models | `openai/gpt-4o`            | `GITHUB_TOKEN` (built-in) |

**Providers are interchangeable.** Pick whichever you prefer — just change the
`provider:` input and the corresponding API key.

---

Ready to get started? Head to the [Getting
Started]({% link getting-started.md %}) guide.
