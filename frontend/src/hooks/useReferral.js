// ── useReferral ────────────────────────────────────────────────────────────────
// Reads the ?ref= query param on first mount, persists it to localStorage,
// and returns the current value so checkout calls can include it.
//
// A ref value is only overwritten if a new one arrives in the URL.
//
// Usage:
//   const ref = useReferral();          // "youtube-aug" | null
//   checkoutApi.initiate(id, provider, ref);

import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";

const STORAGE_KEY = "cb_ref";

export function useReferral() {
  const [searchParams] = useSearchParams();

  const [ref, setRef] = useState(() => {
    // Initialise from localStorage so the value is available synchronously
    try { return localStorage.getItem(STORAGE_KEY) ?? null; } catch { return null; }
  });

  useEffect(() => {
    const urlRef = searchParams.get("ref");
    if (urlRef) {
      try { localStorage.setItem(STORAGE_KEY, urlRef); } catch {}
      setRef(urlRef);
    }
  }, [searchParams]);

  return ref;
}

/** Read the stored ref without a hook (for use outside React components). */
export function getStoredRef() {
  try { return localStorage.getItem(STORAGE_KEY) ?? null; } catch { return null; }
}
