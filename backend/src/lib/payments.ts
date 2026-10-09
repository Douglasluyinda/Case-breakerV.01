/**
 * Payment abstraction layer.
 *
 * The rest of the codebase calls `createCheckout()` and never cares whether
 * the underlying provider is Stripe or Flutterwave. Webhook handlers in
 * routes/checkout.ts normalise provider events into `PaymentResult` and then
 * call `fulfillOrder()`.
 */

import Stripe from "stripe";
// eslint-disable-next-line @typescript-eslint/no-require-imports
import Flutterwave = require("flutterwave-node-v3");
import { config } from "../config.js";

// ── Provider clients (lazily constructed so tests can skip them) ───────────────
let _stripe: Stripe | null = null;
function getStripe(): Stripe {
  if (!_stripe) _stripe = new Stripe(config.STRIPE_SECRET_KEY, { apiVersion: "2024-06-20" });
  return _stripe;
}

let _flw: InstanceType<typeof Flutterwave> | null = null;
function getFlw(): InstanceType<typeof Flutterwave> {
  if (!_flw) _flw = new Flutterwave(config.FLW_PUBLIC_KEY, config.FLW_SECRET_KEY);
  return _flw;
}

// ── Shared types ───────────────────────────────────────────────────────────────
export type PaymentProvider = "stripe" | "flutterwave";

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

// ── Flutterwave ────────────────────────────────────────────────────────────────
export async function createFlutterwaveCheckout(p: CheckoutParams): Promise<CheckoutResult> {
  const flw = getFlw();

  const txRef = `cb-${p.orderId}-${Date.now()}`;

  const payload = {
    tx_ref: txRef,
    amount: p.amountUsd,
    currency: "USD",
    redirect_url: `${config.APP_URL}/api/checkout/flutterwave/callback`,
    customer: { email: p.userEmail },
    meta: { orderId: p.orderId, userId: p.userId, productId: p.productId },
    customizations: {
      title: "Case Breaker",
      description: p.productTitle,
    },
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const response = await (flw as any).Payment.initiate(payload);

  if (response.status !== "success") {
    throw new Error(`Flutterwave initiation failed: ${response.message}`);
  }

  return {
    redirectUrl: response.data.link,
    providerRef: txRef,
  };
}

export function verifyFlutterwaveWebhook(hash: string): boolean {
  return hash === config.FLW_WEBHOOK_HASH;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function parseFlutterwaveEvent(body: any): Promise<PaymentResult | null> {
  if (body.event !== "charge.completed") return null;
  if (body.data?.status !== "successful") return null;

  const flw = getFlw();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const verification = await (flw as any).Transaction.verify({ id: body.data.id });
  if (verification.data?.status !== "successful") return null;

  const orderId = body.data?.meta?.orderId ?? "";

  return {
    provider: "flutterwave",
    orderId,
    providerRef: body.data.tx_ref,
    status: "completed",
    amountUsd: body.data.amount,
  };
}

// ── Main entry point ───────────────────────────────────────────────────────────
export async function createCheckout(p: CheckoutParams): Promise<CheckoutResult> {
  if (p.provider === "stripe") return createStripeCheckout(p);
  return createFlutterwaveCheckout(p);
}
