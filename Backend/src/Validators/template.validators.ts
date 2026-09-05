import { z } from 'zod';

export const ExtractFieldsSchema = z.object({
  fileHash: z.string().min(1),
  cloudinaryId: z.string().min(1),
  title: z.string().min(1),
});

// Coordinates are fractions of page width/height — not clamped strictly to [0,1] since a field
// dragged slightly past an edge (e.g. into a margin) is still a meaningful, valid position.
const fraction = z.coerce.number().min(-0.2).max(1.2);
export const UpdateFieldCoordinatesSchema = z.object({
  coordinates: z.object({
    x: fraction,
    y: fraction,
    width: z.coerce.number().min(0.005).max(1.4),
    height: z.coerce.number().min(0.002).max(1.4),
  }),
});

export const UpdateGridCellOverrideSchema = z.object({
  criterion: z.string().min(1),
  option: z.string().min(1),
  x: fraction,
  y: fraction,
});
