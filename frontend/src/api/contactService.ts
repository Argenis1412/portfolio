/**
 * Contact mutation functions.
 * These are write operations (POST) that trigger side effects on the backend.
 */
import { buildApiUrl, ApiError, extractTraceId } from './client';
import type { ContactResponse } from './types';

// Re-export types so consumers can import from a single service file
export type { ContactResponse };

// â”€â”€â”€ Contact Form â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function postContact(
  data: {
    name: string;
    email: string;
    subject: string;
    message: string;
    website: string; // Honeypot field
    fax: string;     // Honeypot field
  },
  idempotencyKey: string,
): Promise<ContactResponse> {
  const apiUrl = buildApiUrl('/contact');

  const start = performance.now();
  const res = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Idempotency-Key': idempotencyKey,
    },
    body: JSON.stringify(data),
  });
  const durationMs = Math.round(performance.now() - start);

  const rawData = await res.json().catch(() => null);
  const traceId = extractTraceId(res, rawData);

  if (!res.ok) {
    throw new ApiError(res.status, `Failed to submit contact form: ${res.status}`, traceId);
  }

  return {
    traceId,
    durationMs,
    queueStatus: (rawData as Record<string, unknown>)?.queue_status as string | undefined,
    deliveryMode: (rawData as Record<string, unknown>)?.delivery_mode as string | undefined,
    downstream: (rawData as Record<string, unknown>)?.downstream as string | undefined,
    message: (rawData as Record<string, unknown>)?.message as string | undefined,
  };
}
