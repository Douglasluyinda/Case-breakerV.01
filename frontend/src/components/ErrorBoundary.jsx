import { Component } from "react";

const s = {
  wrap: {
    minHeight: "100vh",
    background: "#0f172a",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "'Segoe UI', system-ui, sans-serif",
    padding: "2rem",
  },
  box: {
    background: "#1e293b",
    border: "1px solid #334155",
    borderRadius: "16px",
    padding: "2.5rem",
    maxWidth: "480px",
    width: "100%",
    textAlign: "center",
  },
  icon: { fontSize: "2.5rem", marginBottom: "1rem" },
  title: { color: "#f1f5f9", fontSize: "1.2rem", fontWeight: 700, marginBottom: "0.5rem" },
  msg: { color: "#94a3b8", fontSize: "0.9rem", lineHeight: 1.6, marginBottom: "1.5rem" },
  btn: {
    padding: "0.6rem 1.5rem",
    background: "#1d4ed8",
    border: "none",
    borderRadius: "8px",
    color: "#fff",
    fontWeight: 600,
    fontSize: "0.875rem",
    cursor: "pointer",
  },
};

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error("ErrorBoundary caught:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={s.wrap}>
          <div style={s.box}>
            <div style={s.icon}>⚠️</div>
            <div style={s.title}>Something went wrong</div>
            <p style={s.msg}>
              An unexpected error occurred. Reload the page to try again — your progress is saved.
            </p>
            <button style={s.btn} onClick={() => window.location.reload()}>
              Reload page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
