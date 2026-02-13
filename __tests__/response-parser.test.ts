/**
 * Unit tests for the response parser — src/response-parser.ts
 *
 * Tests cover: valid response, empty files, malformed JSON, missing fields,
 * wrong types, raw JSON parsing.
 */
import { jest } from '@jest/globals'
import * as core from '../__fixtures__/core.js'

// Mock @actions/core before importing the module under test
jest.unstable_mockModule('@actions/core', () => core)

const { parseResponse, parseRawResponse } =
  await import('../src/response-parser.js')
const { ParseError } = await import('../src/errors.js')

import type { LLMResponse, FileChange } from '../src/providers/types.js'

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('response-parser.ts — parseResponse()', () => {
  afterEach(() => {
    jest.resetAllMocks()
  })

  // -- Valid response -------------------------------------------------------

  it('returns validated FileChange[] for a valid response', () => {
    const response: LLMResponse = {
      files: [
        {
          path: 'src/main.ts',
          content: 'console.log("hello")',
          action: 'modify'
        },
        { path: 'new-file.txt', content: 'new content', action: 'create' },
        { path: 'old-file.txt', content: '', action: 'delete' }
      ]
    }

    const result = parseResponse(response)

    expect(result).toHaveLength(3)
    expect(result[0]).toEqual({
      path: 'src/main.ts',
      content: 'console.log("hello")',
      action: 'modify'
    })
    expect(result[1]).toEqual({
      path: 'new-file.txt',
      content: 'new content',
      action: 'create'
    })
    expect(result[2]).toEqual({
      path: 'old-file.txt',
      content: '',
      action: 'delete'
    })
  })

  // -- Empty files (no changes) ---------------------------------------------

  it('returns empty array for empty files list (FR4)', () => {
    const response: LLMResponse = { files: [] }
    const result = parseResponse(response)

    expect(result).toEqual([])
  })

  // -- Missing fields -------------------------------------------------------

  it('throws ParseError when file entry is missing "path"', () => {
    const response: LLMResponse = {
      files: [
        { content: 'some content', action: 'modify' } as unknown as FileChange
      ]
    }

    expect(() => parseResponse(response)).toThrow(ParseError)
    expect(() => parseResponse(response)).toThrow(
      /'path' must be a non-empty string/
    )
  })

  it('throws ParseError when "path" is an empty string', () => {
    const response: LLMResponse = {
      files: [{ path: '', content: 'content', action: 'modify' }]
    }

    expect(() => parseResponse(response)).toThrow(ParseError)
    expect(() => parseResponse(response)).toThrow(
      /'path' must be a non-empty string/
    )
  })

  it('throws ParseError when "path" is whitespace only', () => {
    const response: LLMResponse = {
      files: [{ path: '   ', content: 'content', action: 'modify' }]
    }

    expect(() => parseResponse(response)).toThrow(ParseError)
    expect(() => parseResponse(response)).toThrow(
      /'path' must be a non-empty string/
    )
  })

  it('throws ParseError when file entry is missing "content"', () => {
    const response: LLMResponse = {
      files: [{ path: 'file.ts', action: 'modify' } as unknown as FileChange]
    }

    expect(() => parseResponse(response)).toThrow(ParseError)
    expect(() => parseResponse(response)).toThrow(/'content' must be a string/)
  })

  it('throws ParseError when file entry is missing "action"', () => {
    const response: LLMResponse = {
      files: [{ path: 'file.ts', content: 'code' } as unknown as FileChange]
    }

    expect(() => parseResponse(response)).toThrow(ParseError)
    expect(() => parseResponse(response)).toThrow(/'action' must be one of/)
  })

  // -- Wrong types ----------------------------------------------------------

  it('throws ParseError when "action" has invalid value', () => {
    const response: LLMResponse = {
      files: [
        {
          path: 'file.ts',
          content: 'code',
          action: 'update' as FileChange['action']
        }
      ]
    }

    expect(() => parseResponse(response)).toThrow(ParseError)
    expect(() => parseResponse(response)).toThrow(/'action' must be one of/)
    expect(() => parseResponse(response)).toThrow(/Got: 'update'/)
  })

  it('throws ParseError when file entry is not an object', () => {
    const response: LLMResponse = {
      files: ['not-an-object' as unknown as FileChange]
    }

    expect(() => parseResponse(response)).toThrow(ParseError)
    expect(() => parseResponse(response)).toThrow(/expected an object/)
  })

  it('throws ParseError when file entry is null', () => {
    const response: LLMResponse = {
      files: [null as unknown as FileChange]
    }

    expect(() => parseResponse(response)).toThrow(ParseError)
    expect(() => parseResponse(response)).toThrow(/expected an object/)
  })

  it('throws ParseError when "content" is a number', () => {
    const response: LLMResponse = {
      files: [
        {
          path: 'file.ts',
          content: 42 as unknown as string,
          action: 'modify'
        }
      ]
    }

    expect(() => parseResponse(response)).toThrow(ParseError)
    expect(() => parseResponse(response)).toThrow(/'content' must be a string/)
  })

  // -- Includes index in error message --------------------------------------

  it('includes the index in error messages', () => {
    const response: LLMResponse = {
      files: [
        { path: 'good.ts', content: 'ok', action: 'modify' },
        { path: '', content: 'bad', action: 'modify' }
      ]
    }

    expect(() => parseResponse(response)).toThrow(/index 1/)
  })

  // -- Logs correctly -------------------------------------------------------

  it('logs the number of file changes by action type', () => {
    const response: LLMResponse = {
      files: [
        { path: 'a.ts', content: 'code', action: 'modify' },
        { path: 'b.ts', content: 'new', action: 'create' }
      ]
    }

    parseResponse(response)

    expect(core.info).toHaveBeenCalledWith(expect.stringContaining('1 modify'))
    expect(core.info).toHaveBeenCalledWith(expect.stringContaining('1 create'))
  })
})

