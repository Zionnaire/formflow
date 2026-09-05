import { z } from 'zod';

export const CreateSubmissionSchema = z.object({
  formTemplateId: z.string().min(1),
});

export const PatchSectionSchema = z.object({
  data: z.record(z.unknown()),
});

export const CreateShareSchema = z.object({
  sectionId: z.string().min(1),
  role: z.enum(['owner', 'field_supervisor', 'university_supervisor', 'hod', 'guardian', 'multi']),
});

export const SubmitShareSchema = z.object({
  data: z.record(z.unknown()),
});

export const EmailSubmissionSchema = z.object({
  to: z.string().email(),
  message: z.string().trim().max(2000).optional(),
});
