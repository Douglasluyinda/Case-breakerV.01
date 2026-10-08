import { useState, useEffect, useRef, useCallback } from "react";

// ─── GAME DATA ────────────────────────────────────────────────────────────────

const SENTENCES = [
  // Tier 1: Nominativ masc (subject = DER)
  { template: "___ Hund bellt laut.", answer: "DER", opts: ["DER","DEN","DEM"], case: "NOMI", tier: 1 },
  { template: "___ Mann schläft tief.", answer: "DER", opts: ["DER","DEN","DAS"], case: "NOMI", tier: 1 },
  { template: "___ Zug kommt an.", answer: "DER", opts: ["DER","DEN","DIE"], case: "NOMI", tier: 1 },
  { template: "___ Junge läuft schnell.", answer: "DER", opts: ["DER","DEN","DEM"], case: "NOMI", tier: 1 },
  { template: "___ Arzt arbeitet heute.", answer: "DER", opts: ["DER","DEN","DAS"], case: "NOMI", tier: 1 },
  { template: "___ Brief liegt hier.", answer: "DER", opts: ["DER","DEN","DIE"], case: "NOMI", tier: 1 },
  { template: "___ Tisch ist groß.", answer: "DER", opts: ["DER","DEN","DEM"], case: "NOMI", tier: 1 },
  // Tier 2: + Akkusativ masc (direct object = DEN)
  { template: "Ich sehe ___ Mann.", answer: "DEN", opts: ["DER","DEN","DEM"], case: "AKKU", tier: 2 },
  { template: "Er kauft ___ Hund.", answer: "DEN", opts: ["DER","DEN","DAS"], case: "AKKU", tier: 2 },
  { template: "Wir rufen ___ Arzt.", answer: "DEN", opts: ["DER","DEN","DIE"], case: "AKKU", tier: 2 },
  { template: "Ich nehme ___ Zug.", answer: "DEN", opts: ["DER","DEN","DEM"], case: "AKKU", tier: 2 },
  { template: "Sie schreibt ___ Brief.", answer: "DEN", opts: ["DER","DEN","DAS"], case: "AKKU", tier: 2 },
  { template: "Er braucht ___ Tisch.", answer: "DEN", opts: ["DER","DEN","DIE"], case: "AKKU", tier: 2 },
  { template: "___ Ball schießt er.", answer: "DEN", opts: ["DER","DEN","DEM"], case: "AKKU", tier: 2 },
  { template: "___ Hund höre ich.", answer: "DEN", opts: ["DER","DEN","DAS"], case: "AKKU", tier: 2 },
  // Tier 3: + Feminine NOM=DIE, AKK=DIE
  { template: "___ Frau singt schön.", answer: "DIE", opts: ["DER","DIE","DEN"], case: "NOMI", tier: 3 },
  { template: "___ Katze schläft jetzt.", answer: "DIE", opts: ["DER","DIE","DAS"], case: "NOMI", tier: 3 },
  { template: "___ Schule ist alt.", answer: "DIE", opts: ["DER","DIE","DEN"], case: "NOMI", tier: 3 },
  { template: "___ Mutter kommt bald.", answer: "DIE", opts: ["DER","DIE","DEM"], case: "NOMI", tier: 3 },
  { template: "Er liebt ___ Frau.", answer: "DIE", opts: ["DER","DIE","DEN"], case: "AKKU", tier: 3 },
  { template: "Ich sehe ___ Katze.", answer: "DIE", opts: ["DER","DIE","DEM"], case: "AKKU", tier: 3 },
  { template: "Er besucht ___ Schule.", answer: "DIE", opts: ["DER","DIE","DEN"], case: "AKKU", tier: 3 },
  // Tier 4: + Neuter NOM=DAS, AKK=DAS
  { template: "___ Kind spielt draußen.", answer: "DAS", opts: ["DER","DIE","DAS"], case: "NOMI", tier: 4 },
  { template: "___ Auto fährt schnell.", answer: "DAS", opts: ["DER","DIE","DAS"], case: "NOMI", tier: 4 },
  { template: "___ Buch liegt dort.", answer: "DAS", opts: ["DEN","DIE","DAS"], case: "NOMI", tier: 4 },
  { template: "Er liest ___ Buch.", answer: "DAS", opts: ["DEN","DIE","DAS"], case: "AKKU", tier: 4 },
  { template: "Ich kaufe ___ Auto.", answer: "DAS", opts: ["DEN","DIE","DAS"], case: "AKKU", tier: 4 },
  { template: "Sie sieht ___ Kind.", answer: "DAS", opts: ["DER","DEN","DAS"], case: "AKKU", tier: 4 },
  // Tier 5: Dativ masc=DEM, fem=DER, neut=DEM
  { template: "Er hilft ___ Mann.", answer: "DEM", opts: ["DEN","DER","DEM"], case: "DATIV", tier: 5 },
  { template: "Sie gibt ___ Kind das Buch.", answer: "DEM", opts: ["DAS","DEN","DEM"], case: "DATIV", tier: 5 },
  { template: "Ich danke ___ Arzt.", answer: "DEM", opts: ["DEN","DIE","DEM"], case: "DATIV", tier: 5 },
  { template: "Wir folgen ___ Mann.", answer: "DEM", opts: ["DEN","DER","DEM"], case: "DATIV", tier: 5 },
  { template: "Er zeigt ___ Frau den Weg.", answer: "DER", opts: ["DIE","DEN","DER"], case: "DATIV", tier: 5 },
  { template: "Sie hilft ___ Mutter.", answer: "DER", opts: ["DIE","DEM","DER"], case: "DATIV", tier: 5 },
  { template: "Ich gebe ___ Kind Milch.", answer: "DEM", opts: ["DAS","DEN","DEM"], case: "DATIV", tier: 5 },
  { template: "Er spricht mit ___ Arzt.", answer: "DEM", opts: ["DEN","DER","DEM"], case: "DATIV", tier: 5 },
  { template: "Sie wohnt bei ___ Frau.", answer: "DER", opts: ["DIE","DEM","DER"], case: "DATIV", tier: 5 },
  { template: "Ich spiele mit ___ Kind.", answer: "DEM", opts: ["DAS","DEN","DEM"], case: "DATIV", tier: 5 },
  // Tier 6: Genitiv masc/neut=DES, fem=DER
  { template: "Das Auto ___ Mannes ist rot.", answer: "DES", opts: ["DEM","DEN","DES"], case: "GENIT", tier: 6 },
  { template: "Die Tasche ___ Frau ist schwer.", answer: "DER", opts: ["DIE","DEM","DER"], case: "GENIT", tier: 6 },
  { template: "Das Dach ___ Hauses ist neu.", answer: "DES", opts: ["DEM","DAS","DES"], case: "GENIT", tier: 6 },
  { template: "Der Name ___ Hundes ist Max.", answer: "DES", opts: ["DEM","DEN","DES"], case: "GENIT", tier: 6 },
  { template: "Das Spielzeug ___ Kindes fehlt.", answer: "DES", opts: ["DEM","DAS","DES"], case: "GENIT", tier: 6 },
  { template: "Die Stimme ___ Mutter ist laut.", answer: "DER", opts: ["DIE","DEM","DER"], case: "GENIT", tier: 6 },
  { template: "Der Beruf ___ Vaters ist Arzt.", answer: "DES", opts: ["DEM","DEN","DES"], case: "GENIT", tier: 6 },
  { template: "Das Ende ___ Films war gut.", answer: "DES", opts: ["DEM","DAS","DES"], case: "GENIT", tier: 6 },
  { template: "Die Farbe ___ Autos ist blau.", answer: "DES", opts: ["DEM","DAS","DES"], case: "GENIT", tier: 6 },
  { template: "Der Titel ___ Buches ist lang.", answer: "DES", opts: ["DEM","DEN","DES"], case: "GENIT", tier: 6 },
  { template: "Die Meinung ___ Lehrerin zählt.", answer: "DER", opts: ["DIE","DEM","DER"], case: "GENIT", tier: 6 },
  { template: "Wegen ___ Regens bleibt er.", answer: "DES", opts: ["DEM","DEN","DES"], case: "GENIT", tier: 6 },
  { template: "Trotz ___ Kälte geht er raus.", answer: "DER", opts: ["DIE","DEM","DER"], case: "GENIT", tier: 6 },
  { template: "Wegen ___ Unfalls gibt es Stau.", answer: "DES", opts: ["DEM","DEN","DES"], case: "GENIT", tier: 6 },
  { template: "Das Herz ___ Löwen ist mutig.", answer: "DES", opts: ["DEM","DEN","DES"], case: "GENIT", tier: 6 },
];

