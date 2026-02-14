---
title: 'Prompt2PR — Documentation'
---

# Prompt2PR

> **Cron jobs, but the job description is a prompt.**

Prompt2PR is an open-source GitHub Action that turns **plain-English prompts
into automated Pull Requests** using LLMs. Write a natural-language instruction
in your workflow YAML, run it on a schedule or on-demand, and get clean, labeled
PRs when changes are needed.

---

## Why Prompt2PR?

Repositories accumulate **silent rot** — dead links, stale docs, outdated
copyright years, deprecated APIs, TODO comments that were resolved ages ago.
These are small, repetitive maintenance tasks that nobody owns and everyone
avoids.

Prompt2PR fixes this. Describe the fix in plain English, set a schedule, and
forget about it.

<div class="feature-grid" markdown="0">
  <div class="feature-card">
    <h3>🗣️ Natural Language</h3>
    <p>Write prompts in plain English — no scripting, no DSLs, no complex config.</p>
  </div>
  <div class="feature-card">
    <h3>⏰ Set & Forget</h3>
    <p>Schedule maintenance with cron. Get PRs when fixes are needed, silence when not.</p>
  </div>
  <div class="feature-card">
    <h3>🔒 Safe by Design</h3>
    <p>Guardrails limit changes. .github/ is always protected. Every change goes through a PR for human review.</p>
  </div>
  <div class="feature-card">
    <h3>🔌 Multi-Provider</h3>
    <p>Works with Mistral, OpenAI, Anthropic, and GitHub Models out of the box.</p>
  </div>
  <div class="feature-card">
    <h3>🏷️ Traceable PRs</h3>
    <p>Every PR includes the original prompt, AI summary, and run metadata. No black boxes.</p>
  </div>
  <div class="feature-card">
    <h3>⚡ Zero Infrastructure</h3>
    <p>Runs on GitHub Actions. No servers, no Docker, no SaaS. Just YAML + an API key.</p>
  </div>
</div>

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

**Result:** Every Monday, a PR appears if broken links are found. If everything
is fine — silence.

---

## Get Started

<div class="feature-grid" markdown="0">
  <div class="feature-card">
    <h3>📖 <a href="guides/quick-start">Quick Start Guide</a></h3>
    <p>Get your first Prompt2PR workflow running in under 5 minutes.</p>
  </div>
  <div class="feature-card">
    <h3>🔧 <a href="reference/configuration">Configuration Reference</a></h3>
    <p>Full reference for all inputs, outputs, and default values.</p>
  </div>
  <div class="feature-card">
    <h3>📂 <a href="examples/">Example Workflows</a></h3>
    <p>13 ready-to-use workflows organized by category.</p>
  </div>
  <div class="feature-card">
    <h3>🔑 <a href="guides/providers">Provider Setup</a></h3>
    <p>Step-by-step setup for Mistral, OpenAI, Anthropic, and GitHub Models.</p>
  </div>
</div>
