import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../lib/asyncHandler";
import { prisma } from "../lib/prisma";
import { validateBody } from "../middleware/validate";

export const channelsRouter = Router();

const createChannelSchema = z.object({
  name: z.string().min(1),
  type: z.string().min(1),
  rateLimitPerSec: z.number().int().positive().optional(),
  isSourceOfTruth: z.boolean().optional(),
});

/**
 * @openapi
 * /channels:
 *   get:
 *     summary: List all channels
 *     tags: [Channels]
 *     responses:
 *       200:
 *         description: List of channels
 *   post:
 *     summary: Create a channel
 *     tags: [Channels]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, type]
 *             properties:
 *               name:
 *                 type: string
 *               type:
 *                 type: string
 *               rateLimitPerSec:
 *                 type: integer
 *               isSourceOfTruth:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Channel created
 */
channelsRouter
  .route("/channels")
  .get(
    asyncHandler(async (_req, res) => {
      const channels = await prisma.channel.findMany({ orderBy: { createdAt: "desc" } });
      res.status(200).json({ channels });
    }),
  )
  .post(
    validateBody(createChannelSchema),
    asyncHandler(async (req, res) => {
      const channel = await prisma.channel.create({ data: req.body });
      res.status(201).json({ channel });
    }),
  );