const CASE_CONFIG = {
  NOMI:  { color: "#60a5fa", glow: "#3b82f6", bg: "rgba(30,64,175,0.35)",   label: "NOMINATIV",  emoji: "🔵", desc: "Subject (Wer?)" },
  AKKU:  { color: "#f87171", glow: "#ef4444", bg: "rgba(185,28,28,0.35)",   label: "AKKUSATIV",  emoji: "🔴", desc: "Object (Wen?)" },
  DATIV: { color: "#4ade80", glow: "#22c55e", bg: "rgba(21,128,61,0.35)",   label: "DATIV",      emoji: "🟢", desc: "Indirect (Wem?)" },
  GENIT: { color: "#fbbf24", glow: "#f59e0b", bg: "rgba(120,85,0,0.35)",    label: "GENITIV",    emoji: "🟡", desc: "Possession (Wessen?)" },
};

const TIER_INFO = [
  { t: 1, label: "I",   name: "NOMINATIV",    sub: "Masculine only",      color: "#60a5fa" },
  { t: 2, label: "II",  name: "NOM + AKK",    sub: "Masculine",           color: "#a78bfa" },
  { t: 3, label: "III", name: "+ FEMININ",     sub: "All genders",         color: "#f472b6" },
  { t: 4, label: "IV",  name: "+ NEUTRUM",     sub: "4 articles",          color: "#fb923c" },
  { t: 5, label: "V",   name: "FULL DATIV",    sub: "All cases + genders", color: "#4ade80" },
  { t: 6, label: "VI",  name: "ALL 4 CASES",   sub: "incl. Genitiv",       color: "#fbbf24" },
];

function genQueue(tier, n = 12) {
  const pool = SENTENCES.filter(s => s.tier <= tier);
  return Array.from({ length: n }, () => ({
    ...pool[Math.floor(Math.random() * pool.length)],
    uid: Math.random().toString(36).slice(2),
  }));
}

// ─── PARTICLES ────────────────────────────────────────────────────────────────

function Particles({ bursts }) {
  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 50 }}>
      {bursts.map(burst =>
        burst.particles.map((p, i) => (
          <div key={`${burst.id}-${i}`} style={{
            position: "absolute",
            left: p.x, top: p.y,
            width: p.size, height: p.size,
            borderRadius: "50%",
            background: burst.color,
            boxShadow: `0 0 ${p.size * 2}px ${burst.color}`,
            animation: `pfly${burst.id.slice(-4)} 0.65s ease-out forwards`,
            "--dx": p.dx, "--dy": p.dy,
            opacity: 1,
          }} />
        ))
      )}
    </div>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

