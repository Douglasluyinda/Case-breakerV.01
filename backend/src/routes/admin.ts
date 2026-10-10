import type { FastifyPluginAsync } from "fastify";
import { supabase } from "../db/client.js";
import type { ProductRow, OrderRow, SubscriptionRow } from "../types/index.js";

// ── Admin guard helper ─────────────────────────────────────────────────────────
function isAdmin(role: string): boolean {
  return role === "service_role" || role === "admin";
}

// ── Routes ─────────────────────────────────────────────────────────────────────
const adminRoutes: FastifyPluginAsync = async (fastify) => {
  // All routes in this plugin require authentication + admin role
  fastify.addHook("onRequest", fastify.authenticate);
  fastify.addHook("preHandler", async (request, reply) => {
    if (!isAdmin(request.user.role)) {
      return reply.code(403).send({ error: "Forbidden" });
    }
  });

  // ── GET /admin/stats — dashboard KPIs ───────────────────────────────────────
  fastify.get("/stats", async (_request, reply) => {
    const [productsRes, ordersRes, subsRes, revenueRes] = await Promise.all([
      supabase.from("products").select("id, is_active", { count: "exact" }),
      supabase.from("orders").select("id, status", { count: "exact" }),
      supabase
        .from("subscriptions")
        .select("id, status", { count: "exact" })
        .in("status", ["active", "trialing"]),
      supabase
        .from("orders")
        .select("amount_usd")
        .eq("status", "completed"),
    ]);

    const totalRevenue = (revenueRes.data ?? []).reduce(
      (sum, row) => sum + Number((row as { amount_usd: number }).amount_usd),
      0
    );

    return reply.code(200).send({
      products: {
        total: productsRes.count ?? 0,
        active: (productsRes.data ?? []).filter(
          (r: { is_active: boolean }) => r.is_active
        ).length,
      },
      orders: {
        total: ordersRes.count ?? 0,
        completed: (ordersRes.data ?? []).filter(
          (r: { status: string }) => r.status === "completed"
        ).length,
      },
      subscriptions: {
        active: subsRes.count ?? 0,
      },
      revenue: {
        totalUsd: Math.round(totalRevenue * 100) / 100,
      },
    });
  });

  // ── GET /admin/products — full product list (includes inactive) ──────────────
  fastify.get("/products", async (_request, reply) => {
    const { data, error } = await supabase
      .from("products")
      .select("id, slug, title, price_usd, file_type, file_size_bytes, is_active, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      fastify.log.error(error, "admin.products error");
      return reply.code(500).send({ error: "DB error" });
    }

    return reply.code(200).send(data ?? []);
  });

  // ── GET /admin/orders — all orders with user email + product title ───────────
  fastify.get(
    "/orders",
    async (request, reply) => {
      const page = Number((request.query as { page?: string }).page ?? 1);
      const limit = 50;
      const from = (page - 1) * limit;

      const { data, error, count } = await supabase
        .from("orders")
        .select(
          "id, status, amount_usd, payment_provider, provider_ref, created_at, user_id, product_id, products(title)",
          { count: "exact" }
        )
        .order("created_at", { ascending: false })
        .range(from, from + limit - 1);

      if (error) {
        fastify.log.error(error, "admin.orders error");
        return reply.code(500).send({ error: "DB error" });
      }

      return reply.code(200).send({ orders: data ?? [], total: count ?? 0, page });
    }
  );

  // ── GET /admin/subscriptions — active subscriptions ─────────────────────────
  fastify.get(
    "/subscriptions",
    async (request, reply) => {
      const page = Number((request.query as { page?: string }).page ?? 1);
      const limit = 50;
      const from = (page - 1) * limit;

      const { data, error, count } = await supabase
        .from("subscriptions")
        .select("id, user_id, tier, status, stripe_subscription_id, current_period_end, cancel_at_period_end, created_at", {
          count: "exact",
        })
        .order("created_at", { ascending: false })
        .range(from, from + limit - 1);

      if (error) {
        fastify.log.error(error, "admin.subscriptions error");
        return reply.code(500).send({ error: "DB error" });
      }

      return reply.code(200).send({
        subscriptions: data ?? [],
        total: count ?? 0,
        page,
      });
    }
  );

  // ── PATCH /admin/products/:id — toggle active, update price ─────────────────
  fastify.patch<{ Params: { id: string } }>(
    "/products/:id",
    async (request, reply) => {
      const { id } = request.params;
      const body = request.body as Partial<Pick<ProductRow, "is_active" | "price_usd">>;

      const allowed: Record<string, unknown> = {};
      if (typeof body.is_active === "boolean") allowed.is_active = body.is_active;
      if (typeof body.price_usd === "number") allowed.price_usd = body.price_usd;

      if (Object.keys(allowed).length === 0) {
        return reply.code(400).send({ error: "Nothing to update" });
      }

      const { error } = await supabase
        .from("products")
        .update(allowed)
        .eq("id", id);

      if (error) {
        fastify.log.error(error, "admin.products.patch error");
        return reply.code(500).send({ error: "DB error" });
      }

      return reply.code(200).send({ updated: true });
    }
  );

  // ── PATCH /admin/orders/:id — manual status override (e.g. refund) ──────────
  fastify.patch<{ Params: { id: string } }>(
    "/orders/:id",
    async (request, reply) => {
      const { id } = request.params;
      const { status } = request.body as { status?: string };
      const allowed = ["pending", "completed", "refunded", "failed"];

      if (!status || !allowed.includes(status)) {
        return reply.code(400).send({ error: "Invalid status" });
      }

      const { error } = await supabase
        .from("orders")
        .update({ status })
        .eq("id", id);

      if (error) {
        fastify.log.error(error, "admin.orders.patch error");
        return reply.code(500).send({ error: "DB error" });
      }

      return reply.code(200).send({ updated: true });
    }
  );
};

export default adminRoutes;
