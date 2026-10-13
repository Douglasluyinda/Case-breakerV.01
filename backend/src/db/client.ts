import { createClient } from "@supabase/supabase-js";
import { config } from "../config.js";

// Shared realtime options — disable WebSocket on backend (not needed for REST API calls).
// This avoids the native WebSocket requirement and works on any Node.js version.
const realtimeOptions = {
  params: { eventsPerSecond: -1 },
  // Provide a no-op WebSocket to satisfy the Supabase client constructor
  // without requiring Node.js 22's native WebSocket.
  transport: class NoopWS {
    static CONNECTING = 0; static OPEN = 1; static CLOSING = 2; static CLOSED = 3;
    readyState = NoopWS.CLOSED;
    constructor() { /* intentionally empty */ }
    send() { /* noop */ }
    close() { /* noop */ }
    addEventListener() { /* noop */ }
    removeEventListener() { /* noop */ }
  } as unknown as typeof WebSocket,
};

// Service-role client — used server-side only, never exposed to the browser.
export const supabase = createClient(
  config.SUPABASE_URL,
  config.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    realtime: realtimeOptions,
  }
);

// Anon client — safe to use with user JWTs (RLS enforced).
export const supabaseAnon = createClient(
  config.SUPABASE_URL,
  config.SUPABASE_ANON_KEY,
  { realtime: realtimeOptions }
);
