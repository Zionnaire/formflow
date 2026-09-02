import { FormTemplateModel, type IFormTemplate } from '../Models/FormTemplate.model.js';
import { ApiError } from '../Utils/errors.js';

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
