import { Router, type IRouter } from 'express';
import {
  createSubmissionHandler,
  listSubmissionsHandler,
  getSubmissionHandler,
  patchSectionHandler,
} from '../Controllers/submission.controller.js';
import { createShareHandler } from '../Controllers/share.controller.js';
import { autoFillHandler, validateSubmissionHandler, generatePdfHandler, suggestFieldHandler } from '../Controllers/aiPipeline.controller.js';
import { authenticate } from '../Middlewares/auth.js';
import { validate } from '../Middlewares/validate.js';
import { aiPipelineRateLimiter } from '../Middlewares/rateLimiter.js';
import { CreateSubmissionSchema, PatchSectionSchema, CreateShareSchema } from '../Validators/submission.validators.js';

const router: IRouter = Router();

router.use(authenticate);

router.post('/', validate(CreateSubmissionSchema), createSubmissionHandler);
router.get('/', listSubmissionsHandler);
router.get('/:id', getSubmissionHandler);
router.patch('/:id/sections/:sectionId', validate(PatchSectionSchema), patchSectionHandler);
router.post('/:id/share', validate(CreateShareSchema), createShareHandler);
router.post('/:id/auto-fill', aiPipelineRateLimiter, autoFillHandler);
router.post('/:id/fields/:fieldId/suggest', aiPipelineRateLimiter, suggestFieldHandler);
router.post('/:id/validate', validateSubmissionHandler);
router.post('/:id/generate', aiPipelineRateLimiter, generatePdfHandler);

export { router as submissionRouter };
