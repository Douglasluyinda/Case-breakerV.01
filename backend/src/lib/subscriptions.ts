/**
 * Subscription helpers.
 *
 * Manages Stripe Customers and Subscriptions on behalf of users.
 * The webhook handler in routes/subscriptions.ts is the source of truth
 * for subscription state — we write to Supabase only from there.
 */

import Stripe from "stripe";
import { config } from "../config.js";

let _stripe: Stripe | null = null;
function getStripe(): Stripe {
  if (!_stripe)
    _stripe = new Stripe(config.STRIPE_SECRET_KEY, { apiVersion: "2024-06-20" });
  return _stripe;
}

// ── Customer ───────────────────────────────────────────────────────────────────

/**
 * Look up an existing Stripe customer by email or create a new one.
 * Returns the Stripe customer ID.
 */
export async function getOrCreateStripeCustomer(
  userId: string,
  email: string
): Promise<string> {
  const stripe = getStripe();

  const existing = await stripe.customers.list({ email, limit: 1 });
  if (existing.data.length > 0) return existing.data[0].id;

  const customer = await stripe.customers.create({
    email,
    metadata: { userId },
  });
  return customer.id;
}

// ── Checkout ───────────────────────────────────────────────────────────────────

export interface SubscriptionCheckoutResult {
  redirectUrl: string;
  sessionId: string;
}

/**
 * Create a Stripe Checkout Session for a Pro subscription.
 * Returns the hosted checkout URL to redirect the user to.
 */
export async function createSubscriptionCheckout(params: {
  userId: string;
  email: string;
  stripeCustomerId?: string;
}): Promise<SubscriptionCheckoutResult> {
  const stripe = getStripe();

  const customerId =
    params.stripeCustomerId ??
    (await getOrCreateStripeCustomer(params.userId, params.email));

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: config.STRIPE_PRO_PRICE_ID, quantity: 1 }],
    metadata: { userId: params.userId },
    subscription_data: { metadata: { userId: params.userId } },
    success_url: `${config.APP_URL}/dashboard?subscription=success`,
    cancel_url: `${config.APP_URL}/pro?subscription=cancelled`,
  });

  return { redirectUrl: session.url!, sessionId: session.id };
}

// ── Cancellation ───────────────────────────────────────────────────────────────

/**
 * Cancel a subscription at the end of the current billing period.
 */
export async function cancelSubscriptionAtPeriodEnd(
  stripeSubscriptionId: string
): Promise<void> {
  await getStripe().subscriptions.update(stripeSubscriptionId, {
    cancel_at_period_end: true,
  });
}

// ── Webhook verification ───────────────────────────────────────────────────────

export function verifySubscriptionWebhook(
  payload: Buffer,
  sig: string
): Stripe.Event {
  return getStripe().webhooks.constructEvent(
    payload,
    sig,
    config.STRIPE_WEBHOOK_SECRET
  );
}

// ── Event parsing ──────────────────────────────────────────────────────────────

export type SubscriptionEventKind =
  | "created"
  | "updated"
  | "deleted"
  | "payment_failed";

export interface SubscriptionEvent {
  kind: SubscriptionEventKind;
  stripeSubscriptionId: string;
  stripeCustomerId: string;
  userId: string;
  status: string;
  currentPeriodStart: number;
  currentPeriodEnd: number;
  cancelAtPeriodEnd: boolean;
}

/** Parse Stripe subscription events into a normalised shape. */
export function parseSubscriptionEvent(
  event: Stripe.Event
): SubscriptionEvent | null {
  const subEvents: Record<string, SubscriptionEventKind> = {
    "customer.subscription.created": "created",
    "customer.subscription.updated": "updated",
    "customer.subscription.deleted": "deleted",
    "invoice.payment_failed": "payment_failed",
  };

  const kind = subEvents[event.type];
  if (!kind) return null;

  if (event.type === "invoice.payment_failed") {
    const invoice = event.data.object as Stripe.Invoice;
    const subId =
      typeof invoice.subscription === "string"
        ? invoice.subscription
        : invoice.subscription?.id ?? "";
    return {
      kind: "payment_failed",
      stripeSubscriptionId: subId,
      stripeCustomerId:
        typeof invoice.customer === "string" ? invoice.customer : "",
      userId: invoice.metadata?.userId ?? "",
      status: "past_due",
      currentPeriodStart: 0,
      currentPeriodEnd: 0,
      cancelAtPeriodEnd: false,
    };
  }

  const sub = event.data.object as Stripe.Subscription;
  return {
    kind,
    stripeSubscriptionId: sub.id,
    stripeCustomerId:
      typeof sub.customer === "string" ? sub.customer : sub.customer.id,
    userId: sub.metadata?.userId ?? "",
    status: sub.status,
    currentPeriodStart: sub.current_period_start,
    currentPeriodEnd: sub.current_period_end,
    cancelAtPeriodEnd: sub.cancel_at_period_end,
  };
}
