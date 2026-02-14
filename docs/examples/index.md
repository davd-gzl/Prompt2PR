---
title: 'Example Workflows'
---

# Example Workflows

13 ready-to-use workflow files organized by category. Copy any file to
`.github/workflows/` in your repository to get started.

> **All examples** are available in the
> [`examples/`](https://github.com/davd-gzl/Prompt2PR/tree/main/examples)
> directory of the repository.

---

## By Category

### Documentation & Content

Workflows that maintain docs, README files, and content quality.

| Example                                                 | Description                                   | Provider  | Trigger     | File                                                                                                    |
| ------------------------------------------------------- | --------------------------------------------- | --------- | ----------- | ------------------------------------------------------------------------------------------------------- |
| [Fix Dead Links](documentation#fix-dead-links)          | Scan markdown for broken links and fix them   | Mistral   | Weekly cron | [`fix-dead-links.yml`](https://github.com/davd-gzl/Prompt2PR/blob/main/examples/fix-dead-links.yml)     |
| [Sync README](documentation#sync-readme)                | Keep README in sync with source code          | OpenAI    | Weekly cron | [`sync-readme.yml`](https://github.com/davd-gzl/Prompt2PR/blob/main/examples/sync-readme.yml)           |
| [Translate Docs](documentation#translate-documentation) | Translate documentation into another language | Anthropic | Manual      | [`translate-docs.yml`](https://github.com/davd-gzl/Prompt2PR/blob/main/examples/translate-docs.yml)     |
| [Update Copyright](documentation#update-copyright-year) | Update copyright year in source files         | Anthropic | Yearly cron | [`update-copyright.yml`](https://github.com/davd-gzl/Prompt2PR/blob/main/examples/update-copyright.yml) |

### Code Quality & Maintenance

Workflows that improve code hygiene, style, and modernization.

| Example                                                 | Description                                      | Provider      | Trigger      | File                                                                                                          |
| ------------------------------------------------------- | ------------------------------------------------ | ------------- | ------------ | ------------------------------------------------------------------------------------------------------------- |
| [Cleanup TODOs](code-quality#cleanup-todos)             | Clean up resolved TODO/FIXME/HACK comments       | Anthropic     | Weekly cron  | [`cleanup-todos.yml`](https://github.com/davd-gzl/Prompt2PR/blob/main/examples/cleanup-todos.yml)             |
| [Enforce Style Guide](code-quality#enforce-style-guide) | Fix code style guide violations                  | GitHub Models | Push to main | [`enforce-style-guide.yml`](https://github.com/davd-gzl/Prompt2PR/blob/main/examples/enforce-style-guide.yml) |
| [Deprecation Cleanup](code-quality#deprecation-cleanup) | Replace deprecated APIs with modern alternatives | Anthropic     | Monthly cron | [`deprecation-cleanup.yml`](https://github.com/davd-gzl/Prompt2PR/blob/main/examples/deprecation-cleanup.yml) |
| [Add Error Handling](code-quality#add-error-handling)   | Add missing try/catch and input validation       | Mistral       | Manual       | [`add-error-handling.yml`](https://github.com/davd-gzl/Prompt2PR/blob/main/examples/add-error-handling.yml)   |
| [Improve Logging](code-quality#improve-logging)         | Replace console.log with structured logging      | OpenAI        | Manual       | [`improve-logging.yml`](https://github.com/davd-gzl/Prompt2PR/blob/main/examples/improve-logging.yml)         |

### Security

Workflows focused on security scanning and secret detection.

| Example                                   | Description                                     | Provider | Trigger    | File                                                                                            |
| ----------------------------------------- | ----------------------------------------------- | -------- | ---------- | ----------------------------------------------------------------------------------------------- |
| [Scan Secrets](security#scan-for-secrets) | Detect accidentally committed secrets or tokens | Mistral  | Daily cron | [`scan-secrets.yml`](https://github.com/davd-gzl/Prompt2PR/blob/main/examples/scan-secrets.yml) |

### Testing

Workflows that generate or improve test coverage.

| Example                                          | Description                                | Provider | Trigger     | File                                                                                                |
| ------------------------------------------------ | ------------------------------------------ | -------- | ----------- | --------------------------------------------------------------------------------------------------- |
| [Generate Tests](testing#generate-missing-tests) | Generate unit tests for untested functions | OpenAI   | Weekly cron | [`generate-tests.yml`](https://github.com/davd-gzl/Prompt2PR/blob/main/examples/generate-tests.yml) |

### Advanced Triggers

Workflows demonstrating special trigger patterns and features.

| Example                                                | Description                                | Provider      | Trigger       | File                                                                                                    |
| ------------------------------------------------------ | ------------------------------------------ | ------------- | ------------- | ------------------------------------------------------------------------------------------------------- |
| [Dry Run Audit](advanced-triggers#dry-run-audit)       | Preview changes without creating a PR      | GitHub Models | Manual        | [`dry-run-audit.yml`](https://github.com/davd-gzl/Prompt2PR/blob/main/examples/dry-run-audit.yml)       |
| [On Issue Comment](advanced-triggers#on-issue-comment) | Trigger via `/prompt2pr` comment on issues | GitHub Models | Issue comment | [`on-issue-comment.yml`](https://github.com/davd-gzl/Prompt2PR/blob/main/examples/on-issue-comment.yml) |

---

## By Provider

| Provider          | Examples                                                             |
| ----------------- | -------------------------------------------------------------------- |
| **Mistral**       | Fix Dead Links, Scan Secrets, Add Error Handling                     |
| **OpenAI**        | Sync README, Generate Tests, Improve Logging                         |
| **Anthropic**     | Update Copyright, Cleanup TODOs, Translate Docs, Deprecation Cleanup |
| **GitHub Models** | Enforce Style Guide, Dry Run Audit, On Issue Comment                 |

---

## By Trigger

| Trigger                          | Examples                                                                                                        |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| **Cron (scheduled)**             | Fix Dead Links, Update Copyright, Sync README, Scan Secrets, Cleanup TODOs, Generate Tests, Deprecation Cleanup |
| **Manual (`workflow_dispatch`)** | Translate Docs, Add Error Handling, Improve Logging, Dry Run Audit                                              |
| **Push to branch**               | Enforce Style Guide                                                                                             |
| **Issue comment**                | On Issue Comment                                                                                                |
