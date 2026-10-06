import { useState } from 'react'
import { createRoot } from 'react-dom/client'
import './style.css'

const prompts = [
  'Es tut mir leid, dass …',
  'Können wir uns am … treffen?',
  'Hast du am … Zeit?',
]

const reviewItems = [
  'Habe ich mich entschuldigt und einen Grund genannt?',
  'Habe ich einen konkreten neuen Termin vorgeschlagen?',
  'Habe ich gefragt, ob Mara dann Zeit hat?',
  'Hat meine Nachricht 30–50 Wörter?',
]

function CaseBreaker() {
  const [step, setStep] = useState(0)
  const [draft, setDraft] = useState('')
  const [checks, setChecks] = useState(reviewItems.map(() => false))
  const [finished, setFinished] = useState(false)
  const wordCount = draft.trim() ? draft.trim().split(/\s+/u).length : 0
  const wordCountInRange = wordCount >= 30 && wordCount <= 50

  function insertPrompt(prompt) {
    setDraft((current) => `${current}${current && !current.endsWith(' ') ? ' ' : ''}${prompt}`)
  }

  function toggleCheck(index) {
    setChecks((current) => current.map((checked, item) => item === index ? !checked : checked))
  }

  function startAgain() {
    setStep(0)
    setDraft('')
    setChecks(reviewItems.map(() => false))
    setFinished(false)
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#start" aria-label="Case Breaker Startseite">
          <span className="brand-mark" aria-hidden="true">CB</span>
          <span className="brand-name">CASE BREAKER<span className="brand-dot">.</span></span>
        </a>
        <div className="topbar-right">
          <span className="level-pill"><span className="status-dot" /> DEIN TRAINING <b>B1</b></span>
          <span className="demo-label">DEMO-FALL</span>
        </div>
      </header>

      <main id="start" className="workspace">
        <aside className="rail" aria-label="Fallübersicht">
          <div className="rail-kicker">DEIN FALLHEFT</div>
          <div className="case-number">01<span>/</span>01</div>
          <p className="rail-caption">Schreiben<br />im Alltag</p>
          <div className="rail-rule" />
          <ol className="step-list" aria-label="Übungsschritte">
            <li className={step === 0 ? 'step-item current' : step > 0 ? 'step-item done' : 'step-item'} aria-current={step === 0 ? 'step' : undefined}>
              <span className="step-marker">{step > 0 ? '✓' : '01'}</span><span>Fall lesen</span>
            </li>
            <li className={step === 1 ? 'step-item current' : step > 1 ? 'step-item done' : 'step-item'} aria-current={step === 1 ? 'step' : undefined}>
              <span className="step-marker">{step > 1 ? '✓' : '02'}</span><span>Antwort schreiben</span>
            </li>
            <li className={step === 2 ? 'step-item current' : finished ? 'step-item done' : 'step-item'} aria-current={step === 2 ? 'step' : undefined}>
              <span className="step-marker">{finished ? '✓' : '03'}</span><span>Selbst prüfen</span>
            </li>
          </ol>
          <div className="rail-note"><span className="note-star" aria-hidden="true">✳</span><p>Kleine Schritte.<br /><strong>Klarer Ausdruck.</strong></p></div>
        </aside>

        <section className="case-panel" aria-labelledby="case-title">
          <div className="case-meta">
            <span className="eyebrow">SCHREIBFALL <span className="eyebrow-slash">/</span> ALLTAG</span>
            <span className="time-estimate"><span aria-hidden="true">◷</span> 5 MIN</span>
          </div>

          <div className="case-heading">
            <p className="case-index">FALL 01&nbsp; · &nbsp;EINE NACHRICHT AN MARA</p>
            <h1 id="case-title">Ein neuer<br /><em>Termin.</em></h1>
            <p className="case-intro">Du kannst am Samstag nicht zum Lerntreffen kommen. Schreib Mara eine kurze Nachricht. Entschuldige dich, schlage einen neuen Termin vor und frage, ob sie Zeit hat.</p>
          </div>

          <div className="case-content">
            <div className="brief-card">
              <div className="brief-top"><span className="brief-label">DIE NACHRICHT</span><span className="brief-stamp">VON MARA · HEUTE</span></div>
              <p className="brief-copy">„Hallo! Treffen wir uns am Samstag um 15 Uhr zum Deutschlernen? Ich freue mich schon. Liebe Grüße, Mara“</p>
            </div>

            {step === 0 && !finished && (
              <div className="task-block">
                <div className="task-heading"><span className="task-icon" aria-hidden="true">↳</span><div><span className="brief-label">DEIN AUFTRAG</span><p>Antworte Mara in <strong>30–50 Wörtern.</strong></p></div></div>
                <div className="clue-grid">
                  <div className="clue"><span className="clue-no">1</span><span>Entschuldige dich und nenne den Grund.</span></div>
                  <div className="clue"><span className="clue-no">2</span><span>Schlage einen anderen Termin vor.</span></div>
                  <div className="clue"><span className="clue-no">3</span><span>Frage, ob Mara dann Zeit hat.</span></div>
                </div>
                <button className="primary-button" onClick={() => setStep(1)} type="button">Antwort schreiben <span aria-hidden="true">→</span></button>
              </div>
            )}

            {step === 1 && !finished && (
              <div className="writer-block">
                <div className="writer-heading"><div><span className="brief-label">DEINE ANTWORT</span><p>Schreib zuerst selbst. Die Satzanfänge helfen dir, wenn du sie brauchst.</p></div><span className="word-target">30–50 WÖRTER</span></div>
                <div className="prompt-chips" aria-label="Satzanfänge einfügen">{prompts.map((prompt) => <button type="button" key={prompt} onClick={() => insertPrompt(prompt)}>{prompt}</button>)}</div>
                <label className="sr-only" htmlFor="learner-draft">Deine Nachricht an Mara</label>
                <textarea id="learner-draft" value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Liebe Mara, es tut mir leid, aber …" rows="6" />
                <div className="writer-footer"><span className={wordCountInRange ? 'word-count good' : 'word-count'} aria-live="polite">{wordCount} <span>Wörter</span></span><span>Dein Entwurf bleibt in diesem Fenster.</span></div>
                <div className="button-row"><button className="text-button" onClick={() => setStep(0)} type="button">← Fall ansehen</button><button className="primary-button" onClick={() => setStep(2)} type="button">Selbst prüfen <span aria-hidden="true">→</span></button></div>
              </div>
            )}

            {step === 2 && !finished && (
              <div className="review-block">
                <div className="review-heading"><span className="brief-label">DEIN CHECK VOR DEM ABSENDEN</span><h2>Lies deine Nachricht noch einmal.</h2><p>Markiere jeden Punkt, den du in deinem Text geprüft hast. Du bekommst hier eine Lernhilfe, keine automatische Deutschnote.</p></div>
                <div className="review-list">{reviewItems.map((label, index) => <label className={checks[index] ? 'review-check checked' : 'review-check'} key={label}><input type="checkbox" checked={checks[index]} onChange={() => toggleCheck(index)} /><span className="custom-check" aria-hidden="true">{checks[index] ? '✓' : ''}</span><span>{label}</span></label>)}</div>
                {!wordCountInRange && <p className="word-warning" role="status">Dein Auftrag: 30–50 Wörter. Geh zurück und passe deinen Entwurf an.</p>}
                <div className="draft-recap"><span className="brief-label">DEIN ENTWURF · {wordCount} WÖRTER</span><p>{draft || 'Du hast noch keinen Entwurf geschrieben. Du kannst zurückgehen und einen ergänzen.'}</p></div>
                <div className="button-row"><button className="text-button" onClick={() => setStep(1)} type="button">← Entwurf bearbeiten</button><button className="primary-button" onClick={() => setFinished(true)} disabled={!checks.every(Boolean) || !wordCountInRange} type="button">Fall abschließen <span aria-hidden="true">→</span></button></div>
              </div>
            )}

            {finished && (
              <div className="finish-card" role="status" aria-live="polite">
                <span className="finish-seal" aria-hidden="true">✓</span>
                <span className="brief-label">FALL ABGESCHLOSSEN</span>
                <h2>Gut geprüft.</h2>
                <p>Du hast deine Nachricht selbst überarbeitet. Genau so wird aus einer Idee ein klarer Text.</p>
                <div className="finish-stats"><span><strong>{wordCount}</strong> Wörter</span><span><strong>4/4</strong> Punkte geprüft</span></div>
                <button className="text-button" onClick={startAgain} type="button">Noch einmal üben ↺</button>
              </div>
            )}
          </div>
          <footer className="case-footer"><span>CASE BREAKER <span className="footer-slash">/</span> DEUTSCH ÜBEN, FALL FÜR FALL.</span><span>DEMO-FALL · KEINE KI-KORREKTUR</span></footer>
        </section>
      </main>
    </div>
  )
}

createRoot(document.getElementById('root')).render(<CaseBreaker />)
