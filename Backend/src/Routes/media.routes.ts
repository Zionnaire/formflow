import { Router, type IRouter } from 'express';
import { uploadSignatureHandler, uploadPhotoHandler } from '../Controllers/media.controller.js';
import { authenticate } from '../Middlewares/auth.js';
import { uploadImageMiddleware } from '../Middlewares/upload.js';

const router: IRouter = Router();

router.use(authenticate);

router.post('/signature', uploadImageMiddleware.single('file'), uploadSignatureHandler);
router.post('/photo', uploadImageMiddleware.single('file'), uploadPhotoHandler);

export { router as mediaRouter };
