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

// ── Product shapes ─────────────────────────────────────────────────────────────
export interface Product {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  priceUsd: number;
  fileType: string | null;
  fileSizeBytes: number | null;
  isActive: boolean;
  createdAt: string;
}

export interface ProductRow {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  price_usd: number;
  r2_key: string | null;
  file_type: string | null;
  file_size_bytes: number | null;
  is_active: boolean;
  created_at: string;
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
