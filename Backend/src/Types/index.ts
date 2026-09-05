/**
 * Shared type vocabulary for the FormFlow API.
 * Mirrors FormFlow_System_Design_Brief.md sections 2, 4 and 5 — keep this
 * file in sync with that brief when the data model evolves.
 */

/** Section-level roles a multi-party form can route to. */
export type PartyRole =
  | 'owner'
  | 'field_supervisor'
  | 'university_supervisor'
  | 'hod'
  | 'guardian'
  | 'multi';

export interface JWTPayload {
  sub: string;
  email: string;
  [key: string]: unknown;
}

/** Section 5 — field type vocabulary shared by Groq-based extraction and the renderer. */
export type FieldType =
  | 'text'
  | 'date'
  | 'checkbox'
  | 'rating_grid'
  | 'long_text_ruled'
  | 'signature'
  | 'stamp'
  | 'computed';

/**
 * Fractions of page width/height (0-1), origin top-left — not absolute PDF points.
 * Services/pdfText.service.ts extracts each PDF text run's position in this same fraction
 * space, Groq reasons about field position from that layout (Services/groq.service.ts), and
 * Services/pdf.service.ts converts back to PDF-lib's bottom-left point space per page at
 * generation time.
 */
export interface FieldCoordinates {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface FieldDefinition {
  id: string;
  type: FieldType;
  label: string;
  sectionId: string;
  page: number;
  coordinates: FieldCoordinates;
  required: boolean;
  /** The instructional sentence(s) printed under a section/field heading in the source PDF (e.g. "Provide a brief overview of your internship…") — shown to the user as guidance, distinct from the short field label. */
  helpText?: string;
  ruledLineCount?: number;
  /**
   * Real printed ruled-line y positions on this field's page image, each as a fraction of page
   * height in the same top-left-origin space as `coordinates.y` — detected by scanning pixels
   * (Services/ruleDetection.service.ts), not guessed by the AI extraction pass. Only meaningful
   * for `long_text_ruled` fields. Absent (or too short to be useful) means detection found no
   * reliable rules for this field, and pdf.service.ts falls back to its lineHeight/masking logic.
   */
  detectedRuleYPositions?: number[];
  gridCriteria?: string[];
  gridOptions?: string[];
  /**
   * Human-corrected per-cell centers for a `rating_grid` field, keyed by exact criterion then
   * exact option string. Each {x,y} is a fraction of the full page — same top-left-origin space
   * as `coordinates` — set by a person clicking/dragging a cell marker in the field-position
   * editor (Services/template.service.ts updateGridCellOverride), not computed. pdf.service.ts's
   * drawRatingGrid checks here first for a given criterion+option pair before falling back to its
   * own text-anchored row / uniform-division column computation.
   */
  gridCellOverrides?: Record<string, Record<string, { x: number; y: number }>>;
  computeFrom?: string[];
}

export interface FormSection {
  sectionId: string;
  label: string;
  role: PartyRole;
  pageRange: [number, number];
}

/**
 * One page of a template's source PDF, rasterized once at upload time and cached in Cloudinary —
 * the canonical visual reference every geometry-dependent feature (the field-position editor,
 * ruled-line detection) measures against, instead of each one re-deriving its own notion of "the
 * page" from the live PDF. FieldDefinition.coordinates stays a fraction of page width/height
 * exactly as before (resolution-independent by construction), so nothing that already consumes
 * it needs to change — width/height here just resolve what a fraction actually points to in
 * pixels for anything that needs to draw on or analyze this specific image.
 */
export interface PageImage {
  page: number;
  cloudinaryPublicId: string;
  width: number;
  height: number;
}

export interface ApiSuccess<T> {
  success: true;
  data: T;
  meta?: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

export interface ApiFailure {
  success: false;
  error: {
    code: string;
    message: string;
    fieldErrors?: Record<string, string[]>;
  };
}

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

export const API_ERROR_CODES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  TOKEN_INVALID: 'TOKEN_INVALID',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',
  RATE_LIMITED: 'RATE_LIMITED',
  CONFLICT: 'CONFLICT',
  NOT_IMPLEMENTED: 'NOT_IMPLEMENTED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

export type ApiErrorCode = (typeof API_ERROR_CODES)[keyof typeof API_ERROR_CODES];
