import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../lib/asyncHandler";
import { prisma } from "../lib/prisma";
import { validateBody } from "../middleware/validate";

export const productsRouter = Router();

const createProductSchema = z.object({
  sku: z.string().min(1),
  title: z.string().min(1),
  vendorId: z.string().uuid(),
});

/**
 * @openapi
 * /products:
 *   get:
 *     summary: List all products
 *     tags: [Products]
 *     responses:
 *       200:
 *         description: List of products
 *   post:
 *     summary: Create a product
 *     tags: [Products]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [sku, title, vendorId]
 *             properties:
 *               sku:
 *                 type: string
 *               title:
 *                 type: string
 *               vendorId:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       201:
 *         description: Product created
 *       404:
 *         description: Vendor not found
 */
productsRouter
  .route("/products")
  .get(
    asyncHandler(async (_req, res) => {
      const products = await prisma.product.findMany({
        include: { vendor: true },
        orderBy: { createdAt: "desc" },
      });
      res.status(200).json({ products });
    }),
  )
  .post(
    validateBody(createProductSchema),
    asyncHandler(async (req, res) => {
      const vendor = await prisma.vendor.findUnique({ where: { id: req.body.vendorId } });
      if (!vendor) {
        res.status(404).json({ error: { message: "Vendor not found" } });
        return;
      }

      const product = await prisma.product.create({ data: req.body });
      res.status(201).json({ product });
    }),
  );
