import mongoose from "mongoose";
import { app } from "./app.js";
import { env } from "./config/env.js";
import { logger } from "./lib/logger.js";

async function bootstrap(): Promise<void> {
  await mongoose.connect(env.MONGODB_URI, {
    serverSelectionTimeoutMS: 5_000,
  });

  const server = app.listen(env.API_PORT, env.API_HOST, () => {
    logger.info({ port: env.API_PORT, host: env.API_HOST }, "CivicNexus API is listening");
  });

  const shutdown = async (signal: string): Promise<void> => {
    logger.info({ signal }, "Shutdown requested");
    server.close(async (error) => {
      if (error) {
        logger.error({ error }, "HTTP server shutdown failed");
        process.exitCode = 1;
      }
      await mongoose.disconnect();
      process.exit();
    });
  };

  process.once("SIGINT", () => void shutdown("SIGINT"));
  process.once("SIGTERM", () => void shutdown("SIGTERM"));
}

bootstrap().catch((error: unknown) => {
  logger.fatal({ error }, "CivicNexus API failed to start");
  process.exit(1);
});