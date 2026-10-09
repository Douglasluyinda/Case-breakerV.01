import { describe, it, expect, vi, beforeEach, afterAll } from "vitest";
import type { FastifyInstance } from "fastify";

// ── Mock Supabase client ────────────────────────────────────────────────────────
vi.mock("../src/db/client.js", () => {
  const mockSingle = vi.fn();
  const mockEq = vi.fn(() => ({ single: mockSingle }));
  const mockSelect = vi.fn(() => ({ eq: mockEq }));
  const mockUpsert = vi.fn(() => Promise.resolve({ error: null }));
  const mockFrom = vi.fn(() => ({ select: mockSelect, upsert: mockUpsert }));

  const mockSignUp = vi.fn();
  const mockSignInWithPassword = vi.fn();
  const mockSignOut = vi.fn(() => Promise.resolve({ error: null }));
  const mockAdminSignOut = vi.fn(() => Promise.resolve({ error: null }));

  return {
    supabase: {
      auth: {
        signUp: mockSignUp,
        signInWithPassword: mockSignInWithPassword,
        signOut: mockSignOut,
        setSession: true, // truthy → uses admin.signOut branch
        admin: { signOut: mockAdminSignOut },
      },
      from: mockFrom,
    },
    supabaseAnon: {},
  };
});

// ── Helpers ─────────────────────────────────────────────────────────────────────
import { buildApp } from "../src/app.js";
import { supabase } from "../src/db/client.js";

const mockSupabase = supabase as typeof supabase & {
  auth: {
    signUp: ReturnType<typeof vi.fn>;
    signInWithPassword: ReturnType<typeof vi.fn>;
    signOut: ReturnType<typeof vi.fn>;
    admin: { signOut: ReturnType<typeof vi.fn> };
  };
  from: ReturnType<typeof vi.fn>;
};

function mockProfile() {
  const mockSingle = vi.fn().mockResolvedValue({
    data: { display_name: "Test User", avatar_url: null, created_at: "2024-01-01T00:00:00Z" },
    error: null,
  });
  const mockEq = vi.fn(() => ({ single: mockSingle }));
  const mockSelect = vi.fn(() => ({ eq: mockEq }));
  const mockUpsert = vi.fn(() => Promise.resolve({ error: null }));
  mockSupabase.from.mockReturnValue({ select: mockSelect, upsert: mockUpsert });
}

// ── Valid JWT for protected routes ────────────────────────────────────────────
// We sign our own token using the same secret so fastify.authenticate passes.
let app: FastifyInstance;
let validToken: string;

beforeEach(async () => {
  vi.clearAllMocks();
  if (!app) {
    app = await buildApp();
    // Sign a token with the same secret used in app
    validToken = app.jwt.sign(
      { sub: "user-uuid-123", email: "test@example.com", role: "authenticated" },
      { expiresIn: "1h" }
    );
  }
});

afterAll(async () => {
  if (app) await app.close();
});

// ── POST /auth/register ───────────────────────────────────────────────────────
describe("POST /auth/register", () => {
  it("returns 201 with tokens on successful registration", async () => {
    mockSupabase.auth.signUp.mockResolvedValue({
      data: {
        user: { id: "user-uuid-123" },
        session: { access_token: "access-tok", refresh_token: "refresh-tok" },
      },
      error: null,
    });
    mockProfile();

    const res = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: { email: "new@example.com", password: "password123" },
    });

    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.accessToken).toBe("access-tok");
    expect(body.refreshToken).toBe("refresh-tok");
    expect(body.user.email).toBe("new@example.com");
  });

  it("returns 202 when email confirmation is required", async () => {
    mockSupabase.auth.signUp.mockResolvedValue({
      data: { user: null, session: null },
      error: null,
    });

    const res = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: { email: "confirm@example.com", password: "password123" },
    });

    expect(res.statusCode).toBe(202);
    expect(res.json().message).toMatch(/email/i);
  });

  it("returns 409 when email is already in use", async () => {
    mockSupabase.auth.signUp.mockResolvedValue({
      data: { user: null, session: null },
      error: { message: "User already registered" },
    });

    const res = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: { email: "dup@example.com", password: "password123" },
    });

    expect(res.statusCode).toBe(409);
    expect(res.json().error).toMatch(/email already in use/i);
  });

  it("returns 400 on invalid payload", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: { email: "not-an-email", password: "short" },
    });

    expect(res.statusCode).toBe(400);
  });
});

// ── POST /auth/login ─────────────────────────────────────────────────────────
describe("POST /auth/login", () => {
  it("returns 200 with tokens on valid credentials", async () => {
    mockSupabase.auth.signInWithPassword.mockResolvedValue({
      data: {
        user: { id: "user-uuid-123", email: "test@example.com" },
        session: { access_token: "access-tok", refresh_token: "refresh-tok" },
      },
      error: null,
    });
    mockProfile();

    const res = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email: "test@example.com", password: "password123" },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.accessToken).toBe("access-tok");
    expect(body.user.email).toBe("test@example.com");
  });

  it("returns 401 on invalid credentials", async () => {
    mockSupabase.auth.signInWithPassword.mockResolvedValue({
      data: { user: null, session: null },
      error: { message: "Invalid login credentials" },
    });

    const res = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email: "test@example.com", password: "wrongpass" },
    });

    expect(res.statusCode).toBe(401);
    expect(res.json().error).toBe("Invalid credentials");
  });

  it("returns 400 on missing fields", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email: "test@example.com" },
    });

    expect(res.statusCode).toBe(400);
  });
});

// ── POST /auth/logout ────────────────────────────────────────────────────────
describe("POST /auth/logout", () => {
  it("returns 204 with valid token", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/auth/logout",
      headers: { authorization: `Bearer ${validToken}` },
    });

    expect(res.statusCode).toBe(204);
  });

  it("returns 401 without token", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/auth/logout",
    });

    expect(res.statusCode).toBe(401);
  });
});

// ── GET /auth/me ─────────────────────────────────────────────────────────────
describe("GET /auth/me", () => {
  it("returns 200 with user profile when authenticated", async () => {
    mockProfile();

    const res = await app.inject({
      method: "GET",
      url: "/auth/me",
      headers: { authorization: `Bearer ${validToken}` },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.id).toBe("user-uuid-123");
    expect(body.email).toBe("test@example.com");
  });

  it("returns 401 without token", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/auth/me",
    });

    expect(res.statusCode).toBe(401);
  });
});
