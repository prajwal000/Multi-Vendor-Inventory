import { Prisma } from "@prisma/client";
import express, { NextFunction, Request, Response, Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../lib/asyncHandler";
import { prisma } from "../lib/prisma";
import { verifyShopifyHmac } from "../middleware/shopifyHmac";

export const shopifyWebhooksRouter = Router();

// Body must reach HMAC verification as a raw Buffer, so this router parses its
// own body ahead of the app-wide express.json() (mounted after this router).
const rawJsonBody = express.raw({ type: "application/json" });

function parseRawJsonBody(req: Request, res: Response, next: NextFunction): void {
  try {
    req.body = JSON.parse((req.body as Buffer).toString("utf8"));
    next();
  } catch {
    res.status(400).json({ error: { message: "Invalid JSON payload" } });
  }
}

const variantSchema = z.object({
  id: z.number(),
  sku: z.string().min(1),
  inventory_item_id: z.number(),
  inventory_quantity: z.number().int(),
});

const productsUpdateSchema = z.object({
  id: z.number(),
  title: z.string(),
  variants: z.array(variantSchema),
});

const inventoryLevelsUpdateSchema = z.object({
  inventory_item_id: z.number(),
  location_id: z.number(),
  available: z.number().int(),
});

async function getShopifyChannel() {
  const channel = await prisma.channel.findUnique({ where: { name: "Shopify" } });
  if (!channel) {
    throw new Error("Shopify channel is not configured — run the seed script first");
  }
  return channel;
}

// Returns null when webhookEventId has already been logged — the caller should
// treat that as a duplicate delivery and skip reprocessing.
async function createReceivedLog(params: {
  webhookEventId: string;
  eventType: string;
  sku: string;
  channelId: string;
  payload: unknown;
}) {
  try {
    return await prisma.syncLog.create({
      data: {
        webhookEventId: params.webhookEventId,
        eventType: params.eventType,
        sku: params.sku,
        channelId: params.channelId,
        status: "received",
        payload: params.payload as Prisma.InputJsonValue,
      },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return null;
    }
    throw err;
  }
}

/**
 * @openapi
 * /webhooks/shopify/products/update:
 *   post:
 *     summary: Shopify `products/update` webhook
 *     description: >
 *       Requires a valid `X-Shopify-Hmac-Sha256` signature and a unique
 *       `X-Shopify-Webhook-Id` header. Updates product title, inventory, and
 *       records the SKU → inventory_item_id mapping used by
 *       `inventory_levels/update`.
 *     tags: [Webhooks]
 *     parameters:
 *       - in: header
 *         name: X-Shopify-Hmac-Sha256
 *         required: true
 *         schema:
 *           type: string
 *       - in: header
 *         name: X-Shopify-Webhook-Id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Webhook processed (or ignored as a duplicate)
 *       401:
 *         description: Missing or invalid HMAC signature
 */
shopifyWebhooksRouter.post(
  "/webhooks/shopify/products/update",
  rawJsonBody,
  verifyShopifyHmac,
  parseRawJsonBody,
  asyncHandler(async (req, res) => {
    const webhookEventId = req.get("X-Shopify-Webhook-Id");
    if (!webhookEventId) {
      res.status(400).json({ error: { message: "Missing X-Shopify-Webhook-Id header" } });
      return;
    }

    const parsed = productsUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ error: { message: "Invalid webhook payload", details: parsed.error.flatten() } });
      return;
    }
    const payload = parsed.data;
    const channel = await getShopifyChannel();

    const log = await createReceivedLog({
      webhookEventId,
      eventType: "products/update",
      sku: payload.variants.map((variant) => variant.sku).join(", "),
      channelId: channel.id,
      payload,
    });

    if (!log) {
      res.status(200).json({ status: "duplicate_ignored" });
      return;
    }

    const results: string[] = [];
    for (const variant of payload.variants) {
      const product = await prisma.product.findUnique({ where: { sku: variant.sku } });
      if (!product) {
        results.push(`${variant.sku}: skipped (unknown SKU)`);
        continue;
      }

      await prisma.product.update({
        where: { id: product.id },
        data: {
          title: payload.title,
          shopifyInventoryItemId: String(variant.inventory_item_id),
        },
      });

      await prisma.inventoryRecord.upsert({
        where: { productId_channelId: { productId: product.id, channelId: channel.id } },
        update: { quantity: variant.inventory_quantity, reportedAt: new Date() },
        create: {
          productId: product.id,
          channelId: channel.id,
          quantity: variant.inventory_quantity,
        },
      });

      results.push(`${variant.sku}: updated to ${variant.inventory_quantity}`);
    }

    await prisma.syncLog.update({
      where: { id: log.id },
      data: { status: "success", message: results.join("; ") },
    });

    res.status(200).json({ status: "processed" });
  }),
);

/**
 * @openapi
 * /webhooks/shopify/inventory_levels/update:
 *   post:
 *     summary: Shopify `inventory_levels/update` webhook
 *     description: >
 *       Requires a valid `X-Shopify-Hmac-Sha256` signature and a unique
 *       `X-Shopify-Webhook-Id` header. Resolves the product via the stored
 *       `inventory_item_id` → SKU mapping (populated by `products/update`).
 *     tags: [Webhooks]
 *     parameters:
 *       - in: header
 *         name: X-Shopify-Hmac-Sha256
 *         required: true
 *         schema:
 *           type: string
 *       - in: header
 *         name: X-Shopify-Webhook-Id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Webhook processed, skipped (unmapped item), or ignored as a duplicate
 *       401:
 *         description: Missing or invalid HMAC signature
 */
shopifyWebhooksRouter.post(
  "/webhooks/shopify/inventory_levels/update",
  rawJsonBody,
  verifyShopifyHmac,
  parseRawJsonBody,
  asyncHandler(async (req, res) => {
    const webhookEventId = req.get("X-Shopify-Webhook-Id");
    if (!webhookEventId) {
      res.status(400).json({ error: { message: "Missing X-Shopify-Webhook-Id header" } });
      return;
    }

    const parsed = inventoryLevelsUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ error: { message: "Invalid webhook payload", details: parsed.error.flatten() } });
      return;
    }
    const payload = parsed.data;
    const inventoryItemId = String(payload.inventory_item_id);
    const channel = await getShopifyChannel();

    const product = await prisma.product.findUnique({
      where: { shopifyInventoryItemId: inventoryItemId },
    });

    const log = await createReceivedLog({
      webhookEventId,
      eventType: "inventory_levels/update",
      sku: product?.sku ?? `inventory_item_id:${inventoryItemId}`,
      channelId: channel.id,
      payload,
    });

    if (!log) {
      res.status(200).json({ status: "duplicate_ignored" });
      return;
    }

    if (!product) {
      await prisma.syncLog.update({
        where: { id: log.id },
        data: {
          status: "skipped",
          message: `No product mapped to inventory_item_id ${inventoryItemId} yet — process a products/update webhook first`,
        },
      });
      res.status(200).json({ status: "skipped" });
      return;
    }

    await prisma.inventoryRecord.upsert({
      where: { productId_channelId: { productId: product.id, channelId: channel.id } },
      update: { quantity: payload.available, reportedAt: new Date() },
      create: { productId: product.id, channelId: channel.id, quantity: payload.available },
    });

    await prisma.syncLog.update({
      where: { id: log.id },
      data: { status: "success", message: `Updated ${product.sku} to ${payload.available}` },
    });

    res.status(200).json({ status: "processed" });
  }),
);
