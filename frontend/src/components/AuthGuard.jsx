import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

/** Wraps protected routes — redirects to /login if not authenticated. */
export default function AuthGuard({ children }) {
  const { user, status } = useAuth();
  const location = useLocation();

  if (status === "loading") {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", background: "#0f172a", color: "#60a5fa" }}>
        Loading…
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}
