import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { products as productsApi, purchases as purchasesApi } from "../api/client.js";
import * as checkoutApi from "../api/checkout.js";

// ── Styles ──────────────────────────────────────────────────────────────────────
const s = {
  page: {
    minHeight: "100vh",
    background: "#0f172a",
    fontFamily: "'Segoe UI', system-ui, sans-serif",
    color: "#f1f5f9",
  },

  // Nav
  nav: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "1rem 2rem", background: "#1e293b", borderBottom: "1px solid #334155",
    position: "sticky", top: 0, zIndex: 10,
  },
  navLogo: { color: "#60a5fa", fontWeight: 800, fontSize: "1.25rem", textDecoration: "none" },
  navRight: { display: "flex", gap: "1rem", alignItems: "center" },
  navLink: { color: "#94a3b8", textDecoration: "none", fontSize: "0.9rem" },
  navBtn: {
    padding: "0.4rem 1rem", background: "#1d4ed8", border: "none",
    borderRadius: "8px", color: "#fff", cursor: "pointer",
    fontSize: "0.875rem", fontWeight: 600, textDecoration: "none",
  },

  // Hero
  hero: {
    background: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)",
    borderBottom: "1px solid #334155",
    padding: "4rem 2rem 3.5rem",
    textAlign: "center",
  },
  heroBadge: {
    display: "inline-block",
    background: "rgba(99,102,241,0.15)",
    border: "1px solid rgba(99,102,241,0.4)",
    borderRadius: "999px",
    padding: "0.3rem 1rem",
    fontSize: "0.8rem",
    fontWeight: 700,
    color: "#a5b4fc",
    letterSpacing: "0.06em",
    marginBottom: "1.25rem",
  },
  heroTitle: {
    fontSize: "clamp(2rem, 5vw, 3rem)",
    fontWeight: 800,
    lineHeight: 1.15,
    marginBottom: "1rem",
    maxWidth: "700px",
    margin: "0 auto 1rem",
  },
  heroAccent: { color: "#818cf8" },
  heroSub: {
    color: "#94a3b8",
    fontSize: "1.1rem",
    maxWidth: "560px",
    margin: "0 auto 2rem",
    lineHeight: 1.7,
  },
  heroActions: { display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap" },
  heroPrimary: {
    padding: "0.8rem 2rem",
    background: "linear-gradient(135deg, #7c3aed, #2563eb)",
    border: "none", borderRadius: "10px", color: "#fff",
    fontWeight: 700, fontSize: "1rem", cursor: "pointer",
    textDecoration: "none", display: "inline-block",
  },
  heroSecondary: {
    padding: "0.8rem 2rem",
    background: "transparent",
    border: "1px solid #334155", borderRadius: "10px", color: "#94a3b8",
    fontWeight: 600, fontSize: "1rem", cursor: "pointer",
    textDecoration: "none", display: "inline-block",
  },

  // Content
  main: { maxWidth: "1100px", margin: "0 auto", padding: "3rem 1.5rem" },

  // Section header
  sectionHeader: {
    display: "flex", alignItems: "flex-end", justifyContent: "space-between",
    marginBottom: "1.5rem", flexWrap: "wrap", gap: "0.5rem",
  },
  sectionTitle: { fontSize: "1.3rem", fontWeight: 700 },
  sectionSub: { color: "#64748b", fontSize: "0.9rem" },

  // Product grid
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
    gap: "1.5rem",
    marginBottom: "4rem",
  },

  // Product card
  card: {
    background: "#1e293b",
    border: "1px solid #334155",
    borderRadius: "16px",
    padding: "1.75rem",
    display: "flex",
    flexDirection: "column",
    transition: "border-color 0.15s, box-shadow 0.15s",
  },
  cardHover: {
    borderColor: "#4f46e5",
    boxShadow: "0 0 24px rgba(79,70,229,0.15)",
  },
  fileTag: {
    display: "inline-block",
    padding: "0.2rem 0.6rem",
    background: "#0f172a",
    border: "1px solid #334155",
    borderRadius: "6px",
    fontSize: "0.72rem",
    fontWeight: 700,
    color: "#64748b",
    letterSpacing: "0.04em",
    marginBottom: "1rem",
    textTransform: "uppercase",
  },
  cardTitle: { fontSize: "1.1rem", fontWeight: 700, marginBottom: "0.5rem" },
  cardDesc: {
    color: "#94a3b8", fontSize: "0.875rem",
    lineHeight: 1.6, marginBottom: "1.25rem", flex: 1,
  },
  cardFooter: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.75rem" },
  cardPrice: { fontSize: "1.35rem", fontWeight: 800, color: "#f1f5f9" },
  cardPriceSub: { color: "#64748b", fontSize: "0.8rem", fontWeight: 400 },

  buyBtn: {
    padding: "0.6rem 1.25rem",
    background: "#2563eb",
    border: "none", borderRadius: "9px",
    color: "#fff", fontWeight: 700,
    fontSize: "0.875rem", cursor: "pointer",
  },
  buyBtnBusy: { opacity: 0.6, cursor: "wait" },
  ownedBtn: {
    padding: "0.6rem 1.25rem",
    background: "#14532d",
    border: "none", borderRadius: "9px",
    color: "#86efac", fontWeight: 700,
    fontSize: "0.875rem", cursor: "default",
  },

  // Pro banner
  proBanner: {
    background: "linear-gradient(135deg, #1e1b4b 0%, #1e293b 100%)",
    border: "1px solid #4f46e5",
    borderRadius: "20px",
    padding: "3rem 2.5rem",
    display: "grid",
    gridTemplateColumns: "1fr auto",
    gap: "2rem",
    alignItems: "center",
    flexWrap: "wrap",
  },
  proTitle: { fontSize: "1.5rem", fontWeight: 800, marginBottom: "0.5rem" },
  proAccent: { color: "#818cf8" },
  proSub: { color: "#94a3b8", lineHeight: 1.6, maxWidth: "480px", marginBottom: "0" },
  proFeatures: {
    display: "flex", flexWrap: "wrap", gap: "0.5rem", marginTop: "1rem",
  },
  proFeaturePill: {
    background: "rgba(129,140,248,0.1)",
    border: "1px solid rgba(129,140,248,0.2)",
    borderRadius: "999px",
    padding: "0.25rem 0.75rem",
    fontSize: "0.8rem",
    color: "#a5b4fc",
  },
  proBtn: {
    padding: "0.9rem 2rem",
    background: "linear-gradient(135deg, #7c3aed, #2563eb)",
    border: "none", borderRadius: "12px",
    color: "#fff", fontWeight: 700,
    fontSize: "1rem", cursor: "pointer",
    textDecoration: "none", display: "inline-block",
    whiteSpace: "nowrap",
  },

  // Empty
  empty: {
    textAlign: "center", padding: "4rem 2rem",
    color: "#64748b",
  },

  // Error
  errBanner: {
    background: "#450a0a", border: "1px solid #b91c1c",
    borderRadius: "10px", padding: "1rem 1.5rem",
    color: "#fca5a5", marginBottom: "2rem", fontSize: "0.9rem",
  },
};

