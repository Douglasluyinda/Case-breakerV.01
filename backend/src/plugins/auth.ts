import fp from "fastify-plugin";
import type { FastifyPluginAsync, FastifyRequest } from "fastify";

/**
 * Decorate each request with `request.user` when a valid Bearer JWT is present.
 * Routes that require auth call `request.authenticate()` — this throws 401 if
 * no valid token is found, so there is no need to repeat the check in handlers.
 */
const authPlugin: FastifyPluginAsync = async (fastify) => {
  if (!fastify.hasRequestDecorator("user")) {
    fastify.decorateRequest("user", null);
  }

  fastify.decorate(
    "authenticate",
    async function (request: FastifyRequest) {
      await request.jwtVerify();
    }
  );
};

export default fp(authPlugin, { name: "auth" });
