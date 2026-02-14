---
title: 'Code Quality Examples'
---

# Code Quality & Maintenance Examples

Workflows for improving code hygiene, enforcing style guides, modernizing code,
and adding defensive patterns.

---

## Cleanup TODOs

Finds resolved or stale TODO/FIXME/HACK comments and cleans them up.

**File:**
[`examples/cleanup-todos.yml`](https://github.com/davd-gzl/Prompt2PR/blob/main/examples/cleanup-todos.yml)
**Provider:** Anthropic | **Trigger:** Weekly cron (Friday 10:00 UTC) + manual

```yaml
name: Cleanup TODOs

on:
  schedule:
    - cron: '0 10 * * 5'
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
  cleanup-todos:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: davd-gzl/Prompt2PR@v1
        with:
          prompt: >-
            ${{ github.event.inputs.prompt || 'Find all TODO, FIXME, HACK, and
            XXX comments in the source code. For each one, determine if it has
            already been resolved by the surrounding code. If the task described
            in the comment is already done, remove the comment. If the comment
            references a specific issue number, check if the surrounding code
            addresses it. Leave unresolved TODOs in place.' }}
          provider: 'anthropic'
          paths: 'src/**,lib/**'
          max_files: 10
          max_changes: 200
          label: 'prompt2pr,cleanup'
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
```

**Key points:**

- Smart cleanup — only removes TODOs that are already resolved, leaving active
  ones intact
- Runs on Fridays for a clean end-of-week codebase
- Labels with `cleanup` for easy PR filtering

---

## Enforce Style Guide

Checks source files against a project style guide and fixes violations. Uses
GitHub Models — no external API key needed.

**File:**
[`examples/enforce-style-guide.yml`](https://github.com/davd-gzl/Prompt2PR/blob/main/examples/enforce-style-guide.yml)
**Provider:** GitHub Models | **Trigger:** Push to main + manual

```yaml
name: Enforce Style Guide

on:
  push:
    branches: [main]
    paths: ['src/**']
  workflow_dispatch:
    inputs:
      prompt:
        description: 'Custom prompt (optional — overrides default)'
        required: false
        default: ''

permissions:
  contents: write
  pull-requests: write
  models: read

jobs:
  enforce-style:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: davd-gzl/Prompt2PR@v1
        with:
          prompt: >-
            ${{ github.event.inputs.prompt || 'Review all source files for style
            guide violations: ensure consistent naming conventions (camelCase
            for variables, PascalCase for classes/types), add missing JSDoc
            comments to exported functions, and replace magic numbers with named
            constants. Do not change any logic or behavior.' }}
          provider: 'github'
          model: 'openai/gpt-4o'
          paths: 'src/**'
          max_files: 10
          max_changes: 200
          label: 'prompt2pr,style'
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

**Key points:**

- Triggers on every push to `main` — catches style issues as they're introduced
- Uses GitHub Models (no API key setup needed)
- Only scoped to `src/` to avoid touching config or docs
- Explicitly instructs the LLM not to change logic

---

## Deprecation Cleanup

Finds deprecated API calls, outdated patterns, and legacy code, then replaces
them with modern alternatives.

**File:**
[`examples/deprecation-cleanup.yml`](https://github.com/davd-gzl/Prompt2PR/blob/main/examples/deprecation-cleanup.yml)
**Provider:** Anthropic | **Trigger:** Monthly cron (1st of month) + manual

```yaml
name: Deprecation Cleanup

on:
  schedule:
    - cron: '0 8 1 * *'
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
  deprecation-cleanup:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: davd-gzl/Prompt2PR@v1
        with:
          prompt: >-
            ${{ github.event.inputs.prompt || 'Find all deprecated API calls,
            outdated patterns, and legacy code in the source files. Replace
            deprecated Node.js APIs with their modern equivalents (e.g.,
            fs.promises instead of callback-based fs, URL constructor instead of
            url.parse). Update any TypeScript patterns that use deprecated
            syntax. Add comments explaining the migration where helpful.' }}
          provider: 'anthropic'
          paths: 'src/**'
          max_files: 10
          max_changes: 200
          label: 'prompt2pr,deprecation'
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
```

**Key points:**

- Monthly cadence is ideal — deprecation drift happens slowly
- The prompt asks for migration comments to help reviewers understand changes
- Good candidate for Anthropic's Claude, which excels at careful code
  transformations

---

## Add Error Handling

Scans source files for missing error handling and adds try/catch blocks, input
validation, and descriptive error messages.

**File:**
[`examples/add-error-handling.yml`](https://github.com/davd-gzl/Prompt2PR/blob/main/examples/add-error-handling.yml)
**Provider:** Mistral | **Trigger:** Manual dispatch

```yaml
name: Add Error Handling

on:
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
  error-handling:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: davd-gzl/Prompt2PR@v1
        with:
          prompt: >-
            ${{ github.event.inputs.prompt || 'Review all source files for
            missing error handling. Add try/catch blocks around async
            operations, validate function inputs, and replace generic throws
            with descriptive error messages that include context about what
            failed and why. Preserve existing behavior — only add defensive
            code.' }}
          provider: 'mistral'
          paths: 'src/**'
          max_files: 10
          max_changes: 200
          label: 'prompt2pr,error-handling'
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          MISTRAL_API_KEY: ${{ secrets.MISTRAL_API_KEY }}
```

**Key points:**

- Manual-only — error handling changes should be reviewed carefully
- Emphasizes preserving existing behavior while adding defensive code
- Good for codebases that grew quickly without consistent error handling

---

## Improve Logging

Replaces ad-hoc console.log with structured logging patterns.

**File:**
[`examples/improve-logging.yml`](https://github.com/davd-gzl/Prompt2PR/blob/main/examples/improve-logging.yml)
**Provider:** OpenAI | **Trigger:** Manual dispatch

```yaml
name: Improve Logging

on:
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
  improve-logging:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: davd-gzl/Prompt2PR@v1
        with:
          prompt: >-
            ${{ github.event.inputs.prompt || 'Review all source files and
            improve logging: replace console.log with a structured logger, add
            contextual information to log messages (function name, relevant IDs,
            timestamps), use appropriate log levels (debug, info, warn, error),
            and ensure errors are logged with stack traces. Do not change
            application logic.' }}
          provider: 'openai'
          paths: 'src/**'
          max_files: 10
          max_changes: 200
          label: 'prompt2pr,logging'
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
```

**Key points:**

- Manual-only — logging changes affect observability and should be reviewed
- Focuses on structure (log levels, context) not just reformatting
- Explicitly protects application logic
