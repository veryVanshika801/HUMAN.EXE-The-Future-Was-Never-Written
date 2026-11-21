import { GoogleGenAI, ThinkingLevel } from '@google/genai';

export interface ArchivistHistoryMessage {
  role: 'user' | 'model';
  text: string;
}

export interface ArchivistArchiveContext {
  activeChapter?: string;
  completionPercentage?: number;
  selectedCount?: number;
  decisions?: Record<string, string | undefined>;
  humanityIndex?: {
    innovation?: number;
    connection?: number;
    humanAgency?: number;
    overallScore?: number;
  };
  archetypeTitle?: string;
  pathId?: string;
  inspectedArtifacts?: string[];
  discoveredLostArtifacts?: string[];
  repairedFiles?: string[];
  unlockedSecrets?: string[];
}

export interface ArchivistRequestPayload {
  question?: unknown;
  history?: unknown;
  archiveContext?: unknown;
}

export type ArchivistErrorCode =
  | 'MISSING_API_KEY'
  | 'INVALID_API_KEY'
  | 'INVALID_MODEL_CONFIG'
  | 'INVALID_REQUEST'
  | 'PAYLOAD_TOO_LARGE'
  | 'RATE_LIMITED'
  | 'QUOTA_EXCEEDED'
  | 'UPSTREAM_TIMEOUT'
  | 'UPSTREAM_ERROR';

export interface ArchivistDevDiagnostics {
  durationMs: number;
  model: string;
  upstreamStatus?: number | string;
}

export interface ArchivistResult {
  status: number;
  headers?: Record<string, string>;
  body:
    | {
        ok: true;
        configured: true;
        answer: string;
        model: string;
        diagnostics?: ArchivistDevDiagnostics;
      }
    | {
        ok: false;
        configured: boolean;
        code: ArchivistErrorCode;
        error: string;
        retryAfterSeconds?: number;
        diagnostics?: ArchivistDevDiagnostics;
      };
}

export const DEFAULT_UPSTREAM_TIMEOUT_MS = 22_000;

export const MAX_ARCHIVIST_PAYLOAD_BYTES = 32 * 1024;
export const MAX_QUESTION_LENGTH = 1200;
export const MAX_HISTORY_ITEMS = 8;
export const MAX_HISTORY_TEXT_LENGTH = 2000;
export const DEFAULT_ARCHIVIST_MODEL = 'gemini-4-hydrogen';

const SUPPORTED_GEMINI_MODELS = new Set([
  'gemini-4-hydrogen',
  'gemini-3.1-flash-lite',
]);

const VALID_ACTIVE_CHAPTERS = new Set([
  'intro',
  'ch1',
  'ch2',
  'ch3',
  'ch4',
  'ch5',
  'ending',
  'credits',
]);

const VALID_DECISION_VALUES: Record<string, Set<string>> = {
  ch1: new Set(['share', 'restrict']),
  ch2: new Set(['productivity', 'purpose']),
  ch3: new Set(['open', 'privacy']),
  ch4: new Set(['total_connection', 'digital_privacy']),
  ch5: new Set(['ai_leads', 'humans_lead', 'collaborate']),
};

const SYSTEM_INSTRUCTION = `You are THE ARCHIVIST, the resident curatorial intelligence of HUMAN.EXE — a Year 2075 Digital Archaeology Museum.

ROLE & TONE:
- Speak calmly, concisely, and insightfully like a thoughtful museum curator and historian examining human technological choices across five chapters:
  CH 01: The First Spark (Prehistory / Fire & Shared Knowledge)
  CH 02: Engines of Change (Industrial Revolution / Steam, Clockwork & Labor)
  CH 03: The Silent Code (Early Computing & Information Theory / Open vs Protected Knowledge)
  CH 04: The Connected World (Internet & Global Networks / Connection vs Digital Privacy)
  CH 05: The Age of Machines (AI & 2075 Crossroads / Agency & Governance)

STRICT FACT VS. SPECULATION RULE:
- Explicitly separate DOCUMENTED HISTORY (real historical inventions, pioneers like Ada Lovelace, James Watt, Tim Berners-Lee, Alan Turing, Grace Hopper, real computing & network milestones) from 2075 SPECULATIVE ARCHIVE (the fictional museum setting, fictional lost/corrupted logs like UNKNOWN_ARCHIVE_2075.LOG, and simulated 2075 timeline consequences).
- Label your grounding briefly when helpful (e.g., "[Historical Record]" vs "[2075 Speculative Archive]") so visitors never confuse speculative storytelling with historical fact.
- Ground every response in the visitor's actual Archive Context provided below (only reference choices, artifacts, lost memories, files, and secrets they have actually inspected or decided—never invent fake progress they did not make).
- Keep answers scannable and focused: 2-4 short paragraphs or compact bullet points (roughly 120-260 words). Do not break character into meta developer chatter.`;

