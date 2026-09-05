import mongoose, { type Document, type Model } from 'mongoose';

export type SubmissionStatus = 'draft' | 'awaiting_others' | 'complete';

export interface SubmissionSignature {
  role: string;
  name: string;
  signedAt: Date;
  signatureUrl: string;
}

export interface SubmissionSection {
  filledBy?: mongoose.Types.ObjectId;
  data: Record<string, unknown>;
  completedAt?: Date;
  signatures?: SubmissionSignature[];
}

export interface ISubmission extends Document {
  _id: mongoose.Types.ObjectId;
  formTemplateId: mongoose.Types.ObjectId;
  ownerId: mongoose.Types.ObjectId;
  status: SubmissionStatus;
  sections: mongoose.Types.Map<SubmissionSection>;
  generatedPdfUrl?: string;
  /** Cloudinary public_id of the generated PDF — used by /download to re-fetch bytes server-side, since Cloudinary's raw+authenticated delivery can't reliably serve a signed URL with a real .pdf extension on it (a dot in the public_id gets parsed as a delivery format and breaks the signature). */
  generatedPdfPublicId?: string;
  lastEditedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const SubmissionSignatureSchema = new mongoose.Schema<SubmissionSignature>(
  {
    role: { type: String, required: true },
    name: { type: String, required: true },
    signedAt: { type: Date, required: true },
    signatureUrl: { type: String, required: true },
  },
  { _id: false },
);

const SubmissionSectionSchema = new mongoose.Schema<SubmissionSection>(
  {
    filledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    data: { type: mongoose.Schema.Types.Mixed, default: {} },
    completedAt: { type: Date },
    signatures: { type: [SubmissionSignatureSchema], default: undefined },
  },
  { _id: false },
);

const SubmissionSchema = new mongoose.Schema<ISubmission>(
  {
    formTemplateId: { type: mongoose.Schema.Types.ObjectId, ref: 'FormTemplate', required: true },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    status: { type: String, enum: ['draft', 'awaiting_others', 'complete'], default: 'draft' },
    sections: { type: Map, of: SubmissionSectionSchema, default: {} },
    generatedPdfUrl: { type: String },
    generatedPdfPublicId: { type: String },
    lastEditedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

SubmissionSchema.index({ ownerId: 1, status: 1 });
SubmissionSchema.index({ ownerId: 1, lastEditedAt: -1 });

export const SubmissionModel: Model<ISubmission> = mongoose.model<ISubmission>('Submission', SubmissionSchema);
