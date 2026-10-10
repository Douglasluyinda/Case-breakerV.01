import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import type { FastifyInstance } from "fastify";

// ── Mock subscription library ──────────────────────────────────────────────────
vi.mock("../src/lib/subscriptions.js", () => ({
  createSubscriptionCheckout: vi.fn(),
  cancelSubscriptionAtPeriodEnd: vi.fn(),
  verifySubscriptionWebhook: vi.fn(),
  parseSubscriptionEvent: vi.fn(),
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
import * as subs from "../src/lib/subscriptions.js";

const mockFrom = supabase.from as ReturnType<typeof vi.fn>;
const mockCreateCheckout        = subs.createSubscriptionCheckout      as ReturnType<typeof vi.fn>;
const mockCancelAtPeriodEnd     = subs.cancelSubscriptionAtPeriodEnd   as ReturnType<typeof vi.fn>;
const mockVerifyWebhook         = subs.verifySubscriptionWebhook       as ReturnType<typeof vi.fn>;
const mockParseEvent            = subs.parseSubscriptionEvent          as ReturnType<typeof vi.fn>;

let app: FastifyInstance;
let userToken: string;

const USER_ID = "user-uuid-1";
const SUB_ID  = "sub-uuid-1";
const STRIPE_SUB_ID = "sub_stripe_test_123";

const ACTIVE_SUB_ROW = {
  id: SUB_ID,
  user_id: USER_ID,
  tier: "pro",
  status: "active",
  stripe_customer_id: "cus_test_123",
  stripe_subscription_id: STRIPE_SUB_ID,
  current_period_start: "2026-10-01T00:00:00Z",
  current_period_end: "2026-11-01T00:00:00Z",
  cancel_at_period_end: false,
  cancelled_at: null,
  created_at: "2026-10-01T00:00:00Z",
  updated_at: "2026-10-01T00:00:00Z",
};

beforeAll(async () => {
  app = await buildApp();
  userToken = app.jwt.sign(
    { sub: USER_ID, email: "user@example.com", role: "authenticated" },
    { expiresIn: "1h" }
  );
});

afterAll(async () => {
  if (app) await app.close();
});

// ── GET /subscriptions/me ──────────────────────────────────────────────────────
describe("GET /subscriptions/me", () => {
  it("returns active subscription when one exists", async () => {
    mockFrom.mockReturnValueOnce({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          in: vi.fn(() => ({
            order: vi.fn(() => ({
              limit: vi.fn(() => ({
                maybeSingle: vi.fn(() =>
                  Promise.resolve({ data: ACTIVE_SUB_ROW, error: null })
                ),
              })),
            })),
          })),
        })),
      })),
    });

    const res = await app.inject({
      method: "GET",
      url: "/subscriptions/me",
      headers: { authorization: `Bearer ${userToken}` },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json<{ subscription: { tier: string; status: string } }>();
    expect(body.subscription.tier).toBe("pro");
    expect(body.subscription.status).toBe("active");
  });

  it("returns null when no active subscription", async () => {
    mockFrom.mockReturnValueOnce({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          in: vi.fn(() => ({
            order: vi.fn(() => ({
              limit: vi.fn(() => ({
                maybeSingle: vi.fn(() =>
                  Promise.resolve({ data: null, error: null })
                ),
              })),
            })),
          })),
        })),
      })),
    });

    const res = await app.inject({
      method: "GET",
      url: "/subscriptions/me",
      headers: { authorization: `Bearer ${userToken}` },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json<{ subscription: null }>().subscription).toBeNull();
  });

  it("returns 401 without token", async () => {
    const res = await app.inject({ method: "GET", url: "/subscriptions/me" });
    expect(res.statusCode).toBe(401);
  });
});

// ── POST /subscriptions ────────────────────────────────────────────────────────
describe("POST /subscriptions", () => {
  it("returns 200 with redirectUrl when no existing subscription", async () => {
    // existing-subscription check
    mockFrom.mockReturnValueOnce({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          in: vi.fn(() => ({
            maybeSingle: vi.fn(() =>
              Promise.resolve({ data: null, error: null })
            ),
          })),
        })),
      })),
    });
    mockCreateCheckout.mockResolvedValue({
      redirectUrl: "https://checkout.stripe.com/pay/cs_sub_test",
      sessionId: "cs_sub_test",
    });

    const res = await app.inject({
      method: "POST",
      url: "/subscriptions",
      headers: { authorization: `Bearer ${userToken}` },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json<{ redirectUrl: string }>().redirectUrl).toContain("stripe.com");
    expect(mockCreateCheckout).toHaveBeenCalledWith(
      expect.objectContaining({ userId: USER_ID })
    );
  });

  it("returns 409 when already subscribed", async () => {
    mockFrom.mockReturnValueOnce({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          in: vi.fn(() => ({
            maybeSingle: vi.fn(() =>
              Promise.resolve({ data: { id: SUB_ID, status: "active" }, error: null })
            ),
          })),
        })),
      })),
    });

    const res = await app.inject({
      method: "POST",
      url: "/subscriptions",
      headers: { authorization: `Bearer ${userToken}` },
    });

    expect(res.statusCode).toBe(409);
    expect(res.json<{ error: string }>().error).toBe("Already subscribed");
  });

  it("returns 401 without token", async () => {
    const res = await app.inject({ method: "POST", url: "/subscriptions" });
    expect(res.statusCode).toBe(401);
  });
});

