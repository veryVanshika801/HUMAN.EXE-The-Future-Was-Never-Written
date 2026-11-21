import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Bot, Send, X, AlertCircle, RefreshCw, Sparkles, Compass } from 'lucide-react';
import { ArchiveProgressState, ChapterId, PathOutcome } from '../types/archive';
import { calculateLiveHumanityIndex } from '../logic/decisionEngine';
import { useDialogAccessibility } from '../hooks/useDialogAccessibility';
import { audioEngine } from '../logic/audioEngine';

interface ArchivistMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  model?: string;
}

interface ArchivistDiagnostics {
  durationMs: number;
  model: string;
  upstreamStatus?: number | string;
}

interface ArchivistModalProps {
  isOpen: boolean;
  activeChapter: ChapterId;
  state: ArchiveProgressState;
  outcome: PathOutcome;
  completionPercentage: number;
  onClose: () => void;
}

const CLIENT_REQUEST_TIMEOUT_MS = 28_000;

export const ArchivistModal: React.FC<ArchivistModalProps> = ({
  isOpen,
  activeChapter,
  state,
  outcome,
  completionPercentage,
  onClose,
}) => {
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState<ArchivistMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [errorTitle, setErrorTitle] = useState<string>('TRANSMISSION ERROR');
  const [allowRetry, setAllowRetry] = useState<boolean>(true);
  const [lastFailedQuestion, setLastFailedQuestion] = useState<string | null>(null);
  const [devDiagnostics, setDevDiagnostics] = useState<ArchivistDiagnostics | null>(null);

  const panelRef = useRef<HTMLDivElement | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const requestTimeoutRef = useRef<number | null>(null);
  const inFlightRef = useRef(false);

  useDialogAccessibility(isOpen, onClose, panelRef);

  const abortActiveRequest = () => {
    if (requestTimeoutRef.current !== null) {
      window.clearTimeout(requestTimeoutRef.current);
      requestTimeoutRef.current = null;
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    inFlightRef.current = false;
    setLoading(false);
  };

  useEffect(() => {
    if (!isOpen) {
      abortActiveRequest();
    }
  }, [isOpen]);

  useEffect(() => {
    return () => {
      abortActiveRequest();
    };
  }, []);

  const humanityIndex = useMemo(
    () => calculateLiveHumanityIndex(state.decisions, state),
    [state]
  );

  const suggestedPrompts = useMemo(() => {
    const prompts: string[] = [
      'Summarize how my choices so far shape 2075 and what remains undecided.',
      'What separates documented history from 2075 fiction in this chapter?',
    ];
    if (activeChapter === 'ch2' || activeChapter === 'ch3') {
      prompts.push('Explain how Babbage and Ada Lovelace connect Chapter 02 to Chapter 03.');
    } else if (activeChapter === 'ch4') {
      prompts.push('Why do subsea cables still matter beneath cloud computing?');
    } else {
      prompts.push('Which undiscovered artifacts or clues should I look for next?');
    }
    return prompts;
  }, [activeChapter]);

  if (!isOpen) return null;

  const submitQuery = async (queryText: string) => {
    const trimmed = queryText.trim();
    if (!trimmed || inFlightRef.current || loading) return;

    audioEngine.playEraSound('click');
    inFlightRef.current = true;
    setErrorMsg(null);
    setErrorTitle('TRANSMISSION ERROR');
    setAllowRetry(true);
    setLastFailedQuestion(null);
    setDevDiagnostics(null);

    const userMsgId = `u-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const userMsg: ArchivistMessage = {
      id: userMsgId,
      role: 'user',
      text: trimmed,
    };

    const priorHistory = messages.slice(-6).map((m) => ({
      role: m.role,
      text: m.text,
    }));

    setMessages((prev) => [...prev, userMsg]);
    setQuestion('');
    setLoading(true);

    const controller = new AbortController();
    abortControllerRef.current = controller;
    let timedOut = false;

    requestTimeoutRef.current = window.setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, CLIENT_REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch('/api/archivist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          question: trimmed,
          history: priorHistory,
          archiveContext: {
            activeChapter,
            completionPercentage,
            selectedCount: humanityIndex.selectedCount,
            decisions: state.decisions,
            humanityIndex: {
              innovation: humanityIndex.innovation,
              connection: humanityIndex.connection,
              humanAgency: humanityIndex.humanAgency,
              overallScore: humanityIndex.overallScore,
            },
            archetypeTitle: outcome.archetypeTitle,
            pathId: outcome.pathId,
            inspectedArtifacts: state.inspectedArtifacts,
            discoveredLostArtifacts: state.discoveredLostArtifacts,
            repairedFiles: state.repairedFiles,
            unlockedSecrets: state.unlockedSecrets,
          },
        }),
      });

      const data = (await response.json().catch(() => null)) as
        | {
            ok?: boolean;
            code?: string;
            answer?: string;
            model?: string;
            error?: string;
            diagnostics?: ArchivistDiagnostics;
          }
        | null;

      if (!response.ok || !data?.ok || !data.answer) {
        // Remove the failed optimistic user message so retries do not duplicate turns in history
        setMessages((prev) => prev.filter((m) => m.id !== userMsgId));

        const code = data?.code ?? 'UPSTREAM_ERROR';
        if (code === 'MISSING_API_KEY' || code === 'INVALID_API_KEY') {
          setErrorTitle('SERVER ARCHIVIST CREDENTIAL OFFLINE');
          setAllowRetry(false);
        } else if (code === 'INVALID_MODEL_CONFIG') {
          setErrorTitle('MODEL CONFIGURATION ERROR');
          setAllowRetry(false);
        } else if (code === 'UPSTREAM_TIMEOUT' || response.status === 504) {
          setErrorTitle('TRANSMISSION TIMED OUT');
          setAllowRetry(true);
        } else if (code === 'QUOTA_EXCEEDED' || code === 'RATE_LIMITED') {
          setErrorTitle(code === 'QUOTA_EXCEEDED' ? 'API QUOTA REACHED' : 'RATE LIMIT ACTIVE');
          setAllowRetry(true);
        } else {
          setErrorTitle('TRANSMISSION ERROR');
          setAllowRetry(true);
        }

        if (import.meta.env.DEV && data?.diagnostics) {
          setDevDiagnostics(data.diagnostics);
        }

        setErrorMsg(
          data?.error || `Archivist service unavailable (HTTP ${response.status}). Please try again.`
        );
        setLastFailedQuestion(trimmed);
        return;
      }

      if (import.meta.env.DEV && data.diagnostics) {
        setDevDiagnostics(data.diagnostics);
      }

      audioEngine.playEraSound('chapterUnlock');
      setMessages((prev) => [
        ...prev,
        {
          id: `m-${Date.now()}`,
          role: 'model',
          text: data.answer!,
          model: data.model,
        },
      ]);
    } catch (err) {
      setMessages((prev) => prev.filter((m) => m.id !== userMsgId));

      const isAbort = err instanceof Error && err.name === 'AbortError';
      if (isAbort && !timedOut) {
        // Aborted intentionally because dialog closed or unmounted
        return;
      }

      if (timedOut) {
        setErrorTitle('TRANSMISSION TIMED OUT');
        setErrorMsg(
          'The Archivist AI request exceeded the 28-second transmission window without completing. Please retry.'
        );
      } else {
        setErrorTitle('NETWORK ERROR');
        setErrorMsg('Network error reaching /api/archivist. Check server connectivity and retry.');
      }
      setAllowRetry(true);
      setLastFailedQuestion(trimmed);
    } finally {
      if (requestTimeoutRef.current !== null) {
        window.clearTimeout(requestTimeoutRef.current);
        requestTimeoutRef.current = null;
      }
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
      }
      inFlightRef.current = false;
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void submitQuery(question);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="archivist-ai-title"
      className="no-print fixed inset-0 z-50 bg-[#090B0D]/92 flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
      onClick={onClose}
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className="modal-reveal w-full max-w-3xl bg-[#111619] border border-white/15 rounded-xl p-5 sm:p-7 my-auto max-h-[90vh] flex flex-col gap-4 focus:outline-none"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-white/10">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono-archival text-[#A6C7A9]">
              <Bot className="w-3.5 h-3.5" aria-hidden="true" />
              <span>ARCHIVIST AI CONSOLE · SERVER-GROUNDED CURATOR</span>
            </div>
            <h2
              id="archivist-ai-title"
              className="font-display text-2xl font-semibold text-[#F0F2F2] mt-1"
            >
              Ask the 2075 Archivist
            </h2>
            <p className="text-xs text-[#899398] mt-1">
              Grounded in your {humanityIndex.selectedCount}/5 recorded choices, {state.inspectedArtifacts.length} artifacts, and {state.unlockedSecrets.length} secrets. Distinguishes historical fact from 2075 narrative.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Archivist AI Console"
            className="p-2 rounded-lg border border-white/10 text-[#BFC7CB] hover:text-[#F0F2F2] cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Visitor Context Strip */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono-archival bg-[#090B0D] border border-white/10 rounded-lg px-3 py-2 text-[#BFC7CB]">
          <div className="flex flex-wrap items-center gap-2">
            <Compass className="w-3.5 h-3.5 text-[#D9822B] shrink-0" aria-hidden="true" />
            <span>SECTION: {activeChapter.toUpperCase()}</span>
            <span className="text-[#899398]">·</span>
            <span>DECISIONS: {humanityIndex.selectedCount}/5</span>
            <span className="text-[#899398]">·</span>
            <span className="text-[#A6C7A9]">
              INDEX {humanityIndex.innovation}/{humanityIndex.connection}/{humanityIndex.humanAgency}
            </span>
          </div>
          {import.meta.env.DEV && devDiagnostics && (
            <span className="text-[10px] text-[#899398]">
              DEV TRACE: {devDiagnostics.model} · {devDiagnostics.durationMs}ms
              {devDiagnostics.upstreamStatus !== undefined ? ` · ${devDiagnostics.upstreamStatus}` : ''}
            </span>
          )}
        </div>

        {/* Suggested Prompts */}
        {messages.length === 0 && (
          <div className="space-y-2">
            <div className="text-[11px] font-mono-archival text-[#899398] uppercase">
              Suggested Archival Queries
            </div>
            <div className="flex flex-wrap gap-2">
              {suggestedPrompts.map((promptText) => (
                <button
                  key={promptText}
                  type="button"
                  disabled={loading}
                  onClick={() => void submitQuery(promptText)}
                  className="text-left px-3 py-2 rounded-lg bg-[#090B0D] border border-white/12 hover:border-[#A6C7A9]/60 text-xs text-[#BFC7CB] hover:text-[#F0F2F2] transition-colors cursor-pointer disabled:opacity-50"
                >
                  {promptText}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Message Feed */}
        <div className="flex-1 min-h-[200px] max-h-[360px] overflow-y-auto space-y-3 pr-1">
          {messages.length === 0 && !errorMsg && !loading && (
            <div className="p-5 rounded-lg bg-[#090B0D] border border-white/8 text-xs text-[#899398] leading-relaxed">
              Transmit a question about an era, a real invention behind an artifact, how your Humanity Index shifted, or what the 2075 timelines signify. Responses come directly from the server-side Gemini Archivist endpoint.
            </div>
          )}

          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`p-4 rounded-lg border text-xs sm:text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-[#161D21] border-white/15 text-[#F0F2F2] ml-6'
                  : 'bg-[#090B0D] border-[#A6C7A9]/35 text-[#BFC7CB] mr-4'
              }`}
            >
              <div className="flex items-center justify-between gap-2 text-[10px] font-mono-archival mb-1.5">
                <span className={msg.role === 'user' ? 'text-[#D9822B]' : 'text-[#A6C7A9]'}>
                  {msg.role === 'user' ? 'VISITOR QUERY' : 'THE ARCHIVIST · GEMINI TRANSMISSION'}
                </span>
                {msg.model && <span className="text-[#899398]">{msg.model}</span>}
              </div>
              <div className="whitespace-pre-wrap">{msg.text}</div>
            </div>
          ))}

          {loading && (
            <div className="p-4 rounded-lg bg-[#090B0D] border border-[#A6C7A9]/30 text-xs font-mono-archival text-[#A6C7A9] flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 animate-pulse" aria-hidden="true" />
              <span>SYNTHESIZING ARCHIVE RESPONSE...</span>
            </div>
          )}

          {errorMsg && (
            <div
              role="alert"
              className="p-4 rounded-lg bg-[#1A130F] border border-[#D9822B]/50 text-xs text-[#F0F2F2] space-y-2"
            >
              <div className="flex items-center gap-2 font-mono-archival text-[#D9822B]">
                <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>{errorTitle}</span>
              </div>
              <p className="text-[#BFC7CB] leading-relaxed">{errorMsg}</p>
              {errorTitle === 'SERVER ARCHIVIST CREDENTIAL OFFLINE' && (
                <p className="text-[11px] font-mono-archival text-[#899398]">
                  Configure GEMINI_API_KEY in server environment variables (.env locally or Vercel Project Settings) to enable live Archivist AI responses.
                </p>
              )}
              {lastFailedQuestion && allowRetry && (
                <button
                  type="button"
                  onClick={() => void submitQuery(lastFailedQuestion)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#090B0D] border border-[#D9822B]/60 text-[#D9822B] hover:text-[#F0F2F2] text-xs font-mono-archival cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3" aria-hidden="true" />
                  <span>Retry Query</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="pt-3 border-t border-white/10 flex gap-2.5">
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            maxLength={1200}
            placeholder="Ask the Archivist about an artifact, historical fact, or your 2075 timeline..."
            aria-label="Ask the 2075 Archivist"
            className="flex-1 bg-[#090B0D] border border-white/15 focus:border-[#A6C7A9] rounded-lg px-3.5 py-2.5 text-xs sm:text-sm text-[#F0F2F2] placeholder:text-[#899398] outline-none"
          />
          <button
            type="submit"
            disabled={loading || question.trim().length === 0}
            aria-label="Send query to Archivist AI"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-[#A6C7A9] hover:bg-[#F0F2F2] disabled:bg-white/10 disabled:text-[#899398] text-[#090B0D] text-xs font-semibold transition-colors cursor-pointer disabled:cursor-not-allowed shrink-0"
          >
            <Send className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Ask</span>
          </button>
        </form>
      </div>
    </div>
  );
};
