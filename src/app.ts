import cors from "cors";
import express from "express";
import helmet from "helmet";
import swaggerUi from "swagger-ui-express";
import { swaggerSpec } from "./lib/swagger";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";
import { authRouter } from "./routes/auth";
import { channelsRouter } from "./routes/channels";
import { healthRouter } from "./routes/health";
import { inventoryRouter } from "./routes/inventory";
import { productsRouter } from "./routes/products";
import { vendorsRouter } from "./routes/vendors";

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors());
  app.use(express.json());

  app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

  app.use(healthRouter);
  app.use(authRouter);
  app.use(vendorsRouter);
  app.use(channelsRouter);
  app.use(productsRouter);
  app.use(inventoryRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
