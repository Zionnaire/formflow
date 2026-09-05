/**
 * Thin fetch wrapper around the FormFlow API (Backend/src/app.ts). Every call sends
 * credentials so the httpOnly session cookies set by /auth/login|register are included.
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000/api/v1';

export interface ApiUserProfile {
  fullName?: string;
  matricNumber?: string;
  department?: string;
  level?: string;
  phone?: string;
  email?: string;
  dateOfBirth?: string;
}

export interface ApiSecondaryProfile {
  label: string;
  fullName: string;
  relationship?: string;
  phone?: string;
  email?: string;
}

export interface ApiUser {
  _id: string;
  email: string;
  /** Optional in the type (not just at runtime) so every access site is forced to guard it — the API contract guarantees an object here, but nothing stops that from drifting. */
  primaryProfile?: ApiUserProfile;
  secondaryProfiles?: ApiSecondaryProfile[];
  mediaAssets?: {
    signatureUrl?: string;
    passportPhotoUrl?: string;
  };
  createdAt: string;
}

export type FieldType = 'text' | 'date' | 'checkbox' | 'rating_grid' | 'long_text_ruled' | 'signature' | 'stamp' | 'computed';
export type PartyRole = 'owner' | 'field_supervisor' | 'university_supervisor' | 'hod' | 'guardian' | 'multi';

export interface FieldDefinition {
  id: string;
  type: FieldType;
  label: string;
  sectionId: string;
  page: number;
  coordinates: { x: number; y: number; width: number; height: number };
  required: boolean;
  helpText?: string;
  ruledLineCount?: number;
  gridCriteria?: string[];
  gridOptions?: string[];
  /** Human-corrected per-cell mark centers for a rating_grid field, keyed by criterion then option — same fraction-of-page space as `coordinates`. Set via api.updateGridCellOverride. */
  gridCellOverrides?: Record<string, Record<string, { x: number; y: number }>>;
  computeFrom?: string[];
}

export interface FormSectionDef {
  sectionId: string;
  label: string;
  role: PartyRole;
  pageRange: [number, number];
}

export interface SectionShareStatus {
  sectionId: string;
  role: PartyRole;
  hasActiveShare: boolean;
  completedAt?: string;
}

export interface ApiFormTemplate {
  _id: string;
  title: string;
  pageCount: number;
  usageCount: number;
  fieldSchema: FieldDefinition[];
  sections: FormSectionDef[];
  renderDPI?: number;
  pageImages?: Array<{ page: number; cloudinaryPublicId: string; width: number; height: number }>;
  createdAt: string;
}

export interface ApiSubmissionSection {
  data: Record<string, string>;
  completedAt?: string;
}

export interface ApiSubmission {
  _id: string;
  formTemplateId: string | ApiFormTemplate;
  ownerId: string;
  status: 'draft' | 'awaiting_others' | 'complete';
  sections: Record<string, ApiSubmissionSection>;
  generatedPdfUrl?: string;
  lastEditedAt: string;
  createdAt: string;
}

export interface ValidationResult {
  complete: boolean;
  missingFields: Array<{ id: string; label: string; sectionId: string }>;
}

export interface PublicShareView {
  sectionId: string;
  sectionLabel: string;
  role: PartyRole;
  studentName: string;
  fields: FieldDefinition[];
  expiresAt: string;
  templateId: string;
  templateTitle: string;
  pageImages: Array<{ page: number; cloudinaryPublicId: string; width: number; height: number }>;
}

export class ApiRequestError extends Error {
  status: number;
  fieldErrors?: Record<string, string[]>;

  constructor(status: number, message: string, fieldErrors?: Record<string, string[]>) {
    super(message);
    this.name = 'ApiRequestError';
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

interface ApiEnvelope<T> {
  success: boolean;
  data?: T;
  error?: { code: string; message: string; fieldErrors?: Record<string, string[]> };
}

/** The access-token cookie is short-lived (15m) — a shared in-flight promise means concurrent 401s trigger one refresh, not a stampede. */
let refreshInFlight: Promise<boolean> | null = null;

function refreshSession(): Promise<boolean> {
  if (!refreshInFlight) {
    refreshInFlight = fetch(`${API_URL}/auth/token/refresh`, { method: 'POST', credentials: 'include' })
      .then((res) => res.ok)
      .catch(() => false)
      .finally(() => {
        refreshInFlight = null;
      });
  }
  return refreshInFlight;
}

const AUTH_ENDPOINTS = new Set(['/auth/login', '/auth/register', '/auth/token/refresh', '/auth/logout']);

async function request<T>(path: string, options: RequestInit = {}, isRetry = false): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...options,
      credentials: 'include',
      headers: {
        ...(options.body && !(options.body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}),
        ...options.headers,
      },
    });
  } catch {
    throw new ApiRequestError(0, "Can't reach the FormFlow server. Is the backend running?");
  }

  // A 401 on anything other than the auth endpoints themselves usually just means the 15-minute
  // access token expired mid-session — refresh once via the httpOnly refresh cookie and retry,
  // rather than surfacing an error for something the user can't act on.
  if (res.status === 401 && !isRetry && !AUTH_ENDPOINTS.has(path)) {
    const refreshed = await refreshSession();
    if (refreshed) return request<T>(path, options, true);
  }

  const json = (await res.json().catch(() => null)) as ApiEnvelope<T> | null;

  if (!res.ok || !json?.success) {
    throw new ApiRequestError(res.status, json?.error?.message ?? `Request failed (${res.status})`, json?.error?.fieldErrors);
  }

  return json.data as T;
}

