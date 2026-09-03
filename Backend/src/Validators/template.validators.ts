import { z } from 'zod';

export const ExtractFieldsSchema = z.object({
  fileHash: z.string().min(1),
  cloudinaryId: z.string().min(1),
  title: z.string().min(1),
});
