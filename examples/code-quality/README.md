# Code Quality Examples

Workflows that improve code structure, safety, and standards compliance. These
are best suited for projects where you want to enforce consistent patterns
across the codebase without manual review overhead.

## Workflows

### enforce-style-guide.yml

Checks source files against a style guide and fixes violations: consistent
naming conventions (camelCase, PascalCase), missing JSDoc comments on exports,
and magic numbers replaced with named constants.

**Trigger:** Push to main + manual dispatch

### add-error-handling.yml

Adds defensive code to source files: try/catch blocks around async operations,
input validation, and descriptive error messages with context. Preserves
existing behavior.

**Trigger:** Manual dispatch

### deprecation-cleanup.yml

Finds deprecated API calls and legacy patterns, then replaces them with modern
alternatives (e.g., `fs.promises` over callbacks, `URL` constructor over
`url.parse`).

**Trigger:** Monthly cron + manual dispatch

### generate-tests.yml

Analyzes source files alongside their test files to find untested exports.
Generates new test cases following existing patterns in the project.

**Trigger:** Weekly cron + manual dispatch
