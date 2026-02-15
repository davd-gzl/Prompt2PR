# Prompt2PR Examples

Ready-to-use workflow files organized by use case. Copy any file to
`.github/workflows/` in your repository and adjust the configuration to match
your project.

> All examples use a specific provider, but **providers are interchangeable**.
> Swap `provider:` and the corresponding API key to use any supported provider.
>
> **Single-shot design.** Prompt2PR makes one LLM call per run — it cannot
> iterate, run tests, or verify its own output. The generated PRs are a starting
> point. Always review before merging, especially for code changes.

## Categories

### [Documentation](documentation/)

Workflows that keep your docs accurate and up to date.

| Workflow                                                   | Description                                   |
| ---------------------------------------------------------- | --------------------------------------------- |
| [update-copyright.yml](documentation/update-copyright.yml) | Update copyright year across all files        |
| [sync-readme.yml](documentation/sync-readme.yml)           | Keep readme in sync with actual source code   |
| [translate-docs.yml](documentation/translate-docs.yml)     | Translate Markdown docs into another language |

### [Code Quality](code-quality/)

Workflows that improve code structure, safety, and standards compliance.

| Workflow                                                        | Description                                      |
| --------------------------------------------------------------- | ------------------------------------------------ |
| [add-jsdoc.yml](code-quality/add-jsdoc.yml)                     | Add JSDoc comments to exported functions         |
| [enforce-style-guide.yml](code-quality/enforce-style-guide.yml) | Fix naming conventions and replace magic numbers |
| [add-error-handling.yml](code-quality/add-error-handling.yml)   | Add try/catch blocks and input validation        |
| [generate-tests.yml](code-quality/generate-tests.yml)           | Generate unit tests for untested functions       |

### [Automation](automation/)

Workflows triggered by events or used for previewing changes.

| Workflow                                                      | Description                                |
| ------------------------------------------------------------- | ------------------------------------------ |
| [accessibility-audit.yml](automation/accessibility-audit.yml) | Audit frontend files for a11y issues       |
| [dry-run-audit.yml](automation/dry-run-audit.yml)             | Preview changes without creating a PR      |
| [on-issue-comment.yml](automation/on-issue-comment.yml)       | Trigger via `/prompt2pr` comment on issues |

### [Maintenance](maintenance/)

Workflows that handle routine cleanup and housekeeping tasks.

| Workflow                                               | Description                                 |
| ------------------------------------------------------ | ------------------------------------------- |
| [improve-logging.yml](maintenance/improve-logging.yml) | Replace console.log with structured logging |
| [cleanup-todos.yml](maintenance/cleanup-todos.yml)     | Remove resolved TODO/FIXME/HACK comments    |
| [fix-dead-links.yml](maintenance/fix-dead-links.yml)   | Find likely-broken links in Markdown files  |
