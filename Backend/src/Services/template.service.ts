import { FormTemplateModel, type IFormTemplate } from '../Models/FormTemplate.model.js';
import { SubmissionModel } from '../Models/Submission.model.js';
import { ApiError } from '../Utils/errors.js';
import { logger } from '../Middlewares/logger.js';
import { downloadAsset, uploadPageImage } from './cloudinary.service.js';
import { extractFieldsFromPdf } from './groq.service.js';
import { extractPositionedText } from './pdfText.service.js';
import { renderAllPagesToPngs, RENDER_DPI } from './pdfRender.service.js';
import type { FieldCoordinates, PageImage } from '../Types/index.js';

export async function listTemplates(search?: string): Promise<IFormTemplate[]> {
  const query = search ? { $text: { $search: search } } : {};
  return FormTemplateModel.find(query).sort({ usageCount: -1 }).limit(50);
}

export async function getTemplateById(id: string): Promise<IFormTemplate> {
  const template = await FormTemplateModel.findById(id);
  if (!template) throw new ApiError(404, 'Template not found', 'NOT_FOUND');
  return template;
}

export async function findTemplateByHash(fileHash: string): Promise<IFormTemplate | null> {
  return FormTemplateModel.findOne({ fileHash });
}

/**
 * Downloads the uploaded PDF, flattens it to positioned text (Groq's models are text-only —
 * no native PDF/vision input), sends that to Groq for field extraction, and caches the result
 * as a FormTemplate keyed by fileHash — a repeat upload of the same PDF skips extraction
 * entirely (brief section 6/8: "cheaper, easier to debug, lets cached templates skip
 * extraction").
 */
export async function extractAndCreateTemplate(
  fileHash: string,
  cloudinaryId: string,
  title: string,
  createdBy: string,
): Promise<IFormTemplate> {
  const existing = await findTemplateByHash(fileHash);
  if (existing) return existing;

  const bytes = await downloadAsset(cloudinaryId, 'raw');
  const { pageCount, items } = await extractPositionedText(bytes);

  // Fail fast with a clear, actionable message instead of sending Groq an empty layout — it
  // can't call the required tool with nothing to reason about, and its resulting 400 ("Tool
  // choice is required, but model did not call a tool") gives no hint that the real problem is
  // upstream (confirmed against a real scanned-looking upload). Zero extracted text runs from a
  // real PDF means there's no text layer at all — almost always a scanned image, not a bug in
  // how we're reading it.
  if (items.length === 0) {
    throw new ApiError(
      422,
      'No extractable text was found in this PDF. It may be a scanned image rather than a text-based document — try exporting it directly from the original word processor, or running it through OCR first.',
      'VALIDATION_ERROR',
    );
  }

  const { sections, fields } = await extractFieldsFromPdf(items, pageCount, title);

  // Rasterize every page once, now, at upload time — the canonical visual reference the
  // field-position editor and (eventually) ruled-line/rating-grid detection measure against,
  // instead of each feature re-deriving its own notion of "the page" later. FieldDefinition
  // coordinates stay fractions of page width/height exactly as before (resolution-independent by
  // construction) — pageImages just resolves what a fraction points to in pixels, for anything
  // that needs to draw on or analyze this specific image.
  const pageImages = await rasterizeAndUploadPages(bytes, fileHash);

  const template = await FormTemplateModel.create({
    fileHash,
    title,
    pageCount,
    sourceCloudinaryId: cloudinaryId,
    fieldSchema: fields,
    sections,
    renderDPI: RENDER_DPI,
    pageImages,
    createdBy,
  });

  logger.info({ templateId: template._id.toString(), fieldCount: fields.length, pages: pageImages.length }, 'Template extracted and cached');
  return template;
}

async function rasterizeAndUploadPages(pdfBytes: Buffer, fileHash: string): Promise<PageImage[]> {
  const rendered = await renderAllPagesToPngs(pdfBytes, RENDER_DPI);
  return Promise.all(
    rendered.map(async (page) => {
      const upload = await uploadPageImage(page.buffer, 'page-images', `${fileHash}-p${page.page}`);
      // Cloudinary's own reported width/height, not the pre-upload viewport values — pdfjs
      // viewport dimensions can be fractional (a PDF page's point size isn't always a round
      // number at a given DPI), while a real PNG's pixel dimensions are necessarily integers;
      // Cloudinary's response reflects what was actually rasterized and stored.
      return { page: page.page, cloudinaryPublicId: upload.publicId, width: upload.width ?? page.width, height: upload.height ?? page.height };
    }),
  );
}

/**
 * Serves a template page's rasterized reference image — the visual backdrop for the
 * field-position editor. Templates created before this feature shipped have no pageImages yet;
 * backfilled lazily on first request rather than via a separate migration script, matching how
 * every other schema addition in this codebase has been handled (see e.g.
 * Services/submission.service.ts's generatedPdfPublicId fallback).
 */
export async function getTemplatePagePreview(templateId: string, pageNumber: number): Promise<Buffer> {
  const template = await getTemplateById(templateId);

  let pageImages = template.pageImages;
  if (!pageImages || pageImages.length === 0) {
    const bytes = await downloadAsset(template.sourceCloudinaryId, 'raw');
    pageImages = await rasterizeAndUploadPages(bytes, template.fileHash);
    template.renderDPI = RENDER_DPI;
    template.pageImages = pageImages;
    await template.save();
    logger.info({ templateId, pages: pageImages.length }, 'Backfilled pageImages for a pre-existing template');
  }

  const entry = pageImages.find((p) => p.page === pageNumber);
  if (!entry) throw new ApiError(404, `This document has no page ${pageNumber}`, 'NOT_FOUND');
  return downloadAsset(entry.cloudinaryPublicId, 'image');
}

/**
 * Lets a student drag a misplaced field's box into the right spot instead of that needing an
 * engineering fix — the correction is saved on the template itself, so it's fixed for everyone
 * who fills out this same form from here on, not just the one submission that surfaced it.
 *
 * Scoped to users who have actually used this template (or created it) — anyone actively filling
 * this form can improve it for the next person, but a stranger who's never touched it can't.
 */
export async function updateFieldCoordinates(
  templateId: string,
  fieldId: string,
  userId: string,
  coordinates: FieldCoordinates,
): Promise<IFormTemplate> {
  const template = await getTemplateById(templateId);

  const isCreator = template.createdBy?.toString() === userId;
  const hasUsedTemplate = isCreator || (await SubmissionModel.exists({ formTemplateId: template._id, ownerId: userId }));
  if (!hasUsedTemplate) {
    throw new ApiError(403, "You need to have used this form before you can adjust its field positions", 'INSUFFICIENT_PERMISSIONS');
  }

  const field = template.fieldSchema.find((f) => f.id === fieldId);
  if (!field) throw new ApiError(404, 'Field not found on this template', 'NOT_FOUND');

  field.coordinates = coordinates;
  template.markModified('fieldSchema');
  await template.save();

  logger.info({ templateId, fieldId, userId }, 'Field position adjusted');
  return template;
}
