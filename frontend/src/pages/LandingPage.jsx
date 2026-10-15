import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

// ── Design tokens ──────────────────────────────────────────────────────────────
const c = {
  bg:       "#0a0f1e",
  surface:  "#111827",
  border:   "#1e293b",
  muted:    "#334155",
  dim:      "#64748b",
  sub:      "#94a3b8",
  text:     "#f1f5f9",
  accent:   "#818cf8",
  purple:   "#7c3aed",
  blue:     "#2563eb",
  cyan:     "#22d3ee",
};

const s = {
  page: {
    minHeight: "100vh",
    background: c.bg,
    fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
    color: c.text,
    overflowX: "hidden",
  },

  // ── Nav ──────────────────────────────────────────────────────────────────────
  nav: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "1rem 2rem",
    background: "rgba(10,15,30,0.85)",
    backdropFilter: "blur(12px)",
    borderBottom: `1px solid ${c.border}`,
    position: "sticky", top: 0, zIndex: 50,
  },
  navLogo: {
    display: "flex", alignItems: "center", gap: "0.5rem",
    textDecoration: "none",
  },
  navLogoMark: {
    width: 32, height: 32,
    background: "linear-gradient(135deg, #7c3aed, #2563eb)",
    borderRadius: 8,
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: "1rem", fontWeight: 900, color: "#fff",
  },
  navLogoText: { fontSize: "1.05rem", fontWeight: 800, color: c.text },
  navLogoSub: { fontSize: "0.7rem", color: c.dim, fontWeight: 500 },
  navRight: { display: "flex", gap: "0.75rem", alignItems: "center" },
  navLink: { color: c.sub, textDecoration: "none", fontSize: "0.875rem", padding: "0.3rem 0.5rem" },
  navCta: {
    padding: "0.45rem 1.1rem",
    background: "linear-gradient(135deg, #7c3aed, #2563eb)",
    border: "none", borderRadius: 8, color: "#fff",
    fontWeight: 700, fontSize: "0.875rem", cursor: "pointer",
    textDecoration: "none",
  },

  // ── Hero ─────────────────────────────────────────────────────────────────────
  hero: {
    position: "relative",
    padding: "5rem 2rem 4rem",
    textAlign: "center",
    overflow: "hidden",
  },
  heroGlow: {
    position: "absolute", top: "-120px", left: "50%",
    transform: "translateX(-50%)",
    width: 700, height: 400,
    background: "radial-gradient(ellipse, rgba(124,58,237,0.18) 0%, transparent 70%)",
    pointerEvents: "none",
  },
  heroBadge: {
    display: "inline-flex", alignItems: "center", gap: "0.4rem",
    background: "rgba(99,102,241,0.12)",
    border: "1px solid rgba(99,102,241,0.35)",
    borderRadius: 999,
    padding: "0.3rem 1rem",
    fontSize: "0.78rem", fontWeight: 700,
    color: c.accent, letterSpacing: "0.07em",
    marginBottom: "1.5rem",
    textTransform: "uppercase",
  },
  heroTitle: {
    fontSize: "clamp(2.2rem, 6vw, 3.6rem)",
    fontWeight: 900,
    lineHeight: 1.1,
    maxWidth: 740,
    margin: "0 auto 1.25rem",
    letterSpacing: "-0.02em",
  },
  heroGrad: {
    background: "linear-gradient(90deg, #818cf8, #38bdf8)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
  },
  heroSub: {
    color: c.sub,
    fontSize: "clamp(1rem, 2.5vw, 1.2rem)",
    maxWidth: 560,
    margin: "0 auto 2.5rem",
    lineHeight: 1.7,
  },
  heroActions: {
    display: "flex", gap: "1rem",
    justifyContent: "center", flexWrap: "wrap",
    marginBottom: "3rem",
  },
  btnPrimary: {
    padding: "0.85rem 2.2rem",
    background: "linear-gradient(135deg, #7c3aed, #2563eb)",
    border: "none", borderRadius: 12, color: "#fff",
    fontWeight: 700, fontSize: "1rem", cursor: "pointer",
    textDecoration: "none", display: "inline-block",
    boxShadow: "0 4px 24px rgba(124,58,237,0.35)",
    transition: "opacity 0.2s",
  },
  btnSecondary: {
    padding: "0.85rem 2.2rem",
    background: "transparent",
    border: `1px solid ${c.muted}`,
    borderRadius: 12, color: c.sub,
    fontWeight: 600, fontSize: "1rem", cursor: "pointer",
    textDecoration: "none", display: "inline-block",
  },

  // ── Game preview card ─────────────────────────────────────────────────────────
  previewWrap: {
    maxWidth: 480,
    margin: "0 auto 1rem",
  },
  previewCard: {
    background: c.surface,
    border: `1px solid ${c.border}`,
    borderRadius: 16,
    padding: "1.5rem",
    textAlign: "left",
    boxShadow: "0 8px 40px rgba(0,0,0,0.4)",
  },
  previewLabel: { fontSize: "0.72rem", color: c.dim, fontWeight: 700, letterSpacing: "0.1em", marginBottom: "0.75rem", textTransform: "uppercase" },
  previewSentence: { fontSize: "1.3rem", fontWeight: 700, color: c.text, marginBottom: "1rem" },
  previewBlanks: { display: "flex", gap: "0.5rem", flexWrap: "wrap" },
  previewBtn: (active) => ({
    padding: "0.5rem 1.1rem",
    border: `2px solid ${active ? "#818cf8" : c.muted}`,
    borderRadius: 8,
    background: active ? "rgba(129,140,248,0.15)" : "transparent",
    color: active ? c.accent : c.sub,
    fontWeight: 700, fontSize: "0.95rem", cursor: "pointer",
  }),
  previewTier: { fontSize: "0.75rem", color: c.dim, marginTop: "0.75rem" },

  // ── Stats bar ─────────────────────────────────────────────────────────────────
  statsBar: {
    display: "flex", justifyContent: "center",
    gap: "clamp(1.5rem, 4vw, 4rem)",
    flexWrap: "wrap",
    borderTop: `1px solid ${c.border}`,
    borderBottom: `1px solid ${c.border}`,
    padding: "2rem",
    background: c.surface,
  },
  statItem: { textAlign: "center" },
  statNum: { fontSize: "2rem", fontWeight: 900, color: c.text, lineHeight: 1 },
  statLabel: { fontSize: "0.8rem", color: c.dim, marginTop: "0.25rem" },

  // ── Features ──────────────────────────────────────────────────────────────────
  section: { maxWidth: 1060, margin: "0 auto", padding: "5rem 2rem" },
  sectionLabel: {
    fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.1em",
    color: c.accent, textTransform: "uppercase", marginBottom: "0.75rem",
  },
  sectionTitle: {
    fontSize: "clamp(1.6rem, 4vw, 2.4rem)",
    fontWeight: 800, lineHeight: 1.2,
    marginBottom: "1rem",
  },
  sectionSub: { color: c.sub, fontSize: "1.05rem", lineHeight: 1.7, maxWidth: 540, marginBottom: "3rem" },
  grid3: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: "1.25rem",
  },
  featureCard: {
    background: c.surface,
    border: `1px solid ${c.border}`,
    borderRadius: 14,
    padding: "1.5rem",
  },
  featureIcon: {
    width: 44, height: 44,
    background: "rgba(99,102,241,0.15)",
    borderRadius: 10,
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: "1.4rem",
    marginBottom: "1rem",
  },
  featureTitle: { fontWeight: 700, fontSize: "1rem", marginBottom: "0.5rem" },
  featureText: { color: c.sub, fontSize: "0.9rem", lineHeight: 1.6 },

  // ── Tier ladder ───────────────────────────────────────────────────────────────
  tierList: { display: "flex", flexDirection: "column", gap: "0.75rem" },
  tierRow: (i) => ({
    display: "flex", alignItems: "center", gap: "1rem",
    background: c.surface,
    border: `1px solid ${c.border}`,
    borderRadius: 10,
    padding: "0.9rem 1.25rem",
    opacity: i === 0 ? 1 : 0.55 + i * 0.08,
  }),
  tierBadge: (i) => ({
    minWidth: 36, height: 36,
    borderRadius: 8,
    background: `rgba(${[124,58,237].join(",")}, ${0.15 + i * 0.1})`,
    border: `1px solid rgba(124,58,237,${0.3 + i * 0.1})`,
    display: "flex", alignItems: "center", justifyContent: "center",
    fontWeight: 800, fontSize: "0.85rem", color: c.accent,
  }),
  tierName: { fontWeight: 700, fontSize: "0.95rem" },
  tierDesc: { color: c.sub, fontSize: "0.82rem" },

  // ── Pricing ───────────────────────────────────────────────────────────────────
  pricingGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: "1.5rem",
    maxWidth: 700,
    margin: "0 auto",
  },
  pricingCard: (featured) => ({
    background: featured ? "linear-gradient(160deg, #1e1b4b, #0f172a)" : c.surface,
    border: `1px solid ${featured ? "#6366f1" : c.border}`,
    borderRadius: 16,
    padding: "2rem",
    position: "relative",
    textAlign: "center",
  }),
  pricingBadge: {
    position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)",
    background: "linear-gradient(135deg, #7c3aed, #2563eb)",
    borderRadius: 999, padding: "0.25rem 1rem",
    fontSize: "0.72rem", fontWeight: 800, color: "#fff",
    textTransform: "uppercase", letterSpacing: "0.07em",
    whiteSpace: "nowrap",
  },
  pricingTier: { fontSize: "0.8rem", fontWeight: 700, color: c.dim, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "0.5rem" },
  pricingPrice: { fontSize: "2.6rem", fontWeight: 900, lineHeight: 1, marginBottom: "0.25rem" },
  pricingPer: { color: c.dim, fontSize: "0.85rem", marginBottom: "1.5rem" },
  pricingFeatures: { listStyle: "none", padding: 0, margin: "0 0 1.5rem", textAlign: "left" },
  pricingFeat: { display: "flex", gap: "0.5rem", alignItems: "flex-start", color: c.sub, fontSize: "0.88rem", marginBottom: "0.6rem", lineHeight: 1.5 },
  pricingCheck: { color: "#4ade80", fontWeight: 700, flexShrink: 0 },

  // ── CTA banner ────────────────────────────────────────────────────────────────
  ctaBanner: {
    background: "linear-gradient(135deg, #1e1b4b 0%, #0f172a 50%, #1e1b4b 100%)",
    borderTop: `1px solid ${c.border}`,
    borderBottom: `1px solid ${c.border}`,
    padding: "5rem 2rem",
    textAlign: "center",
  },
  ctaTitle: {
    fontSize: "clamp(1.8rem, 4vw, 2.8rem)",
    fontWeight: 900, marginBottom: "1rem",
  },
  ctaSub: { color: c.sub, fontSize: "1.05rem", marginBottom: "2rem" },

  // ── Footer ────────────────────────────────────────────────────────────────────
  footer: {
    borderTop: `1px solid ${c.border}`,
    padding: "2rem",
    display: "flex", justifyContent: "space-between", alignItems: "center",
    flexWrap: "wrap", gap: "1rem",
    color: c.dim, fontSize: "0.82rem",
  },
  footerLinks: { display: "flex", gap: "1.5rem" },
  footerLink: { color: c.dim, textDecoration: "none" },
};

