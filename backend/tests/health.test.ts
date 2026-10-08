import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { buildApp } from "../src/app.js";
import type { FastifyInstance } from "fastify";

// Minimal env for tests — real Supabase keys not needed for health check
process.env.NODE_ENV = "test";
process.env.SUPABASE_URL = "https://placeholder.supabase.co";
process.env.SUPABASE_ANON_KEY = "placeholder-anon-key";
process.env.SUPABASE_SERVICE_ROLE_KEY = "placeholder-service-role-key";
process.env.JWT_SECRET = "test-secret-at-least-32-chars-long!!";

let app: FastifyInstance;

beforeAll(async () => {
  app = await buildApp();
  await app.ready();
});

afterAll(async () => {
  await app.close();
});

describe("GET /health", () => {
  it("returns 200 with status ok", async () => {
    const res = await app.inject({ method: "GET", url: "/health" });
    expect(res.statusCode).toBe(200);
    const body = res.json<{ status: string; version: string }>();
    expect(body.status).toBe("ok");
    expect(body.version).toBeDefined();
  });
});
