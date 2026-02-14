---
title: 'Documentation Examples'
---

# Documentation & Content Examples

Workflows for maintaining documentation, README files, links, and content
quality.

---

## Fix Dead Links

Scans markdown files for broken links and automatically fixes or removes them.
Runs weekly.

**File:**
[`examples/fix-dead-links.yml`](https://github.com/davd-gzl/Prompt2PR/blob/main/examples/fix-dead-links.yml)
**Provider:** Mistral | **Trigger:** Weekly cron (Monday 9:00 UTC) + manual

```yaml
name: Fix Dead Links

on:
  schedule:
    - cron: '0 9 * * 1'
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
  fix-links:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: davd-gzl/Prompt2PR@v1
        with:
          prompt: >-
            ${{ github.event.inputs.prompt || 'Scan all markdown files for
            broken or dead links (HTTP 404, 410, or unreachable URLs). For each
            broken link, either update it to the correct URL or remove it with a
            note. Do not change any other content.' }}
          provider: 'mistral'
          paths: '**/*.md'
          max_files: 10
          max_changes: 200
          label: 'prompt2pr,dead-links'
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          MISTRAL_API_KEY: ${{ secrets.MISTRAL_API_KEY }}
```

**Key points:**

- Scopes to markdown files only (`**/*.md`)
- Uses the fallback pattern so scheduled runs use the default prompt while
  manual runs accept custom input
- Labels PRs with `dead-links` for easy filtering

---

## Sync README

Keeps the README in sync with the actual codebase by detecting mismatches
between documented examples and real code.

**File:**
[`examples/sync-readme.yml`](https://github.com/davd-gzl/Prompt2PR/blob/main/examples/sync-readme.yml)
**Provider:** OpenAI | **Trigger:** Weekly cron (Wednesday 8:00 UTC) + manual

```yaml
name: Sync README

on:
  schedule:
    - cron: '0 8 * * 3'
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
  sync-readme:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: davd-gzl/Prompt2PR@v1
        with:
          prompt: >-
            ${{ github.event.inputs.prompt || 'Compare the README.md with the
            actual source code. Find any code examples, API references, or
            configuration options in the README that are outdated or do not
            match the current implementation. Update the README to accurately
            reflect the code. Do not change source files — only update
            README.md.' }}
          provider: 'openai'
          paths: 'src/**,README.md'
          max_files: 1
          max_changes: 200
          label: 'prompt2pr,documentation'
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
```

**Key points:**

- `max_files: 1` — only the README should be modified
- Includes `src/**` in paths so the LLM can read source code for context, but
  the prompt instructs it to only modify the README

---

## Translate Documentation

Translates markdown documentation into another language on demand.

**File:**
[`examples/translate-docs.yml`](https://github.com/davd-gzl/Prompt2PR/blob/main/examples/translate-docs.yml)
**Provider:** Anthropic | **Trigger:** Manual dispatch

```yaml
name: Translate Documentation

on:
  workflow_dispatch:
    inputs:
      prompt:
        description: 'What language to translate to?'
        required: true
        default: 'Translate all markdown documentation files into French.'

permissions:
  contents: write
  pull-requests: write

jobs:
  translate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: davd-gzl/Prompt2PR@v1
        with:
          prompt: >-
            ${{ github.event.inputs.prompt }} Preserve all markdown formatting,
            code blocks, links, and front matter. Create translated files with a
            language suffix (e.g., README.fr.md). Do not modify the original
            English files.
          provider: 'anthropic'
          paths: '**/*.md'
          max_files: 10
          max_changes: 200
          label: 'prompt2pr,translation'
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
```

**Key points:**

- Manual-only — the user specifies the target language at trigger time
- The prompt appends instructions to preserve formatting and create
  language-suffixed files
- Creates new files (e.g., `README.fr.md`) instead of modifying originals

---

## Update Copyright Year

Updates copyright year references in source and license files. Perfect for the
start of a new year.

**File:**
[`examples/update-copyright.yml`](https://github.com/davd-gzl/Prompt2PR/blob/main/examples/update-copyright.yml)
**Provider:** Anthropic | **Trigger:** Yearly cron (January 2nd) + manual

```yaml
name: Update Copyright Year

on:
  schedule:
    - cron: '0 6 2 1 *'
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
  update-copyright:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: davd-gzl/Prompt2PR@v1
        with:
          prompt: >-
            ${{ github.event.inputs.prompt || 'Find all copyright year
            references in source files and license files. Update any outdated
            year to the current year (2026). Use the format "2024-2026" for
            ranges. Do not change any other content.' }}
          provider: 'anthropic'
          paths: 'src/**,LICENSE,README.md'
          max_files: 10
          max_changes: 100
          label: 'prompt2pr,copyright'
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
```

**Key points:**

- Runs once per year on January 2nd — the "set and forget" workflow
- Scopes to source files and license/readme
- Uses year ranges (`2024-2026`) for professional formatting
