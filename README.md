# Prompt2PR

[![CI](https://github.com/davd-gzl/Prompt2PR/actions/workflows/ci.yml/badge.svg)](https://github.com/davd-gzl/Prompt2PR/actions/workflows/ci.yml)
[![Coverage](./badges/coverage.svg)](./badges/coverage.svg)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

> A GitHub Action that turns plain-English prompts into Pull Requests using
> LLMs. Point it at files, describe what to fix, and get an automated PR.

---

## Quick Start

Get a working Prompt2PR workflow in under 5 minutes:

1. **Get an API key** from your LLM provider (see
   [Provider Setup](#provider-setup) below).
1. **Add the key as a GitHub Secret** in your repository under _Settings →
   Secrets and variables → Actions_ (e.g., `MISTRAL_API_KEY`).
1. **Create a workflow file** at `.github/workflows/prompt2pr.yml`:

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

1. **Trigger the workflow** from the _Actions_ tab → _Prompt2PR_ → _Run
   workflow_, enter your prompt, and watch the PR appear.

---

## Inputs

All inputs are configured via the standard GitHub Actions `with:` syntax.

| Input           | Required | Default       | Description                                                                                            |
| --------------- | -------- | ------------- | ------------------------------------------------------------------------------------------------------ |
| `prompt`        | **yes**  | —             | Plain-English prompt describing what changes to make. Sent to the LLM along with scoped file contents. |
| `provider`      | **yes**  | —             | LLM provider to use: `mistral`, `openai`, `anthropic`, or `github`.                                    |
| `model`         | no       | _(see below)_ | Model identifier. If omitted, the provider's default model is used.                                    |
| `paths`         | no       | `**`          | Comma-separated glob patterns for files to include as context and allow modifications.                 |
| `max_files`     | no       | `10`          | Maximum number of files the LLM may modify in a single run.                                            |
| `max_changes`   | no       | `200`         | Maximum total lines changed across all files in a single run.                                          |
| `label`         | no       | `prompt2pr`   | Comma-separated labels to apply to the PR. `prompt2pr` is always included.                             |
| `branch_prefix` | no       | `prompt2pr/`  | Prefix for the created branch name.                                                                    |
| `dry_run`       | no       | `false`       | When `true`, runs the full pipeline but skips branch creation and PR submission.                       |
| `base_url`      | no       | _(empty)_     | Override the LLM provider API base URL (useful for proxies or self-hosted endpoints).                  |

### Default Models

| Provider    | Default Model              |
| ----------- | -------------------------- |
| `mistral`   | `mistral-large-latest`     |
| `openai`    | `gpt-4o`                   |
| `anthropic` | `claude-sonnet-4-20250514` |
| `github`    | `openai/gpt-4o`            |

---

## Outputs

| Output          | Description                                                         |
| --------------- | ------------------------------------------------------------------- |
| `pr_url`        | URL of the created Pull Request. Empty if skipped.                  |
| `pr_number`     | Number of the created Pull Request. Empty if skipped.               |
| `files_changed` | Number of files changed by the action.                              |
| `lines_changed` | Total lines changed across all files.                               |
| `skipped`       | `true` if PR creation was skipped (no changes detected or dry run). |

Use outputs in downstream steps:

```yaml
- uses: davd-gzl/Prompt2PR@v1
  id: prompt2pr
  with:
    prompt: 'Fix all dead links in markdown files'
    provider: mistral
  env:
    MISTRAL_API_KEY: ${{ secrets.MISTRAL_API_KEY }}
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

- run: echo "PR created at ${{ steps.prompt2pr.outputs.pr_url }}"
  if: steps.prompt2pr.outputs.skipped != 'true'
```

---

## Provider Setup

### Mistral

1. Sign up at [console.mistral.ai](https://console.mistral.ai/).
1. Navigate to **API Keys** and create a new key.
1. In your GitHub repository, go to _Settings → Secrets and variables → Actions_
   and add `MISTRAL_API_KEY` with your key-value.
1. Set `provider: mistral` in your workflow.

### OpenAI

1. Sign up at [platform.openai.com](https://platform.openai.com/).
1. Navigate to **API Keys** and create a new secret key.
1. In your GitHub repository, add `OPENAI_API_KEY` as a GitHub Secret.
1. Set `provider: openai` in your workflow.

### Anthropic

1. Sign up at [console.anthropic.com](https://console.anthropic.com/).
1. Navigate to **API Keys** and create a new key.
1. In your GitHub repository, add `ANTHROPIC_API_KEY` as a GitHub Secret.
1. Set `provider: anthropic` in your workflow.

### GitHub Models

Use LLMs directly through GitHub's built-in Models API — no external API key
needed. This works with any GitHub Copilot subscription.

1. Ensure your GitHub account has access to
   [GitHub Models](https://github.com/marketplace/models).
1. No additional secrets required — the built-in `GITHUB_TOKEN` is used for
   authentication.
1. Add `models: read` to your workflow permissions.
1. Set `provider: github` and use models in `publisher/model-name` format (e.g.,
   `openai/gpt-4o`, `anthropic/claude-sonnet-4.5`).

```yaml
permissions:
  contents: write
  pull-requests: write
  models: read

jobs:
  prompt2pr:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: davd-gzl/Prompt2PR@v1
        with:
          prompt: 'Fix typos in README.md'
          provider: github
          model: openai/gpt-4o
          paths: 'README.md'
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

---

## Scheduling

Prompt2PR works with any GitHub Actions trigger. Common patterns:

### Cron Schedule

Run automatically on a recurring schedule:

```yaml
on:
  schedule:
    # Every Monday at 9:00 UTC
    - cron: '0 9 * * 1'
```

### Manual Trigger

Run on demand from the Actions tab:

```yaml
on:
  workflow_dispatch:
    inputs:
      prompt:
        description: 'What should the AI fix?'
        required: true
```

### Both

Combine a schedule with a manual override:

```yaml
on:
  schedule:
    - cron: '0 9 * * 1'
  workflow_dispatch:
    inputs:
      prompt:
        description: 'Custom prompt (optional)'
        required: false
        default: ''
```

---

## Examples

Ready-to-use workflow files are in the [`examples/`](examples/) directory. Copy
any file to `.github/workflows/` in your repository:

| Example                                                       | Description                                       | Provider  | Trigger       |
| ------------------------------------------------------------- | ------------------------------------------------- | --------- | ------------- |
| [`fix-dead-links.yml`](examples/fix-dead-links.yml)           | Scan Markdown for broken links and fix them       | Mistral   | Weekly cron   |
| [`update-copyright.yml`](examples/update-copyright.yml)       | Update copyright year in source and license files | Anthropic | Yearly cron   |
| [`sync-readme.yml`](examples/sync-readme.yml)                 | Keep README in sync with actual source code       | OpenAI    | Weekly cron   |
| [`scan-secrets.yml`](examples/scan-secrets.yml)               | Detect accidentally committed secrets or tokens   | Mistral   | Daily cron    |
| [`cleanup-todos.yml`](examples/cleanup-todos.yml)             | Clean up resolved TODO/FIXME/HACK comments        | Anthropic | Weekly cron   |
| [`enforce-style-guide.yml`](examples/enforce-style-guide.yml) | Check and fix code style guide violations         | GitHub    | Push to main  |
| [`generate-tests.yml`](examples/generate-tests.yml)           | Generate unit tests for untested functions        | OpenAI    | Weekly cron   |
| [`translate-docs.yml`](examples/translate-docs.yml)           | Translate documentation into another language     | Anthropic | Manual        |
| [`add-error-handling.yml`](examples/add-error-handling.yml)   | Add missing try/catch and input validation        | Mistral   | Manual        |
| [`dry-run-audit.yml`](examples/dry-run-audit.yml)             | Preview changes without creating a PR (`dry_run`) | GitHub    | Manual        |
| [`improve-logging.yml`](examples/improve-logging.yml)         | Replace console.log with structured logging       | OpenAI    | Manual        |
| [`deprecation-cleanup.yml`](examples/deprecation-cleanup.yml) | Replace deprecated APIs with modern alternatives  | Anthropic | Monthly cron  |
| [`on-issue-comment.yml`](examples/on-issue-comment.yml)       | Trigger via `/prompt2pr` comment on issues        | GitHub    | Issue comment |

---

## FAQ / Troubleshooting

### No PR was created

Check the workflow run logs in the _Actions_ tab. Common causes:

- **No changes detected** — The LLM found nothing to change. The log will say
  `"Found 0 issues. No PR created."`.
- **Dry run enabled** — If `dry_run: true`, the pipeline runs but skips PR
  creation.

### API key errors

```text
Missing API key: environment variable 'MISTRAL_API_KEY' is not set.
```

Make sure you have added the correct secret in _Settings → Secrets and variables
→ Actions_ and passed it via the `env:` block in your workflow:

```yaml
env:
  MISTRAL_API_KEY: ${{ secrets.MISTRAL_API_KEY }}
  GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

### Rate limit errors

If the LLM provider returns HTTP 429 (rate limited), Prompt2PR automatically
retries once after a 5-second backoff. If it still fails, the run will error
with details about the rate limit. Consider:

- Upgrading your API plan for higher limits.
- Reducing the `paths` scope to send fewer files.
- Running the action less frequently.

### Context too large

If you scope too many files, the total context may exceed the LLM's token limit.
To fix this:

- Narrow the `paths` input (e.g., `src/**/*.ts` instead of `**`).
- The action automatically tracks file sizes and truncates content when limits
  are approached, logging a warning when this happens.

### Permission errors

Prompt2PR needs `contents: write` and `pull-requests: write` permissions. Add
these to your workflow:

```yaml
permissions:
  contents: write
  pull-requests: write
```

You must also enable PR creation at the repository level: go to _Settings →
Actions → General → Workflow permissions_ and check **"Allow GitHub Actions to
create and approve pull requests"**. Without this, the action will fail with:

```text
GitHub Actions is not permitted to create or approve pull requests.
```

### Guardrail violations

```text
Guardrail violation: Number of changed files (15) exceeds max_files (10).
```

The LLM tried to modify more files or lines than allowed. Increase `max_files`
or `max_changes` if the change is expected, or narrow the `paths` scope.

---

## Contributing

### Prerequisites

- Node.js 20 (see `.node-version`)
- npm

### Development Setup

```bash
# Install dependencies
npm install

# Run the full pipeline: format, lint, test, coverage badge, bundle
npm run all
```

### Available Scripts

| Script                 | Description                               |
| ---------------------- | ----------------------------------------- |
| `npm run all`          | Format + lint + test + coverage + bundle  |
| `npm test`             | Run Jest tests with ESM support           |
| `npm run lint`         | Run ESLint                                |
| `npm run bundle`       | Format + Rollup bundle to `dist/index.js` |
| `npm run local-action` | Test locally with `@github/local-action`  |

### Local Testing

1. Copy `.env.example` to `.env` and fill in your API keys.
1. Run `npm run local-action` to simulate a GitHub Actions run locally.

### Release Process

Use the release script to tag and publish a new version:

```bash
script/release
```

This handles SemVer tagging (`v1.x.x`) and floats the major tag (`v1`) for users
referencing `@v1`.

---

## License

[MIT](LICENSE)
