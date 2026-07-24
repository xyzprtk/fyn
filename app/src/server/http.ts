export function jsonError(status: number, error: string): Response {
  return Response.json({ error }, { status });
}

/** Parse a JSON object body; returns null for malformed JSON or non-objects. */
export async function readJson(
  request: Request,
): Promise<Record<string, unknown> | null> {
  try {
    const value: unknown = await request.json();
    if (value && typeof value === "object" && !Array.isArray(value)) {
      return value as Record<string, unknown>;
    }
    return null;
  } catch {
    return null;
  }
}

/** Extract a string error code from an api error response body. */
export function errorCode(data: unknown): string | null {
  if (data && typeof data === "object" && "error" in data) {
    const { error } = data as { error: unknown };
    return typeof error === "string" ? error : null;
  }
  return null;
}