export interface RateLimitDecision {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

export interface RateLimiter {
  check: (key: string, nowMs?: number) => RateLimitDecision;
  reset: () => void;
}

export function createRateLimiter(
  maxRequests = 15,
  windowMs = 60_000,
  maxTrackedClients = 5000
): RateLimiter {
  const buckets = new Map<string, number[]>();

  return {
    check(rawKey: string, nowMs = Date.now()): RateLimitDecision {
      const key = (rawKey || 'unknown').slice(0, 128);
      const cutoff = nowMs - windowMs;
      const existing = buckets.get(key) ?? [];
      const active = existing.filter((ts) => ts > cutoff);

      if (active.length >= maxRequests) {
        const oldestActive = active[0];
        const retryAfterSeconds = Math.max(1, Math.ceil((oldestActive + windowMs - nowMs) / 1000));
        buckets.set(key, active);
        return {
          allowed: false,
          remaining: 0,
          retryAfterSeconds,
        };
      }

      active.push(nowMs);
      buckets.set(key, active);

      if (buckets.size > maxTrackedClients) {
        for (const [entryKey, timestamps] of buckets.entries()) {
          const stillValid = timestamps.some((ts) => ts > cutoff);
          if (!stillValid) {
            buckets.delete(entryKey);
          }
          if (buckets.size <= maxTrackedClients) break;
        }
        if (buckets.size > maxTrackedClients) {
          const oldestKey = buckets.keys().next().value;
          if (oldestKey !== undefined) buckets.delete(oldestKey);
        }
      }

      return {
        allowed: true,
        remaining: Math.max(0, maxRequests - active.length),
        retryAfterSeconds: 0,
      };
    },
    reset() {
      buckets.clear();
    },
  };
}

export const defaultArchivistRateLimiter = createRateLimiter(15, 60_000);

export function extractClientIp(
  headers: Record<string, string | string[] | undefined> | undefined,
  fallbackIp?: string
): string {
  if (headers) {
    const forwarded = headers['x-forwarded-for'] ?? headers['X-Forwarded-For'];
    const rawForwarded = Array.isArray(forwarded) ? forwarded[0] : forwarded;
    if (typeof rawForwarded === 'string' && rawForwarded.trim()) {
      const firstHop = rawForwarded.split(',')[0]?.trim();
      if (firstHop) return firstHop.slice(0, 64);
    }
    const realIp = headers['x-real-ip'] ?? headers['X-Real-IP'];
    const rawRealIp = Array.isArray(realIp) ? realIp[0] : realIp;
    if (typeof rawRealIp === 'string' && rawRealIp.trim()) {
      return rawRealIp.trim().slice(0, 64);
    }
  }
  return (fallbackIp || '127.0.0.1').slice(0, 64);
}

function isPlainObject(val: unknown): val is Record<string, unknown> {
  return typeof val === 'object' && val !== null && !Array.isArray(val);
}

function stripControlChars(str: string): string {
  return str.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim();
}

function sanitizeIdList(input: unknown, maxItems = 24): string[] {
  if (!Array.isArray(input)) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const item of input.slice(0, maxItems)) {
    if (typeof item !== 'string') continue;
    const cleaned = stripControlChars(item).slice(0, 64);
    if (cleaned && /^[a-z0-9._-]+$/i.test(cleaned) && !seen.has(cleaned)) {
      seen.add(cleaned);
      out.push(cleaned);
    }
  }
  return out;
}

