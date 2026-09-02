import type { ApiResponse, ApiErrorCode } from '../Types/index.js';

export function createApiSuccess<T>(data: T): ApiResponse<T> {
  return { success: true, data };
}

export function createApiError(
  code: ApiErrorCode | string,
  message: string,
  fieldErrors?: Record<string, string[]>,
): ApiResponse<never> {
  return {
    success: false,
    error: { code, message, ...(fieldErrors && { fieldErrors }) },
  };
}

export function createPaginatedResponse<T>(data: T[], total: number, page: number, limit: number): ApiResponse<T[]> {
  return {
    success: true,
    data,
    meta: { total, page, limit, pages: Math.ceil(total / limit) },
  };
}
