import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { admin as adminApi } from "../api/client.js";

// ── Styles ──────────────────────────────────────────────────────────────────────
const s = {
  page: { minHeight: "100vh", background: "#0f172a", fontFamily: "'Segoe UI', system-ui, sans-serif", color: "#f1f5f9" },
  nav: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "1rem 2rem", background: "#1e293b", borderBottom: "1px solid #334155",
  },
  navLogo: { color: "#60a5fa", fontWeight: 800, fontSize: "1.25rem", textDecoration: "none" },
  navBadge: {
    background: "#7c3aed", color: "#fff", borderRadius: "6px",
    padding: "0.2rem 0.6rem", fontSize: "0.75rem", fontWeight: 700,
  },
  navRight: { display: "flex", gap: "1rem", alignItems: "center" },
  navLink: { color: "#94a3b8", textDecoration: "none", fontSize: "0.875rem" },
  main: { maxWidth: "1100px", margin: "0 auto", padding: "2rem 1.5rem" },
  heading: { fontSize: "1.75rem", fontWeight: 800, marginBottom: "0.25rem" },
  sub: { color: "#64748b", marginBottom: "2.5rem", fontSize: "0.9rem" },

  // Stat tiles
  statGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "1rem", marginBottom: "3rem" },
  statTile: { background: "#1e293b", border: "1px solid #334155", borderRadius: "12px", padding: "1.25rem 1.5rem" },
  statLabel: { color: "#64748b", fontSize: "0.78rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.5rem" },
  statValue: { fontSize: "2rem", fontWeight: 800, lineHeight: 1 },
  statSub: { color: "#64748b", fontSize: "0.8rem", marginTop: "0.25rem" },

  // Tabs
  tabs: { display: "flex", gap: "0.25rem", marginBottom: "1.5rem", borderBottom: "1px solid #334155", paddingBottom: "0" },
  tab: {
    padding: "0.6rem 1.25rem", background: "transparent", border: "none",
    color: "#64748b", cursor: "pointer", fontSize: "0.9rem", fontWeight: 600,
    borderBottom: "2px solid transparent", marginBottom: "-1px",
  },
  tabActive: { color: "#60a5fa", borderBottomColor: "#60a5fa" },

  // Table
  tableWrap: { overflowX: "auto" },
  table: { width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" },
  th: { color: "#64748b", fontWeight: 700, textTransform: "uppercase", fontSize: "0.75rem", letterSpacing: "0.06em", padding: "0.75rem 1rem", textAlign: "left", borderBottom: "1px solid #334155" },
  td: { padding: "0.75rem 1rem", borderBottom: "1px solid #1e293b", verticalAlign: "middle" },
  trHover: { background: "#1e293b" },

  // Status badges
  badge: (color) => ({
    display: "inline-block", padding: "0.2rem 0.6rem", borderRadius: "999px",
    fontSize: "0.75rem", fontWeight: 700,
    background: color === "green" ? "#14532d" : color === "yellow" ? "#713f12" : color === "red" ? "#450a0a" : "#1e293b",
    color: color === "green" ? "#86efac" : color === "yellow" ? "#fde68a" : color === "red" ? "#fca5a5" : "#94a3b8",
  }),

  // Toggle button
  toggleBtn: (active) => ({
    padding: "0.3rem 0.75rem", borderRadius: "6px", cursor: "pointer",
    fontSize: "0.8rem", fontWeight: 600, border: "none",
    background: active ? "#166534" : "#334155",
    color: active ? "#86efac" : "#94a3b8",
  }),
  actionBtn: {
    padding: "0.3rem 0.75rem", borderRadius: "6px", cursor: "pointer",
    fontSize: "0.8rem", fontWeight: 600, border: "none",
    background: "#334155", color: "#94a3b8",
  },

  loadMsg: { color: "#64748b", padding: "2rem 0" },
  errMsg: { color: "#f87171", padding: "2rem 0" },
};

// ── Status badge colour map ──────────────────────────────────────────────────────
function statusColor(status) {
  if (["completed", "active", "trialing"].includes(status)) return "green";
  if (["pending", "past_due"].includes(status)) return "yellow";
  if (["failed", "cancelled", "refunded"].includes(status)) return "red";
  return "neutral";
}

function fmt(date) {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit" });
}

function fmtUsd(n) {
  return `$${Number(n).toFixed(2)}`;
}

