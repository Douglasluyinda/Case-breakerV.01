import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import type { FastifyInstance } from "fastify";

// ── Mock Supabase ──────────────────────────────────────────────────────────────
vi.mock("../src/db/client.js", () => {
  const fromMock = vi.fn();
  return {
    supabase: {
      from: fromMock,
      auth: { admin: { signOut: vi.fn() } },
    },
    supabaseAnon: {},
  };
});

// ── Mock R2 plugin ─────────────────────────────────────────────────────────────
vi.mock("../src/plugins/r2.js", async () => {
  const { default: fp } = await import("fastify-plugin");
  return {
    default: fp(async (fastify: FastifyInstance) => {
      fastify.decorate("r2", {});
      fastify.decorate("r2GetUrl", async () => "https://r2.example.com/get");
      fastify.decorate("r2PutUrl", async () => "https://r2.example.com/put");
    }),
  };
});

// ── Mock payment libs (needed because app imports checkout/subscription routes) ─
vi.mock("../src/lib/payments.js", () => ({
  createCheckout: vi.fn(),
  verifyStripeWebhook: vi.fn(),
  parseStripeEvent: vi.fn(),
  verifyFlutterwaveWebhook: vi.fn(),
  parseFlutterwaveEvent: vi.fn(),
}));

vi.mock("../src/lib/subscriptions.js", () => ({
  createSubscriptionCheckout: vi.fn(),
  cancelSubscriptionAtPeriodEnd: vi.fn(),
  verifySubscriptionWebhook: vi.fn(),
  parseSubscriptionEvent: vi.fn(),
}));

import { buildApp } from "../src/app.js";
import { supabase } from "../src/db/client.js";

const mockFrom = supabase.from as ReturnType<typeof vi.fn>;

let app: FastifyInstance;
let adminToken: string;
let userToken: string;

beforeAll(async () => {
  app = await buildApp();

  adminToken = app.jwt.sign(
    { sub: "admin-uuid", email: "admin@example.com", role: "admin" },
    { expiresIn: "1h" }
  );
  userToken = app.jwt.sign(
    { sub: "user-uuid", email: "user@example.com", role: "authenticated" },
    { expiresIn: "1h" }
  );
});

afterAll(async () => {
  if (app) await app.close();
});

// ── Auth guard ─────────────────────────────────────────────────────────────────
describe("Admin route auth", () => {
  it("returns 401 without token", async () => {
    const res = await app.inject({ method: "GET", url: "/admin/stats" });
    expect(res.statusCode).toBe(401);
  });

  it("returns 403 for non-admin authenticated user", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/admin/stats",
      headers: { authorization: `Bearer ${userToken}` },
    });
    expect(res.statusCode).toBe(403);
  });
});

// ── GET /admin/stats ───────────────────────────────────────────────────────────
describe("GET /admin/stats", () => {
  it("returns KPI stats for admin", async () => {
    // products
    mockFrom.mockReturnValueOnce({
      select: vi.fn(() => Promise.resolve({
        data: [{ id: "p1", is_active: true }, { id: "p2", is_active: false }],
        count: 2,
        error: null,
      })),
    });
    // orders
    mockFrom.mockReturnValueOnce({
      select: vi.fn(() => Promise.resolve({
        data: [{ id: "o1", status: "completed" }, { id: "o2", status: "pending" }],
        count: 2,
        error: null,
      })),
    });
    // active subscriptions
    mockFrom.mockReturnValueOnce({
      select: vi.fn(() => ({
        in: vi.fn(() => Promise.resolve({ data: [{ id: "s1", status: "active" }], count: 1, error: null })),
      })),
    });
    // revenue (completed orders)
    mockFrom.mockReturnValueOnce({
      select: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({
          data: [{ amount_usd: 9.99 }, { amount_usd: 19.99 }],
          error: null,
        })),
      })),
    });

    const res = await app.inject({
      method: "GET",
      url: "/admin/stats",
      headers: { authorization: `Bearer ${adminToken}` },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json<{
      products: { total: number; active: number };
      orders: { total: number; completed: number };
      subscriptions: { active: number };
      revenue: { totalUsd: number };
    }>();
    expect(body.products.total).toBe(2);
    expect(body.products.active).toBe(1);
    expect(body.orders.completed).toBe(1);
    expect(body.subscriptions.active).toBe(1);
    expect(body.revenue.totalUsd).toBeCloseTo(29.98, 2);
  });
});

// ── GET /admin/products ────────────────────────────────────────────────────────
describe("GET /admin/products", () => {
  it("returns all products including inactive", async () => {
    mockFrom.mockReturnValueOnce({
      select: vi.fn(() => ({
        order: vi.fn(() =>
          Promise.resolve({
            data: [
              { id: "p1", slug: "guide-1", title: "Guide 1", price_usd: 9.99, is_active: true, created_at: "2026-10-01" },
              { id: "p2", slug: "guide-2", title: "Guide 2", price_usd: 14.99, is_active: false, created_at: "2026-10-02" },
            ],
            error: null,
          })
        ),
      })),
    });

    const res = await app.inject({
      method: "GET",
      url: "/admin/products",
      headers: { authorization: `Bearer ${adminToken}` },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json<{ id: string; is_active: boolean }[]>();
    expect(body).toHaveLength(2);
    expect(body.some((p) => !p.is_active)).toBe(true);
  });
});

// ── GET /admin/orders ──────────────────────────────────────────────────────────
describe("GET /admin/orders", () => {
  it("returns paginated orders", async () => {
    mockFrom.mockReturnValueOnce({
      select: vi.fn(() => ({
        order: vi.fn(() => ({
          range: vi.fn(() =>
            Promise.resolve({
              data: [
                { id: "o1", status: "completed", amount_usd: 9.99, payment_provider: "stripe", created_at: "2026-10-01" },
              ],
              count: 1,
              error: null,
            })
          ),
        })),
      })),
    });

    const res = await app.inject({
      method: "GET",
      url: "/admin/orders",
      headers: { authorization: `Bearer ${adminToken}` },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json<{ orders: unknown[]; total: number }>();
    expect(body.total).toBe(1);
    expect(body.orders).toHaveLength(1);
  });
});

// ── PATCH /admin/products/:id ─────────────────────────────────────────────────
describe("PATCH /admin/products/:id", () => {
  it("toggles product active status", async () => {
    mockFrom.mockReturnValueOnce({
      update: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ error: null })),
      })),
    });

    const res = await app.inject({
      method: "PATCH",
      url: "/admin/products/p1",
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { is_active: false },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json<{ updated: boolean }>().updated).toBe(true);
  });

  it("returns 400 when no valid field supplied", async () => {
    const res = await app.inject({
      method: "PATCH",
      url: "/admin/products/p1",
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { unknownField: "foo" },
    });
    expect(res.statusCode).toBe(400);
  });
});

// ── PATCH /admin/orders/:id ───────────────────────────────────────────────────
describe("PATCH /admin/orders/:id", () => {
  it("updates order status to refunded", async () => {
    mockFrom.mockReturnValueOnce({
      update: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ error: null })),
      })),
    });

    const res = await app.inject({
      method: "PATCH",
      url: "/admin/orders/o1",
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { status: "refunded" },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json<{ updated: boolean }>().updated).toBe(true);
  });

  it("returns 400 for invalid status", async () => {
    const res = await app.inject({
      method: "PATCH",
      url: "/admin/orders/o1",
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { status: "bogus" },
    });
    expect(res.statusCode).toBe(400);
  });
});
