import { useAuth } from "../context/AuthContext.jsx";
import { Navigate } from "react-router-dom";

/**
 * Restricts a route to users whose JWT role is "admin" or "service_role".
 * Regular authenticated users are redirected to /dashboard.
 */
export default function AdminGuard({ children }) {
  const { user, status } = useAuth();

  if (status === "loading") {
    return (
      <div style={{ minHeight: "100vh", background: "#0f172a", display: "flex",
        alignItems: "center", justifyContent: "center", color: "#64748b" }}>
        Loading…
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== "admin" && user.role !== "service_role") {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
