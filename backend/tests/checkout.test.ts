import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import type { FastifyInstance } from "fastify";

// ── Mock payment library ───────────────────────────────────────────────────────
vi.mock("../src/lib/payments.js", () => ({
  createCheckout: vi.fn(),
  verifyStripeWebhook: vi.fn(),
  parseStripeEvent: vi.fn(),
  verifyFlutterwaveWebhook: vi.fn(),
  parseFlutterwaveEvent: vi.fn(),
}));

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

import { buildApp } from "../src/app.js";
import { supabase } from "../src/db/client.js";
import * as payments from "../src/lib/payments.js";

const mockFrom = supabase.from as ReturnType<typeof vi.fn>;
const mockCreateCheckout   = payments.createCheckout   as ReturnType<typeof vi.fn>;
const mockVerifyStripe     = payments.verifyStripeWebhook as ReturnType<typeof vi.fn>;
const mockParseStripe      = payments.parseStripeEvent  as ReturnType<typeof vi.fn>;
const mockVerifyFlw        = payments.verifyFlutterwaveWebhook as ReturnType<typeof vi.fn>;
const mockParseFlw         = payments.parseFlutterwaveEvent as ReturnType<typeof vi.fn>;

let app: FastifyInstance;
let userToken: string;

const PRODUCT = {
  id: "11111111-1111-1111-1111-111111111111",
  title: "German Case Guide",
  price_usd: 9.99,
  is_active: true,
};

const ORDER_ID = "order-uuid-new";

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

// ── POST /checkout ─────────────────────────────────────────────────────────────
describe("POST /checkout", () => {
  function setupCheckoutMocks({
    product = PRODUCT,
    existing = null,
    insertedOrder = { id: ORDER_ID },
    checkoutResult = { redirectUrl: "https://stripe.com/pay/xyz", providerRef: "cs_test_123" },
  } = {}) {
    // 1. product lookup
    mockFrom.mockReturnValueOnce({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: product, error: null })),
          })),
        })),
      })),
    });
    // 2. existing-order check
    mockFrom.mockReturnValueOnce({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn(() => Promise.resolve({ data: existing, error: null })),
            })),
          })),
        })),
      })),
    });
    // 3. insert pending order
    mockFrom.mockReturnValueOnce({
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() =>
            Promise.resolve({ data: insertedOrder, error: null })
          ),
        })),
      })),
    });
    // 4. update provider_ref
    mockFrom.mockReturnValueOnce({
      update: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ error: null })),
      })),
    });
    mockCreateCheckout.mockResolvedValue(checkoutResult);
  }

  it("returns 200 with redirectUrl for Stripe", async () => {
    setupCheckoutMocks();

    const res = await app.inject({
      method: "POST",
      url: "/checkout",
      headers: { authorization: `Bearer ${userToken}` },
      payload: { productId: PRODUCT.id, provider: "stripe" },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json<{ redirectUrl: string; orderId: string }>();
    expect(body.redirectUrl).toContain("stripe.com");
    expect(body.orderId).toBe(ORDER_ID);
    expect(mockCreateCheckout).toHaveBeenCalledWith(
      expect.objectContaining({ provider: "stripe", productId: PRODUCT.id })
    );
  });

  it("returns 200 with redirectUrl for Flutterwave", async () => {
    setupCheckoutMocks({
      checkoutResult: { redirectUrl: "https://checkout.flutterwave.com/pay/abc", providerRef: "cb-order-123" },
    });

    const res = await app.inject({
      method: "POST",
      url: "/checkout",
      headers: { authorization: `Bearer ${userToken}` },
      payload: { productId: PRODUCT.id, provider: "flutterwave" },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json<{ redirectUrl: string }>().redirectUrl).toContain("flutterwave.com");
  });

  it("returns 409 if product already purchased", async () => {
    // product lookup
    mockFrom.mockReturnValueOnce({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: PRODUCT, error: null })),
          })),
        })),
      })),
    });
    // existing order found
    mockFrom.mockReturnValueOnce({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn(() =>
                Promise.resolve({ data: { id: "existing-order" }, error: null })
              ),
            })),
          })),
        })),
      })),
    });

    const res = await app.inject({
      method: "POST",
      url: "/checkout",
      headers: { authorization: `Bearer ${userToken}` },
      payload: { productId: PRODUCT.id, provider: "stripe" },
    });

    expect(res.statusCode).toBe(409);
    expect(res.json<{ error: string }>().error).toBe("Already purchased");
  });

  it("returns 404 for inactive/unknown product", async () => {
    mockFrom.mockReturnValueOnce({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: null, error: { message: "not found" } })),
          })),
        })),
      })),
    });

    const res = await app.inject({
      method: "POST",
      url: "/checkout",
      headers: { authorization: `Bearer ${userToken}` },
      payload: { productId: "00000000-0000-0000-0000-000000000000", provider: "stripe" },
    });

    expect(res.statusCode).toBe(404);
  });

  it("returns 401 without token", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/checkout",
      payload: { productId: PRODUCT.id, provider: "stripe" },
    });
    expect(res.statusCode).toBe(401);
  });

  it("returns 400 on invalid provider", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/checkout",
      headers: { authorization: `Bearer ${userToken}` },
      payload: { productId: PRODUCT.id, provider: "paypal" },
    });
    expect(res.statusCode).toBe(400);
  });
});

