import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

const s = {
  page: {
    minHeight: "100vh",
    background: "#0f172a",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "'Segoe UI', system-ui, sans-serif",
    padding: "1rem",
  },
  card: {
    background: "#1e293b",
    border: "1px solid #334155",
    borderRadius: "16px",
    padding: "2.5rem",
    width: "100%",
    maxWidth: "400px",
  },
  logo: { color: "#60a5fa", fontSize: "1.75rem", fontWeight: 800, marginBottom: "0.25rem" },
  subtitle: { color: "#94a3b8", fontSize: "0.9rem", marginBottom: "2rem" },
  label: { display: "block", color: "#cbd5e1", fontSize: "0.85rem", marginBottom: "0.4rem" },
  input: {
    width: "100%",
    padding: "0.65rem 0.9rem",
    background: "#0f172a",
    border: "1px solid #334155",
    borderRadius: "8px",
    color: "#f1f5f9",
    fontSize: "1rem",
    outline: "none",
    boxSizing: "border-box",
    marginBottom: "1.1rem",
  },
  btn: {
    width: "100%",
    padding: "0.75rem",
    background: "#2563eb",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    fontSize: "1rem",
    fontWeight: 700,
    cursor: "pointer",
    marginTop: "0.5rem",
  },
  error: {
    background: "#450a0a",
    border: "1px solid #b91c1c",
    borderRadius: "8px",
    color: "#fca5a5",
    padding: "0.65rem 0.9rem",
    fontSize: "0.875rem",
    marginBottom: "1rem",
  },
  footer: { color: "#64748b", fontSize: "0.85rem", textAlign: "center", marginTop: "1.5rem" },
  link: { color: "#60a5fa" },
};

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname ?? "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message ?? "Login failed. Check your credentials.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={s.page}>
      <div style={s.card}>
        <div style={s.logo}>Case Breaker</div>
        <div style={s.subtitle}>Sign in to your account</div>

        {error && <div style={s.error}>{error}</div>}

        <form onSubmit={handleSubmit} noValidate>
          <label style={s.label}>Email</label>
          <input
            style={s.input}
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <label style={s.label}>Password</label>
          <input
            style={s.input}
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button style={s.btn} type="submit" disabled={loading}>
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <div style={s.footer}>
          Don't have an account?{" "}
          <Link to="/register" style={s.link}>Create one</Link>
        </div>
      </div>
    </div>
  );
}
