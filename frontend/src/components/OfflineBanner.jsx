import { useState, useEffect } from "react";

// Shows a slim top bar when the device has no network connection.
// Hides automatically when connectivity returns.

const s = {
  bar: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10000,
    background: "#78350f",
    borderBottom: "1px solid #92400e",
    color: "#fef3c7",
    fontSize: "0.8rem",
    fontWeight: 600,
    fontFamily: "'Segoe UI', system-ui, sans-serif",
    padding: "0.4rem 1rem",
    textAlign: "center",
    letterSpacing: "0.01em",
  },
};

export default function OfflineBanner() {
  const [offline, setOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const go_online  = () => setOffline(false);
    const go_offline = () => setOffline(true);
    window.addEventListener("online",  go_online);
    window.addEventListener("offline", go_offline);
    return () => {
      window.removeEventListener("online",  go_online);
      window.removeEventListener("offline", go_offline);
    };
  }, []);

  if (!offline) return null;

  return (
    <div style={s.bar} role="alert" aria-live="polite">
      📡 You're offline — the drill still works, but shop &amp; downloads need a connection.
    </div>
  );
}
