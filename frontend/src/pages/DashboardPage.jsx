import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { products as productsApi } from "../api/client.js";

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
  navRight: { display: "flex", alignItems: "center", gap: "1rem" },
  userName: { color: "#94a3b8", fontSize: "0.9rem" },
  navBtn: {
    padding: "0.4rem 1rem",
    background: "transparent",
    border: "1px solid #334155",
    borderRadius: "8px",
    color: "#94a3b8",
    cursor: "pointer",
    fontSize: "0.875rem",
  },
  playBtn: {
    padding: "0.4rem 1rem",
    background: "#1d4ed8",
    border: "none",
    borderRadius: "8px",
    color: "#fff",
    cursor: "pointer",
    fontSize: "0.875rem",
    fontWeight: 600,
    textDecoration: "none",
  },
  main: { maxWidth: "900px", margin: "0 auto", padding: "2rem 1rem" },
  heading: { fontSize: "1.5rem", fontWeight: 700, marginBottom: "0.5rem" },
  subheading: { color: "#94a3b8", marginBottom: "2.5rem", fontSize: "0.95rem" },
  sectionTitle: { color: "#94a3b8", fontSize: "0.8rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "1rem" },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1.25rem" },
  card: {
    background: "#1e293b",
    border: "1px solid #334155",
    borderRadius: "12px",
    padding: "1.5rem",
  },
  cardTitle: { fontWeight: 700, marginBottom: "0.35rem" },
  cardDesc: { color: "#94a3b8", fontSize: "0.875rem", marginBottom: "1.25rem", lineHeight: 1.5 },
  cardMeta: { color: "#64748b", fontSize: "0.8rem", marginBottom: "1rem" },
  downloadBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: "0.4rem",
    padding: "0.55rem 1.1rem",
    background: "#166534",
    border: "none",
    borderRadius: "8px",
    color: "#86efac",
    fontWeight: 600,
    fontSize: "0.875rem",
    cursor: "pointer",
  },
  downloadBtnBusy: { opacity: 0.6, cursor: "wait" },
  emptyBox: {
    background: "#1e293b",
    border: "1px dashed #334155",
    borderRadius: "12px",
    padding: "3rem 2rem",
    textAlign: "center",
    color: "#64748b",
  },
  emptyTitle: { fontSize: "1.1rem", fontWeight: 600, marginBottom: "0.5rem", color: "#94a3b8" },
  shopLink: { color: "#60a5fa", textDecoration: "none" },
  errorBadge: { color: "#f87171", fontSize: "0.8rem", marginTop: "0.5rem" },
  tag: {
    display: "inline-block",
    padding: "0.2rem 0.6rem",
    background: "#0f172a",
    border: "1px solid #334155",
    borderRadius: "999px",
    fontSize: "0.75rem",
    color: "#94a3b8",
    marginBottom: "0.75rem",
  },
};

// ── Download button (per-product state) ─────────────────────────────────────────
function DownloadButton({ productId }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function handleDownload() {
    setBusy(true);
    setErr("");
    try {
      const { downloadUrl } = await productsApi.download(productId);
      // Open the presigned R2 URL in a new tab — browser handles the download
      window.open(downloadUrl, "_blank", "noopener,noreferrer");
    } catch (e) {
      setErr(e.message ?? "Download failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <button
        style={{ ...s.downloadBtn, ...(busy ? s.downloadBtnBusy : {}) }}
        onClick={handleDownload}
        disabled={busy}
      >
        {busy ? "Preparing…" : "⬇ Download"}
      </button>
      {err && <div style={s.errorBadge}>{err}</div>}
    </div>
  );
}

// ── File size formatter ─────────────────────────────────────────────────────────
function fmtSize(bytes) {
  if (!bytes) return null;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

// ── Main page ───────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { user, logout } = useAuth();
  const [purchases, setPurchases] = useState([]);
  const [loadingPurchases, setLoadingPurchases] = useState(true);

  useEffect(() => {
    // Fetch all products and attempt to get download URLs to determine entitlement.
    // M07 will add a proper /purchases endpoint; for now we list products and
    // show download buttons — the backend enforces access on the download route.
    productsApi.list()
      .then((data) => setPurchases(data ?? []))
      .catch(() => setPurchases([]))
      .finally(() => setLoadingPurchases(false));
  }, []);

  const displayName = user?.displayName ?? user?.email?.split("@")[0] ?? "there";

  return (
    <div style={s.page}>
      {/* ── Nav ── */}
      <nav style={s.nav}>
        <span style={s.navLogo}>Case Breaker</span>
        <div style={s.navRight}>
          <span style={s.userName}>{user?.email}</span>
          <Link to="/" style={s.playBtn}>▶ Play</Link>
          <button style={s.navBtn} onClick={logout}>Sign out</button>
        </div>
      </nav>

      {/* ── Content ── */}
      <main style={s.main}>
        <h1 style={s.heading}>Welcome back, {displayName}</h1>
        <p style={s.subheading}>Your purchased resources are ready to download.</p>

        <div style={s.sectionTitle}>My Downloads</div>

        {loadingPurchases ? (
          <p style={{ color: "#64748b" }}>Loading…</p>
        ) : purchases.length === 0 ? (
          <div style={s.emptyBox}>
            <div style={s.emptyTitle}>No purchases yet</div>
            <p style={{ margin: 0 }}>
              Browse the <Link to="/shop" style={s.shopLink}>shop</Link> to find grammar guides and resources.
            </p>
          </div>
        ) : (
          <div style={s.grid}>
            {purchases.map((p) => (
              <div key={p.id} style={s.card}>
                {p.fileType && <span style={s.tag}>{p.fileType.split("/")[1]?.toUpperCase() ?? p.fileType}</span>}
                <div style={s.cardTitle}>{p.title}</div>
                {p.description && <div style={s.cardDesc}>{p.description}</div>}
                {fmtSize(p.fileSizeBytes) && (
                  <div style={s.cardMeta}>{fmtSize(p.fileSizeBytes)}</div>
                )}
                <DownloadButton productId={p.id} />
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
