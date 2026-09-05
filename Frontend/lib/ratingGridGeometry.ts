import type { FieldDefinition } from '@/lib/api';

export interface CellCoord {
  x: number;
  y: number;
}

/**
 * Same uniform-division fallback pdf.service.ts's drawRatingGrid computes server-side (see
 * Backend's Services/pdf.service.ts), so an uncorrected cell marker — in the field-position
 * editor, or the fill canvas — starts out exactly where the generated PDF would actually mark it.
 * Shared by both so the geometry can't drift between "where a person sees the mark land" and
 * "where it actually lands".
 */
export function defaultCellCenter(field: FieldDefinition, criterionIndex: number, optionIndex: number): CellCoord {
  const criteriaCount = field.gridCriteria?.length ?? 1;
  const optionsCount = field.gridOptions?.length ?? 1;
  const colWidth = field.coordinates.width / (optionsCount + 1); // +1 for the criteria-label column
  const rowHeight = field.coordinates.height / criteriaCount;
  return {
    x: field.coordinates.x + (optionIndex + 1.5) * colWidth,
    y: field.coordinates.y + (criterionIndex + 0.5) * rowHeight,
  };
}

/** Checks a gridCellOverrides map first, falling back to the computed uniform default. */
export function getCellCenter(
  field: FieldDefinition,
  overrides: Record<string, Record<string, CellCoord>> | undefined,
  criterion: string,
  option: string,
  criterionIndex: number,
  optionIndex: number,
): CellCoord {
  return overrides?.[criterion]?.[option] ?? defaultCellCenter(field, criterionIndex, optionIndex);
}
