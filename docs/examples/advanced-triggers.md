---
title: 'Advanced Trigger Examples'
---

# Advanced Trigger Examples

Workflows demonstrating special trigger patterns, dry-run mode, and issue-based
triggers.

---

## Dry Run Audit

Runs Prompt2PR in dry-run mode to preview what the LLM would change without
creating a branch or PR. Uses GitHub Models — no external API key needed.

**File:**
[`examples/dry-run-audit.yml`](https://github.com/davd-gzl/Prompt2PR/blob/main/examples/dry-run-audit.yml)
**Provider:** GitHub Models | **Trigger:** Manual dispatch

```yaml
name: Dry Run Audit

on:
  workflow_dispatch:
    inputs:
      prompt:
        description: 'What should the AI analyze?'
        required: true

permissions:
  contents: read
  models: read

jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: davd-gzl/Prompt2PR@v1
        id: audit
        with:
          prompt: ${{ github.event.inputs.prompt }}
          provider: 'github'
          model: 'openai/gpt-4o'
          paths: 'src/**'
          dry_run: true
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

      - run: |
          echo "Files that would change: ${{ steps.audit.outputs.files_changed }}"
          echo "Lines that would change: ${{ steps.audit.outputs.lines_changed }}"
          echo "Skipped: ${{ steps.audit.outputs.skipped }}"
```

**Key points:**

- `dry_run: true` runs the full pipeline but skips branch/PR creation
- Only needs `contents: read` (not write) since nothing is modified
- Uses GitHub Models — zero setup, no API key needed
- Outputs still report what _would_ change, useful for auditing
- Perfect for testing prompts before scheduling them

**Use cases:**

- Auditing what a prompt would change before committing to it
- Testing prompt quality without creating noise PRs
- Security reviews — "what would the LLM touch?"

---

## On Issue Comment

Triggers Prompt2PR when someone comments `/prompt2pr <instruction>` on an issue.
The comment body becomes the prompt.

**File:**
[`examples/on-issue-comment.yml`](https://github.com/davd-gzl/Prompt2PR/blob/main/examples/on-issue-comment.yml)
**Provider:** GitHub Models | **Trigger:** Issue comment

```yaml
name: Prompt2PR on Comment

on:
  issue_comment:
    types: [created]

permissions:
  contents: write
  pull-requests: write
  issues: read
  models: read

jobs:
  prompt2pr:
    if: startsWith(github.event.comment.body, '/prompt2pr ')
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: davd-gzl/Prompt2PR@v1
        id: prompt2pr
        with:
          prompt: >-
            ${{ github.event.comment.body }}
          provider: 'github'
          model: 'openai/gpt-4o'
          paths: 'src/**'
          max_files: 5
          max_changes: 100
          label: 'prompt2pr,from-comment'
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

**Key points:**

- Triggers only on comments starting with `/prompt2pr ` (note the space)
- The `if:` condition ensures the action only runs for matching comments
- Requires `issues: read` permission in addition to standard permissions
- Uses GitHub Models for zero-setup convenience
- Lower limits (`max_files: 5`, `max_changes: 100`) for tighter control on
  user-triggered changes

**How to use:**

1. Open any issue in your repository
2. Comment:
   `/prompt2pr Fix the typo in the error message on line 42 of src/config.ts`
3. A PR is created with the fix

**Security considerations:**

- Only users with write access to the repo can trigger workflow runs via
  comments
- Consider adding additional `if:` conditions to restrict to specific users or
  teams
- The `max_files` and `max_changes` limits prevent runaway modifications

---

## Combining Triggers

You can combine multiple triggers in a single workflow:

```yaml
on:
  # Run weekly
  schedule:
    - cron: '0 9 * * 1'

  # Allow manual trigger with custom prompt
  workflow_dispatch:
    inputs:
      prompt:
        description: 'Custom prompt (optional)'
        required: false
        default: ''

  # Also run on push to main (for specific paths)
  push:
    branches: [main]
    paths: ['src/**']
```

This gives you the flexibility of automated scheduling, on-demand runs, and
event-driven execution all in one workflow.