const TIERS = [
  { t: 1, name: "Nominative Masculine", desc: "DER — the subject of the sentence" },
  { t: 2, name: "Accusative Masculine", desc: "DEN — the direct object" },
  { t: 3, name: "Feminine Cases",       desc: "DIE for both Nom. and Akk." },
  { t: 4, name: "Neuter Cases",         desc: "DAS — the neutral gender" },
  { t: 5, name: "Dative",               desc: "DEM / DER — indirect objects" },
  { t: 6, name: "Genitive",             desc: "DES / DER — possession" },
];

const FEATURES = [
  { icon: "🎮", title: "Game-Based Learning", text: "Flashcard drills aren't enough. Case Breaker puts articles in real sentences so your brain builds context, not just memorisation." },
  { icon: "📈", title: "6-Tier Progression", text: "Start with nominative and unlock each case as you go. The difficulty ramps naturally — you'll feel the progress." },
  { icon: "⚡", title: "Instant Feedback", text: "Streak counters, accuracy scores and case-by-case breakdowns show exactly where you're strong and where to drill more." },
  { icon: "📄", title: "PDF Study Guides", text: "Unlock downloadable reference sheets and flashcard decks that pair perfectly with the game." },
  { icon: "🌍", title: "Learn Anywhere", text: "Works on mobile and desktop, even offline. Installable as a PWA so it lives on your home screen." },
  { icon: "🔐", title: "Pro Membership", text: "One subscription unlocks unlimited game tiers, all PDF guides, and priority access to new content." },
];

