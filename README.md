# Prompt2PR

> A GitHub Action that turns plain-English prompts into Pull Requests using
> LLMs.

<!-- TODO: Epic 8 — Full README with quick-start, config reference, provider setup -->

## Quick Start

```yaml
name: Prompt2PR
on:
  workflow_dispatch:
    inputs:
      prompt:
        description: 'What should the AI fix?'
        required: true

permissions:
  contents: write
  pull-requests: write

jobs:
  prompt2pr:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
      - uses: Davphla/Prompt2PR@v1
        with:
          prompt: ${{ github.event.inputs.prompt }}
          provider: mistral
        env:
          MISTRAL_API_KEY: ${{ secrets.MISTRAL_API_KEY }}
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

## Development

```bash
npm install
npm run all
```

## License

MIT
