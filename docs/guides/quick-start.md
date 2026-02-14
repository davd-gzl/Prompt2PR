---
title: 'Quick Start'
---

# Quick Start

Get a working Prompt2PR workflow in under 5 minutes.

---

## Prerequisites

- A GitHub repository where you have admin access
- An API key from an LLM provider (or use
  [GitHub Models](providers#github-models) for zero-setup)

---

## Step 1: Get an API Key

Choose a provider and get an API key:

| Provider          | Where to get a key                                      | Cost                               |
| ----------------- | ------------------------------------------------------- | ---------------------------------- |
| **Mistral**       | [console.mistral.ai](https://console.mistral.ai/)       | Free tier available                |
| **OpenAI**        | [platform.openai.com](https://platform.openai.com/)     | Pay-per-use                        |
| **Anthropic**     | [console.anthropic.com](https://console.anthropic.com/) | Pay-per-use                        |
| **GitHub Models** | Built-in — no key needed                                | Included with Copilot subscription |

> **Fastest setup:** Use `provider: github` with GitHub Models. No external API
> key required — it uses the built-in `GITHUB_TOKEN`.

---

## Step 2: Add the Secret

1. Go to your repository on GitHub
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add your API key (e.g., name: `MISTRAL_API_KEY`, value: your key)

> Skip this step if using GitHub Models.

---

## Step 3: Create the Workflow

Create a file at `.github/workflows/prompt2pr.yml` in your repository:

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

---

## Step 4: Run It

1. Go to the **Actions** tab in your repository
2. Select **Prompt2PR** from the workflow list
3. Click **Run workflow**
4. Enter a prompt like: `Fix any typos in the README`
5. Watch the PR appear!

---

## Step 5: Add a Schedule (Optional)

Make it automatic by adding a cron trigger:

```yaml
on:
  schedule:
    - cron: '0 9 * * 1' # Every Monday at 9:00 UTC
  workflow_dispatch:
    inputs:
      prompt:
        description: 'Custom prompt (optional)'
        required: false
        default: ''

  # In the step:
  with:
    prompt: >-
      ${{ github.event.inputs.prompt || 'Scan all markdown files for broken
      links and fix or remove any dead links found.' }}
```

This runs the prompt every Monday automatically, and you can still trigger it
manually with a custom prompt.

---

## What Happens Next

When Prompt2PR runs:

1. **Checks out** your repository
2. **Scans files** matching the `paths` glob patterns
3. **Sends** the prompt + file contents to the LLM
4. **Creates a PR** if changes are needed, with:
   - The original prompt quoted in the description
   - An AI-generated summary of changes
   - The `prompt2pr` label
   - Run metadata (model, timestamp, files scanned)
5. **Stays silent** if nothing needs fixing (logs available in Actions)

---

## Next Steps

- **[Provider Setup](providers)** — Detailed setup for each LLM provider
- **[Configuration Reference](../reference/configuration)** — All inputs and
  outputs explained
- **[Example Workflows](../examples/)** — 13 ready-to-use workflows by category
- **[Safety & Guardrails](safety-and-guardrails)** — How Prompt2PR keeps changes
  safe
