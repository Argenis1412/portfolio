/**
 * Base HTTP client for the portfolio API.
 *
 * Responsibilities:
 *  - URL construction from VITE_API_URL environment variable
 *  - Centralized trace_id extraction (header → body fallback chain)
 *  - Zod schema validation on every GET response
 *  - Structured error reporting via ApiError
 */
import { z } from 'zod';

const configuredApiBaseUrl = import.meta.env.VITE_API_URL?.trim();
export const API_BASE_URL =
  configuredApiBaseUrl || (import.meta.env.DEV ? 'http://127.0.0.1:8000/api/v1' : '');

export function buildApiUrl(path: string): string {
  if (!API_BASE_URL) {
    throw new Error('VITE_API_URL is not configured');
  }
  return `${API_BASE_URL}${path}`;
}

// ─── Error Class ──────────────────────────────────────────────────────────────

export class ApiError extends Error {
  status: number;
  traceId?: string;

  constructor(status: number, message: string, traceId?: string) {
    super(message);
    this.status = status;
    this.traceId = traceId;
    this.name = 'ApiError';
  }
}

// ─── Generic GET with Zod validation ─────────────────────────────────────────

export async function apiGet<T>(
  path: string,
  schema: z.ZodSchema<T>,
  chaosPreset?: string,
): Promise<T> {
  const headers: Record<string, string> = {};
  if (chaosPreset) {
    headers['X-Chaos-Preset'] = chaosPreset;
  }

  const res = await fetch(buildApiUrl(path), { headers });

  // Parse body first so we can extract trace_id from error responses
  const rawData = await res.json().catch(() => null);

  // Fallback chain: response header → body field → undefined
  const traceId: string | undefined =
    res.headers.get('x-trace-id') ??
    (rawData as Record<string, unknown>)?.trace_id as string | undefined ??
    undefined;

  if (!res.ok) {
    console.error('[API ERROR]', { traceId, status: res.status, endpoint: path });
    throw new ApiError(
      res.status,
      `API request failed: ${res.status} ${res.statusText} (${path})`,
      traceId,
    );
  }

  // Zod contract validation
  const result = schema.safeParse(rawData);
  if (!result.success) {
    console.error(`[Zod Error] Critical contract violation in ${path}:`, result.error.format());
    throw new Error(`Schema validation failed for ${path}`);
  }

  return result.data;
}