function validateAndSanitizeHistory(
  input: unknown
): { ok: true; history: ArchivistHistoryMessage[] } | { ok: false; error: string } {
  if (input === undefined) return { ok: true, history: [] };
  if (!Array.isArray(input)) {
    return { ok: false, error: 'Conversation history must be an array.' };
  }
  if (input.length > 24) {
    return { ok: false, error: 'Conversation history exceeds the maximum turn limit.' };
  }

  const cleaned: ArchivistHistoryMessage[] = [];
  for (const item of input.slice(-MAX_HISTORY_ITEMS)) {
    if (!isPlainObject(item)) {
      return { ok: false, error: 'Each conversation history item must be an object.' };
    }
    if (item.role !== 'user' && item.role !== 'model') {
      return { ok: false, error: 'History role must be "user" or "model".' };
    }
    if (typeof item.text !== 'string') {
      return { ok: false, error: 'History item text must be a string.' };
    }
    const text = stripControlChars(item.text).slice(0, MAX_HISTORY_TEXT_LENGTH);
    if (text) cleaned.push({ role: item.role, text });
  }
  return { ok: true, history: cleaned };
}

function formatArchiveContext(
  raw: unknown
): { ok: true; block: string } | { ok: false; error: string } {
  if (raw === undefined || raw === null) {
    return {
      ok: true,
      block: 'Visitor Archive State: Initial entry (no recorded metadata provided).',
    };
  }
  if (!isPlainObject(raw)) {
    return { ok: false, error: 'Archive context must be a JSON object.' };
  }

  const activeChapter =
    typeof raw.activeChapter === 'string' && VALID_ACTIVE_CHAPTERS.has(raw.activeChapter)
      ? raw.activeChapter
      : 'unknown';

  const completion =
    typeof raw.completionPercentage === 'number' && Number.isFinite(raw.completionPercentage)
      ? Math.max(0, Math.min(100, Math.round(raw.completionPercentage)))
      : 0;

  const decisionsRaw = isPlainObject(raw.decisions) ? raw.decisions : {};
  const decisionLines = [1, 2, 3, 4, 5].map((n) => {
    const key = `ch${n}`;
    const val = decisionsRaw[key];
    const validSet = VALID_DECISION_VALUES[key];
    return `CH 0${n}: ${
      typeof val === 'string' && validSet.has(val) ? val : 'PENDING (not decided yet)'
    }`;
  });

  const idx = isPlainObject(raw.humanityIndex) ? raw.humanityIndex : {};
  const clampMetric = (v: unknown) =>
    typeof v === 'number' && Number.isFinite(v) ? `${Math.max(0, Math.min(100, Math.round(v)))}%` : 'N/A';

  const archetypeTitle =
    typeof raw.archetypeTitle === 'string'
      ? stripControlChars(raw.archetypeTitle).slice(0, 80) || 'INCOMPLETE'
      : 'INCOMPLETE';
  const pathId =
    typeof raw.pathId === 'string'
      ? stripControlChars(raw.pathId).slice(0, 64) || 'DRAFT'
      : 'DRAFT';

  const inspected = sanitizeIdList(raw.inspectedArtifacts);
  const lost = sanitizeIdList(raw.discoveredLostArtifacts);
  const repaired = sanitizeIdList(raw.repairedFiles);
  const secrets = sanitizeIdList(raw.unlockedSecrets);

  return {
    ok: true,
    block: [
      `Active Section: ${activeChapter}`,
      `Archive Completion: ${completion}%`,
      `Timeline Status: ${archetypeTitle} (${pathId})`,
      `Recorded Choices -> ${decisionLines.join(' | ')}`,
      `Live Humanity Index -> Innovation: ${clampMetric(idx.innovation)}, Connection: ${clampMetric(idx.connection)}, Human Agency: ${clampMetric(idx.humanAgency)}`,
      `Inspected Artifacts (${inspected.length}): ${inspected.length > 0 ? inspected.join(', ') : 'none yet'}`,
      `Recovered Lost Memories (${lost.length}): ${lost.length > 0 ? lost.join(', ') : 'none yet'}`,
      `Repaired Corrupted Files (${repaired.length}): ${repaired.length > 0 ? repaired.join(', ') : 'none yet'}`,
      `Unlocked Secrets (${secrets.length}): ${secrets.length > 0 ? secrets.join(', ') : 'none yet'}`,
    ].join('\n'),
  };
}

