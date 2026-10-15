import type { FastifyPluginAsync } from "fastify";
import { supabase } from "../db/client.js";
import { createJjumaCheckout, verifyJjumaWebhook, parseJjumaEvent } from "../lib/payments.js";
import { config } from "../config.js";
import type { SubscriptionRow, Subscription } from "../types/index.js";

const PRO_PRICE_USD = 9;

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
    { onRequest: [fastify.authenticate], schema: { tags: ["subscriptions"], summary: "Get current user's active subscription", security: [{ bearerAuth: [] }] } },
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
    { onRequest: [fastify.authenticate], schema: { tags: ["subscriptions"], summary: "Start a Pro subscription checkout", security: [{ bearerAuth: [] }] } },
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

      // Create a pending subscription record
      const periodStart = new Date();
      const periodEnd = new Date(periodStart);
      periodEnd.setDate(periodEnd.getDate() + 30);

      const { data: sub, error: subErr } = await supabase
        .from("subscriptions")
        .insert({
          user_id: userId,
          tier: "pro",
          status: "pending",
          current_period_start: periodStart.toISOString(),
          current_period_end: periodEnd.toISOString(),
          cancel_at_period_end: false,
        })
        .select("id")
        .single();

      if (subErr || !sub) {
        fastify.log.error(subErr, "subscriptions: failed to create pending row");
        return reply.code(500).send({ error: "Could not create subscription" });
      }

      try {
        const result = await createJjumaCheckout({
          provider: "jjuma",
          productId: "pro-monthly",
          productTitle: "Case Breaker Pro — 1 month",
          amountUsd: PRO_PRICE_USD,
          userId,
          userEmail,
          orderId: sub.id,            // reuse subscription ID as orderId for webhook lookup
        });
        // Store provider ref
        await supabase.from("subscriptions").update({ stripe_subscription_id: result.providerRef }).eq("id", sub.id);
        return reply.code(200).send({ redirectUrl: result.redirectUrl });
      } catch (err) {
        fastify.log.error(err, "subscriptions: checkout creation failed");
        await supabase.from("subscriptions").delete().eq("id", sub.id);
        return reply.code(502).send({ error: "Payment provider unavailable" });
      }
    }
  );

  // ── DELETE /subscriptions/me — cancel at period end ─────────────────────────
  fastify.delete(
    "/me",
    { onRequest: [fastify.authenticate], schema: { tags: ["subscriptions"], summary: "Cancel subscription at period end", security: [{ bearerAuth: [] }] } },
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

      // Mark cancel_at_period_end in DB — Jjuma subscriptions expire naturally at period end
      const { error: updateErr } = await supabase
        .from("subscriptions")
        .update({ cancel_at_period_end: true })
        .eq("id", row.id);

      if (updateErr) {
        fastify.log.error(updateErr, "subscriptions: cancel update failed");
        return reply.code(500).send({ error: "Could not cancel subscription" });
      }
      return reply.code(200).send({ cancelled: true });
    }
  );

  // ── POST /subscriptions/jjuma/webhook ───────────────────────────────────────
  // Jjuma calls this when a subscription payment succeeds or fails.
  fastify.post(
    "/jjuma/webhook",
    { schema: { tags: ["subscriptions"], summary: "Jjuma subscription webhook (internal)" } },
    async (request, reply) => {
      const secret = request.headers["x-jjuma-secret"];
      if (!secret || typeof secret !== "string") {
        return reply.code(400).send({ error: "Missing x-jjuma-secret" });
      }

      if (!verifyJjumaWebhook(secret)) {
        fastify.log.warn("subscription webhook: invalid Jjuma secret");
        return reply.code(400).send({ error: "Invalid signature" });
      }

      const parsed = parseJjumaEvent(request.body);
      if (!parsed || !parsed.orderId) {
        return reply.code(200).send({ received: true });
      }

      // orderId on a subscription checkout is the subscription row id
      const { error: updateErr } = await supabase
        .from("subscriptions")
        .update({
          status: parsed.status === "completed" ? "active" : "past_due",
          provider_ref: parsed.providerRef ?? null,
        })
        .eq("id", parsed.orderId);

      if (updateErr) {
        fastify.log.error(updateErr, "subscription webhook: db update failed");
      }

      return reply.code(200).send({ received: true });
    }
  );
};

export default subscriptionRoutes;
