// Pure learner-flow rules for the Case Breaker MVP writing case.
// Kept free of React so the rules can be unit-tested directly.

export const MIN_WORDS = 30
export const MAX_WORDS = 50

export const prompts = [
  'Es tut mir leid, dass …',
  'Können wir uns am … treffen?',
  'Hast du am … Zeit?',
]

export const reviewItems = [
  'Habe ich mich entschuldigt und einen Grund genannt?',
  'Habe ich einen konkreten neuen Termin vorgeschlagen?',
  'Habe ich gefragt, ob Mara dann Zeit hat?',
  'Hat meine Nachricht 30–50 Wörter?',
]

export function countWords(text) {
  const trimmed = (text ?? '').trim()
  return trimmed ? trimmed.split(/\s+/u).length : 0
}

export function isWordCountInRange(count) {
  return count >= MIN_WORDS && count <= MAX_WORDS
}

export function appendPrompt(current, prompt) {
  const separator = current && !current.endsWith(' ') ? ' ' : ''
  return `${current}${separator}${prompt}`
}

export function emptyChecks() {
  return reviewItems.map(() => false)
}

export function canComplete(draft, checks) {
  return (
    checks.length === reviewItems.length &&
    checks.every(Boolean) &&
    isWordCountInRange(countWords(draft))
  )
}
