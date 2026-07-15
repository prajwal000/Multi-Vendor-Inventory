import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../lib/env";

export interface AuthedRequest extends Request {
  user?: { sub: string; email: string };
}

export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ error: { message: "Missing or malformed Authorization header" } });
    return;
  }

  const token = header.slice("Bearer ".length);
  try {
    const payload = jwt.verify(token, env.jwtSecret) as { sub: string; email: string };
    req.user = payload;
    next();
  } catch {
    res.status(401).json({ error: { message: "Invalid or expired token" } });
  }
}