export function resolveConfiguredModel(modelOverride?: string): {
  valid: boolean;
  modelId: string;
} {
  const candidate = (modelOverride ?? process.env.GEMINI_MODEL ?? DEFAULT_ARCHIVIST_MODEL).trim();
  if (!candidate || !SUPPORTED_GEMINI_MODELS.has(candidate)) {
    return { valid: false, modelId: candidate || '(empty)' };
  }
  return { valid: true, modelId: candidate };
}

class ArchivistTimeoutError extends Error {
  constructor(timeoutMs: number) {
    super(`Archivist upstream request exceeded ${timeoutMs}ms`);
    this.name = 'ArchivistTimeoutError';
  }
}

function classifyAndSanitizeGeminiError(
  err: unknown,
  diagnostics?: ArchivistDevDiagnostics
): ArchivistResult {
  const record =
    err && typeof err === 'object' ? (err as { status?: unknown; code?: unknown; message?: unknown; name?: unknown }) : {};
  const numericStatus = typeof record.status === 'number' ? record.status : undefined;
  const rawMessage = err instanceof Error ? err.message : String(record.message ?? '');
  const lower = rawMessage.toLowerCase();
  const isTimeout =
    err instanceof ArchivistTimeoutError ||
    record.name === 'ArchivistTimeoutError' ||
    record.name === 'AbortError' ||
    lower.includes('timed out') ||
    lower.includes('timeout') ||
    lower.includes('aborted');

  // Log terse diagnostic server-side only (never sent to browser, never includes API key)
  console.error('[Archivist API Upstream Failure]', {
    status: numericStatus ?? (isTimeout ? 504 : 'unknown'),
    code: typeof record.code === 'string' ? record.code : isTimeout ? 'UPSTREAM_TIMEOUT' : 'unknown',
    durationMs: diagnostics?.durationMs,
  });

  const withDiag = <T extends object>(body: T): T & { diagnostics?: ArchivistDevDiagnostics } =>
    diagnostics ? { ...body, diagnostics: { ...diagnostics, upstreamStatus: numericStatus ?? (isTimeout ? 'TIMEOUT' : 'UNKNOWN') } } : body;

  if (isTimeout) {
    return {
      status: 504,
      body: withDiag({
        ok: false as const,
        configured: true,
        code: 'UPSTREAM_TIMEOUT' as const,
        error:
          'The Archivist AI transmission timed out before receiving a response. Please retry your query.',
      }),
    };
  }

  if (
    numericStatus === 429 ||
    lower.includes('resource_exhausted') ||
    lower.includes('quota') ||
    lower.includes('rate limit')
  ) {
    return {
      status: 429,
      headers: { 'Retry-After': '30' },
      body: withDiag({
        ok: false as const,
        configured: true,
        code: 'QUOTA_EXCEEDED' as const,
        retryAfterSeconds: 30,
        error:
          'The Archivist AI service has reached its current API quota limit. Please try again in a minute.',
      }),
    };
  }

  if (
    numericStatus === 404 ||
    lower.includes('not_found') ||
    (lower.includes('model') &&
      (lower.includes('not found') ||
        lower.includes('unsupported') ||
        lower.includes('not supported') ||
        lower.includes('unknown')))
  ) {
    return {
      status: 500,
      body: withDiag({
        ok: false as const,
        configured: true,
        code: 'INVALID_MODEL_CONFIG' as const,
        error:
          'The configured Gemini Archivist model is unavailable or unsupported in this API environment.',
      }),
    };
  }

  if (
    numericStatus === 401 ||
    numericStatus === 403 ||
    lower.includes('api_key_invalid') ||
    lower.includes('api key not valid') ||
    lower.includes('permission_denied') ||
    lower.includes('unauthenticated')
  ) {
    return {
      status: 503,
      body: withDiag({
        ok: false as const,
        configured: false,
        code: 'INVALID_API_KEY' as const,
        error:
          'The server Gemini API credential could not be authenticated for this service.',
      }),
    };
  }

  if (numericStatus === 400) {
    return {
      status: 400,
      body: withDiag({
        ok: false as const,
        configured: true,
        code: 'INVALID_REQUEST' as const,
        error: 'The Archivist query format was rejected by the upstream service. Please rephrase and retry.',
      }),
    };
  }

  if (numericStatus === 503 || lower.includes('unavailable') || lower.includes('high demand')) {
    return {
      status: 503,
      headers: { 'Retry-After': '10' },
      body: withDiag({
        ok: false as const,
        configured: true,
        code: 'UPSTREAM_ERROR' as const,
        retryAfterSeconds: 10,
        error: 'The Archivist AI model is experiencing temporary high demand. Please retry in a few seconds.',
      }),
    };
  }

  return {
    status: 502,
    body: withDiag({
      ok: false as const,
      configured: true,
      code: 'UPSTREAM_ERROR' as const,
      error: 'Unable to reach the Archivist AI service right now. Please try again shortly.',
    }),
  };
}

