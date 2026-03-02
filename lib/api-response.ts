// lib/api-response.ts
import { NextResponse } from "next/server";

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/**
 * Success response helper
 */
export function successResponse<T>(data: T, message?: string, status = 200): NextResponse<ApiResponse<T>> {
  return NextResponse.json(
    {
      success: true,
      data,
      message,
    },
    { status },
  );
}

/**
 * Error response helper
 */
export function errorResponse(error: string, status = 400): NextResponse<ApiResponse> {
  return NextResponse.json(
    {
      success: false,
      error,
    },
    { status },
  );
}

/**
 * Unauthorized response
 */
export function unauthorizedResponse(message = "Unauthorized"): NextResponse<ApiResponse> {
  return errorResponse(message, 401);
}

/**
 * Forbidden response
 */
export function forbiddenResponse(message = "Forbidden - Insufficient permissions"): NextResponse<ApiResponse> {
  return errorResponse(message, 403);
}

/**
 * Not found response
 */
export function notFoundResponse(message = "Resource not found"): NextResponse<ApiResponse> {
  return errorResponse(message, 404);
}

/**
 * Validation error response
 */
export function validationErrorResponse(errors: Record<string, string>): NextResponse<ApiResponse> {
  return NextResponse.json(
    {
      success: false,
      error: "Validation failed",
      data: errors,
    },
    { status: 422 },
  );
}
