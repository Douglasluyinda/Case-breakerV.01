import { z } from "zod";

export const RegisterBodySchema = z.object({
  email: z.string().email("Must be a valid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(72, "Password must be at most 72 characters"),
  displayName: z
    .string()
    .min(2, "Display name must be at least 2 characters")
    .max(50, "Display name must be at most 50 characters")
    .optional(),
});

export const LoginBodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(1, "Password is required"),
});

export type RegisterBody = z.infer<typeof RegisterBodySchema>;
export type LoginBody = z.infer<typeof LoginBodySchema>;

// JSON Schema equivalents for Fastify's response serialisation
export const UserResponseSchema = {
  type: "object",
  properties: {
    id: { type: "string" },
    email: { type: "string" },
    displayName: { type: "string", nullable: true },
    createdAt: { type: "string" },
  },
} as const;

export const AuthResponseSchema = {
  type: "object",
  properties: {
    user: UserResponseSchema,
    accessToken: { type: "string" },
    tokenType: { type: "string" },
    expiresIn: { type: "number" },
  },
} as const;

export const ErrorResponseSchema = {
  type: "object",
  properties: {
    error: { type: "string" },
    message: { type: "string" },
    statusCode: { type: "number" },
  },
} as const;
