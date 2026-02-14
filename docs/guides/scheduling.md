---
title: 'Scheduling & Triggers'
---

# Scheduling & Triggers

Prompt2PR works with any GitHub Actions trigger. This guide covers common
patterns.

---

## Cron Schedule

Run automatically on a recurring schedule:

```yaml
on:
  schedule:
    - cron: '0 9 * * 1' # Every Monday at 9:00 UTC
```

### Common Cron Patterns

| Schedule                     | Cron Expression | Use Case                                |
| ---------------------------- | --------------- | --------------------------------------- |
| Every Monday at 9:00 UTC     | `0 9 * * 1`     | Weekly link checks, TODO cleanup        |
| Daily at 3:00 UTC            | `0 3 * * *`     | Secret scanning, security audits        |
| Monthly (1st at 8:00 UTC)    | `0 8 1 * *`     | Deprecation cleanup, dependency reviews |
| Yearly (Jan 2nd at 6:00 UTC) | `0 6 2 1 *`     | Copyright year updates                  |
| Every Wednesday at 8:00 UTC  | `0 8 * * 3`     | README sync, docs refresh               |

> **Note:** GitHub Actions cron schedules may have up to a few minutes of delay.
> This is a GitHub platform behavior and is not controllable by the action.

---

## Manual Trigger

Run on demand from the Actions tab:

```yaml
on:
  workflow_dispatch:
    inputs:
      prompt:
        description: 'What should the AI fix?'
        required: true
```

This is perfect for:

- Testing prompts before scheduling them
- One-off maintenance tasks
- Translations and ad-hoc fixes

---

## Combined: Schedule + Manual

The most common pattern — a scheduled prompt with a manual override:

```yaml
on:
  schedule:
    - cron: '0 9 * * 1'
  workflow_dispatch:
    inputs:
      prompt:
        description: 'Custom prompt (optional — overrides default)'
        required: false
        default: ''

  # In the step:
  with:
    prompt: >-
      ${{ github.event.inputs.prompt || 'Scan all markdown files for broken
      links and fix or remove any dead links found.' }}
```

**How it works:**

- On schedule: uses the default prompt in the YAML
- On manual trigger: uses your custom prompt if provided, or falls back to the
  default

---

## Push to Branch

Trigger on pushes to specific branches:

```yaml
on:
  push:
    branches: [main]
    paths: ['src/**']
```

Good for:

- Style guide enforcement after merges
- Post-merge cleanup tasks

---

## Issue Comment

Trigger via a special comment on issues:

```yaml
on:
  issue_comment:
    types: [created]

jobs:
  prompt2pr:
    if: startsWith(github.event.comment.body, '/prompt2pr ')
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: davd-gzl/Prompt2PR@v1
        with:
          prompt: ${{ github.event.comment.body }}
          provider: github
          model: openai/gpt-4o
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

Anyone with write access can comment `/prompt2pr Fix the typo on line 42` on an
issue, and a PR will be created.

> **Permissions:** This trigger requires `issues: read` in addition to the
> standard permissions.

---

## Tips

- **Start with manual dispatch** to test your prompt before automating it
- **Use narrow paths** to reduce context and improve accuracy
- **Combine triggers** to get the best of both worlds (automated + on-demand)
- **Check the Actions tab** to see run history and logs
