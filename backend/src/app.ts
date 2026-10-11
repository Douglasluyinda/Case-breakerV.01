import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import jwt from "@fastify/jwt";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";

import { config } from "./config.js";
import authPlugin from "./plugins/auth.js";
import r2Plugin from "./plugins/r2.js";
import healthRoutes from "./routes/health.js";
import authRoutes from "./routes/auth.js";
import productRoutes from "./routes/products.js";
import purchasesRoutes from "./routes/purchases.js";
import checkoutRoutes from "./routes/checkout.js";
import subscriptionRoutes from "./routes/subscriptions.js";
import adminRoutes from "./routes/admin.js";

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

  // ── OpenAPI ─────────────────────────────────────────────────────────────────
  await app.register(swagger, {
    openapi: {
      openapi: "3.0.3",
      info: {
        title: "Case Breaker API",
        description: "DeutschwithDoug × Case Breaker — backend API for auth, products, purchases, subscriptions, checkout and admin.",
        version: "0.1.0",
      },
      servers: [
        { url: config.APP_URL.replace(/\/$/, ""), description: "Deployed" },
        { url: "http://localhost:4000", description: "Local dev" },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: "http",
            scheme: "bearer",
            bearerFormat: "JWT",
          },
        },
      },
      tags: [
        { name: "auth",          description: "Registration and login" },
        { name: "products",      description: "Downloadable grammar resources" },
        { name: "purchases",     description: "User purchase history and download URLs" },
        { name: "checkout",      description: "One-time payment sessions (Stripe / Flutterwave)" },
        { name: "subscriptions", description: "Case Breaker Pro recurring billing" },
        { name: "admin",         description: "Admin-only management endpoints" },
        { name: "health",        description: "Service health" },
      ],
    },
  });

  await app.register(swaggerUi, {
    routePrefix: "/docs",
    uiConfig: { docExpansion: "list", deepLinking: true },
    staticCSP: true,
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
  await app.register(r2Plugin);

  // ── Routes ──────────────────────────────────────────────────────────────────
  await app.register(healthRoutes);

  // ── Routes ──────────────────────────────────────────────────────────────────
  await app.register(authRoutes,      { prefix: "/auth" });
  await app.register(productRoutes,   { prefix: "/products" });
  await app.register(purchasesRoutes, { prefix: "/purchases" });
  await app.register(checkoutRoutes,       { prefix: "/checkout" });
  await app.register(subscriptionRoutes,   { prefix: "/subscriptions" });
  await app.register(adminRoutes,          { prefix: "/admin" });

  // Future route registrations:
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
