import { handleArchivistRequest } from '../server/archivistCore';

interface VercelLikeRequest {
  method?: string;
  body?: unknown;
}

interface VercelLikeResponse {
  status: (code: number) => VercelLikeResponse;
  json: (body: unknown) => void;
  setHeader: (name: string, value: string) => void;
}

export default async function handler(req: VercelLikeRequest, res: VercelLikeResponse) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  if (req.method !== 'POST') {
    res.status(405).json({
      ok: false,
      configured: Boolean(process.env.GEMINI_API_KEY?.trim()),
      code: 'INVALID_REQUEST',
      error: 'Method not allowed. Send a POST request with a JSON payload.',
    });
    return;
  }

  const result = await handleArchivistRequest(
    (req.body && typeof req.body === 'object' ? req.body : {}) as Record<string, unknown>,
    process.env.GEMINI_API_KEY
  );

  res.status(result.status).json(result.body);
}
