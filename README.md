# Prompt2PR

[![CI](https://github.com/davd-gzl/Prompt2PR/actions/workflows/ci.yml/badge.svg)](https://github.com/davd-gzl/Prompt2PR/actions/workflows/ci.yml)
[![Coverage](./badges/coverage.svg)](./badges/coverage.svg)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

> A GitHub Action that turns prompts into Pull Requests using LLMs. Point it at files, describe what to change, and get an automated PR — on push, on schedule, or on demand.

> Explore educational quizzes for learning geography and landmarks [here](https://education.openguessr.com/quiz).

/!\ This is an early production, please report issues (code, bug, vulnerabilities) when you spot one

## Quick Start

Get a working Prompt2PR workflow in under 5 minutes:

1. **Get an API key** from your LLM provider (see
   [Provider Setup](#provider-setup) below).
2. **Add the key as a GitHub Secret** in your repository under _Settings →
   Secrets and variables → Actions_ (e.g., `MISTRAL_API_KEY`).
3. **Create a workflow file** at `.github/workflows/prompt2pr.yml`:

   ```yaml
   name: Prompt2PR — Weekly Code Cleanup
   on:
     schedule:
       # Every Monday at 9:00 UTC
       - cron: '0 9 * * 1'
     workflow_dispatch:
       inputs:
         prompt:
           description: 'Custom prompt (optional — overrides default)'
           required: false
           default: ''

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
             prompt: >-
               ${{ github.event.inputs.prompt || 'Review the source code for
               common issues: unused imports, inconsistent naming, missing error
               handling on async calls, and console.log statements that should
               use a proper logger. Fix any issues you find. Do not change
               application logic.' }}
             provider: mistral
             paths: 'src/**'
             max_files: 10
             max_changes: 200
             label: 'prompt2pr,code-quality'
           env:
             MISTRAL_API_KEY: ${{ secrets.MISTRAL_API_KEY }}
             GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
   ```

4. **Trigger the workflow** — it runs automatically every Monday, or you can
   trigger it manually from the _Actions_ tab with an optional custom prompt.
   See [Scheduling & Triggers](#scheduling--triggers) for more options.

---

## Inputs

All inputs are configured via the standard GitHub Actions `with:` syntax.

| Input           | Required | Default       | Description                                                                                                 |
| --------------- | -------- | ------------- | ----------------------------------------------------------------------------------------------------------- |
| `prompt`        | **yes**  | —             | Plain-English instruction describing what changes to make. Sent to the LLM along with scoped file contents. |
| `provider`      | **yes**  | —             | LLM provider: `mistral`, `openai`, `anthropic`, or `github`.                                                |
| `model`         | no       | _(see below)_ | Model identifier. If omitted, the provider's default model is used.                                         |
| `paths`         | no       | `**`          | Comma-separated glob patterns for files to include as context and allow modifications.                      |
| `max_files`     | no       | `10`          | Maximum number of files the LLM may modify in a single run. Responses exceeding this are rejected.          |
| `max_changes`   | no       | `200`         | Maximum total lines changed across all files. Responses exceeding this are rejected.                        |
| `label`         | no       | `prompt2pr`   | Comma-separated labels to apply to the PR. `prompt2pr` is always included.                                  |
| `branch_prefix` | no       | `prompt2pr/`  | Prefix for the created branch name. Full name: `{prefix}{timestamp}`.                                       |
| `dry_run`       | no       | `false`       | When `true`, runs the full pipeline but skips branch creation and PR submission.                            |
| `base_url`      | no       | _(empty)_     | Override the LLM provider API base URL (useful for proxies or self-hosted endpoints).                       |

### Default Models

| Provider    | Default Model              |
| ----------- | -------------------------- |
| `mistral`   | `mistral-large-latest`     |
| `openai`    | `gpt-4o`                   |
| `anthropic` | `claude-sonnet-4-20250514` |
| `github`    | `openai/gpt-4o`            |

---

## Outputs

... (rest of file remains unchanged)