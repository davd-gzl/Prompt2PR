---
layout: single
title: Contributing
permalink: /contributing/
---

# Contributing

How to set up the project for development, run tests, and create releases.

---

## Prerequisites

- **Node.js 20** (see `.node-version`)
- **npm**

---

## Development Setup

```bash
# Clone the repository
git clone https://github.com/davd-gzl/Prompt2PR.git
cd Prompt2PR

# Install dependencies
npm install

# Run the full pipeline: format, lint, test, coverage badge, bundle
npm run all
```

---

## Available Scripts

| Script                 | Description                                             |
| :--------------------- | :------------------------------------------------------ |
| `npm run all`          | Full pipeline: format + lint + test + coverage + bundle |
| `npm test`             | Run Jest tests with ESM support                         |
| `npm run lint`         | Run ESLint                                              |
| `npm run bundle`       | Format + Rollup bundle to `dist/index.js`               |
| `npm run local-action` | Test locally with `@github/local-action`                |
| `npm run format:write` | Autoformat with Prettier                                |
| `npm run format:check` | Check formatting without modifying files                |
| `npm run package`      | Clean dist/ and run Rollup bundler                      |
| `npm run coverage`     | Generate coverage badge SVG                             |

---

## Project Structure

```text
Prompt2PR/
├── src/                    # TypeScript source code
│   ├── index.ts            # Entry point
│   ├── main.ts             # Pipeline orchestrator
│   ├── config.ts           # Input validation
│   ├── file-scanner.ts     # Glob-based file scanning
│   ├── prompt-assembler.ts # Prompt + context builder
│   ├── response-parser.ts  # LLM response validation
│   ├── guardrails.ts       # Post-LLM safety checks
│   ├── git-manager.ts      # Git operations
│   ├── pr-creator.ts       # GitHub PR creation
│   ├── logger.ts           # Structured logging
│   ├── errors.ts           # Typed error classes
│   ├── retry.ts            # Retry with backoff
│   └── providers/          # LLM provider implementations
├── __tests__/              # Jest test files
├── __fixtures__/           # Test fixtures
├── examples/               # Example workflow files
├── dist/                   # Bundled output (committed)
├── docs/                   # GitHub Pages documentation
├── badges/                 # Auto-generated badges
└── .github/workflows/      # CI workflows
```

---

## Testing

Tests use **Jest 30** with **ts-jest** in ESM mode.

```bash
# Run all tests
npm test

# Run tests with coverage
npm test -- --coverage

# Run a specific test file
npm test -- __tests__/guardrails.test.ts
```

### Coverage Thresholds

The project enforces **80% coverage** for branches, functions, lines, and
statements. Tests that drop below this threshold will fail.

### Test Patterns

Tests use `jest.unstable_mockModule()` for ESM-compatible mocking with top-level
`await` for dynamic imports:

```typescript
jest.unstable_mockModule('@actions/core', () => ({
  /* mocks */
}))
const { myFunction } = await import('../src/my-module.js')
```

---

## Local Testing

Test the action locally without pushing to GitHub:

1. Copy `.env.example` to `.env`:

   ```bash
   cp .env.example .env
   ```

2. Fill in your API keys and inputs in `.env`

3. Run the local action simulator:

   ```bash
   npm run local-action
   ```

This uses `@github/local-action` to simulate a GitHub Actions environment on
your machine.

---

## Build Process

The project uses **Rollup** to bundle all TypeScript source into a single
`dist/index.js` file. This is what GitHub Actions actually runs.

```bash
# Bundle the action
npm run package

# Or run the full pipeline (includes bundling)
npm run all
```

**Important:** The `dist/` directory is committed to the repository. After
making changes to source code, always run `npm run package` and commit the
updated `dist/index.js`. The `check-dist` CI workflow verifies that `dist/`
matches the source. {: .notice--warning }

---

## Release Process

Use the release script to tag and publish a new version:

```bash
script/release
```

This script:

1. Prompts for the version type (major, minor, patch)
2. Creates a SemVer tag (e.g., `v1.2.3`)
3. Floats the major tag (e.g., `v1`) so users referencing `@v1` get updates
4. Pushes tags to the remote
5. Creates a GitHub Release

---

## CI Workflows

| Workflow         | What it checks                                                 |
| :--------------- | :------------------------------------------------------------- |
| `ci.yml`         | Format, lint, test, and a live dry-run test with GitHub Models |
| `linter.yml`     | Super-Linter (codespell, markdownlint, yamllint, gitleaks)     |
| `check-dist.yml` | Verifies `dist/` matches the build output                      |
| `test-e2e.yml`   | Manual end-to-end test with GitHub Models                      |
