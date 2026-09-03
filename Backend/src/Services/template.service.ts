import { FormTemplateModel, type IFormTemplate } from '../Models/FormTemplate.model.js';
import { ApiError } from '../Utils/errors.js';
import { logger } from '../Middlewares/logger.js';
import { downloadAsset } from './cloudinary.service.js';
import { extractFieldsFromPdf } from './groq.service.js';
import { extractPositionedText } from './pdfText.service.js';

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

  const { sections, fields } = await extractFieldsFromPdf(items, pageCount, title);

  const template = await FormTemplateModel.create({
    fileHash,
    title,
    pageCount,
    sourceCloudinaryId: cloudinaryId,
    fieldSchema: fields,
    sections,
    createdBy,
  });

  logger.info({ templateId: template._id.toString(), fieldCount: fields.length }, 'Template extracted and cached');
  return template;
}
