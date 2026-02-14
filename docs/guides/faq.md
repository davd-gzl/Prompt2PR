---
title: 'FAQ & Troubleshooting'
---

# FAQ & Troubleshooting

Common questions and solutions for Prompt2PR issues.

---

## Frequently Asked Questions

### How much does Prompt2PR cost?

Prompt2PR itself is **free and open source** (MIT license). You pay only for:

- **LLM API usage** — depends on your provider and plan (Mistral has a free
  tier)
- **GitHub Actions minutes** — free for public repos, included in GitHub plans
  for private repos

Using `provider: github` with GitHub Models requires only a GitHub Copilot
subscription and uses no external API.

### Does Prompt2PR automatically merge PRs?

**No.** Prompt2PR only creates PRs. Merging always requires human review. This
is a deliberate safety design — the action is a suggestion engine, not an
autonomous merge tool.

### Can Prompt2PR modify workflow files?

**No.** The `.github/` directory is always protected. This hard-coded guardrail
cannot be overridden. The LLM cannot modify any GitHub Actions workflows, issue
templates, or other GitHub-specific configuration.

### What happens if the LLM finds nothing to fix?

The action exits with **success** (green check) and logs a message like:

```text
Found 0 issues. No PR created.
```

The `skipped` output is set to `true`. No PR, no branch, no noise.

### Can I use Prompt2PR with private repositories?

Yes. Prompt2PR runs entirely within GitHub Actions on your own runner. File
contents are only sent to the LLM provider you configure. No data is sent to
Prompt2PR servers (there are none).

### How do I use different prompts for schedule vs. manual?

Use the fallback pattern:

```yaml
with:
  prompt: >-
    ${{ github.event.inputs.prompt || 'Your default scheduled prompt here.' }}
```

On manual dispatch, the user's input is used. On cron schedule, the default
kicks in.

---

## Troubleshooting

### No PR Was Created

Check the workflow run logs in the **Actions** tab. Common causes:

| Symptom                    | Cause                               | Solution                               |
| -------------------------- | ----------------------------------- | -------------------------------------- |
| "Found 0 issues" in logs   | LLM found nothing to change         | Expected behavior — nothing was broken |
| `skipped: true` in outputs | Dry run enabled                     | Remove `dry_run: true` to create PRs   |
| No workflow run at all     | Workflow file not in default branch | Push the workflow file to `main`       |

### API Key Errors

```text
Missing API key: environment variable 'MISTRAL_API_KEY' is not set.
```

**Fix:** Ensure you have:

1. Added the correct secret in **Settings → Secrets and variables → Actions**
2. Passed it via the `env:` block in your workflow:

```yaml
env:
  MISTRAL_API_KEY: ${{ secrets.MISTRAL_API_KEY }}
  GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

### Rate Limit Errors

If the LLM provider returns HTTP 429 (rate limited), Prompt2PR automatically
retries once after a 5-second backoff. If it still fails, the run errors with
details.

**Fix:**

- Upgrade your API plan for higher limits
- Reduce the `paths` scope to send fewer files
- Run the action less frequently

### Context Too Large

If you scope too many files, the total context may approach the LLM's token
limit.

**Fix:**

- Narrow the `paths` input (e.g., `src/**/*.ts` instead of `**`)
- The action automatically tracks file sizes and truncates content when limits
  are approached, logging a warning when this happens

### Permission Errors

Prompt2PR needs `contents: write` and `pull-requests: write` permissions.

```yaml
permissions:
  contents: write
  pull-requests: write
```

You must also enable PR creation at the repository level:

1. Go to **Settings → Actions → General → Workflow permissions**
2. Check **"Allow GitHub Actions to create and approve pull requests"**

Without this, the action fails with:

```text
GitHub Actions is not permitted to create or approve pull requests.
```

### Guardrail Violations

```text
Guardrail violation: Number of changed files (15) exceeds max_files (10).
```

The LLM tried to modify more files or lines than allowed. **Fix:**

- Increase `max_files` or `max_changes` if the change scope is expected
- Narrow the `paths` scope
- Refine your prompt to request smaller changes
