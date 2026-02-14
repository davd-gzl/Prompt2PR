---
title: 'Provider Setup'
---

# Provider Setup

Prompt2PR supports 4 LLM providers. Each requires a one-time setup of an API key
stored as a GitHub Secret.

---

## Provider Comparison

| Provider          | Default Model              | API Key Secret             | External Account | Cost                 |
| ----------------- | -------------------------- | -------------------------- | ---------------- | -------------------- |
| **Mistral**       | `mistral-large-latest`     | `MISTRAL_API_KEY`          | Yes              | Free tier + paid     |
| **OpenAI**        | `gpt-4o`                   | `OPENAI_API_KEY`           | Yes              | Pay-per-use          |
| **Anthropic**     | `claude-sonnet-4-20250514` | `ANTHROPIC_API_KEY`        | Yes              | Pay-per-use          |
| **GitHub Models** | `openai/gpt-4o`            | None (uses `GITHUB_TOKEN`) | No               | Copilot subscription |

---

## Mistral

### Setup

1. Sign up at [console.mistral.ai](https://console.mistral.ai/)
2. Navigate to **API Keys** and create a new key
3. In your GitHub repository, go to **Settings → Secrets and variables →
   Actions**
4. Add `MISTRAL_API_KEY` with your key value

### Workflow Configuration

```yaml
- uses: davd-gzl/Prompt2PR@v1
  with:
    prompt: 'Fix all dead links in markdown files'
    provider: mistral
    # model: mistral-large-latest  (default — omit to use it)
  env:
    MISTRAL_API_KEY: ${{ secrets.MISTRAL_API_KEY }}
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

---

## OpenAI

### Setup

1. Sign up at [platform.openai.com](https://platform.openai.com/)
2. Navigate to **API Keys** and create a new secret key
3. In your GitHub repository, add `OPENAI_API_KEY` as a GitHub Secret

### Workflow Configuration

```yaml
- uses: davd-gzl/Prompt2PR@v1
  with:
    prompt: 'Generate unit tests for untested functions'
    provider: openai
    # model: gpt-4o  (default — omit to use it)
  env:
    OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

---

## Anthropic

### Setup

1. Sign up at [console.anthropic.com](https://console.anthropic.com/)
2. Navigate to **API Keys** and create a new key
3. In your GitHub repository, add `ANTHROPIC_API_KEY` as a GitHub Secret

### Workflow Configuration

```yaml
- uses: davd-gzl/Prompt2PR@v1
  with:
    prompt: 'Update copyright year in all source files'
    provider: anthropic
    # model: claude-sonnet-4-20250514  (default — omit to use it)
  env:
    ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

---

## GitHub Models

Use LLMs directly through GitHub's built-in Models API — **no external API key
needed**. This works with any GitHub Copilot subscription.

### Setup

1. Ensure your GitHub account has access to
   [GitHub Models](https://github.com/marketplace/models)
2. No additional secrets required — the built-in `GITHUB_TOKEN` handles
   authentication
3. Add `models: read` to your workflow permissions

### Workflow Configuration

```yaml
permissions:
  contents: write
  pull-requests: write
  models: read # Required for GitHub Models

jobs:
  prompt2pr:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: davd-gzl/Prompt2PR@v1
        with:
          prompt: 'Fix typos in README.md'
          provider: github
          model: openai/gpt-4o # Use publisher/model-name format
          paths: 'README.md'
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

### Available Models

GitHub Models uses the `publisher/model-name` format. Popular choices:

| Model             | Identifier                    |
| ----------------- | ----------------------------- |
| GPT-4o            | `openai/gpt-4o`               |
| GPT-4o Mini       | `openai/gpt-4o-mini`          |
| Claude Sonnet 4.5 | `anthropic/claude-sonnet-4.5` |

---

## Custom Base URL

For self-hosted endpoints or LLM proxies, use the `base_url` input:

```yaml
- uses: davd-gzl/Prompt2PR@v1
  with:
    prompt: 'Fix dead links'
    provider: openai
    base_url: 'https://my-proxy.example.com/v1'
  env:
    OPENAI_API_KEY: ${{ secrets.MY_PROXY_KEY }}
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

This is useful for:

- Corporate LLM proxies
- Self-hosted inference servers
- LiteLLM or similar gateway services
