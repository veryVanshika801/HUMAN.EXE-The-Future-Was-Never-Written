import React, { useEffect, useMemo, useRef, useState } from 'react';
import { BookOpen, Send, X, Compass, RotateCcw, AlertCircle } from 'lucide-react';
import { ArchiveProgressState, ChapterId, PathOutcome } from '../types/archive';
import { calculateLiveHumanityIndex } from '../logic/decisionEngine';
import { useDialogAccessibility } from '../hooks/useDialogAccessibility';
import { audioEngine } from '../logic/audioEngine';
import {
  ArchivistConversationMessage,
  clearArchivistConversation,
  createInitialArchivistMessages,
  queryArchivist,
} from '../logic/archivistEngine';

interface ArchivistModalProps {
  isOpen: boolean;
  activeChapter: ChapterId;
  state: ArchiveProgressState;
  outcome: PathOutcome;
  completionPercentage: number;
  onClose: () => void;
}

export const ArchivistModal: React.FC<ArchivistModalProps> = ({
  isOpen,
  activeChapter,
  state,
  outcome,
  completionPercentage,
  onClose,
}) => {
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState<ArchivistConversationMessage[]>(
    createInitialArchivistMessages
  );
  const [inputNotice, setInputNotice] = useState<string | null>(null);

  const panelRef = useRef<HTMLDivElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useDialogAccessibility(isOpen, onClose, panelRef);

  useEffect(() => {
    if (!isOpen) return;
    messagesEndRef.current?.scrollIntoView({
      behavior: state.reducedMotion ? 'auto' : 'smooth',
      block: 'end',
    });
  }, [isOpen, messages.length, state.reducedMotion]);

  const humanityIndex = useMemo(
    () => calculateLiveHumanityIndex(state.decisions, state),
    [state]
  );

  const suggestedPrompts = useMemo(() => {
    const prompts: string[] = [
      'Explore my decisions.',
      'Explain this chapter.',
      activeChapter === 'ch2' || activeChapter === 'ch3'
        ? 'Discover the historical connection between Babbage, Ada Lovelace, and Chapter 03.'
        : 'Discover the historical connection.',
      'Analyse my Humanity Index.',
      'What does my ending reveal?',
    ];
    return prompts;
  }, [activeChapter]);

  if (!isOpen) return null;

  const submitQuery = (queryText: string) => {
    const trimmed = queryText.trim();
    if (!trimmed) {
      setInputNotice('Enter a question about a historical chapter, artifact, or your decisions.');
      return;
    }

    setInputNotice(null);
    audioEngine.playEraSound('click');

    const result = queryArchivist({
      question: trimmed,
      activeChapter,
      state,
      outcome,
      completionPercentage,
    });

    if (!result.ok) {
      setInputNotice(result.error);
      return;
    }

    const stamp = Date.now();
    const userMsg: ArchivistConversationMessage = {
      id: `u-${stamp}-${Math.random().toString(36).slice(2, 6)}`,
      role: 'user',
      text: trimmed,
    };

    const archivistMsg: ArchivistConversationMessage = {
      id: `a-${stamp}-${Math.random().toString(36).slice(2, 6)}`,
      role: 'archivist',
      text: result.answer,
      topics: result.topics,
      recordType: result.recordType,
    };

    audioEngine.playEraSound(result.matched ? 'chapterUnlock' : 'click');
    setMessages((prev) => [...prev, userMsg, archivistMsg]);
    setQuestion('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitQuery(question);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (question.trim().length > 0) {
        submitQuery(question);
      } else {
        setInputNotice('Enter a question about a historical chapter, artifact, or your decisions.');
      }
    }
  };

  const handleClear = () => {
    audioEngine.playEraSound('click');
    setMessages(clearArchivistConversation());
    setInputNotice(null);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="archivist-console-title"
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
              <BookOpen className="w-3.5 h-3.5" aria-hidden="true" />
              <span>THE 2075 ARCHIVIST · LOCAL KNOWLEDGE ARCHIVE</span>
            </div>
            <h2
              id="archivist-console-title"
              className="font-display text-2xl font-semibold text-[#F0F2F2] mt-1"
            >
              Ask the 2075 Archivist
            </h2>
            <p className="text-xs text-[#899398] mt-1">
              Rule-based museum catalog grounded in your {humanityIndex.selectedCount}/5 recorded choices,{' '}
              {state.inspectedArtifacts.length} artifacts, and {state.unlockedSecrets.length} secrets. Works 100% offline and separates historical fact from 2075 speculation.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {messages.length > 0 && (
              <button
                type="button"
                onClick={handleClear}
                aria-label="Clear Archivist conversation"
                className="inline-flex items-center gap-1.5 px-2.5 py-2 rounded-lg border border-white/10 text-xs font-mono-archival text-[#BFC7CB] hover:text-[#F0F2F2] hover:border-white/25 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                <span className="hidden sm:inline">Clear</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close Archivist Console"
              className="p-2 rounded-lg border border-white/10 text-[#BFC7CB] hover:text-[#F0F2F2] cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
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
          <span className="text-[10px] text-[#899398]">
            COMPLETION {completionPercentage}% · LOCAL CATALOG
          </span>
        </div>

        {/* Suggested Prompts (Empty State) */}
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
                  onClick={() => submitQuery(promptText)}
                  className="text-left px-3 py-2 rounded-lg bg-[#090B0D] border border-white/12 hover:border-[#A6C7A9]/60 text-xs text-[#BFC7CB] hover:text-[#F0F2F2] transition-colors cursor-pointer"
                >
                  {promptText}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Message Feed */}
        <div className="flex-1 min-h-[200px] max-h-[360px] overflow-y-auto space-y-3 pr-1">
          {messages.length === 0 && (
            <div className="p-5 rounded-lg bg-[#090B0D] border border-white/8 text-xs text-[#899398] leading-relaxed">
              Query any of the five historical chapters, figures such as Ada Lovelace, James Watt, Alan Turing, Grace Hopper, or Tim Berners-Lee, your recovered artifacts, or your live 2075 timeline and Humanity Index.
            </div>
          )}

          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`p-4 rounded-lg border text-xs sm:text-sm leading-relaxed transition-opacity ${
                msg.role === 'user'
                  ? 'bg-[#161D21] border-white/15 text-[#F0F2F2] ml-6'
                  : 'bg-[#090B0D] border-[#A6C7A9]/35 text-[#BFC7CB] mr-4'
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] font-mono-archival mb-1.5">
                <span className={msg.role === 'user' ? 'text-[#D9822B]' : 'text-[#A6C7A9]'}>
                  {msg.role === 'user' ? 'VISITOR QUERY' : 'THE ARCHIVIST · LOCAL ARCHIVE RECORD'}
                </span>
                {msg.topics && msg.topics.length > 0 && (
                  <span className="text-[#899398] truncate max-w-xs">
                    {msg.topics.slice(0, 2).join(' · ')}
                  </span>
                )}
              </div>
              <div className="whitespace-pre-wrap">{msg.text}</div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Empty Input Notice */}
        {inputNotice && (
          <div
            role="status"
            className="px-3 py-2 rounded-lg bg-[#1A130F] border border-[#D9822B]/50 text-xs text-[#F6B26B] flex items-center gap-2"
          >
            <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            <span>{inputNotice}</span>
          </div>
        )}

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="pt-3 border-t border-white/10 flex items-end gap-2.5">
          <div className="flex-1">
            <textarea
              rows={2}
              value={question}
              onChange={(e) => {
                setQuestion(e.target.value);
                if (inputNotice && e.target.value.trim().length > 0) {
                  setInputNotice(null);
                }
              }}
              onKeyDown={handleKeyDown}
              maxLength={1200}
              placeholder="Ask about an era, historical figure, artifact, Humanity Index, or your 2075 choices... (Enter to send, Shift+Enter for newline)"
              aria-label="Ask the 2075 Archivist"
              className="w-full resize-none bg-[#090B0D] border border-white/15 focus:border-[#A6C7A9] rounded-lg px-3.5 py-2.5 text-xs sm:text-sm text-[#F0F2F2] placeholder:text-[#899398] outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={question.trim().length === 0}
            aria-label="Send query to The Archivist"
            className="inline-flex items-center gap-1.5 px-4 py-3 rounded-lg bg-[#A6C7A9] hover:bg-[#F0F2F2] disabled:bg-white/10 disabled:text-[#899398] text-[#090B0D] text-xs font-semibold transition-colors cursor-pointer disabled:cursor-not-allowed shrink-0"
          >
            <Send className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Ask</span>
          </button>
        </form>
      </div>
    </div>
  );
};
