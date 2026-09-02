import mongoose, { type Document, type Model } from 'mongoose';
import type { PartyRole } from '../Types/index.js';

export interface IShare extends Document {
  _id: mongoose.Types.ObjectId;
  submissionId: mongoose.Types.ObjectId;
  sectionId: string;
  token: string;
  role: PartyRole;
  expiresAt: Date;
  usedAt?: Date;
  createdAt: Date;
}

const ShareSchema = new mongoose.Schema<IShare>(
  {
    submissionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Submission', required: true },
    sectionId: { type: String, required: true },
    token: { type: String, required: true, unique: true },
    role: {
      type: String,
      required: true,
      enum: ['owner', 'field_supervisor', 'university_supervisor', 'hod', 'guardian', 'multi'],
    },
    expiresAt: { type: Date, required: true },
    usedAt: { type: Date },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

// TTL index — Mongo reaps expired share documents automatically.
ShareSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const ShareModel: Model<IShare> = mongoose.model<IShare>('Share', ShareSchema);