export default function CaseBreaker() {
  const [phase,      setPhase]      = useState("menu");
  const [tier,       setTier]       = useState(1);
  const [queue,      setQueue]      = useState([]);
  const [hearts,     setHearts]     = useState(5);
  const [score,      setScore]      = useState(0);
  const [combo,      setCombo]      = useState(0);
  const [maxCombo,   setMaxCombo]   = useState(0);
  const [timeLeft,   setTimeLeft]   = useState(60);
  const [brickState, setBrickState] = useState("idle");
  const [feedback,   setFeedback]   = useState(null);
  const [comboAnim,  setComboAnim]  = useState(false);
  const [wrongFlash, setWrongFlash] = useState(false);
  const [bursts,     setBursts]     = useState([]);
  const [highScore,  setHighScore]  = useState(0);
  const [accuracy,   setAccuracy]   = useState({ NOMI:{c:0,t:0}, AKKU:{c:0,t:0}, DATIV:{c:0,t:0}, GENIT:{c:0,t:0} });
  const [chosenOpt,  setChosenOpt]  = useState(null);

  const brickEl  = useRef(null);
  const rootEl   = useRef(null);
  const timerRef = useRef(null);
  const heartsRef = useRef(hearts);
  heartsRef.current = hearts;

  const activeBrick  = queue[0] || null;
  const previewBricks = queue.slice(1, 4);

  // ─── Timer ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== "playing") return;
    if (timeLeft <= 0) { setPhase("roundend"); return; }
    timerRef.current = setTimeout(() => setTimeLeft(t => t - 1), 1000);
    return () => clearTimeout(timerRef.current);
  }, [phase, timeLeft]);

  // ─── Round end → record high score ────────────────────────────────────────
  useEffect(() => {
    if (phase === "roundend") setHighScore(h => Math.max(h, score));
  }, [phase]);

  // ─── Start ────────────────────────────────────────────────────────────────
  function startGame() {
    setQueue(genQueue(tier, 40));
    setHearts(5);
    setScore(0);
    setCombo(0);
    setMaxCombo(0);
    setTimeLeft(60);
    setBrickState("idle");
    setFeedback(null);
    setBursts([]);
    setChosenOpt(null);
    setAccuracy({ NOMI:{c:0,t:0}, AKKU:{c:0,t:0}, DATIV:{c:0,t:0}, GENIT:{c:0,t:0} });
    setPhase("playing");
  }

  // ─── Particle burst ───────────────────────────────────────────────────────
  function spawnBurst(color) {
    if (!brickEl.current || !rootEl.current) return;
    const br = brickEl.current.getBoundingClientRect();
    const rr = rootEl.current.getBoundingClientRect();
    const cx = br.left - rr.left + br.width / 2;
    const cy = br.top - rr.top + br.height / 2;
    const id = Math.random().toString(36).slice(2);
    const particles = Array.from({ length: 16 }, () => {
      const angle = Math.random() * Math.PI * 2;
      const dist  = 40 + Math.random() * 80;
      return {
        x: cx + (Math.random() - 0.5) * 60,
        y: cy + (Math.random() - 0.5) * 30,
        dx: `${(Math.cos(angle) * dist).toFixed(1)}px`,
        dy: `${(Math.sin(angle) * dist).toFixed(1)}px`,
        size: 4 + Math.random() * 6,
      };
    });
    // Inject keyframe dynamically
    const styleId = `pfly${id.slice(-4)}`;
    if (!document.getElementById(styleId)) {
      const s = document.createElement("style");
      s.id = styleId;
      s.textContent = `@keyframes pfly${id.slice(-4)} { 0%{transform:translate(0,0) scale(1);opacity:1} 100%{transform:translate(var(--dx),var(--dy)) scale(0);opacity:0} }`;
      document.head.appendChild(s);
    }
    setBursts(b => [...b, { id, color, particles }]);
    setTimeout(() => setBursts(b => b.filter(x => x.id !== id)), 700);
  }

  // ─── Answer handler ───────────────────────────────────────────────────────
  function handleAnswer(choice) {
    if (brickState !== "idle" || !activeBrick) return;
    const correct = choice === activeBrick.answer;
    setChosenOpt(choice);

    setAccuracy(a => ({
      ...a,
      [activeBrick.case]: {
        c: a[activeBrick.case].c + (correct ? 1 : 0),
        t: a[activeBrick.case].t + 1,
      }
    }));

    if (correct) {
      const nc = combo + 1;
      const pts = Math.round(100 * (1 + Math.floor(nc / 3) * 0.5) * (nc >= 15 ? 3 : 1));
      setScore(s => s + pts);
      setCombo(nc);
      setMaxCombo(m => Math.max(m, nc));
      setBrickState("correct");
      setFeedback(
        nc >= 15 ? "⚡ FEVER MODE ⚡" :
        nc >= 7  ? "GRAMMAR GOD 🔥" :
        nc >= 3  ? `${nc}x KOMBO!` :
        "RICHTIG! ✓"
      );
      spawnBurst(CASE_CONFIG[activeBrick.case].color);
      setComboAnim(true);
      setTimeout(() => setComboAnim(false), 400);
      setTimeout(() => {
        setBrickState("idle");
        setFeedback(null);
        setChosenOpt(null);
        setQueue(q => {
          const next = q.slice(1);
          return next.length < 8 ? [...next, ...genQueue(tier, 10)] : next;
        });
      }, 360);

    } else {
      setCombo(0);
      setBrickState("cracked");
      setFeedback(`FALSCH → ${activeBrick.answer}`);
      setWrongFlash(true);
      setTimeout(() => setWrongFlash(false), 320);
      const nh = heartsRef.current - 1;
      setHearts(nh);
      setTimeout(() => {
        setBrickState("idle");
        setFeedback(null);
        setChosenOpt(null);
        if (nh <= 0) { setPhase("roundend"); return; }
        setQueue(q => {
          const next = q.slice(1);
          return next.length < 8 ? [...next, ...genQueue(tier, 10)] : next;
        });
      }, 580);
    }
  }

  // ─── Screens ──────────────────────────────────────────────────────────────
  if (phase === "menu")     return <MenuScreen     tier={tier} setTier={setTier} onStart={startGame} highScore={highScore} />;
  if (phase === "roundend") return <RoundEndScreen score={score} maxCombo={maxCombo} accuracy={accuracy} hearts={hearts} onReplay={startGame} onMenu={() => setPhase("menu")} highScore={highScore} />;

  const cfg         = activeBrick ? CASE_CONFIG[activeBrick.case] : null;
  const timerUrgent = timeLeft <= 10;
  const feverMode   = combo >= 15;

  return (
    <>
      <GameStyles />
      <div
        ref={rootEl}
        data-game-root
        style={{
          minHeight: "100vh",
          background: `
            radial-gradient(ellipse at 15% 60%, rgba(30,58,138,0.35) 0%, transparent 55%),
            radial-gradient(ellipse at 85% 20%, ${tier === 6 ? "rgba(120,85,0,0.3)" : "rgba(127,29,29,0.25)"} 0%, transparent 55%),
            #080d1a
          `,
          fontFamily: "'Share Tech Mono', monospace",
          color: "#e2e8f0",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          padding: "12px 16px 24px",
          position: "relative",
          overflow: "hidden",
          animation: wrongFlash ? "g-shake 0.3s ease" : "none",
        }}
      >
        {/* Scanlines */}
        <div style={{
          position: "fixed", inset: 0, pointerEvents: "none", zIndex: 60,
          background: "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.04) 3px, rgba(0,0,0,0.04) 4px)",
        }} />

        <Particles bursts={bursts} />

        {/* ── HUD ── */}
        <div style={{ width: "100%", maxWidth: 460, display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>

          {/* Score */}
          <div>
            <div style={{ fontSize: 10, letterSpacing: "0.12em", color: "#475569" }}>SCORE</div>
            <div style={{ fontSize: 28, fontFamily: "'Orbitron',sans-serif", fontWeight: 900, color: "#f1f5f9", lineHeight: 1 }}>
              {score.toString().padStart(6, "0")}
            </div>
          </div>

          {/* Timer */}
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 10, letterSpacing: "0.12em", color: "#475569" }}>ZEIT</div>
            <div style={{
              fontSize: 44, fontFamily: "'Orbitron',sans-serif", fontWeight: 900, lineHeight: 1,
              color: timerUrgent ? "#ef4444" : "#f1f5f9",
              animation: timerUrgent ? "urgent-pulse 0.5s infinite" : "none",
              textShadow: timerUrgent ? "0 0 20px #ef4444" : "none",
            }}>
              {String(Math.max(0, timeLeft)).padStart(2, "0")}
            </div>
          </div>

          {/* Hearts + Combo */}
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 16, marginBottom: 4, letterSpacing: 2 }}>
              {Array.from({ length: 5 }).map((_, i) => (
                <span key={i} style={{
                  display: "inline-block",
                  opacity: i < hearts ? 1 : 0.15,
                  filter: i < hearts ? "drop-shadow(0 0 4px #ef4444)" : "none",
                  transition: "all 0.3s",
                  fontSize: 14,
                }}>❤️</span>
              ))}
            </div>
            <div style={{
              fontSize: 13,
              fontFamily: "'Orbitron',sans-serif",
              color: feverMode ? "#fbbf24" : combo >= 7 ? "#fb923c" : combo >= 3 ? "#4ade80" : "#334155",
              animation: comboAnim ? "combo-pop 0.4s ease" : "none",
              transition: "color 0.3s",
            }}>
              {combo > 1 ? `🔥 ×${combo}` : "× 0"}
            </div>
          </div>
        </div>

        {/* Tier tag */}
        <div style={{
          fontSize: 10, letterSpacing: "0.18em", color: "#334155",
          marginBottom: 10, textTransform: "uppercase",
        }}>
          TIER {tier} — {TIER_INFO[tier-1].name}
        </div>

        {/* ── BRICK FIELD ── */}
        <div style={{ width: "100%", maxWidth: 460, position: "relative", marginBottom: 0 }}>

          {/* Preview bricks */}
          <div style={{ marginBottom: 6 }}>
            {[...previewBricks].reverse().map((b, i) => {
              const bc = CASE_CONFIG[b.case];
              return (
                <div key={b.uid} style={{
                  padding: "7px 14px",
                  marginBottom: 4,
                  borderRadius: 8,
                  border: `1px solid ${bc.color}33`,
                  background: `${bc.bg}`,
                  fontSize: 13,
                  color: "#64748b",
                  fontFamily: "'Share Tech Mono', monospace",
                  opacity: 0.3 + i * 0.2,
                  animation: "brick-enter 0.3s ease",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  letterSpacing: "0.02em",
                }}>
                  <span style={{ fontSize: 9, color: bc.color, minWidth: 60, letterSpacing: "0.12em" }}>{bc.label}</span>
                  <span>{b.template.replace("___", "[ · ]")}</span>
                </div>
              );
            })}
          </div>

          {/* Active brick */}
          <div
            ref={brickEl}
            style={{
              padding: "22px 26px",
              borderRadius: 14,
              border: `2px solid ${cfg ? cfg.color : "#1e293b"}`,
              background: brickState === "cracked"
                ? "rgba(185,28,28,0.3)"
                : brickState === "correct"
                ? "rgba(74,222,128,0.15)"
                : cfg ? cfg.bg : "rgba(30,41,59,0.6)",
              boxShadow: cfg
                ? `0 0 36px ${cfg.glow}44, inset 0 0 30px rgba(0,0,0,0.3)`
                : "none",
              minHeight: 90,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "column",
              position: "relative",
              animation: brickState === "cracked"
                ? "g-brick-wrong 0.3s ease"
                : brickState === "correct"
                ? "g-brick-correct 0.36s ease forwards"
                : activeBrick?.case === "GENIT"
                ? "genit-glow 2s ease-in-out infinite"
                : "brick-enter 0.3s ease",
              transition: "border-color 0.2s, background 0.2s, box-shadow 0.2s",
            }}
          >
            {/* Case label */}
            {cfg && (
              <div style={{
                position: "absolute", top: 7, left: 12,
                fontSize: 9, letterSpacing: "0.2em",
                color: cfg.color, opacity: 0.85,
                fontFamily: "'Orbitron',sans-serif",
              }}>
                {cfg.label}
              </div>
            )}

            {/* Sentence */}
            {activeBrick ? (
              <div style={{
                fontSize: "clamp(18px, 5vw, 24px)",
                fontFamily: "'Share Tech Mono', monospace",
                fontWeight: "bold",
                color: "#f1f5f9",
                letterSpacing: "0.04em",
                textAlign: "center",
              }}>
                {activeBrick.template.split("___").map((part, i, arr) => (
                  <span key={i}>
                    {part}
                    {i < arr.length - 1 && (
                      <span style={{
                        display: "inline-block",
                        minWidth: 62,
                        margin: "0 5px",
                        borderBottom: `3px solid ${cfg ? cfg.color : "#475569"}`,
                        textAlign: "center",
                        verticalAlign: "middle",
                        color: brickState === "correct"
                          ? "#4ade80"
                          : brickState === "cracked"
                          ? "#ef4444"
                          : cfg?.color,
                        fontSize: brickState !== "idle" ? "0.9em" : "0.85em",
                        transition: "all 0.2s",
                      }}>
                        {brickState === "correct"
                          ? activeBrick.answer
                          : brickState === "cracked"
                          ? "✗"
                          : " "}
                      </span>
                    )}
                  </span>
                ))}
              </div>
            ) : (
              <div style={{ color: "#334155", fontSize: 14 }}>— loading —</div>
            )}
          </div>

          {/* Floating feedback */}
          {feedback && (
            <div style={{
              position: "absolute",
              bottom: -28, left: "50%", transform: "translateX(-50%)",
              fontSize: 15, fontFamily: "'Orbitron',sans-serif", fontWeight: 700,
              color: brickState === "cracked" ? "#ef4444" : "#4ade80",
              animation: "feedback-rise 0.8s ease forwards",
              whiteSpace: "nowrap",
              pointerEvents: "none",
              zIndex: 30,
              letterSpacing: "0.08em",
            }}>
              {feedback}
            </div>
          )}
        </div>

        {/* Shield line */}
        <div style={{
          width: "100%", maxWidth: 460,
          margin: "22px 0 16px",
          position: "relative",
          height: 2,
          background: "linear-gradient(90deg, transparent, #1e293b 20%, #334155 50%, #1e293b 80%, transparent)",
        }}>
          <span style={{
            position: "absolute", top: "50%", left: "50%",
            transform: "translate(-50%,-50%)",
            background: "#080d1a", padding: "0 8px",
            fontSize: 8, color: "#1e293b", letterSpacing: "0.2em",
          }}>SHIELD</span>
        </div>

        {/* ── ANSWER BUTTONS ── */}
        {activeBrick && (
          <div style={{ display: "flex", gap: 10, width: "100%", maxWidth: 460 }}>
            {activeBrick.opts.map(opt => {
              const isChosen = chosenOpt === opt;
              const isCorrect = opt === activeBrick.answer;
              const showHint  = brickState !== "idle" && isCorrect;
              return (
                <button
                  key={opt}
                  className="ans-btn"
                  onClick={() => handleAnswer(opt)}
                  disabled={brickState !== "idle"}
                  style={{
                    flex: 1,
                    padding: "clamp(12px,3vw,18px) 0",
                    borderRadius: 12,
                    border: `2px solid ${
                      showHint    ? "#4ade80" :
                      (isChosen && brickState === "cracked") ? "#ef4444" :
                      cfg ? `${cfg.color}66` : "#1e293b"
                    }`,
                    background: showHint
                      ? "rgba(74,222,128,0.15)"
                      : (isChosen && brickState === "cracked")
                      ? "rgba(239,68,68,0.15)"
                      : "rgba(8,13,26,0.85)",
                    color: showHint
                      ? "#4ade80"
                      : (isChosen && brickState === "cracked")
                      ? "#ef4444"
                      : "#e2e8f0",
                    fontFamily: "'Orbitron',sans-serif",
                    fontWeight: 700,
                    fontSize: "clamp(16px,4vw,22px)",
                    cursor: brickState !== "idle" ? "default" : "pointer",
                    transition: "all 0.12s",
                    backdropFilter: "blur(10px)",
                    letterSpacing: "0.05em",
                    opacity: brickState !== "idle" && !showHint && !isChosen ? 0.5 : 1,
                  }}
                >
                  {opt}
                </button>
              );
            })}
          </div>
        )}

        {/* Grammar hint line */}
        <div style={{
          marginTop: 18, fontSize: 10, color: "#1e3a5f",
          letterSpacing: "0.12em", textAlign: "center",
          fontFamily: "'Share Tech Mono', monospace",
          lineHeight: 1.8,
        }}>
          <span style={{ color: "#1e3a5f88" }}>
            🔵 NOMI = Wer? &nbsp;·&nbsp; 🔴 AKKU = Wen? &nbsp;·&nbsp; 🟢 DATIV = Wem? &nbsp;·&nbsp; 🟡 GENIT = Wessen?
          </span>
        </div>

        {/* Fever banner */}
        {feverMode && (
          <div style={{
            position: "fixed", top: 70, left: "50%", transform: "translateX(-50%)",
            background: "rgba(251,191,36,0.12)",
            border: "1px solid #fbbf2466",
            borderRadius: 30, padding: "5px 22px",
            fontSize: 11, fontFamily: "'Orbitron',sans-serif", fontWeight: 700,
            color: "#fbbf24", letterSpacing: "0.2em",
            animation: "fever-pulse 1s infinite",
            zIndex: 55, pointerEvents: "none",
          }}>
            ⚡ FEVER MODE — 3× POINTS ⚡
          </div>
        )}

        {/* Genitiv tier banner */}
        {tier === 6 && !feverMode && (
          <div style={{
            position: "fixed", top: 70, left: "50%", transform: "translateX(-50%)",
            background: "rgba(251,191,36,0.07)",
            border: "1px solid #fbbf2433",
            borderRadius: 30, padding: "5px 22px",
            fontSize: 10, fontFamily: "'Orbitron',sans-serif", fontWeight: 700,
            color: "#92700a", letterSpacing: "0.2em",
            zIndex: 55, pointerEvents: "none",
          }}>
            🟡 GENITIV AKTIV — Wessen?
          </div>
        )}
      </div>
    </>
  );
}

