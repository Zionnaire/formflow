import { FormTemplateModel, type IFormTemplate } from '../Models/FormTemplate.model.js';
import { SubmissionModel } from '../Models/Submission.model.js';
import { ApiError } from '../Utils/errors.js';
import { logger } from '../Middlewares/logger.js';
import { downloadAsset, uploadPageImage } from './cloudinary.service.js';
import { extractFieldsFromPdf } from './groq.service.js';
import { extractPositionedText } from './pdfText.service.js';
import { renderAllPagesToPngs, RENDER_DPI, type RenderedPage } from './pdfRender.service.js';
import { detectRuledLines } from './ruleDetection.service.js';
import type { FieldCoordinates, FieldDefinition, PageImage } from '../Types/index.js';

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
    // Instrumentation for the text-run-vs-vision-extraction question: log every upload that
    // fails this quality check, so a real, growing sample can eventually answer whether scanned
    // uploads are common enough to justify a vision-based fallback path, rather than guessing.
    logger.warn({ fileHash, title }, 'Extraction quality check failed: zero text runs extracted from upload');
    throw new ApiError(
      422,
      'No extractable text was found in this PDF. It may be a scanned image rather than a text-based document — try exporting it directly from the original word processor, or running it through OCR first.',
      'VALIDATION_ERROR',
    );
  }

  const { sections, fields } = await extractFieldsFromPdf(items, pageCount, title);

  // Same instrumentation for the other quality signal named in the extraction-vs-vision
  // question: a real form that has no checkbox fields at all is plausible, but is also exactly
  // what an extraction pass that couldn't resolve an unlabeled checkbox pattern would produce —
  // logging every occurrence is how that gets told apart from a real, growing sample instead of
  // a guess.
  const checkboxCount = fields.filter((f) => f.type === 'checkbox').length;
  if (checkboxCount === 0) {
    logger.warn({ fileHash, title, fieldCount: fields.length }, 'Extraction quality check failed: zero checkboxes extracted from upload');
  }

  // Rasterize every page once, now, at upload time — the canonical visual reference the
  // field-position editor and ruled-line detection measure against, instead of each feature
  // re-deriving its own notion of "the page" later. FieldDefinition coordinates stay fractions of
  // page width/height exactly as before (resolution-independent by construction) — pageImages
  // just resolves what a fraction points to in pixels, for anything that needs to draw on or
  // analyze this specific image.
  const { pageImages, rendered } = await rasterizeAndUploadPages(bytes, fileHash);
  detectRuledLinesForFields(fields, rendered);

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

async function rasterizeAndUploadPages(pdfBytes: Buffer, fileHash: string): Promise<{ pageImages: PageImage[]; rendered: RenderedPage[] }> {
  const rendered = await renderAllPagesToPngs(pdfBytes, RENDER_DPI);
  const pageImages = await Promise.all(
    rendered.map(async (page) => {
      const upload = await uploadPageImage(page.buffer, 'page-images', `${fileHash}-p${page.page}`);
      // Cloudinary's own reported width/height, not the pre-upload viewport values — pdfjs
      // viewport dimensions can be fractional (a PDF page's point size isn't always a round
      // number at a given DPI), while a real PNG's pixel dimensions are necessarily integers;
      // Cloudinary's response reflects what was actually rasterized and stored.
      return { page: page.page, cloudinaryPublicId: upload.publicId, width: upload.width ?? page.width, height: upload.height ?? page.height };
    }),
  );
  return { pageImages, rendered };
}

/**
 * Replaces AI-guessed `ruledLineCount` with real detected rule positions (Services/
 * ruleDetection.service.ts) for every long_text_ruled field, scanning each field's own pixel
 * region on its already-rendered page image — no extra rasterization pass needed, the buffers are
 * already in hand from rasterizeAndUploadPages. Mutates `fields` in place.
 */
function detectRuledLinesForFields(fields: FieldDefinition[], rendered: RenderedPage[]): void {
  for (const field of fields) {
    if (field.type !== 'long_text_ruled') continue;
    const page = rendered.find((p) => p.page === field.page);
    if (!page) continue;

    const detected = detectRuledLines(page.buffer, {
      x: field.coordinates.x * page.width,
      y: field.coordinates.y * page.height,
      width: field.coordinates.width * page.width,
      height: field.coordinates.height * page.height,
    });
    if (detected.length > 0) field.detectedRuleYPositions = detected;
  }
}

