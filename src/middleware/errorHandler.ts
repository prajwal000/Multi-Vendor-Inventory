import { Prisma } from "@prisma/client";
import { NextFunction, Request, Response } from "express";

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({ error: { message: `Route not found: ${req.method} ${req.path}` } });
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  console.error(err);

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") {
      res
        .status(409)
        .json({
          error: { message: `A record with this ${err.meta?.target ?? "value"} already exists` },
        });
      return;
    }
    if (err.code === "P2025") {
      res.status(404).json({ error: { message: "Record not found" } });
      return;
    }
  }

  const message = err instanceof Error ? err.message : "Internal server error";
  res.status(500).json({ error: { message } });
}
