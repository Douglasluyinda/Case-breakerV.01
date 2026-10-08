import type { FastifyPluginAsync } from "fastify";

const VERSION = process.env.npm_package_version ?? "0.1.0";

const healthRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get(
    "/health",
    {
      schema: {
        response: {
          200: {
            type: "object",
            properties: {
              status: { type: "string" },
              version: { type: "string" },
              env: { type: "string" },
              uptime: { type: "number" },
            },
          },
        },
      },
    },
    async (_request, reply) => {
      return reply.code(200).send({
        status: "ok",
        version: VERSION,
        env: process.env.NODE_ENV ?? "development",
        uptime: Math.floor(process.uptime()),
      });
    }
  );
};

export default healthRoutes;
