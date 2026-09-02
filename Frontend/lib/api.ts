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
  primaryProfile: ApiUserProfile;
  secondaryProfiles: ApiSecondaryProfile[];
  mediaAssets: {
    signatureUrl?: string;
    passportPhotoUrl?: string;
  };
  createdAt: string;
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

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
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
};
