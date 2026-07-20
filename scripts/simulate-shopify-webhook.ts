import "dotenv/config";
import crypto from "node:crypto";
import { randomUUID } from "node:crypto";

const BASE_URL = process.env.API_BASE_URL ?? "http://localhost:3000";
const SECRET = process.env.SHOPIFY_WEBHOOK_SECRET ?? "dev-shopify-webhook-secret";

const topic = process.argv[2];
const sendTwice = process.argv.includes("--duplicate");

const payloads: Record<string, unknown> = {
  "products-update": {
    id: 632910392,
    title: "Widget — Small",
    variants: [
      {
        id: 808950810,
        sku: "ACME-001",
        inventory_item_id: 39072856,
        inventory_quantity: 75,
      },
    ],
  },
  "inventory-update": {
    inventory_item_id: 39072856,
    location_id: 655441491,
    available: 42,
  },
};

const routes: Record<string, string> = {
  "products-update": "/webhooks/shopify/products/update",
  "inventory-update": "/webhooks/shopify/inventory_levels/update",
};

if (!topic || !payloads[topic]) {
  console.error(`Usage: tsx scripts/simulate-shopify-webhook.ts <products-update|inventory-update> [--duplicate]`);
  process.exit(1);
}

async function send(webhookEventId: string) {
  const body = JSON.stringify(payloads[topic]);
  const hmac = crypto.createHmac("sha256", SECRET).update(body).digest("base64");

  const res = await fetch(`${BASE_URL}${routes[topic]}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Hmac-Sha256": hmac,
      "X-Shopify-Webhook-Id": webhookEventId,
    },
    body,
  });

  const json = await res.json();
  console.log(`[${res.status}]`, json);
}

async function main() {
  const webhookEventId = randomUUID();
  console.log(`Sending ${topic} webhook (id=${webhookEventId})...`);
  await send(webhookEventId);

  if (sendTwice) {
    console.log(`Re-sending same webhook id to verify duplicate is ignored...`);
    await send(webhookEventId);
  }
}

main();
