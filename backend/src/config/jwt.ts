import { type SignOptions } from "jsonwebtoken";

const DEFAULT_SECRET = "your-secret-key-change-in-production";

/**
 * Returns the centralized JWT secret.
 * Enforces security constraints in production.
 */
export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;

  if (process.env.NODE_ENV === "production") {
    if (!secret || secret === "your-secret-key" || secret === DEFAULT_SECRET) {
      console.error("FATAL ERROR: JWT_SECRET must be set to a secure, custom key in production environments.");
      process.exit(1);
    }
  }

  return secret || DEFAULT_SECRET;
}

/**
 * Returns the JWT token expiry option.
 */
export function getJwtExpiresIn(): SignOptions["expiresIn"] {
  return (process.env.JWT_EXPIRES_IN || "24h") as SignOptions["expiresIn"];
}

/**
 * Marqueur distinguant un ticket de flux d'un jeton de session.
 *
 * L'API EventSource du navigateur ne permet pas d'émettre d'en-tête
 * Authorization : l'authentification d'un flux SSE doit donc passer par l'URL,
 * où elle se retrouve exposée aux journaux d'accès du proxy et à l'historique
 * du navigateur. Plutôt que d'y faire transiter le jeton de session, on émet un
 * ticket à durée de vie très courte et sans pouvoir d'écriture : même
 * intercepté, il n'ouvre que le flux, et pour quelques secondes.
 */
export const STREAM_TICKET_TYPE = "sse-ticket";

/** Durée de vie d'un ticket de flux, en secondes. */
export const STREAM_TICKET_EXPIRES_IN_SECONDS = 30;
