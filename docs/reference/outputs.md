---
title: 'Outputs Reference'
---

# Outputs Reference

Prompt2PR provides 5 outputs that you can use in downstream workflow steps to
build conditional logic, notifications, and reporting.

---

## Output Summary

| Output          | Type     | When Set   | Example Value                           |
| --------------- | -------- | ---------- | --------------------------------------- |
| `pr_url`        | `string` | PR created | `https://github.com/owner/repo/pull/42` |
| `pr_number`     | `string` | PR created | `42`                                    |
| `files_changed` | `string` | Always     | `3`                                     |
| `lines_changed` | `string` | Always     | `47`                                    |
| `skipped`       | `string` | Always     | `true` or `false`                       |

---

## Detailed Output Descriptions

### `pr_url`

The full URL of the created Pull Request.

- **Set to** the PR URL when a PR is successfully created
- **Empty** when the PR was skipped (no changes or dry-run mode)
- **Example:** `https://github.com/davd-gzl/Prompt2PR/pull/42`

### `pr_number`

The number of the created Pull Request.

- **Set to** the PR number when a PR is successfully created
- **Empty** when the PR was skipped
- **Example:** `42`

### `files_changed`

The number of files that were changed (or would be changed in dry-run mode).

- **Always set**, even when the PR is skipped
- **Set to** `0` when the LLM found no changes to make
- **Example:** `3`

### `lines_changed`

The total number of lines changed across all files.

- **Always set**, even when the PR is skipped
- **Set to** `0` when the LLM found no changes to make
- **Example:** `47`

### `skipped`

Whether PR creation was skipped.

- **`"true"`** when:
  - The LLM found no changes to make (0 issues detected)
  - `dry_run: true` was set (pipeline runs but PR is skipped)
- **`"false"`** when a PR was successfully created

---

## Decision Flow

Understanding when each output is set:

```
Run starts
│
├─ LLM finds changes?
│  │
│  ├─ NO → skipped="true", files_changed="0", lines_changed="0"
│  │        pr_url="", pr_number=""
│  │
│  └─ YES → Guardrails pass?
│           │
│           ├─ NO → Action FAILS (error exit, no outputs set)
│           │
│           └─ YES → dry_run=true?
│                    │
│                    ├─ YES → skipped="true", files_changed="N", lines_changed="N"
│                    │        pr_url="", pr_number=""
│                    │
│                    └─ NO → PR created!
│                             skipped="false", files_changed="N", lines_changed="N"
│                             pr_url="https://...", pr_number="42"
```

---

## Usage Examples

### Basic: Log the PR URL

```yaml
- uses: davd-gzl/Prompt2PR@v1
  id: prompt2pr
  with:
    prompt: 'Fix dead links in markdown files'
    provider: mistral
  env:
    MISTRAL_API_KEY: ${{ secrets.MISTRAL_API_KEY }}
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

- run: echo "PR created at ${{ steps.prompt2pr.outputs.pr_url }}"
  if: steps.prompt2pr.outputs.skipped != 'true'
```

### Conditional: Different Actions Based on Result

```yaml
- uses: davd-gzl/Prompt2PR@v1
  id: prompt2pr
  with:
    prompt: 'Clean up resolved TODO comments'
    provider: anthropic
  env:
    ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

- name: Notify on PR created
  if: steps.prompt2pr.outputs.skipped != 'true'
  run: |
    echo "## Prompt2PR Results" >> $GITHUB_STEP_SUMMARY
    echo "- PR: ${{ steps.prompt2pr.outputs.pr_url }}" >> $GITHUB_STEP_SUMMARY
    echo "- Files changed: ${{ steps.prompt2pr.outputs.files_changed }}" >> $GITHUB_STEP_SUMMARY
    echo "- Lines changed: ${{ steps.prompt2pr.outputs.lines_changed }}" >> $GITHUB_STEP_SUMMARY

- name: Notify on skip
  if: steps.prompt2pr.outputs.skipped == 'true'
  run: echo "No changes needed — everything looks clean!"
```

### Dry Run: Preview Changes

```yaml
- uses: davd-gzl/Prompt2PR@v1
  id: audit
  with:
    prompt: 'Find deprecated API calls'
    provider: github
    model: openai/gpt-4o
    dry_run: true
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

- name: Report audit results
  run: |
    echo "Files that would change: ${{ steps.audit.outputs.files_changed }}"
    echo "Lines that would change: ${{ steps.audit.outputs.lines_changed }}"
    echo "Skipped (dry run): ${{ steps.audit.outputs.skipped }}"
```

### Slack Notification (Example)

```yaml
- name: Notify Slack
  if: steps.prompt2pr.outputs.skipped != 'true'
  uses: slackapi/slack-github-action@v1
  with:
    payload: |
      {
        "text": "Prompt2PR created a new PR: ${{ steps.prompt2pr.outputs.pr_url }} (${{ steps.prompt2pr.outputs.files_changed }} files, ${{ steps.prompt2pr.outputs.lines_changed }} lines)"
      }
  env:
    SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
```
