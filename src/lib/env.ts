import "dotenv/config";

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  port: Number(process.env.PORT ?? 3000),
  nodeEnv: process.env.NODE_ENV ?? "development",
  databaseUrl: required(
    "DATABASE_URL",
    "postgresql://postgres:postgres@localhost:5432/inventory_sync",
  ),
  redisUrl: required("REDIS_URL", "redis://localhost:6379"),
  jwtSecret: required("JWT_SECRET", "dev-secret-change-me"),
  testUserEmail: process.env.TEST_USER_EMAIL ?? "admin@example.com",
  testUserPassword: process.env.TEST_USER_PASSWORD ?? "password123",
};
