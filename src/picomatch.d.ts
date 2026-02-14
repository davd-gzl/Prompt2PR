/**
 * Minimal type declarations for picomatch v4.
 *
 * Only the subset of the API used by Prompt2PR is declared here.
 * picomatch does not ship its own type definitions.
 */
declare module 'picomatch' {
  interface PicomatchOptions {
    /** Enable dotfile matching. Default: false */
    dot?: boolean
    /** Enable brace expansion. Default: true */
    nobrace?: boolean
    /** Enable extglob patterns. Default: true */
    noextglob?: boolean
  }

  interface Picomatch {
    /**
     * Test whether a string matches a glob pattern.
     */
    isMatch(
      input: string,
      pattern: string | string[],
      options?: PicomatchOptions
    ): boolean
  }

  const picomatch: Picomatch
  export default picomatch
}
