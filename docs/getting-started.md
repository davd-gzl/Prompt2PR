---
layout: single
title: Getting Started
permalink: /getting-started/
---

# Getting Started

Get a working Prompt2PR workflow in under 5 minutes.

---

## Prerequisites

- A GitHub repository where you have admin access
- An API key from one of the supported LLM providers (or a GitHub Copilot
  subscription for GitHub Models)

## Step 1: Get an API Key

Choose a provider and get your API key:

| Provider      | Where to get the key                                               |
| :------------ | :----------------------------------------------------------------- |
| Mistral       | [console.mistral.ai](https://console.mistral.ai/) → API Keys       |
| OpenAI        | [platform.openai.com](https://platform.openai.com/) → API Keys     |
| Anthropic     | [console.anthropic.com](https://console.anthropic.com/) → API Keys |
| GitHub Models | No key needed — uses the built-in `GITHUB_TOKEN`                   |

## Step 2: Add the Secret

In your GitHub repository:

1. Go to **Settings → Secrets and variables → Actions**
2. Click **New repository secret**
3. Add your API key with the correct name:

| Provider      | Secret Name         |
| :------------ | :------------------ |
| Mistral       | `MISTRAL_API_KEY`   |
| OpenAI        | `OPENAI_API_KEY`    |
| Anthropic     | `ANTHROPIC_API_KEY` |
| GitHub Models | No secret needed    |

## Step 3: Create a Workflow File

Create `.github/workflows/prompt2pr.yml` in your repository:

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

**Note:** Replace `provider: mistral` and `MISTRAL_API_KEY` with your chosen
provider and its corresponding secret. {: .notice--info }

## Step 4: Enable PR Creation

Go to **Settings → Actions → General → Workflow permissions** and check:

- **"Allow GitHub Actions to create and approve pull requests"**

Without this, the action will fail with a permission error.

## Step 5: Trigger the Workflow

1. Go to the **Actions** tab in your repository
2. Select the **Prompt2PR** workflow
3. Click **Run workflow**
4. Enter your prompt (e.g., "Add missing error handling to all async functions")
5. Click **Run workflow**

The action will scan your files, call the LLM, apply the changes, and open a PR.
Check the workflow run logs for details on what was changed.

---

## What Happens Next

After the workflow runs successfully:

- A new branch is created (e.g., `prompt2pr/1707900000`)
- A Pull Request is opened with the LLM's changes
- The PR body includes the original prompt, a summary of changes, and metadata
- The `prompt2pr` label is applied

Review the PR like any other — merge it, request changes, or close it.

---

## Using GitHub Models (No API Key)

If you prefer not to manage external API keys, GitHub Models lets you use LLMs
directly through GitHub's infrastructure:

```yaml
permissions:
  contents: write
  pull-requests: write
  models: read # Required for GitHub Models

jobs:
  prompt2pr:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: davd-gzl/Prompt2PR@v1
        with:
          prompt: 'Fix typos in documentation'
          provider: github
          model: openai/gpt-4o
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

**Important:** GitHub Models requires the `models: read` permission and a GitHub
Copilot subscription. {: .notice--warning }

---

Next: [Configuration Reference](/configuration/)
