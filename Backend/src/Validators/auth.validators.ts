import { z } from 'zod';

export const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  fullName: z.string().min(1).optional(),
});

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const PrimaryProfileSchema = z.object({
  fullName: z.string().trim().min(1).optional(),
  matricNumber: z.string().trim().min(1).optional(),
  department: z.string().trim().min(1).optional(),
  level: z.string().trim().min(1).optional(),
  phone: z.string().trim().min(1).optional(),
  email: z.string().trim().email().optional(),
  dateOfBirth: z.coerce.date().optional(),
});

const SecondaryProfileSchema = z.object({
  label: z.string().trim().min(1),
  fullName: z.string().trim().min(1),
  relationship: z.string().trim().optional(),
  phone: z.string().trim().optional(),
  email: z.string().trim().email().optional(),
});

export const UpdateProfileSchema = z.object({
  primaryProfile: PrimaryProfileSchema.optional(),
  secondaryProfiles: z.array(SecondaryProfileSchema).optional(),
});
