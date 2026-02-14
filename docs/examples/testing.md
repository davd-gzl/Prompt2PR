---
title: 'Testing Examples'
---

# Testing Examples

Workflows for generating and improving test coverage.

---

## Generate Missing Tests

Scans source files for untested functions and generates unit tests
automatically.

**File:**
[`examples/generate-tests.yml`](https://github.com/davd-gzl/Prompt2PR/blob/main/examples/generate-tests.yml)
**Provider:** OpenAI | **Trigger:** Weekly cron (Thursday 7:00 UTC) + manual

```yaml
name: Generate Missing Tests

on:
  schedule:
    - cron: '0 7 * * 4'
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
  generate-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: davd-gzl/Prompt2PR@v1
        with:
          prompt: >-
            ${{ github.event.inputs.prompt || 'Analyze the source files and
            their corresponding test files. Identify exported functions or
            classes that have no test coverage. For each untested function,
            create a new test or add test cases to the existing test file. Use
            Jest with TypeScript. Follow the existing test patterns in the
            project. Only create tests — do not modify source files.' }}
          provider: 'openai'
          paths: 'src/**,__tests__/**'
          max_files: 5
          max_changes: 200
          label: 'prompt2pr,tests'
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
```

**Key points:**

- Includes both source and test directories in `paths` so the LLM can see
  existing patterns
- `max_files: 5` keeps PRs focused and reviewable
- The prompt explicitly says "only create tests" — source files are read-only
  context
- Follows existing test patterns to maintain consistency

**Customization tips:**

- Change the test framework in the prompt (e.g., "Use Vitest" or "Use Mocha with
  Chai")
- Narrow `paths` to specific modules: `src/utils/**,__tests__/utils/**`
- Increase `max_files` if you want broader coverage in a single PR
- Add specific instructions like "Include edge cases and error paths"

---

## Advanced: Test Generation with Coverage Reporting

Combine Prompt2PR with a coverage check step:

```yaml
jobs:
  generate-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      # Generate tests
      - uses: davd-gzl/Prompt2PR@v1
        id: tests
        with:
          prompt: >-
            Analyze source files and generate unit tests for untested functions.
            Use Jest with TypeScript. Follow existing test patterns.
          provider: openai
          paths: 'src/**,__tests__/**'
          max_files: 5
          label: 'prompt2pr,tests'
        env:
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

      # Report what happened
      - name: Summary
        if: steps.tests.outputs.skipped != 'true'
        run: |
          echo "## Test Generation Results" >> $GITHUB_STEP_SUMMARY
          echo "- PR: ${{ steps.tests.outputs.pr_url }}" >> $GITHUB_STEP_SUMMARY
          echo "- New test files: ${{ steps.tests.outputs.files_changed }}" >> $GITHUB_STEP_SUMMARY
```
