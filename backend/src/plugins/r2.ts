import fp from "fastify-plugin";
import type { FastifyPluginAsync } from "fastify";
import { S3Client, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { config } from "../config.js";

// ── R2 plugin ──────────────────────────────────────────────────────────────────
// Decorates Fastify with:
//   fastify.r2          — raw S3Client pointed at Cloudflare R2
//   fastify.r2GetUrl    — presigned GET URL (default 60 s TTL)
//   fastify.r2PutUrl    — presigned PUT URL for direct uploads (default 300 s TTL)

declare module "fastify" {
  interface FastifyInstance {
    r2: S3Client;
    r2GetUrl: (key: string, expiresIn?: number) => Promise<string>;
    r2PutUrl: (key: string, contentType: string, expiresIn?: number) => Promise<string>;
  }
}

const r2Plugin: FastifyPluginAsync = async (fastify) => {
  const client = new S3Client({
    region: "auto",
    endpoint: `https://${config.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: config.R2_ACCESS_KEY_ID,
      secretAccessKey: config.R2_SECRET_ACCESS_KEY,
    },
  });

  fastify.decorate("r2", client);

  fastify.decorate(
    "r2GetUrl",
    async (key: string, expiresIn = 60): Promise<string> => {
      const command = new GetObjectCommand({
        Bucket: config.R2_BUCKET,
        Key: key,
      });
      return getSignedUrl(client, command, { expiresIn });
    }
  );

  fastify.decorate(
    "r2PutUrl",
    async (key: string, contentType: string, expiresIn = 300): Promise<string> => {
      const command = new PutObjectCommand({
        Bucket: config.R2_BUCKET,
        Key: key,
        ContentType: contentType,
      });
      return getSignedUrl(client, command, { expiresIn });
    }
  );
};

export default fp(r2Plugin, { name: "r2" });
