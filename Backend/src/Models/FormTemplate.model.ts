import mongoose, { type Document, type Model } from 'mongoose';
import type { FieldDefinition, FormSection, PageImage } from '../Types/index.js';

export interface IFormTemplate extends Document {
  _id: mongoose.Types.ObjectId;
  fileHash: string;
  title: string;
  description?: string;
  pageCount: number;
  sourceCloudinaryId: string;
  usageCount: number;
  isVerified: boolean;
  institution?: string;
  fieldSchema: FieldDefinition[];
  sections: FormSection[];
  /** The one number that defines every pageImages entry's pixel-to-PDF-point conversion (points = pixels * 72 / renderDPI) — absent on templates created before this feature (see template.service.ts's lazy backfill). */
  renderDPI?: number;
  pageImages?: PageImage[];
  createdBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const FieldDefinitionSchema = new mongoose.Schema<FieldDefinition>(
  {
    id: { type: String, required: true },
    type: {
      type: String,
      required: true,
      enum: ['text', 'date', 'checkbox', 'rating_grid', 'long_text_ruled', 'signature', 'stamp', 'computed'],
    },
    label: { type: String, required: true },
    sectionId: { type: String, required: true },
    page: { type: Number, required: true },
    coordinates: {
      x: { type: Number, required: true },
      y: { type: Number, required: true },
      width: { type: Number, required: true },
      height: { type: Number, required: true },
    },
    required: { type: Boolean, default: false },
    helpText: { type: String },
    ruledLineCount: { type: Number },
    detectedRuleYPositions: { type: [Number] },
    gridCriteria: { type: [String] },
    gridOptions: { type: [String] },
    // Keyed by arbitrary criterion/option strings from the source PDF, not a fixed shape —
    // Mixed is the natural fit for a nested map like this in Mongoose.
    gridCellOverrides: { type: mongoose.Schema.Types.Mixed },
    computeFrom: { type: [String] },
  },
  { _id: false },
);

const FormSectionSchema = new mongoose.Schema<FormSection>(
  {
    sectionId: { type: String, required: true },
    label: { type: String, required: true },
    role: {
      type: String,
      required: true,
      enum: ['owner', 'field_supervisor', 'university_supervisor', 'hod', 'guardian', 'multi'],
    },
    pageRange: { type: [Number], required: true },
  },
  { _id: false },
);

const PageImageSchema = new mongoose.Schema<PageImage>(
  {
    page: { type: Number, required: true },
    cloudinaryPublicId: { type: String, required: true },
    width: { type: Number, required: true },
    height: { type: Number, required: true },
  },
  { _id: false },
);

const FormTemplateSchema = new mongoose.Schema<IFormTemplate>(
  {
    fileHash: { type: String, required: true, unique: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    pageCount: { type: Number, required: true },
    sourceCloudinaryId: { type: String, required: true },
    usageCount: { type: Number, default: 0 },
    isVerified: { type: Boolean, default: false },
    institution: { type: String, trim: true },
    fieldSchema: { type: [FieldDefinitionSchema], default: [] },
    sections: { type: [FormSectionSchema], default: [] },
    renderDPI: { type: Number },
    pageImages: { type: [PageImageSchema] },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

FormTemplateSchema.index({ title: 'text', description: 'text' });
FormTemplateSchema.index({ usageCount: -1 });

export const FormTemplateModel: Model<IFormTemplate> = mongoose.model<IFormTemplate>(
  'FormTemplate',
  FormTemplateSchema,
);
