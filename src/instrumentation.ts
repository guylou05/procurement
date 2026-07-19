/**
 * Next.js instrumentation hook. In production, errors thrown during Server Component
 * rendering are redacted before being sent to the client (only a `digest` survives) —
 * this is the one place the full original error, with message and stack, is still
 * available. Logging it here means Railway's runtime logs show the real cause instead
 * of just a digest.
 */
export async function onRequestError(
  err: unknown,
  request: { path: string; method: string },
): Promise<void> {
  console.error(`[request-error] ${request.method} ${request.path}:`, err);
}
