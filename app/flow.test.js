import { describe, expect, it } from 'vitest'
import {
  MAX_WORDS,
  MIN_WORDS,
  appendPrompt,
  canComplete,
  countWords,
  emptyChecks,
  isWordCountInRange,
  reviewItems,
} from './flow.js'

const words = (n) => Array.from({ length: n }, (_, i) => `wort${i + 1}`).join(' ')
const allChecked = () => reviewItems.map(() => true)

describe('countWords', () => {
  it('returns 0 for empty or whitespace-only drafts', () => {
    expect(countWords('')).toBe(0)
    expect(countWords('   \n\t ')).toBe(0)
    expect(countWords(undefined)).toBe(0)
  })

  it('counts words separated by any whitespace', () => {
    expect(countWords('  Liebe   Mara,\nes tut\tmir leid ')).toBe(6)
  })

  it('treats umlauts and punctuation as part of a word', () => {
    expect(countWords('Können wir uns am Montag treffen?')).toBe(6)
  })
})

describe('isWordCountInRange', () => {
  it('accepts the inclusive 30–50 boundaries', () => {
    expect(MIN_WORDS).toBe(30)
    expect(MAX_WORDS).toBe(50)
    expect(isWordCountInRange(29)).toBe(false)
    expect(isWordCountInRange(30)).toBe(true)
    expect(isWordCountInRange(50)).toBe(true)
    expect(isWordCountInRange(51)).toBe(false)
  })
})

describe('appendPrompt', () => {
  it('inserts into an empty draft without a leading space', () => {
    expect(appendPrompt('', 'Hast du am … Zeit?')).toBe('Hast du am … Zeit?')
  })

  it('adds exactly one separating space', () => {
    expect(appendPrompt('Liebe Mara,', 'Es tut mir leid, dass …')).toBe('Liebe Mara, Es tut mir leid, dass …')
    expect(appendPrompt('Liebe Mara, ', 'Es tut mir leid, dass …')).toBe('Liebe Mara, Es tut mir leid, dass …')
  })
})

describe('canComplete', () => {
  it('requires all four self-checks', () => {
    expect(emptyChecks()).toEqual([false, false, false, false])
    expect(canComplete(words(40), [true, true, true, false])).toBe(false)
    expect(canComplete(words(40), allChecked())).toBe(true)
  })

  it('requires the draft to be 30–50 words', () => {
    expect(canComplete(words(29), allChecked())).toBe(false)
    expect(canComplete(words(30), allChecked())).toBe(true)
    expect(canComplete(words(50), allChecked())).toBe(true)
    expect(canComplete(words(51), allChecked())).toBe(false)
  })

  it('rejects a malformed checks array', () => {
    expect(canComplete(words(40), [true, true, true])).toBe(false)
  })
})
