import { Router, type IRouter } from 'express';
import { listTemplatesHandler, getTemplateHandler } from '../Controllers/template.controller.js';
import { uploadFormHandler } from '../Controllers/upload.controller.js';
import { extractFieldsHandler } from '../Controllers/aiPipeline.controller.js';
import { authenticate } from '../Middlewares/auth.js';
import { validate } from '../Middlewares/validate.js';
import { aiPipelineRateLimiter } from '../Middlewares/rateLimiter.js';
import { uploadDocumentMiddleware } from '../Middlewares/upload.js';
import { ExtractFieldsSchema } from '../Validators/template.validators.js';

const router: IRouter = Router();

router.get('/', listTemplatesHandler);
router.get('/:id', getTemplateHandler);
router.post('/upload', authenticate, uploadDocumentMiddleware.single('file'), uploadFormHandler);
router.post('/extract-fields', authenticate, aiPipelineRateLimiter, validate(ExtractFieldsSchema), extractFieldsHandler);

export { router as templateRouter };
