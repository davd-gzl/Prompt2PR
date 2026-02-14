---
title: 'Contributing'
---

# Contributing

Thank you for considering contributing to Prompt2PR! Here's everything you need
to get started.

---

## Prerequisites

- **Node.js 20** (see `.node-version`)
- **npm**

---

## Development Setup

```bash
# Clone the repository
git clone https://github.com/davd-gzl/Prompt2PR
cd Prompt2PR

# Install dependencies
npm install

# Run the full pipeline: format, lint, test, coverage badge, bundle
npm run all
```

---

## Available Scripts

| Script                 | Description                               |
| ---------------------- | ----------------------------------------- |
| `npm run all`          | Format + lint + test + coverage + bundle  |
| `npm test`             | Run Jest tests with ESM support           |
| `npm run lint`         | Run ESLint                                |
| `npm run bundle`       | Format + Rollup bundle to `dist/index.js` |
| `npm run local-action` | Test locally with `@github/local-action`  |
| `npm run coverage`     | Generate coverage report                  |
| `npm run format:write` | Format code with Prettier                 |
| `npm run format:check` | Check formatting without changes          |

---

## Local Testing

1. Copy `.env.example` to `.env` and fill in your API keys
2. Run `npm run local-action` to simulate a GitHub Actions run locally

---

## Project Structure

```
src/
├── index.ts                  # Entrypoint
├── main.ts                   # Pipeline orchestrator
├── config.ts                 # Input validation
├── errors.ts                 # Custom error types
├── file-scanner.ts           # Glob-based file scanner
├── git-manager.ts            # Git CLI operations
├── guardrails.ts             # Safety limit enforcement
├── logger.ts                 # Structured logger
├── pr-creator.ts             # GitHub API PR creation
├── prompt-assembler.ts       # LLM prompt builder
├── response-parser.ts        # JSON response parser
├── retry.ts                  # Retry with backoff
└── providers/
    ├── types.ts              # LLMProvider interface
    ├── provider-factory.ts   # Factory pattern router
    ├── base-openai-compatible-provider.ts
    ├── mistral-provider.ts
    ├── openai-provider.ts
    ├── anthropic-provider.ts
    └── github-models-provider.ts
```

---

## Test Coverage

The project maintains **98%+ line coverage**. All new code must include tests.

```bash
npm test              # Run tests
npm run coverage      # Generate coverage report
```

---

## Adding a New LLM Provider

Prompt2PR's architecture makes adding providers straightforward:

1. Create `src/providers/your-provider.ts` implementing the `LLMProvider`
   interface
2. Add the provider to the factory in `src/providers/provider-factory.ts`
3. Add the API key environment variable to `src/config.ts`
4. Write tests in `__tests__/providers/your-provider.test.ts`
5. Update documentation

Target: less than 1 day of work.

---

## Release Process

Use the release script to tag and publish a new version:

```bash
script/release
```

This handles SemVer tagging (`v1.x.x`) and floats the major tag (`v1`) for users
referencing `@v1`.

---

## Code Style

- **TypeScript** with strict mode
- **ESM modules** — always use `.js` extensions in imports
- **Named exports only** — no default exports
- **camelCase** for variables/functions, **PascalCase** for types/interfaces
- **kebab-case** for file names
- Run `npm run format:write` before committing
