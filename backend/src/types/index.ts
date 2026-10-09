import type { JWT } from "@fastify/jwt";

// ── JWT payload ────────────────────────────────────────────────────────────────
// Supabase Auth JWTs include these claims in the payload.
export interface JwtPayload {
  sub: string;       // user uuid
  email: string;
  role: string;      // "authenticated" | "anon"
  iat: number;
  exp: number;
}

// ── Public user shape ──────────────────────────────────────────────────────────
export interface UserProfile {
  id: string;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
  createdAt: string;
}

// ── Fastify type augmentation ──────────────────────────────────────────────────
declare module "fastify" {
  interface FastifyRequest {
    user: JwtPayload;
  }
  interface FastifyInstance {
    authenticate: (request: import("fastify").FastifyRequest) => Promise<void>;
  }
}

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: JwtPayload;
    user: JwtPayload;
  }
}