// ─── MENU ─────────────────────────────────────────────────────────────────────

function MenuScreen({ tier, setTier, onStart, highScore }) {
  return (
    <>
      <GameStyles />
      <div style={{
        minHeight: "100vh",
        background: `
          radial-gradient(ellipse at center top, rgba(30,58,138,0.5) 0%, transparent 60%),
          #080d1a
        `,
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        padding: 24,
        position: "relative",
        overflow: "hidden",
        fontFamily: "'Share Tech Mono', monospace",
      }}>
        {/* Animated grid */}
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          backgroundImage: `
            linear-gradient(rgba(59,130,246,0.06) 1px, transparent 1px),
            linear-gradient(90deg, rgba(59,130,246,0.06) 1px, transparent 1px)
          `,
          backgroundSize: "44px 44px",
          animation: "grid-scroll 6s linear infinite",
        }} />

        <div style={{ textAlign: "center", zIndex: 1, maxWidth: 420, width: "100%" }}>
          <div style={{ fontSize: 11, letterSpacing: "0.35em", color: "#3b82f6", marginBottom: 10 }}>
            GRAMMATIK-ARCADE • MVP v1.0
          </div>

          <h1 style={{
            fontFamily: "'Orbitron', sans-serif",
            fontSize: "clamp(42px, 12vw, 64px)",
            fontWeight: 900,
            color: "#f1f5f9",
            lineHeight: 1,
            animation: "logo-pulse 2.5s infinite",
            margin: "0 0 6px",
          }}>
            CASE<br />BREAKER
          </h1>

          <div style={{
            fontSize: 12, color: "#475569", marginBottom: 28,
            letterSpacing: "0.12em",
          }}>
            MEISTER DIE DEUTSCHEN FÄLLE
          </div>

          {highScore > 0 && (
            <div style={{
              display: "inline-block",
              background: "rgba(251,191,36,0.08)",
              border: "1px solid rgba(251,191,36,0.2)",
              borderRadius: 8, padding: "7px 18px",
              marginBottom: 22, fontSize: 13, color: "#fbbf24",
              letterSpacing: "0.1em",
            }}>
              🏆 BEST SCORE: {highScore.toString().padStart(6, "0")}
            </div>
          )}

          {/* Case legend */}
          <div style={{ display: "flex", justifyContent: "center", gap: 8, marginBottom: 28, flexWrap: "wrap" }}>
            {Object.entries(CASE_CONFIG).map(([k, v]) => (
              <div key={k} style={{
                padding: "5px 12px",
                border: `1px solid ${v.color}33`,
                borderRadius: 20,
                fontSize: 10, letterSpacing: "0.12em",
                color: v.color,
                background: v.bg,
              }}>
                {v.emoji} {k} — {v.desc}
              </div>
            ))}
          </div>

          {/* Tier selector */}
          <div style={{ marginBottom: 28 }}>
            <div style={{ fontSize: 10, color: "#475569", letterSpacing: "0.18em", marginBottom: 10 }}>
              SELECT DIFFICULTY TIER
            </div>
            <div style={{ display: "flex", gap: 6, justifyContent: "center", flexWrap: "wrap" }}>
              {TIER_INFO.map(ti => (
                <button key={ti.t} onClick={() => setTier(ti.t)} style={{
                  padding: "10px 14px",
                  borderRadius: 10,
                  border: `2px solid ${tier === ti.t ? ti.color : "#1e293b"}`,
                  background: tier === ti.t ? `${ti.color}22` : "rgba(8,13,26,0.8)",
                  color: tier === ti.t ? ti.color : "#475569",
                  cursor: "pointer",
                  fontFamily: "'Orbitron',sans-serif",
                  fontSize: 10, fontWeight: 700,
                  transition: "all 0.15s",
                  minWidth: 70,
                }}>
                  <div style={{ fontSize: 13, marginBottom: 2 }}>{ti.label}</div>
                  <div style={{ fontSize: 8, opacity: 0.8, letterSpacing: "0.1em" }}>{ti.sub}</div>
                </button>
              ))}
            </div>
          </div>

          <button
            className="start-btn"
            onClick={onStart}
            style={{
              fontFamily: "'Orbitron',sans-serif",
              fontWeight: 900,
              fontSize: "clamp(16px,4vw,22px)",
              padding: "18px 56px",
              borderRadius: 14,
              border: "2px solid #3b82f6",
              background: "rgba(59,130,246,0.12)",
              color: "#f1f5f9",
              cursor: "pointer",
              letterSpacing: "0.18em",
              transition: "all 0.2s",
              boxShadow: "0 0 40px rgba(59,130,246,0.25)",
              marginBottom: 16,
            }}
          >
            START ▶
          </button>

          <div style={{ fontSize: 11, color: "#1e3a5f", letterSpacing: "0.1em" }}>
            Answer bricks correctly · Build combos · 60 seconds
          </div>
        </div>
      </div>
    </>
  );
}

