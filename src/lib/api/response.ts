import { NextResponse } from "next/server";

interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  meta?: PaginationMeta | Record<string, unknown>;
}

/**
 * Create a standardized success response
 */
export function apiSuccess<T>(
  data: T,
  status: number = 200,
  meta?: PaginationMeta | Record<string, unknown>
): NextResponse<ApiSuccessResponse<T>> {
  const response: ApiSuccessResponse<T> = {
    success: true,
    data,
  };

  if (meta) {
    response.meta = meta;
  }

  return NextResponse.json(response, { status });
}

/**
 * Create a paginated response
 */
export function apiPaginated<T>(
  data: T[],
  pagination: { page: number; limit: number; total: number }
): NextResponse<ApiSuccessResponse<T[]>> {
  return apiSuccess(data, 200, {
    page: pagination.page,
    limit: pagination.limit,
    total: pagination.total,
    totalPages: Math.ceil(pagination.total / pagination.limit),
  });
}

/**
 * Create a created response (201)
 */
export function apiCreated<T>(data: T): NextResponse<ApiSuccessResponse<T>> {
  return apiSuccess(data, 201);
}

/**
 * Create a deleted response
 */
export function apiDeleted(id: string): NextResponse<ApiSuccessResponse<{ id: string }>> {
  return apiSuccess({ id }, 200);
}
