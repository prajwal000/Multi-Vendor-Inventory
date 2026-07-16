import { Router } from "express";
import { asyncHandler } from "../lib/asyncHandler";
import { prisma } from "../lib/prisma";

export const inventoryRouter = Router();

/**
 * @openapi
 * /inventory/{sku}:
 *   get:
 *     summary: Get inventory records for a SKU across all channels
 *     tags: [Inventory]
 *     parameters:
 *       - in: path
 *         name: sku
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Inventory records for the SKU
 *       404:
 *         description: Product not found
 */
inventoryRouter.get(
  "/inventory/:sku",
  asyncHandler(async (req, res) => {
    const product = await prisma.product.findUnique({
      where: { sku: req.params.sku },
      include: {
        inventoryRecords: { include: { channel: true }, orderBy: { reportedAt: "desc" } },
      },
    });

    if (!product) {
      res.status(404).json({ error: { message: "Product not found" } });
      return;
    }

    res.status(200).json({
      sku: product.sku,
      title: product.title,
      inventory: product.inventoryRecords.map((record) => ({
        channel: record.channel.name,
        quantity: record.quantity,
        reportedAt: record.reportedAt,
      })),
    });
  }),
);
