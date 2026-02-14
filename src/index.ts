/**
 * The entrypoint for the action. This file simply imports and runs the
 * action's main logic.
 */
import { run } from './main.js'

/* istanbul ignore next */
run().catch((error: unknown) => {
  // eslint-disable-next-line no-console
  console.error('Unhandled error in action entrypoint:', error)
  process.exitCode = 1
})
