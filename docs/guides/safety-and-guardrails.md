---
title: 'Safety & Guardrails'
---

# Safety & Guardrails

Prompt2PR is designed with safety as a core principle. Every change goes through
a PR for human review, and multiple guardrails prevent uncontrolled
modifications.

---

## Guardrail Overview

| Guardrail                     | What It Does                                                                    | Default    |
| ----------------------------- | ------------------------------------------------------------------------------- | ---------- |
| **`max_files`**               | Limits the number of files the LLM can modify per run                           | `10`       |
| **`max_changes`**             | Limits the total lines changed across all files                                 | `200`      |
| **`paths` scoping**           | Only files matching the glob patterns can be read or modified                   | `**` (all) |
| **`.github/` protection**     | The `.github/` directory is **never** modified — absolute, cannot be overridden | Always on  |
| **Path traversal prevention** | The action rejects any file paths that attempt to escape the repository root    | Always on  |
| **Dry run mode**              | Run the full pipeline without creating branches or PRs                          | `false`    |
| **Human review gate**         | Changes always go through a PR — the action never merges anything               | Always on  |

---

## File Limits: `max_files`

Controls how many files the LLM is allowed to modify in a single run. If the
LLM's response contains more file changes than allowed, the **entire response is
rejected** — no partial application.

```yaml
with:
  max_files: 5 # Allow at most 5 file changes per run
```

**When to adjust:**

- Lower it (e.g., `3`) for focused, reviewable PRs
- Raise it (e.g., `20`) for broad sweeps like copyright updates

---

## Change Limits: `max_changes`

Controls the total number of lines changed across all files. This prevents the
LLM from rewriting large portions of your codebase.

```yaml
with:
  max_changes: 100 # Allow at most 100 total lines changed
```

**When to adjust:**

- Lower it for cosmetic fixes (typos, link updates)
- Raise it for test generation or documentation updates that may be verbose

---

## Path Scoping

The `paths` input serves as **both a read filter and a write filter**:

1. **Pre-LLM:** Only files matching the glob patterns are scanned and sent to
   the LLM as context
2. **Post-LLM:** Any changes to files outside the scoped paths are rejected

```yaml
with:
  paths: 'src/**,docs/**' # Only touch source and docs
```

### Common Path Patterns

| Pattern                    | What It Matches               |
| -------------------------- | ----------------------------- |
| `**`                       | All files (default)           |
| `src/**`                   | Everything in `src/`          |
| `**/*.md`                  | All markdown files            |
| `src/**,docs/**`           | Source and docs directories   |
| `src/**,!src/generated/**` | Source except generated files |

---

## `.github/` Protection

The `.github/` directory is **always excluded** from both scanning and
modifications. This is a hard-coded safety measure that cannot be overridden,
preventing the LLM from modifying:

- Workflow files (`.github/workflows/`)
- Issue templates
- Action configurations
- Any other GitHub-specific files

---

## Dry Run Mode

Test prompts without creating any PRs:

```yaml
with:
  dry_run: true
```

In dry-run mode, the action:

- Scans files and sends them to the LLM
- Parses and validates the response
- Logs what would be changed
- Sets outputs (`files_changed`, `lines_changed`)
- **Skips** branch creation and PR submission

Use this to verify your prompt produces sensible results before automating it.

---

## API Key Security

Prompt2PR handles API keys with care:

- Keys are passed via environment variables using GitHub Secrets
- All keys are masked via `core.setSecret()` — they never appear in logs
- Keys are only transmitted to the configured LLM provider API endpoint
- No keys appear in PR bodies, commit messages, or action outputs

---

## What If a Guardrail Is Violated?

When the LLM's response exceeds a guardrail limit, the action fails with a clear
error:

```text
Guardrail violation: Number of changed files (15) exceeds max_files (10).
```

**No changes are applied.** The entire response is rejected. You can then:

- Increase the limits if the changes were expected
- Narrow the `paths` scope to reduce the LLM's scope
- Refine your prompt to request smaller, more focused changes