// ── Buy button per-product ──────────────────────────────────────────────────────
function BuyButton({ product, owned, onSuccess }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [provider] = useState("stripe"); // default; could offer choice

  if (owned) return <button style={s.ownedBtn}>✓ Owned</button>;

  async function handleBuy() {
    if (!user) { navigate("/login?next=/shop"); return; }
    setBusy(true);
    try {
      const { redirectUrl } = await checkoutApi.initiate(product.id, provider);
      window.location.href = redirectUrl;
    } catch (e) {
      alert(e.message ?? "Could not start checkout");
      setBusy(false);
    }
  }

  return (
    <button
      style={{ ...s.buyBtn, ...(busy ? s.buyBtnBusy : {}) }}
      onClick={handleBuy}
      disabled={busy}
    >
      {busy ? "…" : "Buy →"}
    </button>
  );
}

// ── Product card ────────────────────────────────────────────────────────────────
function ProductCard({ product, owned }) {
  const [hovered, setHovered] = useState(false);
  const ext = product.fileType?.split("/")[1]?.toUpperCase() ?? product.fileType ?? "PDF";

  return (
    <div
      style={{ ...s.card, ...(hovered ? s.cardHover : {}) }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <span style={s.fileTag}>{ext}</span>
      <div style={s.cardTitle}>{product.title}</div>
      {product.description && (
        <div style={s.cardDesc}>{product.description}</div>
      )}
      <div style={s.cardFooter}>
        <div>
          <span style={s.cardPrice}>${Number(product.priceUsd).toFixed(2)}</span>
          <span style={s.cardPriceSub}> once</span>
        </div>
        <BuyButton product={product} owned={owned} />
      </div>
    </div>
  );
}

// ── Main page ───────────────────────────────────────────────────────────────────
export default function ShopPage() {
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [ownedIds, setOwnedIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    const fetches = [
      productsApi.list().then((d) => setProducts(d ?? [])),
    ];
    if (user) {
      fetches.push(
        purchasesApi.list()
          .then((d) => setOwnedIds(new Set((d ?? []).map((p) => p.product.id))))
          .catch(() => {})
      );
    }
    Promise.all(fetches)
      .catch((e) => setErr(e.message ?? "Failed to load products"))
      .finally(() => setLoading(false));
  }, [user]);

  const displayName = user?.displayName ?? user?.email?.split("@")[0];

  return (
    <div style={s.page}>
      {/* ── Nav ── */}
      <nav style={s.nav}>
        <Link to="/" style={s.navLogo}>Case Breaker</Link>
        <div style={s.navRight}>
          <Link to="/pro" style={s.navLink}>Pro</Link>
          {user ? (
            <Link to="/dashboard" style={s.navBtn}>Dashboard</Link>
          ) : (
            <>
              <Link to="/login" style={s.navLink}>Sign in</Link>
              <Link to="/register" style={s.navBtn}>Sign up free</Link>
            </>
          )}
        </div>
      </nav>

      {/* ── Hero ── */}
      <section style={s.hero}>
        <div style={s.heroBadge}>DeutschwithDoug × Case Breaker</div>
        <h1 style={s.heroTitle}>
          Master German grammar<br />
          <span style={s.heroAccent}>one case at a time.</span>
        </h1>
        <p style={s.heroSub}>
          Downloadable guides, drills, and cheat sheets — built for learners who
          want to stop guessing and start knowing.
        </p>
        <div style={s.heroActions}>
          <Link to="/" style={s.heroPrimary}>▶ Play free</Link>
          <Link to="/pro" style={s.heroSecondary}>Go Pro for $9/mo</Link>
        </div>
      </section>

      {/* ── Products ── */}
      <main style={s.main}>
        {err && <div style={s.errBanner}>{err}</div>}

        <div style={s.sectionHeader}>
          <div>
            <div style={s.sectionTitle}>Grammar Resources</div>
            <div style={s.sectionSub}>
              {loading ? "Loading…" : `${products.length} resource${products.length !== 1 ? "s" : ""} available`}
            </div>
          </div>
          {user && ownedIds.size > 0 && (
            <Link to="/dashboard" style={{ color: "#60a5fa", fontSize: "0.875rem", textDecoration: "none" }}>
              View my downloads →
            </Link>
          )}
        </div>

        {loading ? (
          <div style={{ ...s.empty, padding: "2rem 0" }}>Loading products…</div>
        ) : products.length === 0 ? (
          <div style={s.empty}>
            <div style={{ fontSize: "2rem", marginBottom: "0.75rem" }}>📚</div>
            <div style={{ color: "#94a3b8", fontWeight: 600 }}>Resources coming soon</div>
            <div style={{ marginTop: "0.5rem" }}>Check back shortly or go Pro for full access.</div>
          </div>
        ) : (
          <div style={s.grid}>
            {products.map((p) => (
              <ProductCard key={p.id} product={p} owned={ownedIds.has(p.id)} />
            ))}
          </div>
        )}

        {/* ── Pro upsell banner ── */}
        <div style={s.proBanner}>
          <div>
            <div style={s.proTitle}>
              Want <span style={s.proAccent}>everything</span>?
            </div>
            <p style={s.proSub}>
              Case Breaker Pro includes every guide plus unlimited drills,
              AI mistake analysis, and CEFR-level progress tracking — for one
              flat monthly fee.
            </p>
            <div style={s.proFeatures}>
              {["AI analysis", "CEFR tracking", "Unlimited drills", "All guides", "$9/mo"].map((f) => (
                <span key={f} style={s.proFeaturePill}>{f}</span>
              ))}
            </div>
          </div>
          <Link to="/pro" style={s.proBtn}>Upgrade to Pro →</Link>
        </div>
      </main>
    </div>
  );
}
