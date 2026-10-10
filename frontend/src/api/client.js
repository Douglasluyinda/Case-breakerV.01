// ── API base client ─────────────────────────────────────────────────────────────
// All requests go through here so auth headers and base URL are handled once.

const BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

const TOKEN_KEY = "cb_access_token";
const REFRESH_KEY = "cb_refresh_token";

// ── Token helpers ───────────────────────────────────────────────────────────────
export function getToken() {
  try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
}

export function setTokens(access, refresh) {
  try {
    localStorage.setItem(TOKEN_KEY, access);
    if (refresh) localStorage.setItem(REFRESH_KEY, refresh);
  } catch {}
}

export function clearTokens() {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
  } catch {}
}

// ── Core fetch wrapper ──────────────────────────────────────────────────────────
async function request(path, options = {}) {
  const token = getToken();
  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (res.status === 204) return null;

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const err = new Error(data.error ?? `HTTP ${res.status}`);
    err.status = res.status;
    err.data = data;
    throw err;
  }

  return data;
}

// ── Auth endpoints ──────────────────────────────────────────────────────────────
export const auth = {
  register: (email, password, displayName) =>
    request("/auth/register", { method: "POST", body: { email, password, displayName } }),

  login: (email, password) =>
    request("/auth/login", { method: "POST", body: { email, password } }),

  logout: () =>
    request("/auth/logout", { method: "POST" }),

  me: () =>
    request("/auth/me"),
};

// ── Product endpoints ───────────────────────────────────────────────────────────
export const products = {
  list: () => request("/products"),
  get: (id) => request(`/products/${id}`),
  download: (id) => request(`/products/${id}/download`),
};

// ── Purchases / entitlements ────────────────────────────────────────────────────
export const purchases = {
  /** Returns the user's completed purchases with product details. */
  list: () => request("/purchases"),
  /** Quick entitlement check for a single product. */
  entitlement: (productId) => request(`/purchases/${productId}/entitlement`),
};

// ── Subscriptions ───────────────────────────────────────────────────────────────
export const subscriptions = {
  /** Returns the user's active Pro subscription or null. */
  me: () => request("/subscriptions/me"),
  /** Start a Pro subscription — returns { redirectUrl }. */
  subscribe: () => request("/subscriptions", { method: "POST" }),
  /** Cancel the active subscription at period end. */
  cancel: () => request("/subscriptions/me", { method: "DELETE" }),
};
