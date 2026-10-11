import type { FastifyPluginAsync } from "fastify";
import { supabase } from "../db/client.js";

// ── POST /leads ─────────────────────────────────────────────────────────────────
// Public endpoint — no auth required.
// Captures an email + optional referral code for the free lead-magnet funnel.
// Rows land in the `leads` table; duplicates (same email) are silently upserted
// so repeat submissions don't return an error.

const leadsRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post(
    "/",
    {
      schema: {
        tags: ["leads"],
        summary: "Capture an email for the free lead magnet",
        body: {
          type: "object",
          required: ["email"],
          properties: {
            email:  { type: "string", format: "email" },
            ref:    { type: "string", maxLength: 128, nullable: true },
            source: { type: "string", maxLength: 64, default: "site" },
          },
        },
        response: {
          200: {
            type: "object",
            properties: { ok: { type: "boolean" } },
          },
        },
      },
    },
    async (request, reply) => {
      const { email, ref = null, source = "site" } =
        request.body as { email: string; ref?: string | null; source?: string };

      const { error } = await supabase
        .from("leads")
        .upsert(
          { email: email.toLowerCase(), ref, source, updated_at: new Date().toISOString() },
          { onConflict: "email" }
        );

      if (error) {
        fastify.log.error({ err: error }, "leads upsert failed");
        return reply.status(500).send({ error: "Could not save your email — please try again." });
      }

      return { ok: true };
    }
  );
};

export default leadsRoutes;
