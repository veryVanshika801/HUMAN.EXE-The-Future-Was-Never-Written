import { GoogleGenAI } from '@google/genai';

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

export interface ArchivistResult {
  status: number;
  body:
    | {
        ok: true;
        configured: true;
        answer: string;
        model: string;
      }
    | {
        ok: false;
        configured: boolean;
        code: 'MISSING_API_KEY' | 'INVALID_REQUEST' | 'UPSTREAM_ERROR';
        error: string;
      };
}

const MODEL_ID = 'gemini-4-hydrogen';

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
- Keep answers scannable (2–4 concise paragraphs or compact bullet points). Do not break character into meta developer chatter.`;

function sanitizeStringList(input: unknown, maxItems = 24): string[] {
  if (!Array.isArray(input)) return [];
  return input
    .filter((v): v is string => typeof v === 'string' && v.trim().length > 0)
    .slice(0, maxItems)
    .map((s) => s.trim().slice(0, 80));
}

function sanitizeHistory(input: unknown): ArchivistHistoryMessage[] {
  if (!Array.isArray(input)) return [];
  const cleaned: ArchivistHistoryMessage[] = [];
  for (const item of input.slice(-8)) {
    if (!item || typeof item !== 'object') continue;
    const obj = item as Record<string, unknown>;
    if ((obj.role === 'user' || obj.role === 'model') && typeof obj.text === 'string') {
      const text = obj.text.trim().slice(0, 2000);
      if (text) cleaned.push({ role: obj.role, text });
    }
  }
  return cleaned;
}

function formatArchiveContext(raw: unknown): string {
  if (!raw || typeof raw !== 'object') {
    return 'Visitor Archive State: Initial entry (no recorded metadata provided).';
  }
  const ctx = raw as Record<string, unknown>;
  const decisions =
    ctx.decisions && typeof ctx.decisions === 'object'
      ? (ctx.decisions as Record<string, unknown>)
      : {};
  const decisionLines = [1, 2, 3, 4, 5].map((n) => {
    const val = decisions[`ch${n}`];
    return `CH 0${n}: ${typeof val === 'string' && val ? val : 'PENDING (not decided yet)'}`;
  });

  const idx =
    ctx.humanityIndex && typeof ctx.humanityIndex === 'object'
      ? (ctx.humanityIndex as Record<string, unknown>)
      : {};
  const inn = typeof idx.innovation === 'number' ? idx.innovation : 'N/A';
  const con = typeof idx.connection === 'number' ? idx.connection : 'N/A';
  const agn = typeof idx.humanAgency === 'number' ? idx.humanAgency : 'N/A';

  const inspected = sanitizeStringList(ctx.inspectedArtifacts);
  const lost = sanitizeStringList(ctx.discoveredLostArtifacts);
  const repaired = sanitizeStringList(ctx.repairedFiles);
  const secrets = sanitizeStringList(ctx.unlockedSecrets);

  return [
    `Active Section: ${typeof ctx.activeChapter === 'string' ? ctx.activeChapter.slice(0, 32) : 'unknown'}`,
    `Archive Completion: ${typeof ctx.completionPercentage === 'number' ? Math.round(ctx.completionPercentage) : 0}%`,
    `Timeline Status: ${typeof ctx.archetypeTitle === 'string' ? ctx.archetypeTitle.slice(0, 80) : 'INCOMPLETE'} (${typeof ctx.pathId === 'string' ? ctx.pathId.slice(0, 64) : 'DRAFT'})`,
    `Recorded Choices -> ${decisionLines.join(' | ')}`,
    `Live Humanity Index -> Innovation: ${inn}%, Connection: ${con}%, Human Agency: ${agn}%`,
    `Inspected Artifacts (${inspected.length}): ${inspected.length > 0 ? inspected.join(', ') : 'none yet'}`,
    `Recovered Lost Memories (${lost.length}): ${lost.length > 0 ? lost.join(', ') : 'none yet'}`,
    `Repaired Corrupted Files (${repaired.length}): ${repaired.length > 0 ? repaired.join(', ') : 'none yet'}`,
    `Unlocked Secrets (${secrets.length}): ${secrets.length > 0 ? secrets.join(', ') : 'none yet'}`,
  ].join('\n');
}

export async function handleArchivistRequest(
  payload: ArchivistRequestPayload,
  apiKey: string | undefined = process.env.GEMINI_API_KEY
): Promise<ArchivistResult> {
  const cleanedKey = (apiKey ?? '').trim();
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

  if (!payload || typeof payload.question !== 'string') {
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

  const question = payload.question.trim();
  if (!question || question.length > 1200) {
    return {
      status: 400,
      body: {
        ok: false,
        configured: true,
        code: 'INVALID_REQUEST',
        error:
          question.length > 1200
            ? 'Question exceeds the 1,200 character archive query limit.'
            : 'Please enter a non-empty question for the Archivist.',
      },
    };
  }

  const history = sanitizeHistory(payload.history);
  const contextBlock = formatArchiveContext(payload.archiveContext);

  const contents = [
    ...history.map((msg) => ({
      role: msg.role,
      parts: [{ text: msg.text }],
    })),
    {
      role: 'user' as const,
      parts: [
        {
          text: `${contextBlock}\n\nVisitor Question:\n${question}`,
        },
      ],
    },
  ];

  try {
    const ai = new GoogleGenAI({
      apiKey: cleanedKey,
      httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
    });

    const response = await ai.models.generateContent({
      model: MODEL_ID,
      contents,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.65,
        maxOutputTokens: 700,
      },
    });

    const answer = response.text?.trim();
    if (!answer) {
      return {
        status: 502,
        body: {
          ok: false,
          configured: true,
          code: 'UPSTREAM_ERROR',
          error: 'The Archivist returned an empty transmission. Please retry your query.',
        },
      };
    }

    return {
      status: 200,
      body: {
        ok: true,
        configured: true,
        answer,
        model: MODEL_ID,
      },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected Archivist AI error.';
    return {
      status: 502,
      body: {
        ok: false,
        configured: true,
        code: 'UPSTREAM_ERROR',
        error: `Archivist transmission interrupted: ${message}`,
      },
    };
  }
}
