import 'dotenv/config';
import express, { NextFunction, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  DEFAULT_ARCHIVIST_MODEL,
  MAX_ARCHIVIST_PAYLOAD_BYTES,
  defaultArchivistRateLimiter,
  extractClientIp,
  handleArchivistRequest,
  resolveConfiguredModel,
} from './server/archivistCore';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 3000);
const isProduction = process.env.NODE_ENV === 'production';

async function startServer() {
  const app = express();
  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  app.use('/api', express.json({ limit: MAX_ARCHIVIST_PAYLOAD_BYTES }));

  // Convert body-parser JSON syntax & payload-size errors into clean sanitized JSON
  app.use('/api', (err: unknown, _req: Request, res: Response, next: NextFunction) => {
    const bodyErr = err as { type?: string; status?: number };
    if (bodyErr?.type === 'entity.too.large' || bodyErr?.status === 413) {
      res.status(413).json({
        ok: false,
        configured: true,
        code: 'PAYLOAD_TOO_LARGE',
        error: 'Request payload exceeds the 32 KB safety limit.',
      });
      return;
    }
    if (bodyErr?.type === 'entity.parse.failed' || bodyErr?.status === 400) {
      res.status(400).json({
        ok: false,
        configured: true,
        code: 'INVALID_REQUEST',
        error: 'Malformed JSON payload.',
      });
      return;
    }
    next(err);
  });

  app.get('/api/health', (_req, res) => {
    const key = (process.env.GEMINI_API_KEY ?? '').trim();
    const model = resolveConfiguredModel(process.env.GEMINI_MODEL || DEFAULT_ARCHIVIST_MODEL);
    res.setHeader('Cache-Control', 'no-store');
    res.json({
      ok: true,
      archivistConfigured: Boolean(key && key !== 'MY_GEMINI_API_KEY'),
      modelSupported: model.valid,
      model: model.modelId,
    });
  });

  app.post('/api/archivist', async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');

    const clientIp = extractClientIp(
      req.headers as Record<string, string | string[] | undefined>,
      req.ip || req.socket?.remoteAddress
    );

    const result = await handleArchivistRequest(req.body ?? {}, {
      apiKey: process.env.GEMINI_API_KEY,
      modelOverride: process.env.GEMINI_MODEL || DEFAULT_ARCHIVIST_MODEL,
      clientIp,
      rateLimiter: defaultArchivistRateLimiter,
    });

    if (result.headers) {
      for (const [k, v] of Object.entries(result.headers)) {
        res.setHeader(k, v);
      }
    }
    res.status(result.status).json(result.body);
  });

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      const indexHtml = path.join(distDir, 'index.html');
      if (fs.existsSync(indexHtml)) {
        res.sendFile(indexHtml);
      } else {
        res.status(404).send('Build output not found. Run npm run build first.');
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`HUMAN.EXE server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start HUMAN.EXE server:', err);
  process.exit(1);
});
