import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import type { FastifyInstance } from "fastify";

// ── Mock Supabase ──────────────────────────────────────────────────────────────
vi.mock("../src/db/client.js", () => {
  const mockMaybeSingle = vi.fn();
  const mockSingle = vi.fn();
  const mockOrder = vi.fn(() => ({ data: [], error: null }));
  const mockEq = vi.fn(function (this: unknown) { return this; });

  // We'll override these per-test via the mock registry
  const fromMock = vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({ maybeSingle: mockMaybeSingle })),
          single: mockSingle,
          order: mockOrder,
        })),
        single: mockSingle,
        order: mockOrder,
      })),
    })),
    insert: vi.fn(() => ({
      select: vi.fn(() => ({ single: mockSingle })),
    })),
    update: vi.fn(() => ({
      eq: vi.fn(() => ({
        select: vi.fn(() => ({ single: mockSingle })),
        // for soft-delete (no select)
        then: vi.fn(),
      })),
    })),
    then: vi.fn(),
  }));

  return {
    supabase: { from: fromMock, auth: { admin: { signOut: vi.fn() } } },
    supabaseAnon: {},
  };
});

// ── Mock R2 plugin ─────────────────────────────────────────────────────────────
// Must be wrapped with fp() so decorators are added to the root scope, not a child.
vi.mock("../src/plugins/r2.js", async () => {
  const { default: fp } = await import("fastify-plugin");
  return {
    default: fp(async (fastify: FastifyInstance) => {
      fastify.decorate("r2", {});
      fastify.decorate("r2GetUrl", async (_key: string) => "https://r2.example.com/signed-get");
      fastify.decorate("r2PutUrl", async (_key: string, _ct: string) => "https://r2.example.com/signed-put");
    }),
  };
});

import { buildApp } from "../src/app.js";
import { supabase } from "../src/db/client.js";

const mockFrom = supabase.from as ReturnType<typeof vi.fn>;

let app: FastifyInstance;
let adminToken: string;
let userToken: string;

const PRODUCT_ROW = {
  id: "prod-uuid-1",
  slug: "german-case-guide",
  title: "German Case Guide",
  description: "Master the four cases",
  price_usd: 9.99,
  r2_key: "products/prod-uuid-1/guide.pdf",
  file_type: "application/pdf",
  file_size_bytes: 1024000,
  is_active: true,
  created_at: "2024-01-01T00:00:00Z",
};

beforeAll(async () => {
  app = await buildApp();
  // admin token (role: service_role bypasses admin check)
  adminToken = app.jwt.sign(
    { sub: "admin-uuid", email: "admin@example.com", role: "service_role" },
    { expiresIn: "1h" }
  );
  // regular user token
  userToken = app.jwt.sign(
    { sub: "user-uuid", email: "user@example.com", role: "authenticated" },
    { expiresIn: "1h" }
  );
});

afterAll(async () => {
  if (app) await app.close();
});

// ── GET /products ─────────────────────────────────────────────────────────────
describe("GET /products", () => {
  it("returns 200 with active product list", async () => {
    mockFrom.mockReturnValueOnce({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => Promise.resolve({ data: [PRODUCT_ROW], error: null })),
        })),
      })),
    });

    const res = await app.inject({ method: "GET", url: "/products" });

    expect(res.statusCode).toBe(200);
    const body = res.json<{ id: string; slug: string; priceUsd: number }[]>();
    expect(body).toHaveLength(1);
    expect(body[0].slug).toBe("german-case-guide");
    expect(body[0].priceUsd).toBe(9.99);
    // r2_key must NOT be exposed
    expect((body[0] as Record<string, unknown>).r2_key).toBeUndefined();
  });
});

// ── GET /products/:id ─────────────────────────────────────────────────────────
describe("GET /products/:id", () => {
  it("returns 200 with product detail", async () => {
    mockFrom.mockReturnValueOnce({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: PRODUCT_ROW, error: null })),
          })),
        })),
      })),
    });

    const res = await app.inject({ method: "GET", url: `/products/${PRODUCT_ROW.id}` });

    expect(res.statusCode).toBe(200);
    expect(res.json<{ id: string }>().id).toBe(PRODUCT_ROW.id);
  });

  it("returns 404 for unknown product", async () => {
    mockFrom.mockReturnValueOnce({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: null, error: { message: "not found" } })),
          })),
        })),
      })),
    });

    const res = await app.inject({ method: "GET", url: "/products/nonexistent" });
    expect(res.statusCode).toBe(404);
  });
});

// ── POST /products ────────────────────────────────────────────────────────────
describe("POST /products", () => {
  it("returns 201 when admin creates product", async () => {
    mockFrom.mockReturnValueOnce({
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: PRODUCT_ROW, error: null })),
        })),
      })),
    });

    const res = await app.inject({
      method: "POST",
      url: "/products",
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { slug: "german-case-guide", title: "German Case Guide", priceUsd: 9.99 },
    });

    expect(res.statusCode).toBe(201);
    expect(res.json<{ slug: string }>().slug).toBe("german-case-guide");
  });

  it("returns 403 when non-admin creates product", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/products",
      headers: { authorization: `Bearer ${userToken}` },
      payload: { slug: "test", title: "Test", priceUsd: 5 },
    });

    expect(res.statusCode).toBe(403);
  });

  it("returns 401 without token", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/products",
      payload: { slug: "test", title: "Test", priceUsd: 5 },
    });

    expect(res.statusCode).toBe(401);
  });

  it("returns 400 on invalid slug", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/products",
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { slug: "INVALID SLUG!", title: "Test", priceUsd: 5 },
    });

    expect(res.statusCode).toBe(400);
  });
});

// ── POST /products/:id/upload-url ─────────────────────────────────────────────
describe("POST /products/:id/upload-url", () => {
  it("returns presigned PUT URL for admin", async () => {
    mockFrom.mockReturnValueOnce({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: { id: PRODUCT_ROW.id }, error: null })),
        })),
      })),
    });

    const res = await app.inject({
      method: "POST",
      url: `/products/${PRODUCT_ROW.id}/upload-url`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { contentType: "application/pdf", fileName: "guide.pdf" },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json<{ uploadUrl: string; r2Key: string }>();
    expect(body.uploadUrl).toContain("r2.example.com");
    expect(body.r2Key).toContain(PRODUCT_ROW.id);
  });

  it("returns 400 for unsupported MIME type", async () => {
    const res = await app.inject({
      method: "POST",
      url: `/products/${PRODUCT_ROW.id}/upload-url`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { contentType: "image/png", fileName: "image.png" },
    });

    expect(res.statusCode).toBe(400);
  });
});

// ── GET /products/:id/download ────────────────────────────────────────────────
describe("GET /products/:id/download", () => {
  it("returns 403 when no order exists", async () => {
    // product lookup
    mockFrom.mockReturnValueOnce({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() =>
            Promise.resolve({ data: { ...PRODUCT_ROW }, error: null })
          ),
        })),
      })),
    });
    // order lookup — no order
    mockFrom.mockReturnValueOnce({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null })),
            })),
          })),
        })),
      })),
    });

    const res = await app.inject({
      method: "GET",
      url: `/products/${PRODUCT_ROW.id}/download`,
      headers: { authorization: `Bearer ${userToken}` },
    });

    expect(res.statusCode).toBe(403);
    expect(res.json<{ error: string }>().error).toBe("Purchase required");
  });

  it("returns 401 without auth", async () => {
    const res = await app.inject({
      method: "GET",
      url: `/products/${PRODUCT_ROW.id}/download`,
    });
    expect(res.statusCode).toBe(401);
  });
});
