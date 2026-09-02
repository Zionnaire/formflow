import mongoose from 'mongoose';
import { env } from './env.js';
import { logger } from '../Middlewares/logger.js';

let isConnected = false;
let memoryServer: import('mongodb-memory-server').MongoMemoryServer | undefined;

const CONNECT_OPTS = {
  serverSelectionTimeoutMS: 30_000,
  socketTimeoutMS: 45_000,
  maxPoolSize: 10,
} as const;

/**
 * MONGODB_URI=memory spins up an ephemeral, in-process MongoDB (via mongodb-memory-server)
 * instead of connecting to a real one — zero setup for local dev, but nothing persists
 * across restarts. Point MONGODB_URI at Atlas or a local mongod for anything that should stick.
 */
async function resolveConnectionString(): Promise<string> {
  if (env.MONGODB_URI !== 'memory') return env.MONGODB_URI;

  const { MongoMemoryServer } = await import('mongodb-memory-server');
  memoryServer = await MongoMemoryServer.create();
  const uri = memoryServer.getUri('formflow_dev');
  logger.warn({ uri }, 'MONGODB_URI=memory — using an ephemeral in-memory database; data will not persist');
  return uri;
}

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

  const uri = await resolveConnectionString();

  const MAX_ATTEMPTS = 5;
  let delay = 3_000;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      await mongoose.connect(uri, CONNECT_OPTS);
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
  if (memoryServer) {
    await memoryServer.stop();
    memoryServer = undefined;
  }
  logger.info('MongoDB disconnected cleanly');
}
