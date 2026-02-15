# Code Quality Examples

Workflows that improve code structure, safety, and standards compliance. These
are best suited for projects where you want to enforce consistent patterns
across the codebase without manual review overhead.

## Workflows

### enforce-style-guide.yml

Checks source files against a style guide and fixes violations: consistent
naming conventions (camelCase, PascalCase) and magic numbers replaced with named
constants. Works well as a single-shot task because the rules are mechanical.

**Trigger:** Push to main + manual dispatch

### add-jsdoc.yml

Adds missing JSDoc documentation to exported functions, classes, and type
aliases. One of the best single-shot LLM tasks — the model reads the
implementation and infers intent, parameters, return types, and edge cases.

**Trigger:** Manual dispatch

### add-error-handling.yml

Adds defensive code to source files: try/catch blocks around async operations,
input validation, and descriptive error messages with context. Preserves
existing behavior. Review the PR and run tests before merging.

**Trigger:** Manual dispatch

### generate-tests.yml

Analyzes source files alongside their test files to find untested exports.
Generates new test cases following existing patterns. The generated tests are a
starting point — they may need adjustments for mocking or fixtures since the LLM
cannot execute them.

**Trigger:** Weekly cron + manual dispatch
