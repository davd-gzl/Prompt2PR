---
layout: single
title: Examples
permalink: /examples/
---

# Examples

Ready-to-use workflow files organized by use case. Copy any file to
`.github/workflows/` in your repository and adjust the configuration.

All example files are in the
[`examples/`](https://github.com/davd-gzl/Prompt2PR/tree/main/examples)
directory.

**Note:** Each example uses a specific provider, but **providers are
interchangeable**. Swap `provider:` and the corresponding API key to use any
supported provider. {: .notice--info }

**Note:** **Single-shot design.** Prompt2PR makes one LLM call per run — it
cannot browse the internet, run tests, or iterate on its output. The examples
below are designed with this in mind. {: .notice--info }

---

## Code Quality

Workflows that improve code structure, safety, and standards compliance.

### Enforce Style Guide

**File:**
[`examples/code-quality/enforce-style-guide.yml`](https://github.com/davd-gzl/Prompt2PR/blob/main/examples/code-quality/enforce-style-guide.yml)

Checks source files against a style guide and fixes violations: consistent
naming conventions (camelCase for variables, PascalCase for classes/types) and
magic numbers replaced with named constants.

**Trigger:** Push to main + manual dispatch

### Add Error Handling

**File:**
[`examples/code-quality/add-error-handling.yml`](https://github.com/davd-gzl/Prompt2PR/blob/main/examples/code-quality/add-error-handling.yml)

Adds defensive code: try/catch blocks around async operations, input validation,
and descriptive error messages with context about what failed and why. Preserves
existing behavior. Note: the LLM cannot run the code, so review the changes to
ensure error handling matches your project's conventions.

**Trigger:** Manual dispatch

### Add JSDoc

**File:**
[`examples/code-quality/add-jsdoc.yml`](https://github.com/davd-gzl/Prompt2PR/blob/main/examples/code-quality/add-jsdoc.yml)

Adds missing JSDoc documentation to exported functions, classes, and type
aliases. The LLM reads the implementation and infers intent, parameters, return
types, and edge cases from the code itself. One of the best single-shot LLM
tasks — no external tools needed.

**Trigger:** Manual dispatch

### Generate Tests

**File:**
[`examples/code-quality/generate-tests.yml`](https://github.com/davd-gzl/Prompt2PR/blob/main/examples/code-quality/generate-tests.yml)

Analyzes source files alongside their test files to find untested exports.
Generates new test cases following existing patterns in the project. Only
creates tests — does not modify source files. Note: the LLM cannot execute
tests, so generated tests should be reviewed and run before merging.

**Trigger:** Weekly cron + manual dispatch

---

## Documentation

Workflows that keep your docs accurate and up to date.

### Sync readme

**File:**
[`examples/documentation/sync-readme.yml`](https://github.com/davd-gzl/Prompt2PR/blob/main/examples/documentation/sync-readme.yml)

Compares the readme with actual source code to find outdated code examples, API
references, or configuration options. Updates the readme to match the current
implementation without touching source files.

**Trigger:** Weekly cron + manual dispatch

### Translate Documentation

**File:**
[`examples/documentation/translate-docs.yml`](https://github.com/davd-gzl/Prompt2PR/blob/main/examples/documentation/translate-docs.yml)

Translates Markdown documentation into another language while preserving
formatting, code blocks, links, and front matter. Creates translated files with
a language suffix (e.g., `README.fr.md`).

**Trigger:** Manual dispatch — specify the target language in the prompt

### Update Copyright

**File:**
[`examples/documentation/update-copyright.yml`](https://github.com/davd-gzl/Prompt2PR/blob/main/examples/documentation/update-copyright.yml)

Updates copyright year references in source files and license files to the
current year, using range format where appropriate.

**Trigger:** Yearly cron (January 2nd) + manual dispatch

---

## Maintenance

Workflows that handle routine cleanup and housekeeping.

### Cleanup TODOs

**File:**
[`examples/maintenance/cleanup-todos.yml`](https://github.com/davd-gzl/Prompt2PR/blob/main/examples/maintenance/cleanup-todos.yml)

Finds TODO, FIXME, HACK, and XXX comments in source code. Determines whether
each one has been resolved by the surrounding code. Removes resolved comments
and leaves unresolved ones in place. Note: the LLM cannot check your issue
tracker — if a TODO references an issue number, it judges from surrounding code
only.

**Trigger:** Weekly cron (Friday) + manual dispatch

### Improve Logging

**File:**
[`examples/maintenance/improve-logging.yml`](https://github.com/davd-gzl/Prompt2PR/blob/main/examples/maintenance/improve-logging.yml)

Replaces `console.log` with structured logging: appropriate log levels, context
information, and stack traces on errors. Does not change application logic.

**Trigger:** Manual dispatch

### Fix Dead Links

**File:**
[`examples/maintenance/fix-dead-links.yml`](https://github.com/davd-gzl/Prompt2PR/blob/main/examples/maintenance/fix-dead-links.yml)

Scans Markdown files for likely-broken links using pattern analysis: malformed
URLs, known-dead domains, mismatched relative paths, and outdated references.
The LLM cannot make HTTP requests to verify links, but it can catch many common
issues from the URL patterns alone.

**Trigger:** Weekly cron (Monday) + manual dispatch

---

## Automation

Event-driven workflows and change previews.

### On Issue Comment

**File:**
[`examples/automation/on-issue-comment.yml`](https://github.com/davd-gzl/Prompt2PR/blob/main/examples/automation/on-issue-comment.yml)

Triggers Prompt2PR when someone comments `/prompt2pr <instruction>` on an issue.
The comment body becomes the prompt. Uses GitHub Models, so no external API key
is needed.

**Trigger:** Issue comment starting with `/prompt2pr`

**How it works:**

```yaml
on:
  issue_comment:
    types: [created]

jobs:
  prompt2pr:
    if: startsWith(github.event.comment.body, '/prompt2pr ')
    # ...
```

### Dry Run Audit

**File:**
[`examples/automation/dry-run-audit.yml`](https://github.com/davd-gzl/Prompt2PR/blob/main/examples/automation/dry-run-audit.yml)

Runs the full pipeline without creating a branch or PR. Outputs what would have
changed so you can audit LLM behavior before enabling real changes.

**Trigger:** Manual dispatch **Special:** Uses `dry_run: true`

### Accessibility Audit

**File:**
[`examples/automation/accessibility-audit.yml`](https://github.com/davd-gzl/Prompt2PR/blob/main/examples/automation/accessibility-audit.yml)

Scans HTML, JSX, and TSX files for accessibility issues: missing alt text,
missing ARIA labels, non-semantic HTML, unlabeled form inputs, and missing role
attributes. LLMs are well-suited for this because they understand the semantic
meaning of UI elements and can suggest context-appropriate fixes.

**Trigger:** Weekly cron (Tuesday) + manual dispatch

---

## Writing Your Own

Every Prompt2PR workflow follows the same pattern:

```yaml
name: Your Workflow Name
on:
  # Your trigger here

permissions:
  contents: write
  pull-requests: write

jobs:
  your-job:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: davd-gzl/Prompt2PR@v1
        with:
          prompt: 'Your prompt here'
          provider: your-provider
          paths: 'src/**' # Scope the files
          max_files: 10 # Safety limit
          max_changes: 200 # Safety limit
        env:
          YOUR_API_KEY: ${{ secrets.YOUR_API_KEY }}
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

Tips for writing effective prompts:

- **Be specific** — "Add error handling to async functions in the API layer" is
  better than "Improve the code"
- **Set boundaries** — "Do not change any logic" prevents unintended
  modifications
- **Scope files** — Use `paths` to limit what the LLM sees and can modify
- **Use dry run first** — Test prompts with `dry_run: true` before enabling real
  changes

---

Next: [Architecture](/architecture/)
