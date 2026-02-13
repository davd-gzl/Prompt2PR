/**
 * File scanner for Prompt2PR.
 *
 * Scans the repository for files matching user-defined glob patterns,
 * reads their content, and tracks sizes. Always excludes `.github/`
 * as a safety guardrail (FR31).
 *
 * @see _bmad-output/planning-artifacts/architecture.md#Boundary 5
 */

import * as fs from 'node:fs/promises'
import * as path from 'node:path'

import * as glob from '@actions/glob'

import { createLogger } from './logger.js'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Represents a single file read from the repository for LLM context.
 */
export interface FileContext {
  /** Relative path from the repository root. */
  path: string
  /** Full text content of the file. */
  content: string
  /** File size in bytes (FR16). */
  size: number
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * Patterns that are always excluded regardless of user configuration (FR31).
 * Uses negation patterns for @actions/glob.
 */
const ALWAYS_EXCLUDED_PATTERNS = ['.github/**']

/**
 * Common binary file extensions to skip (not useful as LLM context).
 */
const BINARY_EXTENSIONS = new Set([
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.bmp',
  '.ico',
  '.svg',
  '.webp',
  '.mp3',
  '.mp4',
  '.avi',
  '.mov',
  '.zip',
  '.tar',
  '.gz',
  '.7z',
  '.rar',
  '.pdf',
  '.woff',
  '.woff2',
  '.ttf',
  '.eot',
  '.exe',
  '.dll',
  '.so',
  '.dylib',
  '.bin',
  '.dat',
  '.lock'
])

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

const log = createLogger('scanner')

/**
 * Check if a file path has a known binary extension.
 */
function isBinaryFile(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase()
  return BINARY_EXTENSIONS.has(ext)
}

/**
 * Normalize a path to use forward slashes (for consistent glob matching).
 */
function toRelativePosix(filePath: string, workDir: string): string {
  return path.relative(workDir, filePath).split(path.sep).join('/')
}

// ---------------------------------------------------------------------------
// Main exported function
// ---------------------------------------------------------------------------

/**
 * Scan repository files matching the given glob patterns.
 *
 * Returns a `FileContext[]` containing the path, content, and size of each
 * matching file. Files in `.github/` are always excluded (FR31). Binary
 * files are skipped. Files are read relative to the working directory.
 *
 * @param patterns - Glob patterns to match (e.g., `['src/**', 'docs/**']`).
 * @param workDir - The repository working directory (defaults to `process.cwd()`).
 * @returns Array of file contexts for matched files.
 */
export async function scanFiles(
  patterns: string[],
  workDir: string = process.cwd()
): Promise<FileContext[]> {
  log.info(`Scanning files with patterns: ${patterns.join(', ')} in ${workDir}`)

  // Build the glob pattern string:
  // Include user patterns, then negate always-excluded patterns
  const includePatterns = patterns.map((p) => path.join(workDir, p))
  const excludePatterns = ALWAYS_EXCLUDED_PATTERNS.map(
    (p) => `!${path.join(workDir, p)}`
  )
  const allPatterns = [...includePatterns, ...excludePatterns].join('\n')

  const globber = await glob.create(allPatterns, {
    followSymbolicLinks: false
  })
  const matchedPaths = await globber.glob()

  log.info(`Glob matched ${matchedPaths.length} paths`)

  const results: FileContext[] = []
  let excludedBinary = 0
  let excludedDirectory = 0
  let excludedGitHub = 0

  for (const absPath of matchedPaths) {
    // Stat the file — skip directories
    const stat = await fs.stat(absPath)
    if (stat.isDirectory()) {
      excludedDirectory++
      continue
    }

    // Skip binary files
    if (isBinaryFile(absPath)) {
      excludedBinary++
      continue
    }

    const relativePath = toRelativePosix(absPath, workDir)

    // Defense-in-depth: double-check .github/ exclusion
    if (relativePath.startsWith('.github/') || relativePath === '.github') {
      excludedGitHub++
      continue
    }

    try {
      const content = await fs.readFile(absPath, 'utf-8')
      results.push({
        path: relativePath,
        content,
        size: stat.size
      })
    } catch {
      log.warn(`Could not read file: ${relativePath}, skipping`)
    }
  }

  log.info(
    `Scan complete: ${results.length} files loaded, ` +
      `${excludedBinary} binary files skipped, ` +
      `${excludedDirectory} directories skipped` +
      (excludedGitHub > 0 ? `, ${excludedGitHub} .github/ files excluded` : '')
  )

  return results
}
