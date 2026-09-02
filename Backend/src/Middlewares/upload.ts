import multer from 'multer';

/** In-memory storage — files are streamed straight to Cloudinary, never touch disk. */
export const uploadImageMiddleware = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      cb(new Error('Only image uploads are allowed'));
      return;
    }
    cb(null, true);
  },
});

export const uploadDocumentMiddleware = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['application/pdf'];
    if (!allowed.includes(file.mimetype)) {
      cb(new Error('Only PDF uploads are allowed'));
      return;
    }
    cb(null, true);
  },
});
