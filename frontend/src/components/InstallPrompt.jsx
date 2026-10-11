import { useState, useEffect } from "react";

// ── InstallPrompt ──────────────────────────────────────────────────────────────
// Shows an "Add to Home Screen" banner when the browser fires beforeinstallprompt.
// Persists dismissal in localStorage so it doesn't re-appear every session.
//
// Usage: drop <InstallPrompt /> anywhere in the tree (main.jsx mounts it once).

const STORAGE_KEY = "cb_pwa_dismissed";

const s = {
  banner: {
    position: "fixed",
    bottom: "env(safe-area-inset-bottom, 0px)",
    left: 0,
    right: 0,
    zIndex: 9999,
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
    padding: "0.85rem 1.25rem",
    background: "#1e293b",
    borderTop: "1px solid #334155",
    boxShadow: "0 -4px 24px rgba(0,0,0,0.4)",
    fontFamily: "'Segoe UI', system-ui, sans-serif",
  },
  icon: { fontSize: "1.75rem", flexShrink: 0 },
  text: { flex: 1, minWidth: 0 },
  title: { fontSize: "0.875rem", fontWeight: 700, color: "#f1f5f9", lineHeight: 1.3 },
  sub: { fontSize: "0.78rem", color: "#94a3b8", marginTop: "0.15rem" },
  actions: { display: "flex", gap: "0.5rem", flexShrink: 0 },
  installBtn: {
    padding: "0.45rem 1rem",
    background: "#4f46e5",
    border: "none",
    borderRadius: "8px",
    color: "#fff",
    fontWeight: 700,
    fontSize: "0.82rem",
    cursor: "pointer",
    whiteSpace: "nowrap",
  },
  dismissBtn: {
    padding: "0.45rem 0.75rem",
    background: "transparent",
    border: "1px solid #475569",
    borderRadius: "8px",
    color: "#94a3b8",
    fontWeight: 600,
    fontSize: "0.82rem",
    cursor: "pointer",
    whiteSpace: "nowrap",
  },
};

export default function InstallPrompt() {
  const [prompt, setPrompt] = useState(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Don't show if already dismissed
    try {
      if (localStorage.getItem(STORAGE_KEY)) return;
    } catch {
      // localStorage blocked (private mode) — still show the prompt
    }

    function handleBeforeInstall(e) {
      e.preventDefault();
      setPrompt(e);
      setVisible(true);
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
  }, []);

  async function handleInstall() {
    if (!prompt) return;
    prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === "accepted") {
      setVisible(false);
    }
    setPrompt(null);
  }

  function handleDismiss() {
    try { localStorage.setItem(STORAGE_KEY, "1"); } catch { /* ignore */ }
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div style={s.banner} role="banner" aria-label="Install Case Breaker">
      <span style={s.icon}>📲</span>
      <div style={s.text}>
        <div style={s.title}>Add Case Breaker to your home screen</div>
        <div style={s.sub}>Play offline · No app store needed</div>
      </div>
      <div style={s.actions}>
        <button style={s.dismissBtn} onClick={handleDismiss} aria-label="Dismiss">
          Not now
        </button>
        <button style={s.installBtn} onClick={handleInstall}>
          Install
        </button>
      </div>
    </div>
  );
}
