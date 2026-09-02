import 'dotenv/config';
import { app } from './app.js';
import { connectDb, disconnectDb } from './config/db.js';
import { logger } from './Middlewares/logger.js';
import { env } from './config/env.js';

process.on('uncaughtException', (err) => {
  logger.error({ err }, 'Uncaught exception — exiting');
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  logger.error({ reason }, 'Unhandled promise rejection — exiting');
  process.exit(1);
});

async function start() {
  const server = app.listen(env.PORT, () => {
    logger.info({ port: env.PORT, env: env.NODE_ENV }, 'FormFlow server started');
  });

  try {
    await connectDb();
  } catch (err) {
    logger.error({ err }, 'MongoDB failed to connect after all retries — DB routes will be unavailable');
  }

  async function shutdown(signal: string) {
    logger.info({ signal }, 'Shutdown signal received');
    server.close(async () => {
      await disconnectDb();
      logger.info('Shutdown complete');
      process.exit(0);
    });

    setTimeout(() => {
      logger.error('Graceful shutdown timeout — forcing exit');
      process.exit(1);
    }, 10_000).unref();
  }

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
}

void start();
