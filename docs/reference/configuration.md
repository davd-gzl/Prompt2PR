---
title: 'Configuration Reference'
---

# Configuration Reference

Complete reference for all Prompt2PR inputs and outputs.

---

## Inputs

All inputs are configured via the standard GitHub Actions `with:` syntax.

### Required Inputs

| Input          | Type     | Description                                                                                                                                                     |
| -------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`prompt`**   | `string` | The plain-English prompt describing what changes to make. This is sent to the LLM along with scoped file contents as context. Supports multi-line YAML strings. |
| **`provider`** | `string` | LLM provider to use. Must be one of: `mistral`, `openai`, `anthropic`, `github`.                                                                                |

### Optional Inputs

| Input           | Type      | Default              | Description                                                                                                                                      |
| --------------- | --------- | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `model`         | `string`  | _(provider default)_ | Model identifier to use. If omitted, the provider's default model is used. See [Default Models](#default-models) below.                          |
| `paths`         | `string`  | `**`                 | Comma-separated glob patterns for files to include as context and allow modifications. Only matching files are scanned and eligible for changes. |
| `max_files`     | `number`  | `10`                 | Maximum number of files the LLM may modify in a single run. If the LLM response exceeds this, the **entire response is rejected**.               |
| `max_changes`   | `number`  | `200`                | Maximum total lines changed across all files. If exceeded, the entire response is rejected.                                                      |
| `label`         | `string`  | `prompt2pr`          | Comma-separated labels to apply to the PR. The label `prompt2pr` is **always included** automatically.                                           |
| `branch_prefix` | `string`  | `prompt2pr/`         | Prefix for the created branch name. The full branch name is `{branch_prefix}{timestamp}`.                                                        |
| `dry_run`       | `boolean` | `false`              | When `true`, runs the full pipeline (scan, LLM call, parse, validate) but skips branch creation and PR submission. Useful for testing prompts.   |
| `base_url`      | `string`  | _(empty)_            | Override the LLM provider API base URL. Useful for proxies, self-hosted endpoints, or LiteLLM gateways.                                          |

### Default Models

Each provider has a sensible default model that is used when `model` is not
specified:

| Provider      | Config Value | Default Model              |
| ------------- | ------------ | -------------------------- |
| Mistral       | `mistral`    | `mistral-large-latest`     |
| OpenAI        | `openai`     | `gpt-4o`                   |
| Anthropic     | `anthropic`  | `claude-sonnet-4-20250514` |
| GitHub Models | `github`     | `openai/gpt-4o`            |

---

## Outputs

Prompt2PR sets the following outputs, which can be used in downstream workflow
steps.

| Output              | Type     | Description                                                                                                            |
| ------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------- |
| **`pr_url`**        | `string` | URL of the created Pull Request (e.g., `https://github.com/owner/repo/pull/42`). **Empty** if PR creation was skipped. |
| **`pr_number`**     | `string` | Number of the created Pull Request (e.g., `42`). **Empty** if skipped.                                                 |
| **`files_changed`** | `string` | Number of files changed by the action (e.g., `3`). Set even in dry-run mode.                                           |
| **`lines_changed`** | `string` | Total lines changed across all files (e.g., `47`). Set even in dry-run mode.                                           |
| **`skipped`**       | `string` | `"true"` if PR creation was skipped (no changes detected or dry-run mode). `"false"` otherwise.                        |

### Using Outputs in Downstream Steps

To access outputs, you must give the Prompt2PR step an `id`:

```yaml
steps:
  - uses: actions/checkout@v4

  - uses: davd-gzl/Prompt2PR@v1
    id: prompt2pr # <-- Give it an ID
    with:
      prompt: 'Fix all dead links in markdown files'
      provider: mistral
    env:
      MISTRAL_API_KEY: ${{ secrets.MISTRAL_API_KEY }}
      GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

  # Use outputs in subsequent steps
  - name: Report results
    if: steps.prompt2pr.outputs.skipped != 'true'
    run: |
      echo "PR created: ${{ steps.prompt2pr.outputs.pr_url }}"
      echo "PR number: ${{ steps.prompt2pr.outputs.pr_number }}"
      echo "Files changed: ${{ steps.prompt2pr.outputs.files_changed }}"
      echo "Lines changed: ${{ steps.prompt2pr.outputs.lines_changed }}"

  - name: Handle skip
    if: steps.prompt2pr.outputs.skipped == 'true'
    run: echo "No changes needed — PR was skipped"
```

### Output Decision Flow

```
LLM returns changes?
├── YES → Guardrails pass?
│         ├── YES → dry_run?
│         │         ├── YES → skipped=true, files_changed=N, lines_changed=N
│         │         └── NO  → Create PR → skipped=false, pr_url=..., pr_number=...
│         └── NO  → Action fails with guardrail violation error
└── NO  → skipped=true, files_changed=0, lines_changed=0
```

---

## Environment Variables

API keys are passed via environment variables using GitHub Secrets:

| Variable            | Required For          | Description                                                                                                                             |
| ------------------- | --------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `GITHUB_TOKEN`      | All providers         | GitHub API authentication for PR creation. Always required. Automatically provided by GitHub Actions via `${{ secrets.GITHUB_TOKEN }}`. |
| `MISTRAL_API_KEY`   | `provider: mistral`   | Mistral API authentication key.                                                                                                         |
| `OPENAI_API_KEY`    | `provider: openai`    | OpenAI API authentication key.                                                                                                          |
| `ANTHROPIC_API_KEY` | `provider: anthropic` | Anthropic API authentication key.                                                                                                       |

> **GitHub Models** (`provider: github`) uses the `GITHUB_TOKEN` for both PR
> creation and LLM API calls. No additional key needed.

---

## Permissions

Your workflow must declare the following permissions:

```yaml
permissions:
  contents: write # Required: create branches and push commits
  pull-requests: write # Required: create pull requests
  models: read # Only for provider: github (GitHub Models)
  issues: read # Only for issue_comment trigger
```

Additionally, you must enable PR creation at the repository level:

**Settings → Actions → General → Workflow permissions → "Allow GitHub Actions to
create and approve pull requests"**
