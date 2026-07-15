import bcrypt from "bcryptjs";
import { Router } from "express";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { env } from "../lib/env";

export const authRouter = Router();

const testUserPasswordHash = bcrypt.hashSync(env.testUserPassword, 10);

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

authRouter.post("/auth/login", (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res
      .status(400)
      .json({ error: { message: "Invalid request body", details: parsed.error.flatten() } });
    return;
  }

  const { email, password } = parsed.data;
  const isValidUser =
    email === env.testUserEmail && bcrypt.compareSync(password, testUserPasswordHash);

  if (!isValidUser) {
    res.status(401).json({ error: { message: "Invalid credentials" } });
    return;
  }

  const token = jwt.sign({ sub: "seed-test-user", email }, env.jwtSecret, { expiresIn: "1h" });
  res.status(200).json({ token });
});
