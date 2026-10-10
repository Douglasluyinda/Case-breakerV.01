import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { subscriptions as subsApi } from "../api/client.js";

// ── Styles ──────────────────────────────────────────────────────────────────────
const s = {
  page: {
    minHeight: "100vh",
    background: "#0f172a",
    fontFamily: "'Segoe UI', system-ui, sans-serif",
    color: "#f1f5f9",
  },
  nav: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "1rem 2rem",
    background: "#1e293b",
    borderBottom: "1px solid #334155",
  },
  navLogo: { color: "#60a5fa", fontWeight: 800, fontSize: "1.25rem", textDecoration: "none" },
  navRight: { display: "flex", gap: "1rem", alignItems: "center" },
  navLink: { color: "#94a3b8", textDecoration: "none", fontSize: "0.9rem" },
  main: { maxWidth: "700px", margin: "0 auto", padding: "4rem 1.5rem" },

  // Hero
  badge: {
    display: "inline-flex",
    alignItems: "center",
    gap: "0.4rem",
    background: "linear-gradient(135deg, #7c3aed, #2563eb)",
    borderRadius: "999px",
    padding: "0.3rem 0.9rem",
    fontSize: "0.8rem",
    fontWeight: 700,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    marginBottom: "1.25rem",
  },
  heading: { fontSize: "2.5rem", fontWeight: 800, lineHeight: 1.2, marginBottom: "1rem" },
  accent: { color: "#818cf8" },
  sub: { color: "#94a3b8", fontSize: "1.05rem", lineHeight: 1.7, marginBottom: "3rem" },

  // Pricing card
  card: {
    background: "linear-gradient(135deg, #1e293b 0%, #1a1f35 100%)",
    border: "1px solid #4f46e5",
    borderRadius: "20px",
    padding: "2.5rem",
    boxShadow: "0 0 40px rgba(79,70,229,0.15)",
    marginBottom: "2.5rem",
  },
  priceRow: { display: "flex", alignItems: "flex-end", gap: "0.4rem", marginBottom: "0.25rem" },
  price: { fontSize: "3rem", fontWeight: 800, color: "#fff", lineHeight: 1 },
  pricePer: { color: "#64748b", fontSize: "1rem", paddingBottom: "0.5rem" },
  priceNote: { color: "#64748b", fontSize: "0.85rem", marginBottom: "2rem" },

  featureList: { listStyle: "none", padding: 0, margin: "0 0 2rem 0" },
  featureItem: {
    display: "flex",
    alignItems: "flex-start",
    gap: "0.75rem",
    padding: "0.6rem 0",
    borderBottom: "1px solid #1e293b",
    fontSize: "0.95rem",
    color: "#cbd5e1",
  },
  featureCheck: { color: "#818cf8", fontWeight: 700, flexShrink: 0, marginTop: "0.1rem" },

  upgradeBtn: {
    width: "100%",
    padding: "1rem",
    background: "linear-gradient(135deg, #7c3aed, #2563eb)",
    border: "none",
    borderRadius: "12px",
    color: "#fff",
    fontWeight: 700,
    fontSize: "1.05rem",
    cursor: "pointer",
    transition: "opacity 0.15s",
  },
  upgradeBtnBusy: { opacity: 0.6, cursor: "wait" },
  upgradeBtnDisabled: { opacity: 0.5, cursor: "not-allowed" },

  // Alert banners
  successBanner: {
    background: "#14532d",
    border: "1px solid #16a34a",
    borderRadius: "10px",
    padding: "1rem 1.5rem",
    marginBottom: "2rem",
    color: "#86efac",
    fontSize: "0.95rem",
  },
  cancelBanner: {
    background: "#1e293b",
    border: "1px solid #334155",
    borderRadius: "10px",
    padding: "1rem 1.5rem",
    marginBottom: "2rem",
    color: "#94a3b8",
    fontSize: "0.95rem",
  },
  errorBanner: {
    background: "#450a0a",
    border: "1px solid #b91c1c",
    borderRadius: "10px",
    padding: "1rem 1.5rem",
    marginBottom: "2rem",
    color: "#fca5a5",
    fontSize: "0.95rem",
  },

  alreadyPro: {
    background: "linear-gradient(135deg, #1e293b, #1a1f35)",
    border: "1px solid #4f46e5",
    borderRadius: "16px",
    padding: "2rem",
    textAlign: "center",
  },
  proIcon: { fontSize: "2.5rem", marginBottom: "0.75rem" },
  proTitle: { fontSize: "1.3rem", fontWeight: 700, marginBottom: "0.5rem", color: "#818cf8" },
  proSub: { color: "#94a3b8", marginBottom: "1.5rem", fontSize: "0.95rem" },
  dashLink: {
    display: "inline-block",
    padding: "0.65rem 1.5rem",
    background: "#4f46e5",
    border: "none",
    borderRadius: "10px",
    color: "#fff",
    fontWeight: 600,
    textDecoration: "none",
  },
};

