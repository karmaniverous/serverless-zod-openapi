export type HttpResponse = {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
};

export const expectHttpJson = (
  res: unknown,
  expectedBody: unknown,
  expectedContentType = 'application/json',
): void => {
  const r = res as {
    statusCode?: number;
    body?: unknown;
    headers?: Record<string, string>;
  };
  if (r.statusCode !== 200) {
    throw new Error(
      `Expected statusCode 200, received ${String(r.statusCode)}`,
    );
  }
  const headers = r.headers ?? {};
  const ct = headers['Content-Type'] ?? headers['content-type'];
  if (ct !== expectedContentType) {
    throw new Error(
      `Expected Content-Type ${expectedContentType}, received ${String(ct)}`,
    );
  }
  const bodyStr = typeof r.body === 'string' ? r.body : JSON.stringify(r.body);
  if (bodyStr !== JSON.stringify(expectedBody)) {
    throw new Error(
      `Expected body ${JSON.stringify(expectedBody)}, received ${bodyStr}`,
    );
  }
};

/** Narrow a Middy request object (with optional response) to a typed HttpResponse. */
export const expectResponse = (req: {
  response?: HttpResponse;
}): HttpResponse => {
  if (!req.response) throw new Error('Expected response to be set');
  return req.response;
};
