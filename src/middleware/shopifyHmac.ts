import crypto from "node:crypto";
import { NextFunction, Request, Response } from "express";
import { env } from "../lib/env";

export function verifyShopifyHmac(req: Request, res: Response, next: NextFunction): void {
  const hmacHeader = req.get("X-Shopify-Hmac-Sha256");

  if (!hmacHeader || !Buffer.isBuffer(req.body)) {
    res.status(401).json({ error: { message: "Missing HMAC signature" } });
    return;
  }

  const digest = crypto
    .createHmac("sha256", env.shopifyWebhookSecret)
    .update(req.body)
    .digest();
  const provided = Buffer.from(hmacHeader, "base64");

  const isValid = digest.length === provided.length && crypto.timingSafeEqual(digest, provided);

  if (!isValid) {
    res.status(401).json({ error: { message: "Invalid HMAC signature" } });
    return;
  }

  next();
}
