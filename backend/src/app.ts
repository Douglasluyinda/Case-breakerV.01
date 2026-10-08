import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import jwt from "@fastify/jwt";

import { config } from "./config.js";
import authPlugin from "./plugins/auth.js";
import healthRoutes from "./routes/health.js";

export async function buildApp() {
  const app = Fastify({
    logger:
      config.NODE_ENV === "test"
        ? false
        : {
            level: config.NODE_ENV === "production" ? "warn" : "info",
            transport:
              config.NODE_ENV === "development"
                ? { target: "pino-pretty", options: { colorize: true } }
                : undefined,
          },
  });

  // ── Security ────────────────────────────────────────────────────────────────
  await app.register(helmet, { contentSecurityPolicy: false });
  await app.register(cors, {
    origin: config.CORS_ORIGINS,
    credentials: true,
  });

  // ── Auth ────────────────────────────────────────────────────────────────────
  await app.register(jwt, { secret: config.JWT_SECRET });
  await app.register(authPlugin);

  // ── Routes ──────────────────────────────────────────────────────────────────
  await app.register(healthRoutes);

  // Future route registrations go here:
  // await app.register(authRoutes,     { prefix: "/auth" });
  // await app.register(productRoutes,  { prefix: "/products" });
  // await app.register(orderRoutes,    { prefix: "/orders" });
  // await app.register(entitleRoutes,  { prefix: "/entitlements" });
  // await app.register(gameRoutes,     { prefix: "/game" });
  // await app.register(adminRoutes,    { prefix: "/admin" });

  return app;
}

// ── Entry point ────────────────────────────────────────────────────────────────
if (process.env.NODE_ENV !== "test") {
  const app = await buildApp();
  await app.listen({ port: config.PORT, host: config.HOST });
}