export interface HandleArchivistOptions {
  apiKey?: string;
  modelOverride?: string;
  clientIp?: string;
  rateLimiter?: RateLimiter;
  nowMs?: number;
  upstreamTimeoutMs?: number;
  includeDevDiagnostics?: boolean;
  generateContentFn?: (params: {
    apiKey: string;
    model: string;
    contents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }>;
    systemInstruction: string;
    signal?: AbortSignal;
  }) => Promise<{ text?: string }>;
}

export async function handleArchivistRequest(
  payload: ArchivistRequestPayload,
  optionsOrKey?: string | HandleArchivistOptions
): Promise<ArchivistResult> {
  const opts: HandleArchivistOptions =
    typeof optionsOrKey === 'string'
      ? { apiKey: optionsOrKey }
      : optionsOrKey ?? {};

  // 1. Per-IP Rate Limiting
  if (opts.rateLimiter) {
    const rate = opts.rateLimiter.check(opts.clientIp ?? '127.0.0.1', opts.nowMs);
    if (!rate.allowed) {
      return {
        status: 429,
        headers: {
          'Retry-After': String(rate.retryAfterSeconds),
          'X-RateLimit-Remaining': '0',
        },
        body: {
          ok: false,
          configured: true,
          code: 'RATE_LIMITED',
          retryAfterSeconds: rate.retryAfterSeconds,
          error: `Too many Archivist queries from this address. Please wait ${rate.retryAfterSeconds}s before trying again.`,
        },
      };
    }
  }

  // 2. Payload structure & byte-size validation
  if (!isPlainObject(payload)) {
    return {
      status: 400,
      body: {
        ok: false,
        configured: true,
        code: 'INVALID_REQUEST',
        error: 'Request body must be a valid JSON object.',
      },
    };
  }

  try {
    const serializedBytes = Buffer.byteLength(JSON.stringify(payload), 'utf8');
    if (serializedBytes > MAX_ARCHIVIST_PAYLOAD_BYTES) {
      return {
        status: 413,
        body: {
          ok: false,
          configured: true,
          code: 'PAYLOAD_TOO_LARGE',
          error: 'Request payload exceeds the 32 KB safety limit.',
        },
      };
    }
  } catch {
    return {
      status: 400,
      body: {
        ok: false,
        configured: true,
        code: 'INVALID_REQUEST',
        error: 'Request body could not be serialized safely.',
      },
    };
  }

  // 3. Validate question, history, and archiveContext before invoking SDK
  if (typeof payload.question !== 'string') {
    return {
      status: 400,
      body: {
        ok: false,
        configured: true,
        code: 'INVALID_REQUEST',
        error: 'Please enter a non-empty question for the Archivist.',
      },
    };
  }

  const question = stripControlChars(payload.question);
  if (!question) {
    return {
      status: 400,
      body: {
        ok: false,
        configured: true,
        code: 'INVALID_REQUEST',
        error: 'Please enter a non-empty question for the Archivist.',
      },
    };
  }
  if (question.length > MAX_QUESTION_LENGTH) {
    return {
      status: 400,
      body: {
        ok: false,
        configured: true,
        code: 'INVALID_REQUEST',
        error: `Question exceeds the ${MAX_QUESTION_LENGTH} character archive query limit.`,
      },
    };
  }

  const historyResult = validateAndSanitizeHistory(payload.history);
  if (!historyResult.ok) {
    return {
      status: 400,
      body: {
        ok: false,
        configured: true,
        code: 'INVALID_REQUEST',
        error: historyResult.error,
      },
    };
  }

  const contextResult = formatArchiveContext(payload.archiveContext);
  if (!contextResult.ok) {
    return {
      status: 400,
      body: {
        ok: false,
        configured: true,
        code: 'INVALID_REQUEST',
        error: contextResult.error,
      },
    };
  }

  // 4. Verify Server API Key & Model Configuration
  const cleanedKey = (opts.apiKey ?? process.env.GEMINI_API_KEY ?? '').trim();
  if (!cleanedKey || cleanedKey === 'MY_GEMINI_API_KEY') {
    return {
      status: 503,
      body: {
        ok: false,
        configured: false,
        code: 'MISSING_API_KEY',
        error:
          'Archivist AI is currently offline because GEMINI_API_KEY is not configured in the server environment.',
      },
    };
  }

  const modelCheck = resolveConfiguredModel(opts.modelOverride);
  if (!modelCheck.valid) {
    return {
      status: 500,
      body: {
        ok: false,
        configured: true,
        code: 'INVALID_MODEL_CONFIG',
        error:
          'Archivist AI model configuration is invalid or unsupported by the active Gemini API environment.',
      },
    };
  }

  const contents = [
    ...historyResult.history.map((msg) => ({
      role: msg.role,
      parts: [{ text: msg.text }],
    })),
    {
      role: 'user' as const,
      parts: [
        {
          text: `${contextResult.block}\n\nVisitor Question:\n${question}`,
        },
      ],
    },
  ];

  // 5. Execute Server-Side Gemini Call with Bounded Timeout (Never fabricate answers on error)
  const timeoutMs =
    typeof opts.upstreamTimeoutMs === 'number' && Number.isFinite(opts.upstreamTimeoutMs) && opts.upstreamTimeoutMs > 0
      ? opts.upstreamTimeoutMs
      : DEFAULT_UPSTREAM_TIMEOUT_MS;
  const allowDevDiagnostics = opts.includeDevDiagnostics ?? process.env.NODE_ENV !== 'production';
  const startedAt = Date.now();
  const controller = new AbortController();
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  try {
    const runUpstream = async () => {
      if (opts.generateContentFn) {
        return opts.generateContentFn({
          apiKey: cleanedKey,
          model: modelCheck.modelId,
          contents,
          systemInstruction: SYSTEM_INSTRUCTION,
          signal: controller.signal,
        });
      }

      const ai = new GoogleGenAI({
        apiKey: cleanedKey,
        httpOptions: {
          timeout: timeoutMs,
          headers: { 'User-Agent': 'aistudio-build' },
        },
      });

      return ai.models.generateContent({
        model: modelCheck.modelId,
        contents,
        config: {
          abortSignal: controller.signal,
          systemInstruction: SYSTEM_INSTRUCTION,
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        },
      });
    };

    const timeoutPromise = new Promise<never>((_resolve, reject) => {
      timeoutId = setTimeout(() => {
        controller.abort();
        reject(new ArchivistTimeoutError(timeoutMs));
      }, timeoutMs);
    });

    const response = await Promise.race([runUpstream(), timeoutPromise]);
    const durationMs = Date.now() - startedAt;
    const answer = response.text?.trim();

    if (!answer) {
      return {
        status: 502,
        body: {
          ok: false,
          configured: true,
          code: 'UPSTREAM_ERROR',
          error: 'The Archivist returned an empty transmission. Please retry your query.',
          ...(allowDevDiagnostics
            ? { diagnostics: { durationMs, model: modelCheck.modelId, upstreamStatus: 'EMPTY_TEXT' } }
            : {}),
        },
      };
    }

    return {
      status: 200,
      body: {
        ok: true,
        configured: true,
        answer,
        model: modelCheck.modelId,
        ...(allowDevDiagnostics
          ? { diagnostics: { durationMs, model: modelCheck.modelId, upstreamStatus: 200 } }
          : {}),
      },
    };
  } catch (err) {
    const durationMs = Date.now() - startedAt;
    return classifyAndSanitizeGeminiError(
      err,
      allowDevDiagnostics ? { durationMs, model: modelCheck.modelId } : undefined
    );
  } finally {
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId);
    }
  }
}
