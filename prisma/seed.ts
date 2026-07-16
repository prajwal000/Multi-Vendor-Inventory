import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const vendor = await prisma.vendor.upsert({
    where: { id: "00000000-0000-0000-0000-000000000001" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-000000000001",
      name: "Acme Supply Co.",
    },
  });

  const shopify = await prisma.channel.upsert({
    where: { name: "Shopify" },
    update: {},
    create: {
      name: "Shopify",
      type: "shopify",
      rateLimitPerSec: 4,
      isSourceOfTruth: true,
    },
  });

  const marketplaceX = await prisma.channel.upsert({
    where: { name: "MarketplaceX" },
    update: {},
    create: {
      name: "MarketplaceX",
      type: "marketplace-x",
      rateLimitPerSec: 2,
      isSourceOfTruth: false,
    },
  });

  const products = await Promise.all(
    [
      { sku: "ACME-001", title: "Widget — Small" },
      { sku: "ACME-002", title: "Widget — Large" },
      { sku: "ACME-003", title: "Widget — Deluxe" },
    ].map((product) =>
      prisma.product.upsert({
        where: { sku: product.sku },
        update: {},
        create: { ...product, vendorId: vendor.id },
      }),
    ),
  );

  for (const product of products) {
    await prisma.inventoryRecord.upsert({
      where: { productId_channelId: { productId: product.id, channelId: shopify.id } },
      update: {},
      create: { productId: product.id, channelId: shopify.id, quantity: 100 },
    });
    await prisma.inventoryRecord.upsert({
      where: { productId_channelId: { productId: product.id, channelId: marketplaceX.id } },
      update: {},
      create: { productId: product.id, channelId: marketplaceX.id, quantity: 100 },
    });
  }

  console.log(`Seeded 1 vendor, 2 channels, ${products.length} products.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
