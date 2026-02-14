# Prompt2PR Examples

Ready-to-use workflow files organized by use case. Copy any file to
`.github/workflows/` in your repository and adjust the configuration to match
your project.

> All examples use a specific provider, but **providers are interchangeable**.
> Swap `provider:` and the corresponding API key to use any supported provider.

## Categories

### [Code Quality](code-quality/)

Workflows that improve code structure, safety, and standards compliance.

| Workflow                                                        | Description                                              |
| --------------------------------------------------------------- | -------------------------------------------------------- |
| [enforce-style-guide.yml](code-quality/enforce-style-guide.yml) | Fix naming conventions, add JSDoc, replace magic numbers |
| [add-error-handling.yml](code-quality/add-error-handling.yml)   | Add try/catch blocks and input validation                |
| [deprecation-cleanup.yml](code-quality/deprecation-cleanup.yml) | Replace deprecated APIs with modern alternatives         |
| [generate-tests.yml](code-quality/generate-tests.yml)           | Generate unit tests for untested functions               |

### [Documentation](documentation/)

Workflows that keep your docs accurate and up to date.

| Workflow                                                   | Description                                   |
| ---------------------------------------------------------- | --------------------------------------------- |
| [sync-readme.yml](documentation/sync-readme.yml)           | Keep README in sync with actual source code   |
| [translate-docs.yml](documentation/translate-docs.yml)     | Translate markdown docs into another language |
| [update-copyright.yml](documentation/update-copyright.yml) | Update copyright year across all files        |

### [Maintenance](maintenance/)

Workflows that handle routine cleanup and housekeeping tasks.

| Workflow                                               | Description                                 |
| ------------------------------------------------------ | ------------------------------------------- |
| [cleanup-todos.yml](maintenance/cleanup-todos.yml)     | Remove resolved TODO/FIXME/HACK comments    |
| [improve-logging.yml](maintenance/improve-logging.yml) | Replace console.log with structured logging |
| [fix-dead-links.yml](maintenance/fix-dead-links.yml)   | Find and fix broken links in markdown files |

### [Automation](automation/)

Workflows triggered by events or used for previewing changes.

| Workflow                                                      | Description                                |
| ------------------------------------------------------------- | ------------------------------------------ |
| [on-issue-comment.yml](automation/on-issue-comment.yml)       | Trigger via `/prompt2pr` comment on issues |
| [dry-run-audit.yml](automation/dry-run-audit.yml)             | Preview changes without creating a PR      |
| [accessibility-audit.yml](automation/accessibility-audit.yml) | Audit frontend files for a11y issues       |
