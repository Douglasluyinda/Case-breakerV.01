import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { supabase } from "../db/client.js";
import type { Product, ProductRow } from "../types/index.js";

// ── Allowed upload MIME types ─────────────────────────────────────────────────
const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "application/zip",
  "application/x-zip-compressed",
  "video/mp4",
  "audio/mpeg",
  "audio/mp3",
]);

// ── Zod schemas ───────────────────────────────────────────────────────────────
const createProductSchema = z.object({
  slug: z
    .string()
    .min(2)
    .max(64)
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase letters, numbers and hyphens only"),
  title: z.string().min(2).max(128),
  description: z.string().max(2000).optional(),
  priceUsd: z.number().nonnegative().multipleOf(0.01),
});

const patchProductSchema = z.object({
  r2Key: z.string().min(1).optional(),
  fileSizeBytes: z.number().int().positive().optional(),
  fileType: z.string().min(1).optional(),
  isActive: z.boolean().optional(),
});

const uploadUrlSchema = z.object({
  contentType: z.string().refine((t) => ALLOWED_MIME_TYPES.has(t), {
    message: "Unsupported file type",
  }),
  fileName: z.string().min(1).max(255),
});

// ── Helper ────────────────────────────────────────────────────────────────────
function toProduct(row: ProductRow): Product {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description,
    priceUsd: row.price_usd,
    fileType: row.file_type,
    fileSizeBytes: row.file_size_bytes,
    isActive: row.is_active,
    createdAt: row.created_at,
  };
}