// ── POST /checkout/stripe/webhook ──────────────────────────────────────────────
describe("POST /checkout/stripe/webhook", () => {
  it("returns 200 and fulfills order on valid event", async () => {
    mockVerifyStripe.mockReturnValue({ type: "checkout.session.completed" });
    mockParseStripe.mockReturnValue({
      provider: "stripe",
      orderId: ORDER_ID,
      providerRef: "cs_test_123",
      status: "completed",
      amountUsd: 9.99,
    });
    // fulfillOrder update
    mockFrom.mockReturnValueOnce({
      update: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ error: null })),
      })),
    });

    const res = await app.inject({
      method: "POST",
      url: "/checkout/stripe/webhook",
      headers: { "stripe-signature": "t=123,v1=abc", "content-type": "application/json" },
      payload: "{}",
    });

    expect(res.statusCode).toBe(200);
    expect(res.json<{ received: boolean }>().received).toBe(true);
  });

  it("returns 400 on missing stripe-signature", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/checkout/stripe/webhook",
      headers: { "content-type": "application/json" },
      payload: "{}",
    });
    expect(res.statusCode).toBe(400);
  });

  it("returns 400 when signature verification fails", async () => {
    mockVerifyStripe.mockImplementation(() => {
      throw new Error("Signature mismatch");
    });

    const res = await app.inject({
      method: "POST",
      url: "/checkout/stripe/webhook",
      headers: { "stripe-signature": "bad-sig", "content-type": "application/json" },
      payload: "{}",
    });
    expect(res.statusCode).toBe(400);
  });
});

// ── POST /checkout/flutterwave/webhook ─────────────────────────────────────────
describe("POST /checkout/flutterwave/webhook", () => {
  it("returns 200 and fulfills order on valid event", async () => {
    mockVerifyFlw.mockReturnValue(true);
    mockParseFlw.mockResolvedValue({
      provider: "flutterwave",
      orderId: ORDER_ID,
      providerRef: "cb-order-123",
      status: "completed",
      amountUsd: 9.99,
    });
    mockFrom.mockReturnValueOnce({
      update: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ error: null })),
      })),
    });

    const res = await app.inject({
      method: "POST",
      url: "/checkout/flutterwave/webhook",
      headers: { "verif-hash": "flw-webhook-hash-test" },
      payload: { event: "charge.completed", data: { status: "successful", id: 123 } },
    });

    expect(res.statusCode).toBe(200);
  });

  it("returns 401 when hash is wrong", async () => {
    mockVerifyFlw.mockReturnValue(false);

    const res = await app.inject({
      method: "POST",
      url: "/checkout/flutterwave/webhook",
      headers: { "verif-hash": "wrong-hash" },
      payload: {},
    });
    expect(res.statusCode).toBe(401);
  });
});
