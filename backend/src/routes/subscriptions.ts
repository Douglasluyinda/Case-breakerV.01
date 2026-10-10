import type { FastifyPluginAsync } from "fastify";
import { supabase } from "../db/client.js";
import {
  createSubscriptionCheckout,
  cancelSubscriptionAtPeriodEnd,
  verifySubscriptionWebhook,
  parseSubscriptionEvent,
} from "../lib/subscriptions.js";
import type { SubscriptionRow, Subscription } from "../types/index.js";

// ── Helper ─────────────────────────────────────────────────────────────────────
function toSubscription(row: SubscriptionRow): Subscription {
  return {
    id: row.id,
    tier: row.tier,
    status: row.status,
    currentPeriodEnd: row.current_period_end,
    cancelAtPeriodEnd: row.cancel_at_period_end,
  };
}

// ── Routes ─────────────────────────────────────────────────────────────────────
const subscriptionRoutes: FastifyPluginAsync = async (fastify) => {

  // ── GET /subscriptions/me — current subscription ────────────────────────────
  fastify.get(
    "/me",
    { onRequest: [fastify.authenticate] },
    async (request, reply) => {
      const userId = request.user.sub;

      const { data, error } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", userId)
        .in("status", ["trialing", "active", "past_due"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        fastify.log.error(error, "subscriptions/me: db error");
        return reply.code(500).send({ error: "Could not fetch subscription" });
      }

      if (!data) {
        return reply.code(200).send({ subscription: null });
      }

      return reply.code(200).send({ subscription: toSubscription(data as SubscriptionRow) });
    }
  );

  // ── POST /subscriptions — start a Pro subscription checkout ─────────────────
  fastify.post(
    "/",
    { onRequest: [fastify.authenticate] },
    async (request, reply) => {
      const userId = request.user.sub;
      const userEmail = request.user.email;

      // Check for an existing active subscription
      const { data: existing } = await supabase
        .from("subscriptions")
        .select("id, status")
        .eq("user_id", userId)
        .in("status", ["trialing", "active"])
        .maybeSingle();

      if (existing) {
        return reply.code(409).send({ error: "Already subscribed" });
      }

      try {
        const result = await createSubscriptionCheckout({ userId, email: userEmail });
        return reply.code(200).send({ redirectUrl: result.redirectUrl });
      } catch (err) {
        fastify.log.error(err, "subscriptions: checkout creation failed");
        return reply.code(502).send({ error: "Payment provider unavailable" });
      }
    }
  );

  // ── DELETE /subscriptions/me — cancel at period end ─────────────────────────
  fastify.delete(
    "/me",
    { onRequest: [fastify.authenticate] },
    async (request, reply) => {
      const userId = request.user.sub;

      const { data: sub, error } = await supabase
        .from("subscriptions")
        .select("id, stripe_subscription_id, status")
        .eq("user_id", userId)
        .in("status", ["trialing", "active"])
        .maybeSingle();

      if (error || !sub) {
        return reply.code(404).send({ error: "No active subscription found" });
      }

      const row = sub as SubscriptionRow;
      if (!row.stripe_subscription_id) {
        return reply.code(422).send({ error: "Subscription has no provider reference" });
      }

      try {
        await cancelSubscriptionAtPeriodEnd(row.stripe_subscription_id);
        return reply.code(200).send({ cancelled: true });
      } catch (err) {
        fastify.log.error(err, "subscriptions: cancel failed");
        return reply.code(502).send({ error: "Payment provider unavailable" });
      }
    }
  );

  // ── POST /subscriptions/stripe/webhook ───────────────────────────────────────
  fastify.post(
    "/stripe/webhook",
    { config: { rawBody: true } },
    async (request, reply) => {
      const sig = request.headers["stripe-signature"];
      if (!sig || typeof sig !== "string") {
        return reply.code(400).send({ error: "Missing stripe-signature" });
      }

      let event;
      try {
        const rawBody = (request as unknown as { rawBody: Buffer }).rawBody;
        event = verifySubscriptionWebhook(rawBody, sig);
      } catch (err) {
        fastify.log.warn(err, "subscription webhook: signature verification failed");
        return reply.code(400).send({ error: "Invalid signature" });
      }

      const parsed = parseSubscriptionEvent(event);
      if (!parsed || !parsed.userId) {
        return reply.code(200).send({ received: true });
      }

      // Upsert the subscription row keyed by stripe_subscription_id
      const { error: upsertError } = await supabase
        .from("subscriptions")
        .upsert(
          {
            user_id: parsed.userId,
            tier: "pro",
            status: parsed.kind === "deleted" ? "cancelled" : parsed.status,
            stripe_customer_id: parsed.stripeCustomerId,
            stripe_subscription_id: parsed.stripeSubscriptionId,
            current_period_start: parsed.currentPeriodStart
              ? new Date(parsed.currentPeriodStart * 1000).toISOString()
              : null,
            current_period_end: parsed.currentPeriodEnd
              ? new Date(parsed.currentPeriodEnd * 1000).toISOString()
              : null,
            cancel_at_period_end: parsed.cancelAtPeriodEnd,
            cancelled_at:
              parsed.kind === "deleted" ? new Date().toISOString() : null,
          },
          { onConflict: "stripe_subscription_id" }
        );

      if (upsertError) {
        fastify.log.error(upsertError, "subscription webhook: db upsert failed");
      }

      return reply.code(200).send({ received: true });
    }
  );
};

export default subscriptionRoutes;