// ── Routes ────────────────────────────────────────────────────────────────────
const productRoutes: FastifyPluginAsync = async (fastify) => {
  // ── GET /products ────────────────────────────────────────────────────────────
  // Public — returns all active products (no file keys exposed)
  fastify.get("/", async (_request, reply) => {
    const { data, error } = await supabase
      .from("products")
      .select("id, slug, title, description, price_usd, file_type, file_size_bytes, is_active, created_at")
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (error) {
      fastify.log.error(error, "products.list error");
      return reply.code(500).send({ error: "Failed to fetch products" });
    }

    return reply.code(200).send((data as ProductRow[]).map(toProduct));
  });

  // ── GET /products/:id ────────────────────────────────────────────────────────
  fastify.get<{ Params: { id: string } }>("/:id", async (request, reply) => {
    const { id } = request.params;

    const { data, error } = await supabase
      .from("products")
      .select("id, slug, title, description, price_usd, file_type, file_size_bytes, is_active, created_at")
      .eq("id", id)
      .eq("is_active", true)
      .single();

    if (error || !data) {
      return reply.code(404).send({ error: "Product not found" });
    }

    return reply.code(200).send(toProduct(data as ProductRow));
  });

  // ── POST /products — admin only ───────────────────────────────────────────────
  fastify.post(
    "/",
    { onRequest: [fastify.authenticate] },
    async (request, reply) => {
      // TODO: replace with proper role check once admin role is implemented
      const role = (request.user as { role?: string }).role;
      if (role !== "service_role" && role !== "admin") {
        return reply.code(403).send({ error: "Forbidden" });
      }

      const parse = createProductSchema.safeParse(request.body);
      if (!parse.success) {
        return reply.code(400).send({
          error: "Validation failed",
          details: parse.error.flatten().fieldErrors,
        });
      }

      const { slug, title, description, priceUsd } = parse.data;

      const { data, error } = await supabase
        .from("products")
        .insert({
          slug,
          title,
          description: description ?? null,
          price_usd: priceUsd,
        })
        .select("id, slug, title, description, price_usd, file_type, file_size_bytes, is_active, created_at")
        .single();

      if (error) {
        if (error.message.toLowerCase().includes("unique") || error.code === "23505") {
          return reply.code(409).send({ error: "Slug already in use" });
        }
        fastify.log.error(error, "products.create error");
        return reply.code(500).send({ error: "Failed to create product" });
      }

      return reply.code(201).send(toProduct(data as ProductRow));
    }
  );

  // ── PATCH /products/:id — admin only ─────────────────────────────────────────
  fastify.patch<{ Params: { id: string } }>(
    "/:id",
    { onRequest: [fastify.authenticate] },
    async (request, reply) => {
      const role = (request.user as { role?: string }).role;
      if (role !== "service_role" && role !== "admin") {
        return reply.code(403).send({ error: "Forbidden" });
      }

      const parse = patchProductSchema.safeParse(request.body);
      if (!parse.success) {
        return reply.code(400).send({
          error: "Validation failed",
          details: parse.error.flatten().fieldErrors,
        });
      }

      const { id } = request.params;
      const { r2Key, fileSizeBytes, fileType, isActive } = parse.data;

      const updates: Record<string, unknown> = {};
      if (r2Key !== undefined) updates.r2_key = r2Key;
      if (fileSizeBytes !== undefined) updates.file_size_bytes = fileSizeBytes;
      if (fileType !== undefined) updates.file_type = fileType;
      if (isActive !== undefined) updates.is_active = isActive;

      if (Object.keys(updates).length === 0) {
        return reply.code(400).send({ error: "No fields to update" });
      }

      const { data, error } = await supabase
        .from("products")
        .update(updates)
        .eq("id", id)
        .select("id, slug, title, description, price_usd, file_type, file_size_bytes, is_active, created_at")
        .single();

      if (error || !data) {
        return reply.code(404).send({ error: "Product not found" });
      }

      return reply.code(200).send(toProduct(data as ProductRow));
    }
  );

  // ── DELETE /products/:id — admin only (soft delete) ──────────────────────────
  fastify.delete<{ Params: { id: string } }>(
    "/:id",
    { onRequest: [fastify.authenticate] },
    async (request, reply) => {
      const role = (request.user as { role?: string }).role;
      if (role !== "service_role" && role !== "admin") {
        return reply.code(403).send({ error: "Forbidden" });
      }

      const { id } = request.params;

      const { error } = await supabase
        .from("products")
        .update({ is_active: false })
        .eq("id", id);

      if (error) {
        fastify.log.error(error, "products.delete error");
        return reply.code(500).send({ error: "Failed to delete product" });
      }

      return reply.code(204).send();
    }
  );

  // ── POST /products/:id/upload-url — admin only ────────────────────────────────
  fastify.post<{ Params: { id: string } }>(
    "/:id/upload-url",
    { onRequest: [fastify.authenticate] },
    async (request, reply) => {
      const role = (request.user as { role?: string }).role;
      if (role !== "service_role" && role !== "admin") {
        return reply.code(403).send({ error: "Forbidden" });
      }

      const parse = uploadUrlSchema.safeParse(request.body);
      if (!parse.success) {
        return reply.code(400).send({
          error: "Validation failed",
          details: parse.error.flatten().fieldErrors,
        });
      }

      const { id } = request.params;
      const { contentType, fileName } = parse.data;

      // Confirm product exists
      const { data: product, error: productErr } = await supabase
        .from("products")
        .select("id")
        .eq("id", id)
        .single();

      if (productErr || !product) {
        return reply.code(404).send({ error: "Product not found" });
      }

      const r2Key = `products/${id}/${Date.now()}-${fileName}`;
      const uploadUrl = await fastify.r2PutUrl(r2Key, contentType, 300);

      return reply.code(200).send({ uploadUrl, r2Key });
    }
  );

  // ── GET /products/:id/download — authenticated purchasers ─────────────────────
  fastify.get<{ Params: { id: string } }>(
    "/:id/download",
    { onRequest: [fastify.authenticate] },
    async (request, reply) => {
      const { id } = request.params;
      const userId = request.user.sub;

      // Fetch product (including r2_key — not exposed in public routes)
      const { data: product, error: productErr } = await supabase
        .from("products")
        .select("id, slug, r2_key, is_active")
        .eq("id", id)
        .single();

      if (productErr || !product || !product.is_active) {
        return reply.code(404).send({ error: "Product not found" });
      }

      if (!product.r2_key) {
        return reply.code(503).send({ error: "File not yet available" });
      }

      // Entitlement check — will be expanded in M07
      // For now: allow if user has a completed order for this product
      const { data: order, error: orderErr } = await supabase
        .from("orders")
        .select("id")
        .eq("user_id", userId)
        .eq("product_id", id)
        .eq("status", "completed")
        .maybeSingle();

      if (orderErr) {
        fastify.log.error(orderErr, "products.download: order lookup error");
        return reply.code(500).send({ error: "Could not verify purchase" });
      }

      if (!order) {
        return reply.code(403).send({ error: "Purchase required" });
      }

      // Log download event (best-effort — don't fail the download if this errors)
      supabase.from("download_events").insert({
        user_id: userId,
        product_id: id,
        downloaded_at: new Date().toISOString(),
      }).then(({ error }) => {
        if (error) fastify.log.warn(error, "products.download: event log failed");
      });

      const downloadUrl = await fastify.r2GetUrl(product.r2_key, 60);

      return reply.code(200).send({ downloadUrl, expiresInSeconds: 60 });
    }
  );
};

export default productRoutes;
