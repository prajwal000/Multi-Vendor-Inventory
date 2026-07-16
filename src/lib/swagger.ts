import path from "node:path";
import swaggerJsdoc from "swagger-jsdoc";

const isTsRuntime = __filename.endsWith(".ts");

export const swaggerSpec = swaggerJsdoc({
  definition: {
    openapi: "3.0.3",
    info: {
      title: "Inventory Sync API",
      version: "0.1.0",
      description:
        "REST API for managing vendors, products, and inventory across multiple sales channels.",
    },
    servers: [{ url: "/" }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
  },
  apis: [path.join(__dirname, "..", "routes", `*.${isTsRuntime ? "ts" : "js"}`)],
});