export const api = {
  register: (email: string, password: string, fullName?: string) =>
    request<{ user: ApiUser }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, fullName }),
    }),

  login: (email: string, password: string) =>
    request<{ user: ApiUser }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  logout: () => request<{ loggedOut: boolean }>('/auth/logout', { method: 'POST' }),

  me: () => request<{ user: ApiUser }>('/auth/me'),

  updateProfile: (patch: { primaryProfile?: Partial<ApiUserProfile>; secondaryProfiles?: ApiSecondaryProfile[] }) =>
    request<{ user: ApiUser }>('/auth/profile', {
      method: 'PATCH',
      body: JSON.stringify(patch),
    }),

  uploadPhoto: (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return request<{ passportPhotoUrl: string }>('/media/photo', { method: 'POST', body: form });
  },

  uploadSignature: (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return request<{ signatureUrl: string }>('/media/signature', { method: 'POST', body: form });
  },

  // ── Form templates & the AI pipeline ─────────────────────────────────────
  uploadTemplateFile: (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return request<{ fileHash: string; cloudinaryId: string; url: string; cached: boolean; template?: ApiFormTemplate }>(
      '/templates/upload',
      { method: 'POST', body: form },
    );
  },

  extractFields: (fileHash: string, cloudinaryId: string, title: string) =>
    request<{ template: ApiFormTemplate }>('/templates/extract-fields', {
      method: 'POST',
      body: JSON.stringify({ fileHash, cloudinaryId, title }),
    }),

  getTemplate: (id: string) => request<{ template: ApiFormTemplate }>(`/templates/${id}`),

  getTemplatePagePreviewUrl: (templateId: string, pageNumber: number) => `${API_URL}/templates/${templateId}/pages/${pageNumber}/preview`,

  updateFieldCoordinates: (templateId: string, fieldId: string, coordinates: FieldDefinition['coordinates']) =>
    request<{ template: ApiFormTemplate }>(`/templates/${templateId}/fields/${fieldId}`, {
      method: 'PATCH',
      body: JSON.stringify({ coordinates }),
    }),

  updateGridCellOverride: (templateId: string, fieldId: string, criterion: string, option: string, coords: { x: number; y: number }) =>
    request<{ template: ApiFormTemplate }>(`/templates/${templateId}/fields/${fieldId}/grid-cell`, {
      method: 'PATCH',
      body: JSON.stringify({ criterion, option, ...coords }),
    }),

  // ── Submissions ───────────────────────────────────────────────────────────
  createSubmission: (formTemplateId: string) =>
    request<{ submission: ApiSubmission }>('/submissions', {
      method: 'POST',
      body: JSON.stringify({ formTemplateId }),
    }),

  listSubmissions: () => request<{ submissions: ApiSubmission[] }>('/submissions'),

  getSubmission: (id: string) => request<{ submission: ApiSubmission }>(`/submissions/${id}`),

  patchSection: (id: string, sectionId: string, data: Record<string, string>) =>
    request<{ submission: ApiSubmission }>(`/submissions/${id}/sections/${sectionId}`, {
      method: 'PATCH',
      body: JSON.stringify({ data }),
    }),

  autoFillSubmission: (id: string) => request<{ submission: ApiSubmission }>(`/submissions/${id}/auto-fill`, { method: 'POST' }),

  suggestField: (submissionId: string, fieldId: string) =>
    request<{ value: string }>(`/submissions/${submissionId}/fields/${fieldId}/suggest`, { method: 'POST' }),

  validateSubmission: (id: string) => request<ValidationResult>(`/submissions/${id}/validate`, { method: 'POST' }),

  generateSubmission: (id: string) =>
    request<{ submission: ApiSubmission; downloadUrl: string; missingFields: ValidationResult['missingFields'] }>(
      `/submissions/${id}/generate`,
      { method: 'POST' },
    ),

  /**
   * The API streams the generated PDF itself (with a real application/pdf content type and a
   * friendly filename) rather than handing back a direct Cloudinary link — Cloudinary's
   * raw+authenticated delivery can't reliably serve a signed URL ending in a real .pdf extension,
   * so a direct link left browsers unable to tell it was a PDF and force-downloaded it instead of
   * previewing it.
   */
  getDownloadUrl: (submissionId: string) => `${API_URL}/submissions/${submissionId}/download`,

  emailSubmission: (submissionId: string, to: string, message?: string) =>
    request<{ sent: true }>(`/submissions/${submissionId}/email`, {
      method: 'POST',
      body: JSON.stringify({ to, message }),
    }),

  // ── Shared-fill links (multi-party sections — brief section 7.3) ──────────
  createShare: (submissionId: string, sectionId: string, role: PartyRole) =>
    request<{ share: { token: string }; url: string }>(`/submissions/${submissionId}/share`, {
      method: 'POST',
      body: JSON.stringify({ sectionId, role }),
    }),

  /** Real, server-persisted status per non-owner section — survives a reload, unlike a purely local "did I just click Get Link" flag. */
  listShares: (submissionId: string) => request<{ sections: SectionShareStatus[] }>(`/submissions/${submissionId}/shares`),

  /** Public — no session cookie needed, the token itself is the access grant. */
  resolveShare: (token: string) => request<{ share: PublicShareView }>(`/fill/${token}`),

  /** Public — same as above. */
  submitShare: (token: string, data: Record<string, string>) =>
    request<{ submitted: boolean }>(`/fill/${token}`, { method: 'POST', body: JSON.stringify({ data }) }),
};

/** A Mongo ObjectId is 24 hex chars — distinguishes a real submission id from the mock template slugs. */
export function isObjectId(value: string): boolean {
  return /^[0-9a-f]{24}$/i.test(value);
}