describe('response-parser.ts — parseRawResponse()', () => {
  afterEach(() => {
    jest.resetAllMocks()
  })

  it('parses valid raw JSON string', () => {
    const raw = JSON.stringify({
      files: [{ path: 'test.ts', content: 'code', action: 'modify' }]
    })

    const result = parseRawResponse(raw)
    expect(result).toHaveLength(1)
    expect(result[0].path).toBe('test.ts')
  })

  it('throws ParseError for invalid JSON', () => {
    expect(() => parseRawResponse('not json')).toThrow(ParseError)
    expect(() => parseRawResponse('not json')).toThrow(
      /Failed to parse LLM response as JSON/
    )
  })

  it('throws ParseError for non-object JSON (e.g. array)', () => {
    expect(() => parseRawResponse('[]')).toThrow(ParseError)
    expect(() => parseRawResponse('[]')).toThrow(
      /expected \{ files: \[...\] \}/
    )
  })

  it('throws ParseError for non-object JSON (e.g. string)', () => {
    expect(() => parseRawResponse('"hello"')).toThrow(ParseError)
    expect(() => parseRawResponse('"hello"')).toThrow(/expected an object/)
  })

  it('throws ParseError when "files" key is missing', () => {
    expect(() => parseRawResponse('{"changes": []}')).toThrow(ParseError)
    expect(() => parseRawResponse('{"changes": []}')).toThrow(
      /expected \{ files: \[...\] \}/
    )
  })

  it('throws ParseError when "files" is not an array', () => {
    expect(() => parseRawResponse('{"files": "not-array"}')).toThrow(ParseError)
    expect(() => parseRawResponse('{"files": "not-array"}')).toThrow(
      /expected \{ files: \[...\] \}/
    )
  })

  it('returns empty array for empty files', () => {
    const result = parseRawResponse('{"files": []}')
    expect(result).toEqual([])
  })
})