// ── Products tab ────────────────────────────────────────────────────────────────
function ProductsTab() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    adminApi.products()
      .then((d) => setProducts(d ?? []))
      .catch((e) => setErr(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(load, [load]);

  async function toggleActive(id, current) {
    try {
      await adminApi.patchProduct(id, { is_active: !current });
      setProducts((prev) => prev.map((p) => p.id === id ? { ...p, is_active: !current } : p));
    } catch (e) {
      alert(e.message);
    }
  }

  if (loading) return <p style={s.loadMsg}>Loading…</p>;
  if (err) return <p style={s.errMsg}>{err}</p>;

  return (
    <div style={s.tableWrap}>
      <table style={s.table}>
        <thead>
          <tr>
            <th style={s.th}>Title</th>
            <th style={s.th}>Slug</th>
            <th style={s.th}>Price</th>
            <th style={s.th}>Type</th>
            <th style={s.th}>Created</th>
            <th style={s.th}>Status</th>
          </tr>
        </thead>
        <tbody>
          {products.map((p) => (
            <tr key={p.id}>
              <td style={s.td}>{p.title}</td>
              <td style={{ ...s.td, color: "#64748b", fontFamily: "monospace", fontSize: "0.8rem" }}>{p.slug}</td>
              <td style={s.td}>{fmtUsd(p.price_usd)}</td>
              <td style={{ ...s.td, color: "#64748b" }}>{p.file_type ?? "—"}</td>
              <td style={{ ...s.td, color: "#64748b" }}>{fmt(p.created_at)}</td>
              <td style={s.td}>
                <button style={s.toggleBtn(p.is_active)} onClick={() => toggleActive(p.id, p.is_active)}>
                  {p.is_active ? "Active" : "Inactive"}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Orders tab ──────────────────────────────────────────────────────────────────
function OrdersTab() {
  const [orders, setOrders] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const load = useCallback((p) => {
    setLoading(true);
    adminApi.orders(p)
      .then((d) => { setOrders(d.orders ?? []); setTotal(d.total ?? 0); })
      .catch((e) => setErr(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => load(page), [load, page]);

  async function updateStatus(id, status) {
    if (!window.confirm(`Set order ${id.slice(0, 8)}… to "${status}"?`)) return;
    try {
      await adminApi.patchOrder(id, { status });
      setOrders((prev) => prev.map((o) => o.id === id ? { ...o, status } : o));
    } catch (e) {
      alert(e.message);
    }
  }

  if (loading) return <p style={s.loadMsg}>Loading…</p>;
  if (err) return <p style={s.errMsg}>{err}</p>;

  return (
    <>
      <div style={s.tableWrap}>
        <table style={s.table}>
          <thead>
            <tr>
              <th style={s.th}>ID</th>
              <th style={s.th}>Product</th>
              <th style={s.th}>Provider</th>
              <th style={s.th}>Amount</th>
              <th style={s.th}>Date</th>
              <th style={s.th}>Status</th>
              <th style={s.th}>Action</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id}>
                <td style={{ ...s.td, fontFamily: "monospace", fontSize: "0.75rem", color: "#64748b" }}>{o.id.slice(0, 8)}…</td>
                <td style={s.td}>{o.products?.title ?? "—"}</td>
                <td style={{ ...s.td, color: "#64748b" }}>{o.payment_provider ?? "—"}</td>
                <td style={s.td}>{fmtUsd(o.amount_usd)}</td>
                <td style={{ ...s.td, color: "#64748b" }}>{fmt(o.created_at)}</td>
                <td style={s.td}><span style={s.badge(statusColor(o.status))}>{o.status}</span></td>
                <td style={s.td}>
                  {o.status === "completed" && (
                    <button style={s.actionBtn} onClick={() => updateStatus(o.id, "refunded")}>Refund</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ display: "flex", gap: "0.75rem", marginTop: "1rem", color: "#64748b", fontSize: "0.85rem", alignItems: "center" }}>
        <span>{total} total</span>
        <button style={s.actionBtn} onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>← Prev</button>
        <span>Page {page}</span>
        <button style={s.actionBtn} onClick={() => setPage((p) => p + 1)} disabled={orders.length < 50}>Next →</button>
      </div>
    </>
  );
}

// ── Subscriptions tab ───────────────────────────────────────────────────────────
function SubscriptionsTab() {
  const [subs, setSubs] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    adminApi.subscriptions(1)
      .then((d) => { setSubs(d.subscriptions ?? []); setTotal(d.total ?? 0); })
      .catch((e) => setErr(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p style={s.loadMsg}>Loading…</p>;
  if (err) return <p style={s.errMsg}>{err}</p>;

  return (
    <>
      <div style={s.tableWrap}>
        <table style={s.table}>
          <thead>
            <tr>
              <th style={s.th}>User ID</th>
              <th style={s.th}>Stripe Sub</th>
              <th style={s.th}>Status</th>
              <th style={s.th}>Renews</th>
              <th style={s.th}>Cancel EOP</th>
              <th style={s.th}>Created</th>
            </tr>
          </thead>
          <tbody>
            {subs.map((sub) => (
              <tr key={sub.id}>
                <td style={{ ...s.td, fontFamily: "monospace", fontSize: "0.75rem", color: "#64748b" }}>{sub.user_id.slice(0, 8)}…</td>
                <td style={{ ...s.td, fontFamily: "monospace", fontSize: "0.75rem", color: "#64748b" }}>{sub.stripe_subscription_id ?? "—"}</td>
                <td style={s.td}><span style={s.badge(statusColor(sub.status))}>{sub.status}</span></td>
                <td style={{ ...s.td, color: "#64748b" }}>{fmt(sub.current_period_end)}</td>
                <td style={{ ...s.td, color: sub.cancel_at_period_end ? "#fca5a5" : "#64748b" }}>
                  {sub.cancel_at_period_end ? "Yes" : "No"}
                </td>
                <td style={{ ...s.td, color: "#64748b" }}>{fmt(sub.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ marginTop: "1rem", color: "#64748b", fontSize: "0.85rem" }}>{total} total</div>
    </>
  );
}

// ── Main page ───────────────────────────────────────────────────────────────────
export default function AdminPage() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState("products");
  const [stats, setStats] = useState(null);

  useEffect(() => {
    adminApi.stats().then(setStats).catch(() => {});
  }, []);

  const TABS = [
    { id: "products", label: "Products" },
    { id: "orders", label: "Orders" },
    { id: "subscriptions", label: "Subscriptions" },
  ];

  return (
    <div style={s.page}>
      {/* ── Nav ── */}
      <nav style={s.nav}>
        <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
          <Link to="/" style={s.navLogo}>Case Breaker</Link>
          <span style={s.navBadge}>Admin</span>
        </div>
        <div style={s.navRight}>
          <span style={{ color: "#64748b", fontSize: "0.875rem" }}>{user?.email}</span>
          <Link to="/dashboard" style={s.navLink}>Dashboard</Link>
          <button
            style={{ ...s.navLink, background: "none", border: "none", cursor: "pointer" }}
            onClick={logout}
          >
            Sign out
          </button>
        </div>
      </nav>

      <main style={s.main}>
        <h1 style={s.heading}>Admin</h1>
        <p style={s.sub}>Manage products, orders, and Pro subscriptions.</p>

        {/* ── KPI tiles ── */}
        {stats && (
          <div style={s.statGrid}>
            <div style={s.statTile}>
              <div style={s.statLabel}>Products</div>
              <div style={s.statValue}>{stats.products.total}</div>
              <div style={s.statSub}>{stats.products.active} active</div>
            </div>
            <div style={s.statTile}>
              <div style={s.statLabel}>Orders</div>
              <div style={s.statValue}>{stats.orders.total}</div>
              <div style={s.statSub}>{stats.orders.completed} completed</div>
            </div>
            <div style={s.statTile}>
              <div style={s.statLabel}>Pro Subs</div>
              <div style={s.statValue}>{stats.subscriptions.active}</div>
              <div style={s.statSub}>active</div>
            </div>
            <div style={s.statTile}>
              <div style={s.statLabel}>Revenue</div>
              <div style={{ ...s.statValue, color: "#86efac" }}>{fmtUsd(stats.revenue.totalUsd)}</div>
              <div style={s.statSub}>all time</div>
            </div>
          </div>
        )}

        {/* ── Tabs ── */}
        <div style={s.tabs}>
          {TABS.map((t) => (
            <button
              key={t.id}
              style={{ ...s.tab, ...(activeTab === t.id ? s.tabActive : {}) }}
              onClick={() => setActiveTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {activeTab === "products" && <ProductsTab />}
        {activeTab === "orders" && <OrdersTab />}
        {activeTab === "subscriptions" && <SubscriptionsTab />}
      </main>
    </div>
  );
}
