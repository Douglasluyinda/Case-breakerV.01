import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
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
  success: {
    background: "#052e16",
    border: "1px solid #166534",
    borderRadius: "8px",
    color: "#86efac",
    padding: "0.65rem 0.9rem",
    fontSize: "0.875rem",
    marginBottom: "1rem",
  },
  footer: { color: "#64748b", fontSize: "0.85rem", textAlign: "center", marginTop: "1.5rem" },
  link: { color: "#60a5fa" },
};

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setInfo("");
    setLoading(true);
    try {
      const result = await register(email, password, displayName || undefined);
      if (result?.requiresConfirmation) {
        setInfo("Check your email to confirm your account, then sign in.");
        return;
      }
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(err.message ?? "Registration failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={s.page}>
      <div style={s.card}>
        <div style={s.logo}>Case Breaker</div>
        <div style={s.subtitle}>Create your account</div>

        {error && <div style={s.error}>{error}</div>}
        {info  && <div style={s.success}>{info}</div>}

        <form onSubmit={handleSubmit} noValidate>
          <label style={s.label}>Display name (optional)</label>
          <input
            style={s.input}
            type="text"
            autoComplete="name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
          />
          <label style={s.label}>Email</label>
          <input
            style={s.input}
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <label style={s.label}>Password <span style={{ color: "#64748b" }}>(min 8 characters)</span></label>
          <input
            style={s.input}
            type="password"
            autoComplete="new-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button style={s.btn} type="submit" disabled={loading}>
            {loading ? "Creating account…" : "Create account"}
          </button>
        </form>

        <div style={s.footer}>
          Already have an account?{" "}
          <Link to="/login" style={s.link}>Sign in</Link>
        </div>
      </div>
    </div>
  );
}