const PRO_FEATURES = [
  { icon: "⚡", text: "Unlimited case-drill sessions per day" },
  { icon: "🧠", text: "AI-powered analysis of your mistake patterns" },
  { icon: "📊", text: "CEFR-level tracking (A1 → C2) with progress charts" },
  { icon: "🔊", text: "Audio pronunciation for every example sentence" },
  { icon: "🎯", text: "Adaptive difficulty — levels adjust to your accuracy" },
  { icon: "📥", text: "All current and future downloadable grammar guides" },
  { icon: "🏆", text: "Leaderboard and streak rewards" },
  { icon: "📧", text: "Priority support from the DeutschwithDoug team" },
];

// ── Main page ───────────────────────────────────────────────────────────────────
export default function ProPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [subscription, setSubscription] = useState(null);
  const [loadingSub, setLoadingSub] = useState(!!user);
  const [upgrading, setUpgrading] = useState(false);
  const [error, setError] = useState("");

  const returnStatus = searchParams.get("subscription"); // "success" | "cancelled"

  useEffect(() => {
    if (!user) return;
    subsApi.me()
      .then((data) => setSubscription(data?.subscription ?? null))
      .catch(() => {})
      .finally(() => setLoadingSub(false));
  }, [user]);

  async function handleUpgrade() {
    if (!user) { navigate("/login?next=/pro"); return; }
    setUpgrading(true);
    setError("");
    try {
      const { redirectUrl } = await subsApi.subscribe();
      window.location.href = redirectUrl;
    } catch (e) {
      setError(e.message ?? "Something went wrong. Please try again.");
      setUpgrading(false);
    }
  }

  const isAlreadyPro =
    subscription && ["active", "trialing"].includes(subscription.status);

  return (
    <div style={s.page}>
      {/* ── Nav ── */}
      <nav style={s.nav}>
        <Link to="/" style={s.navLogo}>Case Breaker</Link>
        <div style={s.navRight}>
          {user ? (
            <Link to="/dashboard" style={s.navLink}>Dashboard</Link>
          ) : (
            <>
              <Link to="/login" style={s.navLink}>Sign in</Link>
              <Link to="/register" style={s.navLink}>Sign up</Link>
            </>
          )}
        </div>
      </nav>

      <main style={s.main}>
        {/* ── Return banners ── */}
        {returnStatus === "success" && (
          <div style={s.successBanner}>
            🎉 You're now on Case Breaker Pro! Head to your{" "}
            <Link to="/dashboard" style={{ color: "#86efac" }}>dashboard</Link> to get started.
          </div>
        )}
        {returnStatus === "cancelled" && (
          <div style={s.cancelBanner}>
            No worries — you can upgrade any time.
          </div>
        )}
        {error && <div style={s.errorBanner}>{error}</div>}

        {/* ── Hero ── */}
        <div style={s.badge}>✦ Pro</div>
        <h1 style={s.heading}>
          Master German cases<br />
          <span style={s.accent}>faster than ever.</span>
        </h1>
        <p style={s.sub}>
          Case Breaker Pro unlocks AI-powered mistake analysis, CEFR progress
          tracking, and unlimited drills — everything you need to go from A1 to
          C2 without grinding through textbooks.
        </p>

        {/* ── Already Pro state ── */}
        {loadingSub ? null : isAlreadyPro ? (
          <div style={s.alreadyPro}>
            <div style={s.proIcon}>✦</div>
            <div style={s.proTitle}>You're on Pro</div>
            <p style={s.proSub}>
              {subscription.cancelAtPeriodEnd
                ? `Your plan is active until ${new Date(subscription.currentPeriodEnd).toLocaleDateString()}.`
                : "Enjoy unlimited drills and AI analysis."}
            </p>
            <Link to="/dashboard" style={s.dashLink}>Go to Dashboard</Link>
          </div>
        ) : (
          /* ── Pricing card ── */
          <div style={s.card}>
            <div style={s.priceRow}>
              <span style={s.price}>$9</span>
              <span style={s.pricePer}>/month</span>
            </div>
            <div style={s.priceNote}>Cancel any time. No contracts.</div>

            <ul style={s.featureList}>
              {PRO_FEATURES.map((f) => (
                <li key={f.text} style={s.featureItem}>
                  <span style={s.featureCheck}>{f.icon}</span>
                  <span>{f.text}</span>
                </li>
              ))}
            </ul>

            <button
              style={{
                ...s.upgradeBtn,
                ...(upgrading ? s.upgradeBtnBusy : {}),
              }}
              onClick={handleUpgrade}
              disabled={upgrading}
            >
              {upgrading ? "Redirecting to checkout…" : "Upgrade to Pro →"}
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
