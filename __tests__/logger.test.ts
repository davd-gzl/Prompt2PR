/**
 * Unit tests for logger — src/logger.ts
 *
 * Tests cover: component prefix formatting, delegation to @actions/core
 * functions, and secret masking via core.setSecret().
 */
import { jest } from '@jest/globals'
import * as core from '../__fixtures__/core.js'

// Mock @actions/core before importing the module under test
jest.unstable_mockModule('@actions/core', () => core)

const { createLogger } = await import('../src/logger.js')

describe('logger.ts — createLogger()', () => {
  afterEach(() => {
    jest.resetAllMocks()
  })

  // -- Prefix formatting --------------------------------------------------

  it('prefixes info messages with [component]', () => {
    const log = createLogger('scanner')

    log.info('Scanning files')

    expect(core.info).toHaveBeenCalledWith('[scanner] Scanning files')
  })

  it('prefixes debug messages with [component]', () => {
    const log = createLogger('provider:mistral')

    log.debug('Sending request')

    expect(core.debug).toHaveBeenCalledWith(
      '[provider:mistral] Sending request'
    )
  })

  it('prefixes warn messages with [component]', () => {
    const log = createLogger('git')

    log.warn('Branch already exists')

    expect(core.warning).toHaveBeenCalledWith('[git] Branch already exists')
  })

  it('prefixes error messages with [component]', () => {
    const log = createLogger('parser')

    log.error('Invalid JSON response')

    expect(core.error).toHaveBeenCalledWith('[parser] Invalid JSON response')
  })

  // -- Delegation to core functions ---------------------------------------

  it('delegates info to core.info', () => {
    const log = createLogger('test')

    log.info('hello')

    expect(core.info).toHaveBeenCalledTimes(1)
  })

  it('delegates debug to core.debug', () => {
    const log = createLogger('test')

    log.debug('hello')

    expect(core.debug).toHaveBeenCalledTimes(1)
  })

  it('delegates warn to core.warning', () => {
    const log = createLogger('test')

    log.warn('hello')

    expect(core.warning).toHaveBeenCalledTimes(1)
  })

  it('delegates error to core.error', () => {
    const log = createLogger('test')

    log.error('hello')

    expect(core.error).toHaveBeenCalledTimes(1)
  })

  // -- Secret masking (NFR4) ----------------------------------------------

  it('calls core.setSecret for each provided secret', () => {
    createLogger('provider', ['sk-api-key-123', 'another-secret'])

    expect(core.setSecret).toHaveBeenCalledTimes(2)
    expect(core.setSecret).toHaveBeenCalledWith('sk-api-key-123')
    expect(core.setSecret).toHaveBeenCalledWith('another-secret')
  })

  it('does not call core.setSecret when no secrets are provided', () => {
    createLogger('scanner')

    expect(core.setSecret).not.toHaveBeenCalled()
  })

  it('skips empty strings in the secrets array', () => {
    createLogger('provider', ['sk-key', '', 'another-key'])

    expect(core.setSecret).toHaveBeenCalledTimes(2)
    expect(core.setSecret).toHaveBeenCalledWith('sk-key')
    expect(core.setSecret).toHaveBeenCalledWith('another-key')
  })

  // -- Multiple loggers with different components -------------------------

  it('supports multiple loggers with independent prefixes', () => {
    const logA = createLogger('scanner')
    const logB = createLogger('git')

    logA.info('scanning')
    logB.info('pushing')

    expect(core.info).toHaveBeenCalledWith('[scanner] scanning')
    expect(core.info).toHaveBeenCalledWith('[git] pushing')
  })
})