// ── DELETE /subscriptions/me ───────────────────────────────────────────────────
describe("DELETE /subscriptions/me", () => {
  it("returns 200 on successful cancellation", async () => {
    mockFrom.mockReturnValueOnce({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          in: vi.fn(() => ({
            maybeSingle: vi.fn(() =>
              Promise.resolve({ data: ACTIVE_SUB_ROW, error: null })
            ),
          })),
        })),
      })),
    });
    mockCancelAtPeriodEnd.mockResolvedValue(undefined);

    const res = await app.inject({
      method: "DELETE",
      url: "/subscriptions/me",
      headers: { authorization: `Bearer ${userToken}` },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json<{ cancelled: boolean }>().cancelled).toBe(true);
    expect(mockCancelAtPeriodEnd).toHaveBeenCalledWith(STRIPE_SUB_ID);
  });

  it("returns 404 when no active subscription", async () => {
    mockFrom.mockReturnValueOnce({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          in: vi.fn(() => ({
            maybeSingle: vi.fn(() =>
              Promise.resolve({ data: null, error: null })
            ),
          })),
        })),
      })),
    });

    const res = await app.inject({
      method: "DELETE",
      url: "/subscriptions/me",
      headers: { authorization: `Bearer ${userToken}` },
    });

    expect(res.statusCode).toBe(404);
  });

  it("returns 401 without token", async () => {
    const res = await app.inject({ method: "DELETE", url: "/subscriptions/me" });
    expect(res.statusCode).toBe(401);
  });
});

// ── POST /subscriptions/stripe/webhook ────────────────────────────────────────
describe("POST /subscriptions/stripe/webhook", () => {
  it("returns 200 and upserts subscription on valid created event", async () => {
    mockVerifyWebhook.mockReturnValue({ type: "customer.subscription.created" });
    mockParseEvent.mockReturnValue({
      kind: "created",
      stripeSubscriptionId: STRIPE_SUB_ID,
      stripeCustomerId: "cus_test_123",
      userId: USER_ID,
      status: "active",
      currentPeriodStart: 1727740800,
      currentPeriodEnd: 1730419200,
      cancelAtPeriodEnd: false,
    });
    mockFrom.mockReturnValueOnce({
      upsert: vi.fn(() => Promise.resolve({ error: null })),
    });

    const res = await app.inject({
      method: "POST",
      url: "/subscriptions/stripe/webhook",
      headers: { "stripe-signature": "t=123,v1=abc", "content-type": "application/json" },
      payload: "{}",
    });

    expect(res.statusCode).toBe(200);
    expect(res.json<{ received: boolean }>().received).toBe(true);
  });

  it("returns 200 and ignores unknown events", async () => {
    mockVerifyWebhook.mockReturnValue({ type: "payment_intent.created" });
    mockParseEvent.mockReturnValue(null);

    const res = await app.inject({
      method: "POST",
      url: "/subscriptions/stripe/webhook",
      headers: { "stripe-signature": "t=123,v1=abc", "content-type": "application/json" },
      payload: "{}",
    });

    expect(res.statusCode).toBe(200);
  });

  it("returns 400 on missing stripe-signature", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/subscriptions/stripe/webhook",
      headers: { "content-type": "application/json" },
      payload: "{}",
    });
    expect(res.statusCode).toBe(400);
  });

  it("returns 400 on bad signature", async () => {
    mockVerifyWebhook.mockImplementation(() => {
      throw new Error("Signature mismatch");
    });

    const res = await app.inject({
      method: "POST",
      url: "/subscriptions/stripe/webhook",
      headers: { "stripe-signature": "bad-sig", "content-type": "application/json" },
      payload: "{}",
    });
    expect(res.statusCode).toBe(400);
  });
});
