# Automation Examples

Workflows triggered by events or used for previewing changes before committing.
These demonstrate how Prompt2PR integrates with different GitHub Actions
triggers beyond simple cron schedules.

## Workflows

### accessibility-audit.yml

Scans HTML, JSX, and TSX files for accessibility issues: missing alt text,
missing ARIA labels, non-semantic HTML, unlabeled form inputs, and missing role
attributes. LLMs are well-suited for this because they understand the semantic
meaning of UI elements and can suggest context-appropriate fixes.

**Trigger:** Weekly cron (Tuesday) + manual dispatch

### dry-run-audit.yml

Runs the full Prompt2PR pipeline without creating a branch or PR. Useful for
testing prompts, auditing what would change, or validating LLM behavior before
enabling real changes. Outputs the number of files and lines that would change.

**Trigger:** Manual dispatch  
**Special:** Uses `dry_run: true` — no PR is created

### on-issue-comment.yml

Triggers Prompt2PR when someone comments `/prompt2pr <instruction>` on an issue.
The comment body becomes the prompt. Uses GitHub Models so no external API key
is needed.

**Trigger:** Issue comment starting with `/prompt2pr`
