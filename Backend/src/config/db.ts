import mongoose from 'mongoose';
import { env } from './env.js';
import { logger } from '../Middlewares/logger.js';

let isConnected = false;

const CONNECT_OPTS = {
  serverSelectionTimeoutMS: 30_000,
  socketTimeoutMS: 45_000,
  maxPoolSize: 10,
} as const;

export async function connectDb(): Promise<void> {
  if (isConnected) return;

  mongoose.set('strictQuery', true);

  mongoose.connection.on('connected', () => {
    logger.info('MongoDB connected');
    isConnected = true;
  });

  mongoose.connection.on('disconnected', () => {
    logger.warn('MongoDB disconnected — will retry');
    isConnected = false;
  });

  mongoose.connection.on('error', (err) => {
    logger.error({ err }, 'MongoDB connection error');
  });

  const MAX_ATTEMPTS = 5;
  let delay = 3_000;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      await mongoose.connect(env.MONGODB_URI, CONNECT_OPTS);
      return;
    } catch (err) {
      logger.warn({ attempt, maxAttempts: MAX_ATTEMPTS, err }, 'MongoDB connect attempt failed');
      if (attempt === MAX_ATTEMPTS) throw err;
      logger.info({ delayMs: delay }, 'Retrying MongoDB connection…');
      await new Promise((r) => setTimeout(r, delay));
      delay = Math.min(delay * 2, 30_000);
    }
  }
}

export async function disconnectDb(): Promise<void> {
  if (!isConnected) return;
  await mongoose.disconnect();
  isConnected = false;
  logger.info('MongoDB disconnected cleanly');
}
