import {
  DEFAULT_ARCHIVIST_MODEL,
  MAX_ARCHIVIST_PAYLOAD_BYTES,
  defaultArchivistRateLimiter,
  extractClientIp,
  handleArchivistRequest,
} from '../server/archivistCore';

interface VercelLikeRequest {
  method?: string;
  body?: unknown;
  headers?: Record<string, string | string[] | undefined>;
  socket?: { remoteAddress?: string };
}

interface VercelLikeResponse {
  status: (code: number) => VercelLikeResponse;
  json: (body: unknown) => void;
  setHeader: (name: string, value: string) => void;
}

export default async function handler(req: VercelLikeRequest, res: VercelLikeResponse) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  if (req.method !== 'POST') {
    res.status(405).json({
      ok: false,
      configured: Boolean(process.env.GEMINI_API_KEY?.trim()),
      code: 'INVALID_REQUEST',
      error: 'Method not allowed. Send a POST request with a JSON payload.',
    });
    return;
  }

  const rawContentLen = req.headers?.['content-length'];
  const headerLen = Number(Array.isArray(rawContentLen) ? rawContentLen[0] : rawContentLen);
  if (Number.isFinite(headerLen) && headerLen > MAX_ARCHIVIST_PAYLOAD_BYTES) {
    res.status(413).json({
      ok: false,
      configured: true,
      code: 'PAYLOAD_TOO_LARGE',
      error: 'Request payload exceeds the 32 KB safety limit.',
    });
    return;
  }

  let parsedBody: unknown = req.body;
  if (typeof parsedBody === 'string') {
    if (Buffer.byteLength(parsedBody, 'utf8') > MAX_ARCHIVIST_PAYLOAD_BYTES) {
      res.status(413).json({
        ok: false,
        configured: true,
        code: 'PAYLOAD_TOO_LARGE',
        error: 'Request payload exceeds the 32 KB safety limit.',
      });
      return;
    }
    try {
      parsedBody = JSON.parse(parsedBody);
    } catch {
      res.status(400).json({
        ok: false,
        configured: true,
        code: 'INVALID_REQUEST',
        error: 'Malformed JSON payload.',
      });
      return;
    }
  }

  const clientIp = extractClientIp(req.headers, req.socket?.remoteAddress);
  const result = await handleArchivistRequest((parsedBody ?? {}) as Record<string, unknown>, {
    apiKey: process.env.GEMINI_API_KEY,
    modelOverride: process.env.GEMINI_MODEL || DEFAULT_ARCHIVIST_MODEL,
    clientIp,
    rateLimiter: defaultArchivistRateLimiter,
  });

  if (result.headers) {
    for (const [key, val] of Object.entries(result.headers)) {
      res.setHeader(key, val);
    }
  }

  res.status(result.status).json(result.body);
}
