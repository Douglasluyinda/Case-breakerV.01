import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CaseBreaker } from './CaseBreaker.jsx'
import { reviewItems } from './flow.js'

const words = (n) => Array.from({ length: n }, (_, i) => `wort${i + 1}`).join(' ')

function setup() {
  const user = userEvent.setup()
  render(<CaseBreaker />)
  return { user }
}

const startWriting = (user) => user.click(screen.getByRole('button', { name: /Antwort schreiben/ }))
const goToReview = (user) => user.click(screen.getByRole('button', { name: /Selbst prüfen/ }))
const backToDraft = (user) => user.click(screen.getByRole('button', { name: /Entwurf bearbeiten/ }))
const completeButton = () => screen.getByRole('button', { name: /Fall abschließen/ })
const draftBox = () => screen.getByLabelText('Deine Nachricht an Mara')

async function writeDraft(user, text) {
  const box = draftBox()
  await user.clear(box)
  if (text) {
    await user.click(box)
    await user.paste(text)
  }
}

async function checkAll(user) {
  for (const label of reviewItems) {
    await user.click(screen.getByRole('checkbox', { name: label }))
  }
}

describe('Case Breaker learner flow: acceptance', () => {
  it('runs case reading → writing → self-review → completion', async () => {
    const { user } = setup()

    // 1. Case reading
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Ein neuerTermin.')
    expect(screen.getByText(/Treffen wir uns am Samstag um 15 Uhr/)).toBeInTheDocument()
    expect(screen.getByText('Fall lesen').closest('li')).toHaveAttribute('aria-current', 'step')

    // 2. Writing
    await startWriting(user)
    expect(screen.getByText('Antwort schreiben').closest('li')).toHaveAttribute('aria-current', 'step')
    await writeDraft(user, words(35))

    // 3. Self-review
    await goToReview(user)
    expect(screen.getByText('Selbst prüfen').closest('li')).toHaveAttribute('aria-current', 'step')
    expect(screen.getByText(/DEIN ENTWURF · 35 WÖRTER/)).toBeInTheDocument()
    await checkAll(user)

    // 4. Completion
    expect(completeButton()).toBeEnabled()
    await user.click(completeButton())
    const finish = screen.getByRole('status')
    expect(finish).toHaveTextContent('FALL ABGESCHLOSSEN')
    expect(within(finish).getByText('35')).toBeInTheDocument()
    expect(finish).toHaveTextContent('4/4 Punkte geprüft')
  })

  it('shows a live word count while typing', async () => {
    const { user } = setup()
    await startWriting(user)
    const counter = screen.getByTestId('word-count')
    expect(counter).toHaveTextContent('0 Wörter')
    expect(counter).toHaveAttribute('aria-live', 'polite')

    await user.type(draftBox(), 'Liebe Mara')
    expect(counter).toHaveTextContent('2 Wörter')
    expect(counter).not.toHaveClass('good')

    await writeDraft(user, words(30))
    expect(counter).toHaveTextContent('30 Wörter')
    expect(counter).toHaveClass('good')

    await writeDraft(user, words(51))
    expect(counter).toHaveTextContent('51 Wörter')
    expect(counter).not.toHaveClass('good')
  })

  it.each([
    [29, false],
    [30, true],
    [50, true],
    [51, false],
  ])('with all checks ticked, %i words → completion enabled: %s', async (count, enabled) => {
    const { user } = setup()
    await startWriting(user)
    await writeDraft(user, words(count))
    await goToReview(user)
    await checkAll(user)
    if (enabled) {
      expect(completeButton()).toBeEnabled()
      expect(screen.queryByText(/Geh zurück und passe deinen Entwurf an/)).not.toBeInTheDocument()
    } else {
      expect(completeButton()).toBeDisabled()
      expect(screen.getByRole('status')).toHaveTextContent('Dein Auftrag: 30–50 Wörter.')
    }
  })

  it('requires every one of the four self-check items', async () => {
    const { user } = setup()
    await startWriting(user)
    await writeDraft(user, words(40))
    await goToReview(user)

    const boxes = screen.getAllByRole('checkbox')
    expect(boxes).toHaveLength(4)

    for (let i = 0; i < reviewItems.length - 1; i += 1) {
      await user.click(screen.getByRole('checkbox', { name: reviewItems[i] }))
      expect(completeButton()).toBeDisabled()
    }
    await user.click(screen.getByRole('checkbox', { name: reviewItems[3] }))
    expect(completeButton()).toBeEnabled()

    await user.click(screen.getByRole('checkbox', { name: reviewItems[0] }))
    expect(completeButton()).toBeDisabled()
  })

  it('preserves typed text and self-check answers when returning to the draft', async () => {
    const { user } = setup()
    const text = `Liebe Mara, ${words(32)}`
    await startWriting(user)
    await writeDraft(user, text)
    await goToReview(user)
    await user.click(screen.getByRole('checkbox', { name: reviewItems[0] }))
    await user.click(screen.getByRole('checkbox', { name: reviewItems[2] }))

    await backToDraft(user)
    expect(draftBox()).toHaveValue(text)

    await user.click(screen.getByRole('button', { name: /Fall ansehen/ }))
    await startWriting(user)
    expect(draftBox()).toHaveValue(text)

    await goToReview(user)
    expect(screen.getByRole('checkbox', { name: reviewItems[0] })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: reviewItems[1] })).not.toBeChecked()
    expect(screen.getByRole('checkbox', { name: reviewItems[2] })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: reviewItems[3] })).not.toBeChecked()
  })

  it('"Noch einmal üben" resets draft, checks, and progress', async () => {
    const { user } = setup()
    await startWriting(user)
    await writeDraft(user, words(40))
    await goToReview(user)
    await checkAll(user)
    await user.click(completeButton())

    await user.click(screen.getByRole('button', { name: /Noch einmal üben/ }))

    expect(screen.getByText('Fall lesen').closest('li')).toHaveAttribute('aria-current', 'step')
    expect(screen.getByText('03')).toBeInTheDocument()
    expect(screen.queryByText('FALL ABGESCHLOSSEN')).not.toBeInTheDocument()

    await startWriting(user)
    expect(draftBox()).toHaveValue('')
    expect(screen.getByTestId('word-count')).toHaveTextContent('0 Wörter')

    await goToReview(user)
    for (const box of screen.getAllByRole('checkbox')) {
      expect(box).not.toBeChecked()
    }
    expect(completeButton()).toBeDisabled()
  })

  it('sentence starters insert text into the draft', async () => {
    const { user } = setup()
    await startWriting(user)
    await user.type(draftBox(), 'Liebe Mara,')
    await user.click(screen.getByRole('button', { name: 'Es tut mir leid, dass …' }))
    expect(draftBox()).toHaveValue('Liebe Mara, Es tut mir leid, dass …')
  })
})

