/**
 * Unit tests for retry utility — src/retry.ts
 *
 * Tests cover: success on first attempt, retry-then-success,
 * retry-then-fail, error type preservation, backoff timing,
 * and custom options.
 */
import { jest } from '@jest/globals'
import type { ProviderError as ProviderErrorType } from '../src/errors.js'

// Mock the global setTimeout to avoid real delays and control backoff behavior
jest.useFakeTimers()

const { withRetry } = await import('../src/retry.js')
const { ProviderError } = await import('../src/errors.js')

describe('retry.ts — withRetry()', () => {
  afterEach(() => {
    jest.resetAllMocks()
    jest.clearAllTimers()
  })

  afterAll(() => {
    jest.useRealTimers()
  })

  // -- Success on first attempt -------------------------------------------

  it('returns the result on first successful call', async () => {
    const fn = jest.fn<() => Promise<string>>().mockResolvedValue('ok')

    const result = await withRetry(fn)

    expect(result).toBe('ok')
    expect(fn).toHaveBeenCalledTimes(1)
  })

  // -- Retry then success -------------------------------------------------

  it('retries once and returns the result on second success', async () => {
    const fn = jest
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(new Error('transient'))
      .mockResolvedValue('recovered')

    const promise = withRetry(fn, { retries: 1, backoffMs: 100 })

    // Advance timers to resolve the backoff sleep
    await jest.advanceTimersByTimeAsync(100)

    const result = await promise

    expect(result).toBe('recovered')
    expect(fn).toHaveBeenCalledTimes(2)
  })

  // -- Retry then fail ----------------------------------------------------

  it('throws the original error after all retries are exhausted', async () => {
    const error = new Error('persistent failure')
    const fn = jest.fn<() => Promise<string>>().mockRejectedValue(error)

    const promise = withRetry(fn, { retries: 1, backoffMs: 50 })

    // Catch the rejection to prevent unhandled rejection during timer advance
    const caught = promise.catch((e: unknown) => e)

    // Advance timers to resolve the backoff sleep
    await jest.advanceTimersByTimeAsync(50)

    const result = await caught
    expect(result).toBe(error)
    expect(fn).toHaveBeenCalledTimes(2) // initial + 1 retry
  })

  // -- Error type preservation --------------------------------------------

  it('preserves ProviderError type through retries', async () => {
    const providerError = new ProviderError('server error', 'mistral', 500)
    const fn = jest.fn<() => Promise<string>>().mockRejectedValue(providerError)

    const promise = withRetry(fn, { retries: 1, backoffMs: 50 })

    // Catch the rejection to prevent unhandled rejection during timer advance
    const caught = promise.catch((e: unknown) => e)

    await jest.advanceTimersByTimeAsync(50)

    const err = await caught
    expect(err).toBeInstanceOf(ProviderError)
    expect(err).toBe(providerError) // exact same reference
    expect((err as ProviderErrorType).provider).toBe('mistral')
    expect((err as ProviderErrorType).statusCode).toBe(500)
  })

  // -- Non-retryable errors (e.g., 429 rate limit) -------------------------

  it('does not retry non-retryable ProviderError (429 rate limit)', async () => {
    const rateLimitError = new ProviderError(
      'rate limited',
      'github',
      429,
      false
    )
    const fn = jest
      .fn<() => Promise<string>>()
      .mockRejectedValue(rateLimitError)

    await expect(withRetry(fn, { retries: 3, backoffMs: 50 })).rejects.toThrow(
      rateLimitError
    )

    // Should be called only once — no retries
    expect(fn).toHaveBeenCalledTimes(1)
  })

  // -- Default options (NFR14: 1 retry, 5000ms backoff) -------------------

  it('uses default options: 1 retry, 5000ms backoff', async () => {
    const fn = jest
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValue('ok')

    const promise = withRetry(fn)

    // Default backoff is 5000ms
    await jest.advanceTimersByTimeAsync(5_000)

    const result = await promise

    expect(result).toBe('ok')
    expect(fn).toHaveBeenCalledTimes(2)
  })

  // -- Custom retries count -----------------------------------------------

  it('supports multiple retries', async () => {
    const fn = jest
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(new Error('fail 1'))
      .mockRejectedValueOnce(new Error('fail 2'))
      .mockResolvedValue('ok')

    const promise = withRetry(fn, { retries: 3, backoffMs: 10 })

    // Advance timers enough for all backoffs
    await jest.advanceTimersByTimeAsync(10)
    await jest.advanceTimersByTimeAsync(10)

    const result = await promise

    expect(result).toBe('ok')
    expect(fn).toHaveBeenCalledTimes(3)
  })

  // -- Zero retries = no retry --------------------------------------------

  it('does not retry when retries is 0', async () => {
    const fn = jest
      .fn<() => Promise<string>>()
      .mockRejectedValue(new Error('immediate fail'))

    await expect(withRetry(fn, { retries: 0 })).rejects.toThrow(
      'immediate fail'
    )

    expect(fn).toHaveBeenCalledTimes(1)
  })

  // -- Non-Error thrown values preserved ----------------------------------

  it('preserves non-Error thrown values', async () => {
    const fn = jest
      .fn<() => Promise<string>>()
      .mockRejectedValue('string error')

    const promise = withRetry(fn, { retries: 1, backoffMs: 10 })

    // Catch the rejection to prevent unhandled rejection during timer advance
    const caught = promise.catch((e: unknown) => e)

    await jest.advanceTimersByTimeAsync(10)

    const result = await caught
    expect(result).toBe('string error')
  })
})
