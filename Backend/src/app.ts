import express, { type Application } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { pinoHttp } from 'pino-http';
import { env } from './config/env.js';
import { logger } from './Middlewares/logger.js';
import { generalRateLimiter } from './Middlewares/rateLimiter.js';
import { errorHandler, notFoundHandler } from './Middlewares/errorHandler.js';
import { authRouter } from './Routes/auth.routes.js';
import { templateRouter } from './Routes/template.routes.js';
import { submissionRouter } from './Routes/submission.routes.js';
import { shareRouter } from './Routes/share.routes.js';
import { mediaRouter } from './Routes/media.routes.js';

const app: Application = express();

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https://res.cloudinary.com'],
        connectSrc: ["'self'"],
      },
    },
  }),
);

app.use(
  cors({
    origin: env.ALLOWED_ORIGINS,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }),
);

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: false, limit: '2mb' }));
app.use(cookieParser());

app.use(
  pinoHttp({
    logger,
    customLogLevel: (_req, res) => {
      if (res.statusCode >= 500) return 'error';
      if (res.statusCode >= 400) return 'warn';
      return 'info';
    },
    redact: ['req.headers.cookie', 'req.headers.authorization'],
  }),
);

app.use('/api/v1', generalRateLimiter);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'formflow-backend', timestamp: new Date().toISOString() });
});

app.use('/api/v1/auth', authRouter);
app.use('/api/v1/templates', templateRouter);
app.use('/api/v1/submissions', submissionRouter);
app.use('/api/v1/fill', shareRouter);
app.use('/api/v1/media', mediaRouter);

app.use(notFoundHandler);
app.use(errorHandler);

export { app };
