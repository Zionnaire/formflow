import mongoose, { type Document, type Model } from 'mongoose';

export interface PrimaryProfile {
  fullName?: string;
  matricNumber?: string;
  department?: string;
  level?: string;
  phone?: string;
  email?: string;
  dateOfBirth?: Date;
  profilePhotoUrl?: string;
}

export interface SecondaryProfile {
  label: string;
  fullName: string;
  relationship?: string;
  phone?: string;
  email?: string;
}

export interface MediaAssets {
  signatureUrl?: string;
  passportPhotoUrl?: string;
}

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  email: string;
  passwordHash: string;
  primaryProfile: PrimaryProfile;
  secondaryProfiles: SecondaryProfile[];
  mediaAssets: MediaAssets;
  createdAt: Date;
  updatedAt: Date;
}

const PrimaryProfileSchema = new mongoose.Schema<PrimaryProfile>(
  {
    fullName: { type: String, trim: true },
    matricNumber: { type: String, trim: true },
    department: { type: String, trim: true },
    level: { type: String, trim: true },
    phone: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
    dateOfBirth: { type: Date },
    profilePhotoUrl: { type: String },
  },
  { _id: false },
);

const SecondaryProfileSchema = new mongoose.Schema<SecondaryProfile>(
  {
    label: { type: String, required: true, trim: true },
    fullName: { type: String, required: true, trim: true },
    relationship: { type: String, trim: true },
    phone: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
  },
  { _id: false },
);

const UserSchema = new mongoose.Schema<IUser>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    primaryProfile: { type: PrimaryProfileSchema, default: () => ({}) },
    secondaryProfiles: { type: [SecondaryProfileSchema], default: [] },
    mediaAssets: {
      type: {
        signatureUrl: { type: String },
        passportPhotoUrl: { type: String },
      },
      default: () => ({}),
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret: Record<string, unknown>) => {
        delete ret['passwordHash'];
        return ret;
      },
    },
  },
);

export const UserModel: Model<IUser> = mongoose.model<IUser>('User', UserSchema);
