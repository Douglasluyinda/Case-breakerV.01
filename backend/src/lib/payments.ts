/**
 * Payment abstraction layer.
 *
 * The rest of the codebase calls `createCheckout()` and never cares whether
 * the underlying provider is Stripe or Flutterwave. Webhook handlers in
 * routes/checkout.ts normalise provider events into `PaymentResult` and then
 * call `fulfillOrder()`.
 */

import Stripe from "stripe";
import { config } from "../config.js";

// ── Provider clients (lazily constructed so tests can skip them) ───────────────
let _stripe: Stripe | null = null;
function getStripe(): Stripe {
  if (!_stripe) _stripe = new Stripe(config.STRIPE_SECRET_KEY, { apiVersion: "2024-06-20" });
  return _stripe;
}

// ── Shared types ───────────────────────────────────────────────────────────────
export type PaymentProvider = "stripe" | "jjuma";

export interface CheckoutParams {
  provider: PaymentProvider;
  productId: string;
  productTitle: string;
  amountUsd: number;
  userId: string;
  userEmail: string;
  /** Pre-created pending order ID stored in our DB before redirect. */
  orderId: string;
}

export interface CheckoutResult {
  /** Redirect the user to this URL to complete payment. */
  redirectUrl: string;
  /** Provider's session/transaction reference — stored on the order row. */
  providerRef: string;
}

export interface PaymentResult {
  provider: PaymentProvider;
  orderId: string;
  providerRef: string;
  status: "completed" | "failed";
  amountUsd: number;
}

// ── Stripe ─────────────────────────────────────────────────────────────────────
export async function createStripeCheckout(p: CheckoutParams): Promise<CheckoutResult> {
  const stripe = getStripe();

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: "usd",
          unit_amount: Math.round(p.amountUsd * 100),   // cents
          product_data: { name: p.productTitle },
        },
        quantity: 1,
      },
    ],
    customer_email: p.userEmail,
    metadata: { orderId: p.orderId, userId: p.userId, productId: p.productId },
    success_url: `${config.APP_URL}/dashboard?payment=success`,
    cancel_url:  `${config.APP_URL}/shop?payment=cancelled`,
  });

  return {
    redirectUrl: session.url!,
    providerRef: session.id,
  };
}

export function verifyStripeWebhook(payload: Buffer, sig: string): Stripe.Event {
  return getStripe().webhooks.constructEvent(payload, sig, config.STRIPE_WEBHOOK_SECRET);
}

export function parseStripeEvent(event: Stripe.Event): PaymentResult | null {
  if (event.type !== "checkout.session.completed") return null;
  const session = event.data.object as Stripe.Checkout.Session;
  if (session.payment_status !== "paid") return null;

  return {
    provider: "stripe",
    orderId: session.metadata?.orderId ?? "",
    providerRef: session.id,
    status: "completed",
    amountUsd: (session.amount_total ?? 0) / 100,
  };
}

// ── Jjuma Global Pay ───────────────────────────────────────────────────────────
// Jjuma uses a hosted checkout: we POST to their API to get a payment link,
// then redirect the customer to pay.jjuma.com. On completion they POST a
// webhook to /checkout/jjuma/webhook and also redirect to our callback URL.
const JJUMA_API_BASE = "https://api.jjuma.com/api";

export async function createJjumaCheckout(p: CheckoutParams): Promise<CheckoutResult> {
  const txRef = `cb-${p.orderId}-${Date.now()}`;

  const payload = {
    amount: p.amountUsd,
    currency: "USD",
    title: "Case Breaker",
    description: p.productTitle,
    redirect_url: `${config.APP_URL}/api/checkout/jjuma/callback`,
    metadata: {
      orderId: p.orderId,
      userId: p.userId,
      productId: p.productId,
      reference: txRef,
    },
  };

  const response = await fetch(`${JJUMA_API_BASE}/payment-links`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${config.JJUMA_API_KEY}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Jjuma payment creation failed (${response.status}): ${err}`);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data = await response.json() as any;

  // Jjuma returns { data: { payment_url, reference } } or similar
  const redirectUrl: string = data?.data?.payment_url ?? data?.payment_url ?? data?.url ?? data?.link;
  if (!redirectUrl) {
    throw new Error(`Jjuma: no payment URL in response: ${JSON.stringify(data)}`);
  }

  return {
    redirectUrl,
    providerRef: txRef,
  };
}

export function verifyJjumaWebhook(secret: string): boolean {
  return secret === config.JJUMA_WEBHOOK_SECRET;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function parseJjumaEvent(body: any): PaymentResult | null {
  // Jjuma webhook payload:
  // { event: "payment.completed", reference, amount, currency, status, metadata? }
  const event: string = body?.event ?? "";
  const status: string = body?.status ?? "";

  if (event !== "payment.completed" && status !== "successful") {
    return null;
  }

  const txRef: string = body?.reference ?? "";
  const orderId: string = body?.metadata?.orderId ?? "";
  const amount: number = Number(body?.amount ?? 0);

  if (!txRef) return null;

  return {
    provider: "jjuma",
    orderId,
    providerRef: txRef,
    status: "completed",
    amountUsd: amount,
  };
}

// ── Main entry point ───────────────────────────────────────────────────────────
export async function createCheckout(p: CheckoutParams): Promise<CheckoutResult> {
  if (p.provider === "stripe") return createStripeCheckout(p);
  return createJjumaCheckout(p);
}
