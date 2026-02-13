/**
 * Unit tests for custom error types — src/errors.ts
 *
 * Story 1.2: Tests ConfigError.
 * Story 1.3: Tests ProviderError (with provider/statusCode), GitError,
 *            GuardrailError, ParseError.
 */
import {
  ConfigError,
  ProviderError,
  GitError,
  GuardrailError,
  ParseError
} from '../src/errors.js'

describe('errors.ts', () => {
  it('ConfigError has correct name and message', () => {
    const err = new ConfigError('bad input')
    expect(err).toBeInstanceOf(Error)
    expect(err).toBeInstanceOf(ConfigError)
    expect(err.name).toBe('ConfigError')
    expect(err.message).toBe('bad input')
  })

  it('ProviderError has correct name, message, provider, and statusCode', () => {
    const err = new ProviderError('api failed', 'mistral', 429)
    expect(err).toBeInstanceOf(Error)
    expect(err).toBeInstanceOf(ProviderError)
    expect(err.name).toBe('ProviderError')
    expect(err.message).toBe('api failed')
    expect(err.provider).toBe('mistral')
    expect(err.statusCode).toBe(429)
  })

  it('ProviderError works without statusCode', () => {
    const err = new ProviderError('timeout', 'openai')
    expect(err).toBeInstanceOf(Error)
    expect(err.name).toBe('ProviderError')
    expect(err.message).toBe('timeout')
    expect(err.provider).toBe('openai')
    expect(err.statusCode).toBeUndefined()
  })

  it('GitError has correct name and message', () => {
    const err = new GitError('push rejected')
    expect(err).toBeInstanceOf(Error)
    expect(err.name).toBe('GitError')
    expect(err.message).toBe('push rejected')
  })

  it('GuardrailError has correct name and message', () => {
    const err = new GuardrailError('limit exceeded')
    expect(err).toBeInstanceOf(Error)
    expect(err.name).toBe('GuardrailError')
    expect(err.message).toBe('limit exceeded')
  })

  it('ParseError has correct name and message', () => {
    const err = new ParseError('invalid json')
    expect(err).toBeInstanceOf(Error)
    expect(err.name).toBe('ParseError')
    expect(err.message).toBe('invalid json')
  })
})