/**
 * Templates created before this feature shipped have no pageImages yet; backfilled lazily on
 * first request rather than via a separate migration script, matching how every other schema
 * addition in this codebase has been handled (see e.g. Services/submission.service.ts's
 * generatedPdfPublicId fallback). Shared by every reader of a template's page images — the
 * field-position editor's preview endpoint and a guest's share-link fill canvas alike — so a
 * template backfills exactly once no matter which one happens to touch it first.
 */
export async function ensurePageImages(template: IFormTemplate): Promise<PageImage[]> {
  if (template.pageImages && template.pageImages.length > 0) return template.pageImages;

  const bytes = await downloadAsset(template.sourceCloudinaryId, 'raw');
  const rasterized = await rasterizeAndUploadPages(bytes, template.fileHash);
  detectRuledLinesForFields(template.fieldSchema, rasterized.rendered);
  template.renderDPI = RENDER_DPI;
  template.pageImages = rasterized.pageImages;
  template.markModified('fieldSchema');
  await template.save();
  logger.info({ templateId: template._id.toString(), pages: rasterized.pageImages.length }, 'Backfilled pageImages for a pre-existing template');
  return rasterized.pageImages;
}

/** Serves a template page's rasterized reference image — the visual backdrop for the field-position editor and the fill canvas alike. */
export async function getTemplatePagePreview(templateId: string, pageNumber: number): Promise<Buffer> {
  const template = await getTemplateById(templateId);
  const pageImages = await ensurePageImages(template);

  const entry = pageImages.find((p) => p.page === pageNumber);
  if (!entry) throw new ApiError(404, `This document has no page ${pageNumber}`, 'NOT_FOUND');
  return downloadAsset(entry.cloudinaryPublicId, 'image');
}

/**
 * Anyone actively filling this form can improve it for the next person, but a stranger who's
 * never touched it can't — same scoping rule for every field-position-editor write.
 */
async function assertCanEditTemplate(template: IFormTemplate, userId: string): Promise<void> {
  const isCreator = template.createdBy?.toString() === userId;
  const hasUsedTemplate = isCreator || (await SubmissionModel.exists({ formTemplateId: template._id, ownerId: userId }));
  if (!hasUsedTemplate) {
    throw new ApiError(403, "You need to have used this form before you can adjust its field positions", 'INSUFFICIENT_PERMISSIONS');
  }
}

/**
 * Lets a student drag a misplaced field's box into the right spot instead of that needing an
 * engineering fix — the correction is saved on the template itself, so it's fixed for everyone
 * who fills out this same form from here on, not just the one submission that surfaced it.
 */
export async function updateFieldCoordinates(
  templateId: string,
  fieldId: string,
  userId: string,
  coordinates: FieldCoordinates,
): Promise<IFormTemplate> {
  const template = await getTemplateById(templateId);
  await assertCanEditTemplate(template, userId);

  const field = template.fieldSchema.find((f) => f.id === fieldId);
  if (!field) throw new ApiError(404, 'Field not found on this template', 'NOT_FOUND');

  field.coordinates = coordinates;
  template.markModified('fieldSchema');
  await template.save();

  logger.info({ templateId, fieldId, userId }, 'Field position adjusted');
  return template;
}

/**
 * Lets a person correct one rating_grid cell's exact mark position by clicking/dragging it in the
 * field-position editor, instead of trusting the uniform-column / text-anchored-row computation
 * every fillPdf call otherwise falls back to (see pdf.service.ts drawRatingGrid) — a per-cell
 * escape hatch for whichever cells the automatic placement still gets wrong, rather than an
 * all-or-nothing box like every other field type gets.
 */
export async function updateGridCellOverride(
  templateId: string,
  fieldId: string,
  userId: string,
  criterion: string,
  option: string,
  coordinates: { x: number; y: number },
): Promise<IFormTemplate> {
  const template = await getTemplateById(templateId);
  await assertCanEditTemplate(template, userId);

  const field = template.fieldSchema.find((f) => f.id === fieldId);
  if (!field) throw new ApiError(404, 'Field not found on this template', 'NOT_FOUND');
  if (field.type !== 'rating_grid') throw new ApiError(422, 'This field is not a rating grid', 'VALIDATION_ERROR');
  if (!field.gridCriteria?.includes(criterion) || !field.gridOptions?.includes(option)) {
    throw new ApiError(404, 'That criterion/option pair is not part of this rating grid', 'NOT_FOUND');
  }

  field.gridCellOverrides ??= {};
  field.gridCellOverrides[criterion] ??= {};
  field.gridCellOverrides[criterion]![option] = coordinates;
  template.markModified('fieldSchema');
  await template.save();

  logger.info({ templateId, fieldId, userId, criterion, option }, 'Rating grid cell position corrected');
  return template;
}
