import { useState } from "react";
import { leads as leadsApi } from "../api/client.js";
import { getStoredRef } from "../hooks/useReferral.js";
import { useAnalytics } from "../hooks/useAnalytics.js";

// ── LeadMagnetCapture ──────────────────────────────────────────────────────────
// Email capture form for a free lead-magnet resource (e.g. a grammar cheat sheet).
//
// Props:
//   source   string  – analytics / tagging source, e.g. "shop-banner"
//   headline string  – override the default headline
//   sub      string  – override the default sub-text
//   cta      string  – override the button label

const s = {
  wrap: {
    background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
    border: "1px solid #334155",
    borderRadius: "20px",
    padding: "2.5rem 2rem",
    textAlign: "center",
    maxWidth: "520px",
    margin: "0 auto",
    fontFamily: "'Segoe UI', system-ui, sans-serif",
  },
  icon: { fontSize: "2.5rem", marginBottom: "0.75rem" },
  headline: {
    fontSize: "1.35rem",
    fontWeight: 800,
    color: "#f1f5f9",
    marginBottom: "0.5rem",
    lineHeight: 1.3,
  },
  sub: {
    color: "#94a3b8",
    fontSize: "0.95rem",
    lineHeight: 1.6,
    marginBottom: "1.5rem",
  },
  form: { display: "flex", gap: "0.5rem", flexWrap: "wrap", justifyContent: "center" },
  input: {
    flex: "1 1 220px",
    padding: "0.7rem 1rem",
    background: "#0f172a",
    border: "1px solid #334155",
    borderRadius: "10px",
    color: "#f1f5f9",
    fontSize: "0.9rem",
    outline: "none",
    minWidth: 0,
  },
  btn: {
    padding: "0.7rem 1.4rem",
    background: "linear-gradient(135deg, #7c3aed, #2563eb)",
    border: "none",
    borderRadius: "10px",
    color: "#fff",
    fontWeight: 700,
    fontSize: "0.9rem",
    cursor: "pointer",
    whiteSpace: "nowrap",
    flexShrink: 0,
  },
  btnBusy: { opacity: 0.6, cursor: "wait" },
  success: {
    background: "#14532d",
    border: "1px solid #16a34a",
    borderRadius: "10px",
    padding: "0.9rem 1.25rem",
    color: "#86efac",
    fontSize: "0.9rem",
    marginTop: "1rem",
  },
  error: {
    color: "#fca5a5",
    fontSize: "0.85rem",
    marginTop: "0.75rem",
  },
  privacy: {
    color: "#475569",
    fontSize: "0.75rem",
    marginTop: "0.9rem",
  },
};

export default function LeadMagnetCapture({
  source = "site",
  headline = "Get the free German Cases Cheat Sheet",
  sub = "One-page PDF — Nominative, Accusative, Dative & Genitive articles at a glance. No spam, unsubscribe any time.",
  cta = "Send it to me →",
}) {
  const { track } = useAnalytics();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    if (!email.trim()) return;
    setBusy(true);
    setErr("");
    try {
      await leadsApi.subscribe(email.trim(), getStoredRef(), source);
      track("Lead captured", { props: { source } });
      setDone(true);
    } catch (ex) {
      setErr(ex.message ?? "Something went wrong — please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={s.wrap}>
      <div style={s.icon}>🎁</div>
      <div style={s.headline}>{headline}</div>
      <p style={s.sub}>{sub}</p>

      {done ? (
        <div style={s.success}>
          ✓ Check your inbox — your cheat sheet is on its way!
        </div>
      ) : (
        <form style={s.form} onSubmit={handleSubmit} noValidate>
          <input
            style={s.input}
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            aria-label="Email address"
          />
          <button
            style={{ ...s.btn, ...(busy ? s.btnBusy : {}) }}
            type="submit"
            disabled={busy}
          >
            {busy ? "Sending…" : cta}
          </button>
        </form>
      )}

      {err && <div style={s.error}>{err}</div>}
      <p style={s.privacy}>No spam. Unsubscribe any time.</p>
    </div>
  );
}
