---
title: 'Security Examples'
---

# Security Examples

Workflows focused on security scanning and secret detection.

---

## Scan for Secrets

Scans source files for accidentally committed secrets, tokens, API keys, and
passwords.

**File:**
[`examples/scan-secrets.yml`](https://github.com/davd-gzl/Prompt2PR/blob/main/examples/scan-secrets.yml)
**Provider:** Mistral | **Trigger:** Daily cron (3:00 UTC) + manual

```yaml
name: Scan Secrets

on:
  schedule:
    - cron: '0 3 * * *'
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
  scan-secrets:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: davd-gzl/Prompt2PR@v1
        with:
          prompt: >-
            ${{ github.event.inputs.prompt || 'Scan all source files for
            accidentally committed secrets, API keys, tokens, passwords, or
            private keys. Look for patterns like hardcoded strings starting with
            "sk-", "ghp_", "AKIA", base64-encoded credentials, or connection
            strings with embedded passwords. For each finding, replace the value
            with an environment variable reference and add a comment explaining
            what secret was removed.' }}
          provider: 'mistral'
          paths: 'src/**,config/**,*.json,*.yml,*.yaml'
          max_files: 10
          max_changes: 100
          label: 'prompt2pr,security'
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          MISTRAL_API_KEY: ${{ secrets.MISTRAL_API_KEY }}
```

**Key points:**

- **Daily frequency** — secrets should be caught as fast as possible
- Scans a wide range of file types including JSON and YAML configs
- The prompt specifies common secret patterns (`sk-`, `ghp_`, `AKIA`)
- Replaces secrets with environment variable references instead of just deleting
  them
- Labels with `security` for priority filtering

**Customization tips:**

- Add your own secret patterns to the prompt (e.g., `"xoxb-"` for Slack tokens)
- Exclude test fixtures by adjusting `paths`:
  `src/**,config/**,!**/__fixtures__/**`
- Lower `max_changes` if you want smaller, more focused PRs