// ── Component ──────────────────────────────────────────────────────────────────
export default function LandingPage() {
  const { user } = useAuth();

  return (
    <div style={s.page}>

      {/* ── Nav ── */}
      <nav style={s.nav}>
        <Link to="/" style={s.navLogo}>
          <div style={s.navLogoMark}>CB</div>
          <div>
            <div style={s.navLogoText}>Case Breaker</div>
            <div style={s.navLogoSub}>DeutschwithDoug</div>
          </div>
        </Link>
        <div style={s.navRight}>
          <Link to="/shop" style={s.navLink}>Shop</Link>
          <Link to="/pro" style={s.navLink}>Pro</Link>
          {user
            ? <Link to="/dashboard" style={s.navLink}>Dashboard</Link>
            : <Link to="/login" style={s.navLink}>Sign in</Link>
          }
          <Link to="/play" style={s.navCta}>Play Free</Link>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section style={s.hero}>
        <div style={s.heroGlow} />
        <div style={s.heroBadge}>🇩🇪 DeutschwithDoug × Case Breaker</div>
        <h1 style={s.heroTitle}>
          Master German Articles<br />
          <span style={s.heroGrad}>Der, Die, Das — for Good.</span>
        </h1>
        <p style={s.heroSub}>
          Stop guessing. Case Breaker is a fast-paced drill game that trains all four German grammatical cases through real sentences — free to play, forever.
        </p>
        <div style={s.heroActions}>
          <Link to="/play" style={s.btnPrimary}>▶ Play Free Now</Link>
          <Link to="/shop" style={s.btnSecondary}>View Study Materials</Link>
        </div>

        {/* Mini game preview */}
        <div style={s.previewWrap}>
          <div style={s.previewCard}>
            <div style={s.previewLabel}>Tier 2 — Accusative</div>
            <div style={s.previewSentence}>Ich sehe <span style={{ color: c.accent }}>___</span> Mann.</div>
            <div style={s.previewBlanks}>
              {["DER","DEN","DEM"].map(opt => (
                <button key={opt} style={s.previewBtn(opt === "DEN")}>{opt}</button>
              ))}
            </div>
            <div style={s.previewTier}>🔥 Streak: 7 &nbsp;·&nbsp; Accuracy: 85%</div>
          </div>
        </div>
      </section>

      {/* ── Stats ── */}
      <div style={s.statsBar}>
        {[
          ["50+",  "Practice sentences"],
          ["6",    "Grammar tiers"],
          ["4",    "Grammatical cases"],
          ["Free", "To start playing"],
        ].map(([n, l]) => (
          <div key={l} style={s.statItem}>
            <div style={s.statNum}>{n}</div>
            <div style={s.statLabel}>{l}</div>
          </div>
        ))}
      </div>

      {/* ── Features ── */}
      <section style={s.section}>
        <div style={s.sectionLabel}>Why it works</div>
        <h2 style={s.sectionTitle}>Built for real German learners</h2>
        <p style={s.sectionSub}>
          Most learners can recite the article table but freeze in real sentences. Case Breaker fixes that with context-first practice.
        </p>
        <div style={s.grid3}>
          {FEATURES.map(f => (
            <div key={f.title} style={s.featureCard}>
              <div style={s.featureIcon}>{f.icon}</div>
              <div style={s.featureTitle}>{f.title}</div>
              <div style={s.featureText}>{f.text}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Tier ladder ── */}
      <section style={{ background: c.surface, borderTop: `1px solid ${c.border}`, borderBottom: `1px solid ${c.border}` }}>
        <div style={{ ...s.section, paddingTop: "4rem", paddingBottom: "4rem" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "3rem", alignItems: "center" }}>
            <div>
              <div style={s.sectionLabel}>Progression</div>
              <h2 style={s.sectionTitle}>Six tiers. One mastery.</h2>
              <p style={s.sectionSub}>
                Each tier unlocks automatically as your accuracy improves. No skipping, no shortcuts — just systematic case mastery.
              </p>
              <Link to="/play" style={s.btnPrimary}>Start at Tier 1 →</Link>
            </div>
            <div style={s.tierList}>
              {TIERS.map((tier, i) => (
                <div key={tier.t} style={s.tierRow(i)}>
                  <div style={s.tierBadge(i)}>T{tier.t}</div>
                  <div>
                    <div style={s.tierName}>{tier.name}</div>
                    <div style={s.tierDesc}>{tier.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section style={s.section}>
        <div style={{ textAlign: "center", marginBottom: "3rem" }}>
          <div style={s.sectionLabel}>Pricing</div>
          <h2 style={s.sectionTitle}>Free to play. Pro to master.</h2>
          <p style={{ ...s.sectionSub, margin: "0 auto" }}>No credit card required to start.</p>
        </div>
        <div style={s.pricingGrid}>
          {/* Free */}
          <div style={s.pricingCard(false)}>
            <div style={s.pricingTier}>Free</div>
            <div style={s.pricingPrice}>$0</div>
            <div style={s.pricingPer}>forever</div>
            <ul style={s.pricingFeatures}>
              {["Full game — all 6 tiers","Accuracy & streak tracking","Mobile + offline (PWA)","Community leaderboard"].map(f => (
                <li key={f} style={s.pricingFeat}><span style={s.pricingCheck}>✓</span>{f}</li>
              ))}
            </ul>
            <Link to="/play" style={{ ...s.btnSecondary, display: "block", textAlign: "center" }}>Play Now</Link>
          </div>
          {/* Pro */}
          <div style={s.pricingCard(true)}>
            <div style={s.pricingBadge}>Most Popular</div>
            <div style={s.pricingTier}>Pro</div>
            <div style={s.pricingPrice}>$9<span style={{ fontSize: "1.2rem" }}></span></div>
            <div style={s.pricingPer}>per month</div>
            <ul style={s.pricingFeatures}>
              {[
                "Everything in Free",
                "PDF Der Die Das Mastery Guide",
                "300-card Anki flashcard deck",
                "Case-by-case performance reports",
                "Priority access to new content",
              ].map(f => (
                <li key={f} style={s.pricingFeat}><span style={s.pricingCheck}>✓</span>{f}</li>
              ))}
            </ul>
            <Link to="/pro" style={{ ...s.btnPrimary, display: "block", textAlign: "center" }}>Get Pro →</Link>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <div style={s.ctaBanner}>
        <h2 style={s.ctaTitle}>Ready to break the case?</h2>
        <p style={s.ctaSub}>Join learners drilling German articles the smart way.</p>
        <div style={{ display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap" }}>
          <Link to="/play" style={s.btnPrimary}>▶ Start Playing — It's Free</Link>
          {!user && <Link to="/register" style={s.btnSecondary}>Create Account</Link>}
        </div>
      </div>

      {/* ── Footer ── */}
      <footer style={s.footer}>
        <div>© {new Date().getFullYear()} DeutschwithDoug · Case Breaker</div>
        <div style={s.footerLinks}>
          <Link to="/shop" style={s.footerLink}>Shop</Link>
          <Link to="/pro" style={s.footerLink}>Pro</Link>
          <Link to="/login" style={s.footerLink}>Sign in</Link>
          <Link to="/register" style={s.footerLink}>Register</Link>
        </div>
      </footer>

    </div>
  );
}
