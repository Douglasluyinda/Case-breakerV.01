import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { supabase } from "../db/client.js";
import type { UserProfile } from "../types/index.js";

// ── Zod schemas ────────────────────────────────────────────────────────────────

const registerSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(72, "Password must be under 72 characters"),
  displayName: z.string().min(1).max(64).optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// ── Helpers ────────────────────────────────────────────────────────────────────

function toUserProfile(
  id: string,
  email: string,
  profile: { display_name: string | null; avatar_url: string | null; created_at: string } | null
): UserProfile {
  return {
    id,
    email,
    displayName: profile?.display_name ?? null,
    avatarUrl: profile?.avatar_url ?? null,
    createdAt: profile?.created_at ?? new Date().toISOString(),
  };
}

// ── Routes ─────────────────────────────────────────────────────────────────────

const authRoutes: FastifyPluginAsync = async (fastify) => {
  // ── POST /auth/register ──────────────────────────────────────────────────────
  fastify.post("/register", async (request, reply) => {
    const parse = registerSchema.safeParse(request.body);
    if (!parse.success) {
      return reply.code(400).send({
        error: "Validation failed",
        details: parse.error.flatten().fieldErrors,
      });
    }

    const { email, password, displayName } = parse.data;

    const { data, error } = await supabase.auth.signUp({ email, password });

    if (error) {
      // Supabase returns "User already registered" for duplicate emails
      if (error.message.toLowerCase().includes("already registered")) {
        return reply.code(409).send({ error: "Email already in use" });
      }
      if (error.message.toLowerCase().includes("password")) {
        return reply.code(422).send({ error: error.message });
      }
      fastify.log.error(error, "auth.register error");
      return reply.code(500).send({ error: "Registration failed" });
    }

    if (!data.user || !data.session) {
      // Email confirmation required — tell the client
      return reply.code(202).send({
        message: "Check your email to confirm your account",
      });
    }

    // Upsert profile row
    await supabase.from("profiles").upsert({
      id: data.user.id,
      display_name: displayName ?? null,
    });

    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name, avatar_url, created_at")
      .eq("id", data.user.id)
      .single();

    return reply.code(201).send({
      user: toUserProfile(data.user.id, email, profile),
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
    });
  });

  // ── POST /auth/login ─────────────────────────────────────────────────────────
  fastify.post("/login", async (request, reply) => {
    const parse = loginSchema.safeParse(request.body);
    if (!parse.success) {
      return reply.code(400).send({ error: "Validation failed" });
    }

    const { email, password } = parse.data;

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.session) {
      // Never reveal which field is wrong
      return reply.code(401).send({ error: "Invalid credentials" });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name, avatar_url, created_at")
      .eq("id", data.user.id)
      .single();

    return reply.code(200).send({
      user: toUserProfile(data.user.id, data.user.email ?? email, profile),
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
    });
  });

  // ── POST /auth/logout ────────────────────────────────────────────────────────
  fastify.post(
    "/logout",
    { onRequest: [fastify.authenticate] },
    async (request, reply) => {
      // Sign out the user on the Supabase side using their access token
      const token = request.headers.authorization?.replace("Bearer ", "") ?? "";
      // Use admin.signOut to invalidate only this session token
      const supabaseUser = await supabase.auth.admin.signOut(token);

      if ("error" in supabaseUser && supabaseUser.error) {
        fastify.log.warn(supabaseUser.error, "auth.logout warning");
        // Still return 204 — token will expire naturally
      }

      return reply.code(204).send();
    }
  );

  // ── GET /auth/me ─────────────────────────────────────────────────────────────
  fastify.get(
    "/me",
    { onRequest: [fastify.authenticate] },
    async (request, reply) => {
      const userId = request.user!.sub;
      const email = request.user!.email;

      const { data: profile, error } = await supabase
        .from("profiles")
        .select("display_name, avatar_url, created_at")
        .eq("id", userId)
        .single();

      if (error) {
        fastify.log.warn(error, "auth.me: profile not found, returning minimal");
      }

      return reply.code(200).send(toUserProfile(userId, email, profile ?? null));
    }
  );
};

export default authRoutes;
