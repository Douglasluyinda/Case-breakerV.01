// ── useAnalytics ───────────────────────────────────────────────────────────────
// Lightweight wrapper around Plausible custom events.
//
// Usage:
//   const { track } = useAnalytics();
//   track("Upgrade clicked");
//   track("Product purchased", { props: { product: "Nominative Guide" } });
//
// The Plausible script is loaded by index.html when VITE_PLAUSIBLE_DOMAIN is set.
// If the script hasn't loaded (dev, ad-blocker, no domain configured) the calls
// are silently no-ops so nothing crashes.

export function useAnalytics() {
  function track(eventName, options = {}) {
    try {
      if (typeof window !== "undefined" && typeof window.plausible === "function") {
        window.plausible(eventName, options);
      }
    } catch {
      // silently ignore — analytics must never break the app
    }
  }

  return { track };
}
