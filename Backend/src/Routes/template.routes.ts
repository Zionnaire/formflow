import { Router, type IRouter } from 'express';
import {
  listTemplatesHandler,
  getTemplateHandler,
  getTemplatePagePreviewHandler,
  updateFieldCoordinatesHandler,
} from '../Controllers/template.controller.js';
import { uploadFormHandler } from '../Controllers/upload.controller.js';
import { extractFieldsHandler } from '../Controllers/aiPipeline.controller.js';
import { authenticate } from '../Middlewares/auth.js';
import { validate } from '../Middlewares/validate.js';
import { aiPipelineRateLimiter } from '../Middlewares/rateLimiter.js';
import { uploadDocumentMiddleware } from '../Middlewares/upload.js';
import { ExtractFieldsSchema, UpdateFieldCoordinatesSchema } from '../Validators/template.validators.js';

const router: IRouter = Router();

router.get('/', listTemplatesHandler);
router.get('/:id', getTemplateHandler);
router.get('/:id/pages/:pageNumber/preview', getTemplatePagePreviewHandler);
router.post('/upload', authenticate, uploadDocumentMiddleware.single('file'), uploadFormHandler);
router.post('/extract-fields', authenticate, aiPipelineRateLimiter, validate(ExtractFieldsSchema), extractFieldsHandler);
router.patch(
  '/:id/fields/:fieldId',
  authenticate,
  validate(UpdateFieldCoordinatesSchema),
  updateFieldCoordinatesHandler,
);

export { router as templateRouter };
