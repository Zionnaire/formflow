import { Router, type IRouter } from 'express';
import { listTemplatesHandler, getTemplateHandler } from '../Controllers/template.controller.js';
import { uploadFormHandler } from '../Controllers/upload.controller.js';
import { extractFieldsHandler } from '../Controllers/aiPipeline.controller.js';
import { authenticate } from '../Middlewares/auth.js';
import { uploadDocumentMiddleware } from '../Middlewares/upload.js';

const router: IRouter = Router();

router.get('/', listTemplatesHandler);
router.get('/:id', getTemplateHandler);
router.post('/upload', authenticate, uploadDocumentMiddleware.single('file'), uploadFormHandler);
router.post('/extract-fields', authenticate, extractFieldsHandler);

export { router as templateRouter };
