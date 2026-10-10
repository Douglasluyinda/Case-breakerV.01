// Standalone checkout helper — mirrors the BASE_URL / auth logic in client.js
// without importing the private `request` function.

const BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000";
const TOKEN_KEY = "cb_access_token";

function getToken() {
  try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
}

async function post(path, body) {
  const token = getToken();
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message ?? `HTTP ${res.status}`);
  return data;
}

/**
 * Initiate a one-time product checkout.
 * Returns { redirectUrl } — caller should redirect window.location.href there.
 */
export function initiate(productId, provider = "stripe") {
  return post("/checkout", { productId, provider });
}
