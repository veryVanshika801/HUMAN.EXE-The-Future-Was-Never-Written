import React, { useState } from 'react';
import { Flame, Cog, Cpu, Globe, Sparkles, Compass, X, Check, Lock, KeyRound } from 'lucide-react';
import { CHAPTERS } from '../data/chapters';
import { ARTIFACTS, CORRUPTED_FILES, LOST_ARTIFACTS, SECRET_MEMORIES } from '../data/artifacts';
import { ArtifactItem, ChapterId, ChapterNumber, DecisionsState, PathOutcome } from '../types/archive';

interface MemoryMapRailProps {
  activeChapter: ChapterId;
  activeStageIndex: number;
  visitedChapters: ChapterNumber[];
  decisions: DecisionsState;
  inspectedArtifacts: string[];
  discoveredLostArtifacts: string[];
  repairedFiles: string[];
  unlockedSecrets: string[];
  completionPercentage: number;
  endingOutcome: PathOutcome;
  isModalOpen: boolean;
  onCloseModal: () => void;
  onOpenModal: () => void;
  onNavigateChapter: (chapter: ChapterId) => void;
  onNavigateArtifact: (chapter: ChapterId, artifact: ArtifactItem) => void;
}

const ERA_ICONS: Record<ChapterNumber, React.FC<{ className?: string }>> = {
  1: Flame,
  2: Cog,
  3: Cpu,
  4: Globe,
  5: Sparkles,
};

