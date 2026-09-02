import { Router, type IRouter } from 'express';
import {
  registerHandler,
  loginHandler,
  refreshHandler,
  logoutHandler,
  getMeHandler,
  updateProfileHandler,
} from '../Controllers/auth.controller.js';
import { authenticate } from '../Middlewares/auth.js';
import { validate } from '../Middlewares/validate.js';
import { authRateLimiter } from '../Middlewares/rateLimiter.js';
import { RegisterSchema, LoginSchema, UpdateProfileSchema } from '../Validators/auth.validators.js';

const router: IRouter = Router();

router.post('/register', authRateLimiter, validate(RegisterSchema), registerHandler);
router.post('/login', authRateLimiter, validate(LoginSchema), loginHandler);
router.post('/token/refresh', refreshHandler);
router.post('/logout', authenticate, logoutHandler);
router.get('/me', authenticate, getMeHandler);
router.patch('/profile', authenticate, validate(UpdateProfileSchema), updateProfileHandler);

export { router as authRouter };