// ─── ROUND END ────────────────────────────────────────────────────────────────

function RoundEndScreen({ score, maxCombo, accuracy, hearts, onReplay, onMenu, highScore }) {
  const newRecord = score > 0 && score >= highScore;
  const totalAnswered = Object.values(accuracy).reduce((s, v) => s + v.t, 0);
  const totalCorrect  = Object.values(accuracy).reduce((s, v) => s + v.c, 0);
  const overallPct = totalAnswered > 0 ? Math.round(totalCorrect / totalAnswered * 100) : 0;

  const grade =
    overallPct >= 90 ? { g: "S", color: "#fbbf24", label: "MEISTER" } :
    overallPct >= 75 ? { g: "A", color: "#4ade80", label: "SEHR GUT" } :
    overallPct >= 60 ? { g: "B", color: "#60a5fa", label: "GUT" } :
    overallPct >= 40 ? { g: "C", color: "#fb923c", label: "ÜBEN!" } :
                       { g: "D", color: "#ef4444", label: "WIEDERHOLEN" };

  return (
    <>
      <GameStyles />
      <div style={{
        minHeight: "100vh",
        background: "#080d1a",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        padding: 24,
        fontFamily: "'Share Tech Mono', monospace",
        color: "#e2e8f0",
      }}>
        <div style={{ textAlign: "center", maxWidth: 400, width: "100%", animation: "brick-enter 0.5s ease" }}>
          <div style={{ fontSize: 10, letterSpacing: "0.3em", color: "#475569", marginBottom: 4 }}>
            RUNDE BEENDET
          </div>
          <h2 style={{
            fontFamily: "'Orbitron',sans-serif", fontWeight: 900,
            fontSize: "clamp(28px, 8vw, 42px)",
            color: hearts > 0 ? "#f1f5f9" : "#ef4444",
            margin: "0 0 4px",
          }}>
            {hearts > 0 ? "ZEIT ABGELAUFEN!" : "GAME OVER"}
          </h2>

          {newRecord && (
            <div style={{ fontSize: 14, color: "#fbbf24", letterSpacing: "0.12em", marginBottom: 10 }}>
              ✦ NEUER REKORD! ✦
            </div>
          )}

          {/* Score card */}
          <div style={{
            padding: "18px 24px",
            margin: "16px 0",
            border: "1px solid #1e293b",
            borderRadius: 16,
            background: "rgba(15,23,42,0.7)",
          }}>
            {/* Grade */}
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 16, marginBottom: 12 }}>
              <div style={{
                width: 64, height: 64,
                borderRadius: 12,
                border: `2px solid ${grade.color}`,
                background: `${grade.color}15`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontFamily: "'Orbitron',sans-serif", fontWeight: 900,
                fontSize: 32, color: grade.color,
                boxShadow: `0 0 20px ${grade.color}44`,
              }}>
                {grade.g}
              </div>
              <div style={{ textAlign: "left" }}>
                <div style={{ fontSize: 11, color: "#64748b", letterSpacing: "0.1em" }}>ERGEBNIS</div>
                <div style={{ fontSize: 20, fontFamily: "'Orbitron',sans-serif", color: grade.color, fontWeight: 700 }}>
                  {grade.label}
                </div>
                <div style={{ fontSize: 12, color: "#64748b" }}>{overallPct}% korrekt</div>
              </div>
            </div>

            <div style={{ fontSize: 11, color: "#475569", letterSpacing: "0.1em" }}>FINAL SCORE</div>
            <div style={{
              fontFamily: "'Orbitron',sans-serif", fontSize: "clamp(36px,9vw,52px)",
              fontWeight: 900, color: "#60a5fa", lineHeight: 1.1,
            }}>
              {score.toString().padStart(6, "0")}
            </div>
            <div style={{ fontSize: 12, color: "#475569", marginTop: 4 }}>
              MAX COMBO: 🔥 ×{maxCombo} &nbsp;·&nbsp; {totalAnswered} answered
            </div>
          </div>

          {/* Case accuracy breakdown */}
          <div style={{
            padding: "14px 18px",
            marginBottom: 18,
            border: "1px solid #0f172a",
            borderRadius: 12,
            background: "rgba(8,13,26,0.8)",
          }}>
            <div style={{ fontSize: 9, letterSpacing: "0.18em", color: "#334155", marginBottom: 12 }}>
              CASE ACCURACY BREAKDOWN
            </div>
            {Object.entries(accuracy).map(([k, v]) => {
              const pct = v.t > 0 ? Math.round(v.c / v.t * 100) : null;
              const bc  = CASE_CONFIG[k];
              const barColor = pct === null ? "#1e293b" : pct >= 80 ? "#4ade80" : pct >= 50 ? "#fbbf24" : "#ef4444";
              return (
                <div key={k} style={{ marginBottom: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 3 }}>
                    <span style={{ color: bc.color }}>{bc.emoji} {k}</span>
                    <span style={{ color: barColor }}>
                      {pct === null ? "not seen" : `${pct}%  (${v.c}/${v.t})`}
                    </span>
                  </div>
                  <div style={{ height: 4, background: "#0f172a", borderRadius: 2, overflow: "hidden" }}>
                    {pct !== null && (
                      <div style={{
                        height: "100%", width: `${pct}%`,
                        background: barColor, borderRadius: 2,
                        transition: "width 1.2s ease 0.3s",
                        boxShadow: `0 0 6px ${barColor}`,
                      }} />
                    )}
                  </div>
                  {pct !== null && pct < 70 && (
                    <div style={{ fontSize: 9, color: "#475569", marginTop: 2 }}>
                      ↳ {bc.desc} — needs practice
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Buttons */}
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={onMenu} className="secondary-btn" style={{
              flex: 1, padding: "13px",
              borderRadius: 10,
              border: "1px solid #1e293b",
              background: "rgba(8,13,26,0.8)",
              color: "#475569", cursor: "pointer",
              fontFamily: "'Orbitron',sans-serif", fontSize: 12, fontWeight: 700,
              letterSpacing: "0.1em", transition: "all 0.2s",
            }}>
              MENÜ
            </button>
            <button onClick={onReplay} style={{
              flex: 2, padding: "13px",
              borderRadius: 10,
              border: "2px solid #3b82f6",
              background: "rgba(59,130,246,0.12)",
              color: "#f1f5f9", cursor: "pointer",
              fontFamily: "'Orbitron',sans-serif", fontSize: 16, fontWeight: 700,
              letterSpacing: "0.12em", transition: "all 0.2s",
              boxShadow: "0 0 20px rgba(59,130,246,0.2)",
            }}>
              NOCHMAL ▶
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── STYLES ───────────────────────────────────────────────────────────────────

function GameStyles() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Share+Tech+Mono&family=Orbitron:wght@700;900&display=swap');

      * { box-sizing: border-box; margin: 0; padding: 0; }

      @keyframes logo-pulse {
        0%,100% { text-shadow: 0 0 40px #3b82f6, 0 0 80px #1d4ed8; }
        50%      { text-shadow: 0 0 70px #60a5fa, 0 0 120px #3b82f6, 0 0 160px #1d4ed8; }
      }
      @keyframes grid-scroll {
        from { transform: translateY(0); }
        to   { transform: translateY(44px); }
      }
      @keyframes brick-enter {
        from { opacity: 0; transform: translateY(-16px); }
        to   { opacity: 1; transform: translateY(0); }
      }
      @keyframes g-brick-correct {
        0%   { transform: scale(1); opacity: 1; }
        40%  { transform: scale(1.03); }
        100% { transform: scale(0.97) translateY(-8px); opacity: 0; }
      }
      @keyframes g-brick-wrong {
        0%,100% { transform: translateX(0); }
        20%     { transform: translateX(-8px); }
        60%     { transform: translateX(8px); }
      }
      @keyframes g-shake {
        0%,100% { transform: translateX(0); }
        25%     { transform: translateX(-5px); }
        75%     { transform: translateX(5px); }
      }
      @keyframes combo-pop {
        0%   { transform: scale(1); }
        50%  { transform: scale(1.5); }
        100% { transform: scale(1); }
      }
      @keyframes urgent-pulse {
        0%,100% { opacity: 1; }
        50%      { opacity: 0.3; }
      }
      @keyframes feedback-rise {
        0%   { opacity: 1; transform: translateX(-50%) translateY(0); }
        100% { opacity: 0; transform: translateX(-50%) translateY(-36px); }
      }
      @keyframes fever-pulse {
        0%,100% { box-shadow: 0 0 20px rgba(251,191,36,0.3); }
        50%      { box-shadow: 0 0 40px rgba(251,191,36,0.6); }
      }
      @keyframes genit-glow {
        0%,100% { box-shadow: 0 0 20px rgba(251,191,36,0.15), inset 0 0 30px rgba(0,0,0,0.3); }
        50%      { box-shadow: 0 0 50px rgba(251,191,36,0.35), inset 0 0 30px rgba(0,0,0,0.3); }
      }

      .ans-btn:hover:not(:disabled) {
        transform: translateY(-3px);
        filter: brightness(1.25);
      }
      .ans-btn:active:not(:disabled) {
        transform: translateY(1px) scale(0.97);
      }
      .start-btn:hover {
        background: rgba(59,130,246,0.3) !important;
        box-shadow: 0 0 60px rgba(59,130,246,0.4) !important;
        transform: translateY(-2px);
      }
      .secondary-btn:hover {
        border-color: #334155 !important;
        color: #94a3b8 !important;
      }
    `}</style>
  );
}
