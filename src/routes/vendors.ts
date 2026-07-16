import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../lib/asyncHandler";
import { prisma } from "../lib/prisma";
import { validateBody } from "../middleware/validate";

export const vendorsRouter = Router();

const createVendorSchema = z.object({
  name: z.string().min(1),
});

/**
 * @openapi
 * /vendors:
 *   get:
 *     summary: List all vendors
 *     tags: [Vendors]
 *     responses:
 *       200:
 *         description: List of vendors
 *   post:
 *     summary: Create a vendor
 *     tags: [Vendors]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name:
 *                 type: string
 *     responses:
 *       201:
 *         description: Vendor created
 */
vendorsRouter
  .route("/vendors")
  .get(
    asyncHandler(async (_req, res) => {
      const vendors = await prisma.vendor.findMany({ orderBy: { createdAt: "desc" } });
      res.status(200).json({ vendors });
    }),
  )
  .post(
    validateBody(createVendorSchema),
    asyncHandler(async (req, res) => {
      const vendor = await prisma.vendor.create({ data: req.body });
      res.status(201).json({ vendor });
    }),
  );
