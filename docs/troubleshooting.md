---
layout: default
title: Troubleshooting
nav_order: 7
---

# Troubleshooting

Common issues and how to fix them.

---

## No PR Was Created

Check the workflow run logs in the **Actions** tab. Common causes:

### No Changes Detected

The LLM analyzed your files and found nothing to change. The log will show:

```text
Found 0 issues. No PR created.
```

The `skipped` output will be `"true"` and `files_changed` will be `0`.

**What to do:**

- Make your prompt more specific
- Broaden the `paths` scope to include more files
- Try a different model or provider

### Dry Run Enabled

If `dry_run: true`, the pipeline runs completely but skips PR creation by
design. Check `files_changed` and `lines_changed` outputs to see what would have
been modified.

---

## API Key Errors

```text
Missing API key: environment variable 'MISTRAL_API_KEY' is not set.
```

**Checklist:**

1. The secret exists in **Settings → Secrets and variables → Actions**
2. The secret name matches exactly what the provider expects:

   | Provider    | Secret Name                |
   | :---------- | :------------------------- |
   | `mistral`   | `MISTRAL_API_KEY`          |
   | `openai`    | `OPENAI_API_KEY`           |
   | `anthropic` | `ANTHROPIC_API_KEY`        |
   | `github`    | `GITHUB_TOKEN` (automatic) |

3. The secret is passed via the `env:` block in your workflow step:

   ```yaml
   env:
     MISTRAL_API_KEY: ${{ secrets.MISTRAL_API_KEY }}
     GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
   ```

4. For GitHub Models, ensure `models: read` is in your permissions

---

## Rate Limit Errors

If the LLM provider returns HTTP 429 (rate limited), Prompt2PR retries once
after a 5-second backoff. If it still fails, the run errors with rate limit
details.

**What to do:**

- Upgrade your API plan for higher rate limits
- Reduce the `paths` scope to send fewer files (smaller request)
- Run the action less frequently
- Switch to a different provider temporarily

---

## Context Too Large

When too many files match your `paths` globs, the total content may exceed the
LLM's context window.

**Symptoms:**

- Provider returns an error about token limits
- The action logs warnings about truncating file content

**What to do:**

- Narrow the `paths` input: `src/**/*.ts` instead of `**`
- The action automatically truncates content at ~200,000 characters and logs
  which files were excluded
- Reduce the number of matching files by using more specific globs

---

## Permission Errors

### Workflow Permissions

Prompt2PR needs these permissions in your workflow:

```yaml
permissions:
  contents: write # Create branches and push commits
  pull-requests: write # Create Pull Requests
```

For GitHub Models, also add:

```yaml
models: read # Access GitHub Models API
```

### Repository Setting

You must also enable PR creation at the repository level:

1. Go to **Settings → Actions → General**
2. Scroll to **Workflow permissions**
3. Check **"Allow GitHub Actions to create and approve pull requests"**

Without this, the action will fail with:

```text
GitHub Actions is not permitted to create or approve pull requests.
```

---

## Guardrail Violations

### Too Many Files

```text
Guardrail violation: Number of changed files (15) exceeds max_files (10).
```

The LLM tried to modify more files than allowed. Options:

- Increase `max_files` if the change is expected
- Narrow the `paths` scope so the LLM has fewer files to work with
- Make the prompt more targeted

### Too Many Changes

```text
Guardrail violation: Total lines changed (350) exceeds max_changes (200).
```

Same approach — increase `max_changes` or narrow the scope.

### Path Scope Violation

```text
Guardrail violation: File "config/secrets.json" is outside the allowed paths scope.
```

The LLM tried to modify a file that doesn't match your `paths` globs. This is a
safety feature. If you need the LLM to modify that file, expand your `paths`.

### .github/ Protection

```text
Guardrail violation: Modifications to .github/ are not allowed.
```

Prompt2PR blocks all modifications to the `.github/` directory to prevent
workflows from modifying themselves. This cannot be overridden.

---

## Parse Errors

```text
ParseError: LLM response is not valid JSON
```

The LLM returned a response that couldn't be parsed. This is usually a provider
issue. Try:

- Running the workflow again (transient LLM issue)
- Trying a different model
- Simplifying your prompt

---

## Git Errors

```text
GitError: Failed to push branch
```

Common causes:

- Branch protection rules blocking the push
- The repository's default branch has diverged
- Network issues

Check that GitHub Actions has permission to push branches.

---

Next: [Contributing]({% link contributing.md %})
