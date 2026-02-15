# Prompt2PR

[![CI](https://github.com/davd-gzl/Prompt2PR/actions/workflows/ci.yml/badge.svg)](https://github.com/davd-gzl/Prompt2PR/actions/workflows/ci.yml)
[![Coverage](./badges/coverage.svg)](./badges/coverage.svg)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

> A GitHub Action that turns prompts into Pull Requests using LLMs. Point it at
> files, describe what to change, and get an automated PR — on push, on
> schedule, or on demand.

/!\ This is an early production, please report issues (code, bug,
vulnerabilities) when you spot one

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

The action sets several outputs you can use in downstream steps.

| Output          | Type     | Description                                                                                          |
| --------------- | -------- | ---------------------------------------------------------------------------------------------------- |
| `pr_url`        | `string` | URL of the created Pull Request. Empty when `dry_run: true` or no changes detected.                  |
| `pr_number`     | `string` | Number of the created Pull Request. Empty when `dry_run: true` or no changes detected.               |
| `files_changed` | `string` | Number of files the LLM modified. Set even in dry-run mode.                                          |
| `lines_changed` | `string` | Total lines changed across all modified files. Set even in dry-run mode.                             |
| `skipped`       | `string` | `"true"` if PR creation was skipped (no changes detected or `dry_run` enabled). `"false"` otherwise. |

### Using Outputs

```yaml
- uses: davd-gzl/Prompt2PR@v1
  id: p2pr
  with:
    prompt: 'Add missing JSDoc comments to all exported functions'
    provider: openai
  env:
    OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

# Only runs if a PR was actually created
- if: steps.p2pr.outputs.skipped != 'true'
  run: |
    echo "PR: ${{ steps.p2pr.outputs.pr_url }}"
    echo "Changed ${{ steps.p2pr.outputs.files_changed }} files (${{ steps.p2pr.outputs.lines_changed }} lines)"

# Useful for dry-run auditing
- if: steps.p2pr.outputs.skipped == 'true'
  run: |
    echo "No PR created."
    echo "Would have changed ${{ steps.p2pr.outputs.files_changed }} files (${{ steps.p2pr.outputs.lines_changed }} lines)"
```

---

## Scheduling & Triggers

Prompt2PR is a standard GitHub Action — it works with **any trigger** you'd use
in normal CI. The `prompt` can be hardcoded in the workflow file, typed in
manually, or pulled from event context (commit message, issue body, comment,
etc.).

### On Push

Run automatically when code is pushed, just like a linter or test suite:

```yaml
on:
  push:
    branches: [main]
    paths: ['src/**']

jobs:
  prompt2pr:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: davd-gzl/Prompt2PR@v1
        with:
          prompt:
            'Review recent changes for bugs, dead imports, and code smells. Fix
            any issues.'
          provider: mistral
          paths: 'src/**'
        env:
          MISTRAL_API_KEY: ${{ secrets.MISTRAL_API_KEY }}
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

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

### From Issues or Comments

Use event context as the prompt — for example, trigger from an issue body:

```yaml
on:
  issues:
    types: [opened, labeled]

jobs:
  prompt2pr:
    if: contains(github.event.issue.labels.*.name, 'prompt2pr')
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: davd-gzl/Prompt2PR@v1
        with:
          prompt: ${{ github.event.issue.body }}
          provider: mistral
        env:
          MISTRAL_API_KEY: ${{ secrets.MISTRAL_API_KEY }}
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

---

## Examples

Ready-to-use workflow files organized by use case in the
[`examples/`](examples/) directory. Copy any file to `.github/workflows/` in
your repository. See each category's readme for detailed descriptions.

> **Providers are interchangeable.** Each example uses a specific provider, but
> you can swap `provider:` and the corresponding API key to use any supported
> provider.

> **Single-shot design.** Prompt2PR makes one LLM call per run — it cannot
> browse the internet, run tests, or iterate on its output. The examples below
> are designed with this in mind.

### Code Quality

Improve code structure, safety, and standards compliance.

| Workflow                                                                 | Description                                      | Trigger      |
| ------------------------------------------------------------------------ | ------------------------------------------------ | ------------ |
| [enforce-style-guide.yml](examples/code-quality/enforce-style-guide.yml) | Fix naming conventions and replace magic numbers | Push to main |
| [add-error-handling.yml](examples/code-quality/add-error-handling.yml)   | Add try/catch blocks and input validation        | Manual       |
| [add-jsdoc.yml](examples/code-quality/add-jsdoc.yml)                     | Add missing JSDoc comments to exported functions | Manual       |
| [generate-tests.yml](examples/code-quality/generate-tests.yml)           | Generate unit tests for untested functions       | Weekly cron  |

### Documentation

Keep your docs accurate and up to date.

| Workflow                                                            | Description                                   | Trigger     |
| ------------------------------------------------------------------- | --------------------------------------------- | ----------- |
| [sync-readme.yml](examples/documentation/sync-readme.yml)           | Keep readme in sync with actual source code   | Weekly cron |
| [translate-docs.yml](examples/documentation/translate-docs.yml)     | Translate Markdown docs into another language | Manual      |
| [update-copyright.yml](examples/documentation/update-copyright.yml) | Update copyright year across all files        | Yearly cron |

### Maintenance

Handle routine cleanup and housekeeping.

| Workflow                                                        | Description                                               | Trigger     |
| --------------------------------------------------------------- | --------------------------------------------------------- | ----------- |
| [cleanup-todos.yml](examples/maintenance/cleanup-todos.yml)     | Remove resolved TODO/FIXME/HACK comments                  | Weekly cron |
| [improve-logging.yml](examples/maintenance/improve-logging.yml) | Replace console.log with structured logging               | Manual      |
| [fix-dead-links.yml](examples/maintenance/fix-dead-links.yml)   | Find likely-broken links in Markdown via pattern analysis | Weekly cron |

### Automation

Event-driven workflows and change previews.

| Workflow                                                               | Description                                             | Trigger       |
| ---------------------------------------------------------------------- | ------------------------------------------------------- | ------------- |
| [on-issue-comment.yml](examples/automation/on-issue-comment.yml)       | Trigger via `/prompt2pr` comment on issues              | Issue comment |
| [dry-run-audit.yml](examples/automation/dry-run-audit.yml)             | Preview changes without creating a PR (`dry_run: true`) | Manual        |
| [accessibility-audit.yml](examples/automation/accessibility-audit.yml) | Audit frontend files for a11y issues                    | Weekly cron   |

---

## Provider Setup

Prompt2PR supports four LLM providers. **Providers are interchangeable** — pick
whichever you prefer and swap the `provider:` input and API key.

### Mistral

1. Sign up at [console.mistral.ai](https://console.mistral.ai/).
2. Navigate to **API Keys** and create a new key.
3. In your GitHub repository, go to _Settings → Secrets and variables → Actions_
   and add `MISTRAL_API_KEY` with your key-value.
4. Set `provider: mistral` in your workflow.

### OpenAI

1. Sign up at [platform.openai.com](https://platform.openai.com/).
2. Navigate to **API Keys** and create a new secret key.
3. In your GitHub repository, add `OPENAI_API_KEY` as a GitHub Secret.
4. Set `provider: openai` in your workflow.

### Anthropic

1. Sign up at [console.anthropic.com](https://console.anthropic.com/).
2. Navigate to **API Keys** and create a new key.
3. In your GitHub repository, add `ANTHROPIC_API_KEY` as a GitHub Secret.
4. Set `provider: anthropic` in your workflow.

### GitHub Models

Use LLMs directly through GitHub's built-in Models API — no external API key
needed. This works with any GitHub Copilot subscription.

1. Ensure your GitHub account has access to
   [GitHub Models](https://github.com/marketplace/models).
2. No additional secrets required — the built-in `GITHUB_TOKEN` is used for
   authentication.
3. Add `models: read` to your workflow permissions.
4. Set `provider: github` and use models in `publisher/model-name` format (e.g.,
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

## FAQ / Troubleshooting

### No PR was created

Check the workflow run logs in the _Actions_ tab. Common causes:

- **No changes detected** — The LLM found nothing to change. The log will say
  `"Found 0 issues. No PR created."`. The `skipped` output will be `"true"`.
- **Dry run enabled** — If `dry_run: true`, the pipeline runs but skips PR
  creation. Check `files_changed` and `lines_changed` outputs to see what would
  have been modified.

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

Each provider expects a specific environment variable:

| Provider    | Environment Variable      |
| ----------- | ------------------------- |
| `mistral`   | `MISTRAL_API_KEY`         |
| `openai`    | `OPENAI_API_KEY`          |
| `anthropic` | `ANTHROPIC_API_KEY`       |
| `github`    | `GITHUB_TOKEN` (built-in) |

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
or `max_changes` if the change is expected, or narrow the `paths` scope to give
the LLM less to work with.

### Path scope violations

If the LLM tries to modify files outside your `paths` globs, the guardrail will
reject the change:

```text
Guardrail violation: File "config/secrets.json" is outside the allowed paths scope.
```

This is a safety feature. If you need the LLM to modify those files, expand your
`paths` input.

---

## Roadmap

See the full [Roadmap](https://davd-gzl.github.io/Prompt2PR/roadmap/) for what's
coming next, including:

- **PR deduplication** and **auto-assign reviewers**
- **LiteLLM proxy mode** for any provider
- **Agentic mode** — multi-step LLM loops with tool use (read files, run tests,
  explore codebase)
- **Structured prompts DSL** — `task`, `scope`, `rules` for precision
- **Community prompt templates** and a **prompt marketplace**
- **Cross-repo dashboard** and **self-improving prompts**

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
2. Run `npm run local-action` to simulate a GitHub Actions run locally.

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