export const MemoryMapRail: React.FC<MemoryMapRailProps> = ({
  activeChapter,
  activeStageIndex,
  visitedChapters,
  decisions,
  inspectedArtifacts,
  discoveredLostArtifacts,
  repairedFiles,
  unlockedSecrets,
  completionPercentage,
  endingOutcome,
  isModalOpen,
  onCloseModal,
  onOpenModal,
  onNavigateChapter,
  onNavigateArtifact,
}) => {
  const [hoveredNode, setHoveredNode] = useState<ChapterNumber | 6 | null>(null);

  const lineFillPercent = completionPercentage;

  const isChapterUnlocked = (num: ChapterNumber) => {
    if (num === 1) return true;
    return visitedChapters.includes(num) || Boolean(decisions[`ch${num - 1}` as keyof DecisionsState]);
  };

  return (
    <>
      {/* Persistent Desktop Side Rail */}
      <aside
        aria-label="Memory Map"
        className="no-print hidden lg:flex fixed right-6 top-1/2 -translate-y-1/2 z-30 flex-col items-end gap-3"
      >
        <div className="bg-[#090B0D]/92 border border-white/12 rounded-lg px-2.5 py-4 flex flex-col items-center gap-3.5">
          <button
            type="button"
            onClick={onOpenModal}
            className="text-[11px] font-mono-archival text-[#899398] hover:text-[#A6C7A9] transition-colors tracking-wider uppercase cursor-pointer"
            title="Open Memory Constellation"
          >
            Map
          </button>

          <div className="relative flex flex-col items-center gap-4 py-1">
            {/* Connecting Vertical Track animated dynamically with progress */}
            <div className="absolute top-2 bottom-2 w-px bg-white/10" aria-hidden="true">
              <div
                className="w-full bg-[#A6C7A9] transition-all duration-500"
                style={{ height: `${lineFillPercent}%` }}
              />
            </div>

            {CHAPTERS.map((ch) => {
              const Icon = ERA_ICONS[ch.number];
              const isCurrent = activeChapter === ch.id;
              const isCompleted = Boolean(decisions[ch.id]);
              const unlocked = isChapterUnlocked(ch.number);
              const lostFound = discoveredLostArtifacts.includes(`lost-00${ch.number}`);

              return (
                <div
                  key={ch.id}
                  className="relative flex items-center"
                  onMouseEnter={() => setHoveredNode(ch.number)}
                  onMouseLeave={() => setHoveredNode(null)}
                >
                  {hoveredNode === ch.number && (
                    <div className="absolute right-10 whitespace-nowrap bg-[#111619] border border-white/15 rounded px-3 py-1.5 text-right shadow-lg pointer-events-none">
                      <div className="text-xs font-medium text-[#F0F2F2]">{ch.title}</div>
                      <div className="text-[11px] font-mono-archival text-[#899398]">
                        {ch.period} · {isCurrent ? `Stage ${activeStageIndex}/6` : isCompleted ? 'Decided' : unlocked ? 'Available' : 'Unvisited'}
                        {lostFound ? ' · Memory Found' : ''}
                      </div>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => unlocked && onNavigateChapter(ch.id)}
                    disabled={!unlocked}
                    aria-label={`Chapter ${ch.number}: ${ch.title} (${ch.period})`}
                    className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center border transition-all cursor-pointer disabled:cursor-not-allowed ${
                      isCurrent
                        ? 'bg-[#A6C7A9] text-[#090B0D] border-[#A6C7A9] scale-110'
                        : isCompleted
                        ? 'bg-[#111619] text-[#A6C7A9] border-[#A6C7A9]/65 hover:border-[#A6C7A9]'
                        : unlocked
                        ? 'bg-[#111619] text-[#BFC7CB] border-white/25 hover:border-white/50'
                        : 'bg-[#090B0D] text-[#899398]/45 border-white/10'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>
                </div>
              );
            })}

            {/* Final Core Node */}
            <div
              className="relative flex items-center"
              onMouseEnter={() => setHoveredNode(6)}
              onMouseLeave={() => setHoveredNode(null)}
            >
              {hoveredNode === 6 && (
                <div className="absolute right-10 whitespace-nowrap bg-[#111619] border border-white/15 rounded px-3 py-1.5 text-right pointer-events-none">
                  <div className="text-xs font-medium text-[#F0F2F2]">Archive Core</div>
                  <div className="text-[11px] font-mono-archival text-[#A6C7A9]">2075 Simulation</div>
                </div>
              )}
              <button
                type="button"
                onClick={() => onNavigateChapter('ending')}
                aria-label="Archive Core 2075"
                className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center border transition-all cursor-pointer ${
                  activeChapter === 'ending' || activeChapter === 'credits'
                    ? 'bg-[#F0F2F2] text-[#090B0D] border-[#F0F2F2] scale-110'
                    : 'bg-[#111619] text-[#BFC7CB] border-white/20 hover:border-white/50'
                }`}
              >
                <Compass className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            </div>
          </div>

          {/* Dynamic Progress Counters */}
          <div className="pt-2 border-t border-white/10 w-full text-center font-mono-archival space-y-1">
            <div className="text-[11px] text-[#F0F2F2] tabular-nums">{completionPercentage}%</div>
            <div className="text-[10px] text-[#D9822B] tabular-nums" title="Lost Memories Discovered">
              M {discoveredLostArtifacts.length}/{LOST_ARTIFACTS.length}
            </div>
            <div className="text-[10px] text-[#A6C7A9] tabular-nums" title="Corrupted Files Repaired">
              F {repairedFiles.length}/{CORRUPTED_FILES.length}
            </div>
            <div className="text-[10px] text-[#BFC7CB] tabular-nums" title="Secret Archives Unlocked">
              S {unlockedSecrets.length}/{SECRET_MEMORIES.length}
            </div>
          </div>
        </div>
      </aside>

      {/* Expanded Memory Constellation Modal */}
      {isModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="memory-map-modal-title"
          className="no-print fixed inset-0 z-50 bg-[#090B0D]/95 flex items-center justify-center p-4 sm:p-8 overflow-y-auto"
        >
          <div className="w-full max-w-6xl bg-[#111619] border border-white/12 rounded-xl p-6 sm:p-8 my-auto max-h-[92vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-4 pb-5 border-b border-white/10">
              <div>
                <div className="text-xs font-mono-archival text-[#899398]">
                  CONSTELLATION COMPLETION {completionPercentage}% · ARTIFACTS {inspectedArtifacts.length}/{ARTIFACTS.length} · MEMORIES {discoveredLostArtifacts.length}/{LOST_ARTIFACTS.length} · SECRETS {unlockedSecrets.length}/{SECRET_MEMORIES.length}
                </div>
                <h2 id="memory-map-modal-title" className="font-display text-2xl sm:text-3xl font-semibold text-[#F0F2F2] mt-1">
                  The Memory Constellation
                </h2>
                <p className="text-sm text-[#899398] mt-1">
                  Click any unlocked Era or Artifact node to jump directly to its archival position.
                </p>
              </div>
              <button
                type="button"
                onClick={onCloseModal}
                aria-label="Close Memory Constellation"
                className="p-2 rounded-lg border border-white/10 text-[#BFC7CB] hover:text-[#F0F2F2] hover:border-white/30 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Visual Legend */}
            <div className="mt-4 flex flex-wrap items-center gap-5 text-[11px] font-mono-archival text-[#899398]">
              <span className="inline-flex items-center gap-1.5 text-[#A6C7A9]">
                <span className="w-2.5 h-2.5 rounded-full bg-[#A6C7A9]" />
                Discovered / Decided
              </span>
              <span className="inline-flex items-center gap-1.5 text-[#D9822B]">
                <span className="w-2.5 h-2.5 rounded-full bg-[#D9822B]" />
                Lost Memory Recovered
              </span>
              <span className="inline-flex items-center gap-1.5 text-[#F0F2F2]">
                <span className="w-2.5 h-2.5 rotate-45 border border-[#A6C7A9] bg-[#A6C7A9]/30" />
                Secret Record
              </span>
              <span className="inline-flex items-center gap-1.5 text-[#899398]">
                <span className="w-2.5 h-2.5 rounded-full border border-dashed border-white/30" />
                Undiscovered / Unvisited
              </span>
            </div>

            {/* Interactive SVG Constellation Backbone connecting Eras 01-05 -> 2075 */}
            <div className="mt-5 bg-[#090B0D] border border-white/10 rounded-xl p-4 overflow-x-auto">
              <svg
                viewBox="0 0 920 118"
                className="w-full min-w-[640px] h-28 block"
                role="img"
                aria-label="Timeline constellation connecting five historical eras to Archive Core 2075"
              >
                {/* Connecting Bezier Spine */}
                <path
                  d="M 75 60 C 210 26, 260 94, 395 60 C 530 26, 580 94, 715 60 L 845 60"
                  fill="none"
                  stroke="rgba(191, 199, 203, 0.16)"
                  strokeWidth="2"
                  strokeDasharray="4 4"
                />
                {CHAPTERS.map((ch, idx) => {
                  const cx = 75 + idx * 160;
                  const cy = idx % 2 === 0 ? 58 : 62;
                  const unlocked = isChapterUnlocked(ch.number);
                  const decided = Boolean(decisions[ch.id]);
                  const lostFound = discoveredLostArtifacts.includes(`lost-00${ch.number}`);
                  const secretMatch = SECRET_MEMORIES.find((s) => s.chapter === ch.number);
                  const secretFound = secretMatch ? unlockedSecrets.includes(secretMatch.id) : false;

                  return (
                    <g
                      key={ch.id}
                      onClick={() => {
                        if (!unlocked) return;
                        onNavigateChapter(ch.id);
                        onCloseModal();
                      }}
                      className={unlocked ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}
                    >
                      {/* Satellite link to Lost Memory */}
                      <line x1={cx} y1={cy} x2={cx - 26} y2={20} stroke="rgba(217,130,43,0.35)" strokeWidth="1" />
                      <circle
                        cx={cx - 26}
                        cy={20}
                        r={5.5}
                        fill={lostFound ? '#D9822B' : '#090B0D'}
                        stroke={lostFound ? '#D9822B' : 'rgba(217,130,43,0.45)'}
                        strokeDasharray={lostFound ? undefined : '2 2'}
                      />
                      {/* Satellite link to Secret Archive */}
                      <line x1={cx} y1={cy} x2={cx + 28} y2={22} stroke="rgba(166,199,169,0.35)" strokeWidth="1" />
                      <rect
                        x={cx + 23}
                        y={17}
                        width={10}
                        height={10}
                        transform={`rotate(45 ${cx + 28} 22)`}
                        fill={secretFound ? '#A6C7A9' : '#090B0D'}
                        stroke={secretFound ? '#F0F2F2' : 'rgba(166,199,169,0.45)'}
                      />
                      {/* Main Era Star Node */}
                      <circle
                        cx={cx}
                        cy={cy}
                        r={activeChapter === ch.id ? 16 : 13}
                        fill={decided ? '#142019' : '#111619'}
                        stroke={activeChapter === ch.id ? '#F0F2F2' : decided ? '#A6C7A9' : 'rgba(191,199,203,0.35)'}
                        strokeWidth={activeChapter === ch.id ? 2.5 : 1.5}
                      />
                      <text
                        x={cx}
                        y={cy + 4}
                        textAnchor="middle"
                        fill={decided ? '#A6C7A9' : '#F0F2F2'}
                        fontSize="10"
                        fontFamily="IBM Plex Mono, monospace"
                      >
                        0{ch.number}
                      </text>
                      <text
                        x={cx}
                        y={104}
                        textAnchor="middle"
                        fill="#899398"
                        fontSize="9.5"
                        fontFamily="IBM Plex Mono, monospace"
                      >
                        {ch.period}
                      </text>
                    </g>
                  );
                })}

                {/* 2075 Core Final Star */}
                <g
                  onClick={() => {
                    onNavigateChapter('ending');
                    onCloseModal();
                  }}
                  className="cursor-pointer"
                >
                  <circle
                    cx={845}
                    cy={60}
                    r={18}
                    fill="#141C18"
                    stroke="#A6C7A9"
                    strokeWidth="2"
                  />
                  <text
                    x={845}
                    y={64}
                    textAnchor="middle"
                    fill="#F0F2F2"
                    fontSize="10"
                    fontFamily="IBM Plex Mono, monospace"
                  >
                    2075
                  </text>
                  <text
                    x={845}
                    y={104}
                    textAnchor="middle"
                    fill="#A6C7A9"
                    fontSize="9.5"
                    fontFamily="IBM Plex Mono, monospace"
                  >
                    ARCHIVE CORE
                  </text>
                </g>
              </svg>
            </div>

            {/* Detailed Constellation Clusters per Era */}
            <div className="mt-5 grid grid-cols-1 md:grid-cols-6 gap-3.5 items-stretch">
              {CHAPTERS.map((ch) => {
                const Icon = ERA_ICONS[ch.number];
                const choiceVal = decisions[ch.id];
                const selectedOpt = ch.options.find((o) => o.value === choiceVal);
                const unlocked = isChapterUnlocked(ch.number);
                const isCurrent = activeChapter === ch.id;
                const lostItem = LOST_ARTIFACTS.find((l) => l.chapter === ch.number);
                const lostFound = lostItem ? discoveredLostArtifacts.includes(lostItem.id) : false;
                const secretItem = SECRET_MEMORIES.find((s) => s.chapter === ch.number);
                const secretFound = secretItem ? unlockedSecrets.includes(secretItem.id) : false;
                const eraArtifacts = ARTIFACTS.filter((a) => a.chapter === ch.number);

                return (
                  <div
                    key={ch.id}
                    className={`p-3.5 rounded-lg border flex flex-col justify-between gap-3 ${
                      isCurrent
                        ? 'bg-[#161D21] border-[#A6C7A9]'
                        : unlocked
                        ? 'bg-[#0D1114] border-white/12'
                        : 'bg-[#090B0D] border-white/5 opacity-60'
                    }`}
                  >
                    <div>
                      <button
                        type="button"
                        disabled={!unlocked}
                        onClick={() => {
                          onNavigateChapter(ch.id);
                          onCloseModal();
                        }}
                        className="w-full text-left cursor-pointer disabled:cursor-not-allowed group"
                      >
                        <div className="flex items-center justify-between text-xs font-mono-archival text-[#899398]">
                          <span>0{ch.number}</span>
                          {choiceVal ? (
                            <Check className="w-3.5 h-3.5 text-[#A6C7A9]" />
                          ) : !unlocked ? (
                            <Lock className="w-3.5 h-3.5 text-[#899398]" />
                          ) : null}
                        </div>
                        <div className="mt-2.5 flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-[#111619] border border-white/15 flex items-center justify-center text-[#BFC7CB] shrink-0">
                            <Icon className="w-3.5 h-3.5" />
                          </div>
                          <div className="min-w-0">
                            <h3 className="text-xs sm:text-sm font-semibold text-[#F0F2F2] group-hover:text-[#A6C7A9] truncate">
                              {ch.title}
                            </h3>
                            <div className="text-[10px] font-mono-archival text-[#899398]">{ch.period}</div>
                          </div>
                        </div>
                      </button>

                      {/* Clickable Artifact Constellation Nodes */}
                      <div className="mt-3 pt-2.5 border-t border-white/8 space-y-1">
                        {eraArtifacts.map((art) => {
                          const found = inspectedArtifacts.includes(art.id);
                          return (
                            <button
                              key={art.id}
                              type="button"
                              onClick={() => {
                                onNavigateArtifact(ch.id, art);
                                onCloseModal();
                              }}
                              className="w-full text-left flex items-center gap-1.5 text-[11px] py-0.5 text-[#BFC7CB] hover:text-[#F0F2F2] cursor-pointer"
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                  found ? 'bg-[#A6C7A9]' : 'border border-white/40'
                                }`}
                              />
                              <span className="truncate">{art.name}</span>
                            </button>
                          );
                        })}
                        <div className={`flex items-center gap-1.5 text-[10px] font-mono-archival pt-1 ${lostFound ? 'text-[#D9822B]' : 'text-[#899398]'}`}>
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${lostFound ? 'bg-[#D9822B]' : 'border border-[#D9822B]/50'}`} />
                          <span>{lostFound ? lostItem?.title : 'Lost Memory Hidden'}</span>
                        </div>
                        {secretItem && (
                          <div className={`flex items-center gap-1.5 text-[10px] font-mono-archival ${secretFound ? 'text-[#A6C7A9]' : 'text-[#899398]'}`}>
                            <KeyRound className="w-2.5 h-2.5 shrink-0" />
                            <span>{secretFound ? secretItem.title : 'Secret Archive Locked'}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="pt-2 border-t border-white/10 text-[11px] text-[#A6C7A9]">
                      {selectedOpt ? selectedOpt.label : unlocked ? 'Awaiting Decision' : 'Locked'}
                    </div>
                  </div>
                );
              })}

              <button
                type="button"
                onClick={() => {
                  onNavigateChapter('ending');
                  onCloseModal();
                }}
                className="text-left p-4 rounded-lg border border-[#A6C7A9]/40 bg-[#131A1D] hover:border-[#A6C7A9] transition-all flex flex-col justify-between gap-3 cursor-pointer"
              >
                <div>
                  <div className="flex items-center justify-between text-xs font-mono-archival text-[#A6C7A9]">
                    <span>2075</span>
                    <Compass className="w-3.5 h-3.5" />
                  </div>
                  <h3 className="text-sm font-semibold text-[#F0F2F2] mt-3">Archive Core</h3>
                  <p className="text-xs text-[#899398] mt-1">{endingOutcome.archetypeTitle}</p>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onNavigateChapter('credits');
                      onCloseModal();
                    }}
                    className="mt-3 text-[11px] font-mono-archival text-[#BFC7CB] hover:text-[#A6C7A9] underline underline-offset-4 cursor-pointer"
                  >
                    Jump to Credits &amp; Colophon
                  </button>
                </div>
                <div className="pt-2 border-t border-white/10 text-xs font-mono-archival text-[#BFC7CB]">
                  {endingOutcome.pathId}
                </div>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

