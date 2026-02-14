---
layout: default
title: Providers
nav_order: 4
---

# Providers

Prompt2PR supports four LLM providers. **Providers are interchangeable** — the
action behaves the same regardless of which one you choose. Pick based on your
preference, existing subscriptions, or model availability.

---

## Mistral

[Mistral AI](https://mistral.ai/) offers high-quality models with competitive
pricing.

**Default model:** `mistral-large-latest`

### Setup

1. Sign up at [console.mistral.ai](https://console.mistral.ai/)
2. Go to **API Keys** and create a new key
3. Add `MISTRAL_API_KEY` as a GitHub Secret in your repository
4. Set `provider: mistral` in your workflow

### Workflow

```yaml
- uses: davd-gzl/Prompt2PR@v1
  with:
    prompt: 'Your prompt here'
    provider: mistral
  env:
    MISTRAL_API_KEY: ${{ secrets.MISTRAL_API_KEY }}
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

---

## OpenAI

[OpenAI](https://openai.com/) provides GPT models with broad language and code
understanding.

**Default model:** `gpt-4o`

### Setup

1. Sign up at [platform.openai.com](https://platform.openai.com/)
2. Go to **API Keys** and create a new secret key
3. Add `OPENAI_API_KEY` as a GitHub Secret in your repository
4. Set `provider: openai` in your workflow

### Workflow

```yaml
- uses: davd-gzl/Prompt2PR@v1
  with:
    prompt: 'Your prompt here'
    provider: openai
  env:
    OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

---

## Anthropic

[Anthropic](https://www.anthropic.com/) provides Claude models known for
detailed, careful analysis.

**Default model:** `claude-sonnet-4-20250514`

### Setup

1. Sign up at [console.anthropic.com](https://console.anthropic.com/)
2. Go to **API Keys** and create a new key
3. Add `ANTHROPIC_API_KEY` as a GitHub Secret in your repository
4. Set `provider: anthropic` in your workflow

### Workflow

```yaml
- uses: davd-gzl/Prompt2PR@v1
  with:
    prompt: 'Your prompt here'
    provider: anthropic
  env:
    ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

---

## GitHub Models

[GitHub Models](https://github.com/marketplace/models) lets you use LLMs
directly through GitHub's infrastructure. **No external API key required** — it
uses the built-in `GITHUB_TOKEN`.

**Default model:** `openai/gpt-4o`

### Prerequisites

- A GitHub Copilot subscription
- Access to [GitHub Models](https://github.com/marketplace/models)

### Setup

1. No additional secrets needed
2. Add `models: read` to your workflow permissions
3. Set `provider: github` in your workflow
4. Use models in `publisher/model-name` format

### Available Models

GitHub Models hosts models from multiple publishers. Use the
`publisher/model-name` format:

- `openai/gpt-4o`
- `anthropic/claude-sonnet-4.5`
- And more — check the
  [GitHub Models marketplace](https://github.com/marketplace/models)

### Workflow

```yaml
permissions:
  contents: write
  pull-requests: write
  models: read

jobs:
  prompt2pr:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: davd-gzl/Prompt2PR@v1
        with:
          prompt: 'Your prompt here'
          provider: github
          model: openai/gpt-4o
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

{: .important } The `models: read` permission is required. Without it, the
action will fail with an authentication error.

---

## Switching Providers

Since providers are interchangeable, switching is straightforward. Change two
things:

1. The `provider:` input
2. The API key in the `env:` block

```yaml
# Before (Mistral)
provider: mistral
env:
  MISTRAL_API_KEY: ${{ secrets.MISTRAL_API_KEY }}

# After (OpenAI)
provider: openai
env:
  OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
```

The action handles all differences in API format, authentication, and response
parsing internally.

## Custom Endpoints

Use the `base_url` input to point any provider at a custom endpoint:

```yaml
with:
  provider: openai
  base_url: 'https://my-proxy.example.com/v1'
```

This is useful for API proxies, self-hosted models, or testing with mock
servers.

---

Next: [Examples]({% link examples.md %})
