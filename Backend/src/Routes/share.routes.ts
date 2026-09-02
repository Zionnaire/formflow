import { Router, type IRouter } from 'express';
import { resolveShareHandler, submitShareHandler } from '../Controllers/share.controller.js';
import { validate } from '../Middlewares/validate.js';
import { authRateLimiter } from '../Middlewares/rateLimiter.js';
import { SubmitShareSchema } from '../Validators/submission.validators.js';

const router: IRouter = Router();

// Token-scoped — no login required, deliberately public per brief section 2.
router.get('/:token', authRateLimiter, resolveShareHandler);
router.post('/:token', authRateLimiter, validate(SubmitShareSchema), submitShareHandler);

export { router as shareRouter };
