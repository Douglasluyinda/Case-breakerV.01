import type { FastifyPluginAsync } from "fastify";
import { supabase } from "../db/client.js";
import type { OrderRow, Purchase, ProductRow } from "../types/index.js";

// ── Helper: map DB row → API shape ─────────────────────────────────────────────
function toPurchase(row: OrderRow): Purchase {
  const p = row.products as ProductRow;
  return {
    orderId: row.id,
    status: row.status,
    amountUsd: row.amount_usd,
    purchasedAt: row.created_at,
    product: {
      id: p.id,
      slug: p.slug,
      title: p.title,
      description: p.description,
      priceUsd: p.price_usd,
      fileType: p.file_type,
      fileSizeBytes: p.file_size_bytes,
      isActive: p.is_active,
      createdAt: p.created_at,
    },
  };
}

// ── Routes ─────────────────────────────────────────────────────────────────────
const purchasesRoutes: FastifyPluginAsync = async (fastify) => {
  // ── GET /purchases ───────────────────────────────────────────────────────────
  // Returns the authenticated user's completed purchases with product details.
  fastify.get(
    "/",
    { onRequest: [fastify.authenticate] },
    async (request, reply) => {
      const userId = request.user.sub;

      const { data, error } = await supabase
        .from("orders")
        .select(`
          id,
          status,
          amount_usd,
          created_at,
          payment_provider,
          products (
            id, slug, title, description,
            price_usd, file_type, file_size_bytes, is_active, created_at
          )
        `)
        .eq("user_id", userId)
        .eq("status", "completed")
        .order("created_at", { ascending: false });

      if (error) {
        fastify.log.error(error, "purchases.list error");
        return reply.code(500).send({ error: "Failed to fetch purchases" });
      }

      const rows = (data ?? []) as unknown as OrderRow[];
      return reply.code(200).send(rows.map(toPurchase));
    }
  );

  // ── GET /purchases/:productId/entitlement ────────────────────────────────────
  // Quick boolean check: does this user own a given product?
  // Used by the download route and future Pro-gate checks.
  fastify.get<{ Params: { productId: string } }>(
    "/:productId/entitlement",
    { onRequest: [fastify.authenticate] },
    async (request, reply) => {
      const userId = request.user.sub;
      const { productId } = request.params;

      const { data, error } = await supabase
        .from("orders")
        .select("id")
        .eq("user_id", userId)
        .eq("product_id", productId)
        .eq("status", "completed")
        .maybeSingle();

      if (error) {
        fastify.log.error(error, "purchases.entitlement error");
        return reply.code(500).send({ error: "Entitlement check failed" });
      }

      return reply.code(200).send({ entitled: data !== null });
    }
  );
};

export default purchasesRoutes;
