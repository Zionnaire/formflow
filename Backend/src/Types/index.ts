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

/** Section 5 — field type vocabulary shared by Claude extraction and the renderer. */
export type FieldType =
  | 'text'
  | 'date'
  | 'checkbox'
  | 'rating_grid'
  | 'long_text_ruled'
  | 'signature'
  | 'stamp'
  | 'computed';

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
  ruledLineCount?: number;
  gridCriteria?: string[];
  gridOptions?: string[];
  computeFrom?: string[];
}

export interface FormSection {
  sectionId: string;
  label: string;
  role: PartyRole;
  pageRange: [number, number];
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
