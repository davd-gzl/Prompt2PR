# Documentation Examples

Workflows that keep your documentation accurate, translated, and up to date.
These run on a schedule or manually to catch documentation drift before it
becomes a problem.

## Workflows

### sync-readme.yml

Compares the readme with actual source code to find outdated code examples, API
references, or configuration options. Updates the readme to match the current
implementation without touching source files.

**Trigger:** Weekly cron + manual dispatch

### translate-docs.yml

Translates Markdown documentation into another language while preserving
formatting, code blocks, links, and front matter. Creates translated files with
a language suffix (e.g., `README.fr.md`).

**Trigger:** Manual dispatch (specify target language in the prompt)

### update-copyright.yml

Updates copyright year references in source files and license files to the
current year. Uses range format (e.g., `2024-2026`) where appropriate.

**Trigger:** Yearly cron (January 2nd) + manual dispatch
