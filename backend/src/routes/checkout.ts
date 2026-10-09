import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { supabase } from "../db/client.js";
import {
  createCheckout,
  verifyStripeWebhook,
  parseStripeEvent,
  verifyFlutterwaveWebhook,
  parseFlutterwaveEvent,
  type PaymentResult,
} from "../lib/payments.js";
import type { ProductRow } from "../types/index.js";

// ── Schemas ────────────────────────────────────────────────────────────────────
const initiateSchema = z.object({
  productId: z.string().uuid("Invalid product ID"),
  provider: z.enum(["stripe", "flutterwave"]),
});

// ── Order fulfillment (shared by both webhook handlers) ────────────────────────
async function fulfillOrder(result: PaymentResult, log: (msg: string, e?: unknown) => void) {
  if (!result.orderId) {
    log("fulfillOrder: missing orderId in payment result");
    return;
  }

  const { error } = await supabase
    .from("orders")
    .update({
      status: result.status,
      provider_ref: result.providerRef,
    })
    .eq("id", result.orderId);

  if (error) {
    log(`fulfillOrder: failed to update order ${result.orderId}`, error);
  }
}

// ── Routes ─────────────────────────────────────────────────────────────────────
const checkoutRoutes: FastifyPluginAsync = async (fastify) => {
  // ── POST /checkout — create a checkout session ────────────────────────────────
  // Authenticated. Creates a pending order row then redirects to provider.
  fastify.post(
    "/",
    { onRequest: [fastify.authenticate] },
    async (request, reply) => {
      const parse = initiateSchema.safeParse(request.body);
      if (!parse.success) {
        return reply.code(400).send({
          error: "Validation failed",
          details: parse.error.flatten().fieldErrors,
        });
      }

      const { productId, provider } = parse.data;
      const userId = request.user.sub;
      const userEmail = request.user.email;

      // 1. Fetch product
      const { data: product, error: productErr } = await supabase
        .from("products")
        .select("id, title, price_usd, is_active")
        .eq("id", productId)
        .eq("is_active", true)
        .single();

      if (productErr || !product) {
        return reply.code(404).send({ error: "Product not found" });
      }

      const p = product as Pick<ProductRow, "id" | "title" | "price_usd" | "is_active">;

      // 2. Check if user already owns this product
      const { data: existing } = await supabase
        .from("orders")
        .select("id")
        .eq("user_id", userId)
        .eq("product_id", productId)
        .eq("status", "completed")
        .maybeSingle();

      if (existing) {
        return reply.code(409).send({ error: "Already purchased" });
      }

      // 3. Create pending order
      const { data: order, error: orderErr } = await supabase
        .from("orders")
        .insert({
          user_id: userId,
          product_id: productId,
          status: "pending",
          amount_usd: p.price_usd,
          payment_provider: provider,
        })
        .select("id")
        .single();

      if (orderErr || !order) {
        fastify.log.error(orderErr, "checkout: failed to create order");
        return reply.code(500).send({ error: "Could not create order" });
      }

      // 4. Create provider checkout session
      try {
        const checkout = await createCheckout({
          provider,
          productId: p.id,
          productTitle: p.title,
          amountUsd: Number(p.price_usd),
          userId,
          userEmail,
          orderId: order.id,
        });

        // Store the provider reference on the order
        await supabase
          .from("orders")
          .update({ provider_ref: checkout.providerRef })
          .eq("id", order.id);

        return reply.code(200).send({
          redirectUrl: checkout.redirectUrl,
          orderId: order.id,
        });
      } catch (err) {
        fastify.log.error(err, "checkout: provider session creation failed");
        // Mark order as failed
        await supabase.from("orders").update({ status: "failed" }).eq("id", order.id);
        return reply.code(502).send({ error: "Payment provider unavailable" });
      }
    }
  );

  // ── POST /checkout/stripe/webhook ─────────────────────────────────────────────
  // Stripe sends raw body — must be parsed before JSON middleware touches it.
  fastify.post(
    "/stripe/webhook",
    {
      config: { rawBody: true },
    },
    async (request, reply) => {
      const sig = request.headers["stripe-signature"];
      if (!sig || typeof sig !== "string") {
        return reply.code(400).send({ error: "Missing stripe-signature" });
      }

      let event;
      try {
        // rawBody is populated by @fastify/rawbody or the addContentTypeParser below
        const rawBody = (request as unknown as { rawBody: Buffer }).rawBody;
        event = verifyStripeWebhook(rawBody, sig);
      } catch (err) {
        fastify.log.warn(err, "stripe webhook: signature verification failed");
        return reply.code(400).send({ error: "Invalid signature" });
      }

      const result = parseStripeEvent(event);
      if (result) {
        await fulfillOrder(result, (msg, e) => fastify.log.error(e ?? {}, msg));
      }

      return reply.code(200).send({ received: true });
    }
  );

  // ── POST /checkout/flutterwave/webhook ────────────────────────────────────────
  fastify.post("/flutterwave/webhook", async (request, reply) => {
    const hash = request.headers["verif-hash"];
    if (!hash || typeof hash !== "string" || !verifyFlutterwaveWebhook(hash)) {
      return reply.code(401).send({ error: "Unauthorised" });
    }

    try {
      const result = await parseFlutterwaveEvent(request.body);
      if (result) {
        await fulfillOrder(result, (msg, e) => fastify.log.error(e ?? {}, msg));
      }
    } catch (err) {
      fastify.log.error(err, "flutterwave webhook: processing error");
    }

    return reply.code(200).send({ received: true });
  });

  // ── GET /checkout/flutterwave/callback ────────────────────────────────────────
  // Flutterwave redirect-back URL after payment. Verify transaction then redirect.
  fastify.get<{ Querystring: { transaction_id?: string; tx_ref?: string; status?: string } }>(
    "/flutterwave/callback",
    async (request, reply) => {
      const { status, transaction_id } = request.query;

      if (status !== "successful" || !transaction_id) {
        return reply.redirect(`${process.env.APP_URL}/shop?payment=cancelled`);
      }

      // The webhook will handle fulfillment; redirect to dashboard optimistically.
      return reply.redirect(`${process.env.APP_URL}/dashboard?payment=success`);
    }
  );
};

export default checkoutRoutes;
