/**
 * Unit tests for the action's main functionality, src/main.ts
 */
import { jest } from '@jest/globals'
import * as core from '../__fixtures__/core.js'

// Mocks should be declared before the module being tested is imported.
jest.unstable_mockModule('@actions/core', () => core)

// The module being tested should be imported dynamically. This ensures that the
// mocks are used in place of any actual dependencies.
const { run } = await import('../src/main.js')

describe('main.ts', () => {
  afterEach(() => {
    jest.resetAllMocks()
  })

  it('Logs action started and completed', async () => {
    await run()

    // Verify the action logged startup message
    expect(core.info).toHaveBeenCalledWith('[main] Prompt2PR action started')

    // Verify the action logged completion message
    expect(core.info).toHaveBeenCalledWith('[main] Prompt2PR action completed')
  })

  it('Does not set a failed status on success', async () => {
    await run()

    // Verify that setFailed was not called
    expect(core.setFailed).not.toHaveBeenCalled()
  })

  it('Sets a failed status when an error occurs', async () => {
    // Mock core.info to throw on the first call
    core.info.mockImplementationOnce(() => {
      throw new Error('Simulated failure')
    })

    await run()

    // Verify that the action was marked as failed
    expect(core.setFailed).toHaveBeenCalledWith('Simulated failure')
  })

  it('Sets a failed status when a non-Error is thrown', async () => {
    // Mock core.info to throw a string (non-Error)
    core.info.mockImplementationOnce(() => {
      throw 'string error' as unknown
    })

    await run()

    // setFailed IS called for non-Error throws (NFR11: fail loudly)
    expect(core.setFailed).toHaveBeenCalledWith('string error')
  })
})