describe('Case Breaker learner flow: accessibility', () => {
  it('labels the textarea and every checkbox, and is keyboard operable', async () => {
    const { user } = setup()

    await user.tab()
    expect(screen.getByRole('link', { name: 'Case Breaker Startseite' })).toHaveFocus()
    await user.tab()
    const start = screen.getByRole('button', { name: /Antwort schreiben/ })
    expect(start).toHaveFocus()
    await user.keyboard('{Enter}')

    expect(draftBox().tagName).toBe('TEXTAREA')
    expect(screen.getByRole('group', { name: 'Satzanfänge einfügen' })).toBeInTheDocument()

    await user.click(draftBox())
    await user.paste(words(40))
    await goToReview(user)

    for (const label of reviewItems) {
      const box = screen.getByRole('checkbox', { name: label })
      box.focus()
      expect(box).toHaveFocus()
      await user.keyboard(' ')
      expect(box).toBeChecked()
    }
    const complete = completeButton()
    complete.focus()
    await user.keyboard('{Enter}')
    expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite')
  })
})

describe('Case Breaker learner flow: regression guard on scope claims', () => {
  let fetchSpy
  let setItemSpy

  beforeEach(() => {
    fetchSpy = undefined
    setItemSpy = undefined
    if (typeof globalThis.fetch === 'function') {
      fetchSpy = vi.spyOn(globalThis, 'fetch')
    }
    if (typeof Storage !== 'undefined') {
      setItemSpy = vi.spyOn(Storage.prototype, 'setItem')
    }
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('makes no network or storage calls and claims no login, payment, or AI grading', async () => {
    const { user } = setup()
    await startWriting(user)
    await writeDraft(user, words(40))
    await goToReview(user)
    await checkAll(user)
    await user.click(completeButton())

    if (fetchSpy) expect(fetchSpy).not.toHaveBeenCalled()
    if (setItemSpy) expect(setItemSpy).not.toHaveBeenCalled()

    expect(screen.getByText('DEMO-FALL · KEINE KI-KORREKTUR')).toBeInTheDocument()
    expect(document.querySelector('input[type="password"], input[type="email"], form')).toBeNull()

    const pageText = document.body.textContent ?? ''
    expect(pageText).not.toMatch(/anmelden|einloggen|login|registrieren|bezahlen|kaufen|abo\b|premium/iu)
    expect(pageText).not.toMatch(/KI-Bewertung|automatisch korrigiert|deine Note:/iu)
  })
})
