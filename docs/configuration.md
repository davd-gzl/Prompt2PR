---
layout: default
title: Configuration
nav_order: 3
---

# Configuration Reference

All inputs and outputs for the Prompt2PR action.

---

## Inputs

Inputs are configured via the `with:` block in your workflow step.

### `prompt` (required)

The instruction describing what changes to make. This is sent to the LLM along
with the contents of matching files.

```yaml
with:
  prompt: 'Add input validation to all public functions'
```

For scheduled workflows, you can provide a default prompt with an optional
manual override:

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

# In the step:
with:
  prompt: >-
    ${{ github.event.inputs.prompt || 'Default scheduled prompt here' }}
```

### `provider` (required)

The LLM provider to use. Supported values:

| Value       | Provider      | API Key Variable    |
| :---------- | :------------ | :------------------ |
| `mistral`   | Mistral AI    | `MISTRAL_API_KEY`   |
| `openai`    | OpenAI        | `OPENAI_API_KEY`    |
| `anthropic` | Anthropic     | `ANTHROPIC_API_KEY` |
| `github`    | GitHub Models | `GITHUB_TOKEN`      |

**Providers are interchangeable.** Choose based on your preference — the action
behaves the same regardless of provider.

### `model` (optional)

Override the provider's default model. If omitted, the default is used:

| Provider    | Default Model              |
| :---------- | :------------------------- |
| `mistral`   | `mistral-large-latest`     |
| `openai`    | `gpt-4o`                   |
| `anthropic` | `claude-sonnet-4-20250514` |
| `github`    | `openai/gpt-4o`            |

For GitHub Models, use the `publisher/model-name` format:

```yaml
with:
  provider: github
  model: openai/gpt-4o
```

### `paths` (optional)

**Default:** `**` (all files)

Comma-separated glob patterns for files to include as LLM context. Only matching
files are scanned, and only matching files can be modified.

```yaml
# Only TypeScript source files
paths: 'src/**/*.ts'

# Multiple patterns
paths: 'src/**,lib/**,*.md'

# Specific file types across the project
paths: '**/*.{ts,tsx,js,jsx}'
```

{: .note } The `.github/` directory is always excluded regardless of the `paths`
setting. Binary files are also automatically skipped.

### `max_files` (optional)

**Default:** `10`

Maximum number of files the LLM is allowed to modify in a single run. If the
LLM's response includes more file changes than this limit, the entire response
is rejected and the run fails.

### `max_changes` (optional)

**Default:** `200`

Maximum total lines changed across all files. Like `max_files`, exceeding this
limit rejects the entire response.

### `label` (optional)

**Default:** `prompt2pr`

Comma-separated labels to apply to the created PR. The `prompt2pr` label is
always included automatically even if you specify custom labels.

```yaml
label: 'prompt2pr,automated,cleanup'
```

### `branch_prefix` (optional)

**Default:** `prompt2pr/`

Prefix for the branch name. The full branch name is `{prefix}{timestamp}`.

```yaml
branch_prefix: 'ai-fix/'
# Creates branches like: ai-fix/1707900000
```

### `dry_run` (optional)

**Default:** `false`

When set to `true`, runs the full pipeline (scan, prompt, LLM call, parse,
guardrails) but skips branch creation and PR submission. Useful for:

- Testing prompts before enabling real changes
- Auditing what the LLM would modify
- CI checks that validate LLM behavior

The `files_changed` and `lines_changed` outputs are still set, so you can
inspect what would have happened.

### `base_url` (optional)

**Default:** _(empty — uses the provider's default endpoint)_

Override the LLM provider's API base URL. Useful for:

- API proxies
- Self-hosted LLM endpoints
- Testing with mock servers

---

## Outputs

Outputs are set after the action completes and can be referenced in downstream
steps.

| Output          | Description                                                                 |
| :-------------- | :-------------------------------------------------------------------------- |
| `pr_url`        | URL of the created Pull Request. Empty if skipped.                          |
| `pr_number`     | Number of the created Pull Request. Empty if skipped.                       |
| `files_changed` | Number of files modified. Set even in dry-run mode.                         |
| `lines_changed` | Total lines changed across all files. Set even in dry-run mode.             |
| `skipped`       | `"true"` if no PR was created (no changes or dry run). `"false"` otherwise. |

### Output Scenarios

| Scenario   | `pr_url`                         | `pr_number` | `files_changed` | `lines_changed` | `skipped` |
| :--------- | :------------------------------- | :---------- | :-------------- | :-------------- | :-------- |
| PR created | `https://github.com/.../pull/42` | `42`        | `3`             | `47`            | `false`   |
| Dry run    | _(empty)_                        | _(empty)_   | `3`             | `47`            | `true`    |
| No changes | _(empty)_                        | _(empty)_   | `0`             | `0`             | `true`    |

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

# Only runs if a PR was created
- if: steps.p2pr.outputs.skipped != 'true'
  run: |
    echo "PR: ${{ steps.p2pr.outputs.pr_url }}"
    echo "Changed ${{ steps.p2pr.outputs.files_changed }} files (${{ steps.p2pr.outputs.lines_changed }} lines)"

# Useful for dry-run reporting
- if: steps.p2pr.outputs.skipped == 'true'
  run: |
    echo "No PR created."
    echo "Would have changed ${{ steps.p2pr.outputs.files_changed }} files"
```

---

Next: [Providers]({% link providers.md %})
