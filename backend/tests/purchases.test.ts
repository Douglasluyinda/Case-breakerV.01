import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import type { FastifyInstance } from "fastify";

// ── Mock Supabase ──────────────────────────────────────────────────────────────
vi.mock("../src/db/client.js", () => {
  const mockMaybeSingle = vi.fn();
  const mockOrder = vi.fn(() => Promise.resolve({ data: [], error: null }));

  const fromMock = vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(function eqChain() {
        return {
          eq: vi.fn(function eqChain2() {
            return {
              eq: vi.fn(() => ({
                maybeSingle: mockMaybeSingle,
                order: mockOrder,
              })),
              maybeSingle: mockMaybeSingle,
              order: mockOrder,
            };
          }),
          order: mockOrder,
        };
      }),
    })),
    insert: vi.fn(() => ({ select: vi.fn(() => ({ single: vi.fn() })) })),
    update: vi.fn(() => ({ eq: vi.fn(() => ({ select: vi.fn(() => ({ single: vi.fn() })) })) })),
    then: vi.fn(),
  }));

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
      fastify.decorate("r2GetUrl", async (_key: string) => "https://r2.example.com/signed-get");
      fastify.decorate("r2PutUrl", async (_key: string, _ct: string) => "https://r2.example.com/signed-put");
    }),
  };
});

import { buildApp } from "../src/app.js";
import { supabase } from "../src/db/client.js";

const mockFrom = supabase.from as ReturnType<typeof vi.fn>;

let app: FastifyInstance;
let userToken: string;

const PRODUCT_ROW = {
  id: "prod-uuid-1",
  slug: "german-case-guide",
  title: "German Case Guide",
  description: "Master the four cases",
  price_usd: 9.99,
  file_type: "application/pdf",
  file_size_bytes: 1024000,
  is_active: true,
  created_at: "2024-01-01T00:00:00Z",
};

const ORDER_ROW = {
  id: "order-uuid-1",
  status: "completed",
  amount_usd: 9.99,
  created_at: "2024-06-01T00:00:00Z",
  payment_provider: "stripe",
  products: PRODUCT_ROW,
};

beforeAll(async () => {
  app = await buildApp();
  userToken = app.jwt.sign(
    { sub: "user-uuid", email: "user@example.com", role: "authenticated" },
    { expiresIn: "1h" }
  );
});

afterAll(async () => {
  if (app) await app.close();
});

// ── GET /purchases ─────────────────────────────────────────────────────────────
describe("GET /purchases", () => {
  it("returns 200 with the user's completed purchases", async () => {
    // Mock chain: .from().select().eq().eq().order()
    mockFrom.mockReturnValueOnce({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => Promise.resolve({ data: [ORDER_ROW], error: null })),
          })),
        })),
      })),
    });

    const res = await app.inject({
      method: "GET",
      url: "/purchases",
      headers: { authorization: `Bearer ${userToken}` },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json<Array<{ orderId: string; product: { slug: string }; amountUsd: number }>>();
    expect(body).toHaveLength(1);
    expect(body[0].orderId).toBe("order-uuid-1");
    expect(body[0].product.slug).toBe("german-case-guide");
    expect(body[0].amountUsd).toBe(9.99);
  });

  it("returns 200 with empty array when no purchases", async () => {
    mockFrom.mockReturnValueOnce({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => Promise.resolve({ data: [], error: null })),
          })),
        })),
      })),
    });

    const res = await app.inject({
      method: "GET",
      url: "/purchases",
      headers: { authorization: `Bearer ${userToken}` },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual([]);
  });

  it("returns 401 without token", async () => {
    const res = await app.inject({ method: "GET", url: "/purchases" });
    expect(res.statusCode).toBe(401);
  });
});

// ── GET /purchases/:productId/entitlement ──────────────────────────────────────
describe("GET /purchases/:productId/entitlement", () => {
  it("returns entitled: true when order exists", async () => {
    mockFrom.mockReturnValueOnce({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn(() =>
                Promise.resolve({ data: { id: "order-uuid-1" }, error: null })
              ),
            })),
          })),
        })),
      })),
    });

    const res = await app.inject({
      method: "GET",
      url: `/purchases/${PRODUCT_ROW.id}/entitlement`,
      headers: { authorization: `Bearer ${userToken}` },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json<{ entitled: boolean }>().entitled).toBe(true);
  });

  it("returns entitled: false when no order", async () => {
    mockFrom.mockReturnValueOnce({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn(() =>
                Promise.resolve({ data: null, error: null })
              ),
            })),
          })),
        })),
      })),
    });

    const res = await app.inject({
      method: "GET",
      url: `/purchases/${PRODUCT_ROW.id}/entitlement`,
      headers: { authorization: `Bearer ${userToken}` },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json<{ entitled: boolean }>().entitled).toBe(false);
  });

  it("returns 401 without token", async () => {
    const res = await app.inject({
      method: "GET",
      url: `/purchases/${PRODUCT_ROW.id}/entitlement`,
    });
    expect(res.statusCode).toBe(401);
  });
});
