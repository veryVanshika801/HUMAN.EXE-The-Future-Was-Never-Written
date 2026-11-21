import React, { useRef, useState } from 'react';
import {
  Volume2,
  VolumeX,
  Map,
  Archive,
  Sparkles,
  SlidersHorizontal,
  Bot,
  Menu,
  X,
  Compass,
} from 'lucide-react';
import { CHAPTERS } from '../data/chapters';
import { ChapterId, DecisionsState } from '../types/archive';
import { useDialogAccessibility } from '../hooks/useDialogAccessibility';

interface TopNavProps {
  activeChapter: ChapterId;
  decisions: DecisionsState;
  completionPercentage: number;
  soundEnabled: boolean;
  soundPanelOpen: boolean;
  reducedMotion: boolean;
  onToggleSound: () => void;
  onToggleSoundPanel: () => void;
  onToggleReducedMotion: () => void;
  onOpenMemoryMap: () => void;
  onOpenArchiveLog: () => void;
  onOpenArchivist: () => void;
  onNavigateChapter: (id: ChapterId) => void;
  onJumpToTop: () => void;
  onJumpToEnding: () => void;
}

export const TopNav: React.FC<TopNavProps> = ({
  activeChapter,
  decisions,
  completionPercentage,
  soundEnabled,
  soundPanelOpen,
  reducedMotion,
  onToggleSound,
  onToggleSoundPanel,
  onToggleReducedMotion,
  onOpenMemoryMap,
  onOpenArchiveLog,
  onOpenArchivist,
  onNavigateChapter,
  onJumpToTop,
  onJumpToEnding,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const mobileDrawerRef = useRef<HTMLDivElement | null>(null);

  useDialogAccessibility(mobileMenuOpen, () => setMobileMenuOpen(false), mobileDrawerRef);

  const navigateAndClose = (id: ChapterId) => {
    setMobileMenuOpen(false);
    onNavigateChapter(id);
  };

  return (
    <>
      <header className="no-print fixed top-0 left-0 right-0 z-40 h-14 bg-[#090B0D]/92 border-b border-white/10 px-3 sm:px-8 flex items-center justify-between gap-2 sm:gap-6">
        {/* Zone 1: Single-line wordmark */}
        <button
          type="button"
          onClick={onJumpToTop}
          className="font-display text-sm sm:text-base font-semibold tracking-[0.18em] text-[#F0F2F2] hover:text-[#A6C7A9] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          HUMAN.EXE
        </button>

        {/* Zone 2: Clean single-line navigation & utility controls */}
        <nav
          aria-label="Archive navigation"
          className="flex items-center gap-2 sm:gap-5 text-xs sm:text-sm text-[#BFC7CB] min-w-0"
        >
          <button
            type="button"
            onClick={onOpenMemoryMap}
            data-cursor-kind="nav"
            data-cursor-label="MAP"
            aria-label="Open Memory Map"
            className="hidden sm:inline-flex items-center gap-1.5 hover:text-[#F0F2F2] transition-colors whitespace-nowrap shrink-0 cursor-pointer py-1.5"
          >
            <Map className="w-3.5 h-3.5 text-[#A6C7A9]" aria-hidden="true" />
            <span>Memory Map</span>
          </button>

          <button
            type="button"
            onClick={onOpenArchiveLog}
            aria-label="Open Archivist's Journal"
            data-cursor-kind="nav"
            data-cursor-label="JOURNAL"
            className="hidden sm:inline-flex items-center gap-1.5 hover:text-[#F0F2F2] transition-colors whitespace-nowrap shrink-0 cursor-pointer py-1.5"
          >
            <Archive className="w-3.5 h-3.5 text-[#BFC7CB]" aria-hidden="true" />
            <span>Journal</span>
          </button>

          <button
            type="button"
            onClick={onOpenArchivist}
            aria-label="Open 2075 Archivist Knowledge Console"
            data-cursor-kind="nav"
            data-cursor-label="ARCHIVIST"
            className="inline-flex items-center gap-1.5 text-[#A6C7A9] hover:text-[#F0F2F2] transition-colors whitespace-nowrap shrink-0 cursor-pointer py-1.5 px-1.5 sm:px-0"
          >
            <Bot className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            <span className="hidden md:inline">Archivist</span>
            <span className="md:hidden text-[11px] font-mono-archival">ARCHIVE</span>
          </button>

          <div className="inline-flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={onToggleSound}
              className="inline-flex items-center gap-1.5 hover:text-[#F0F2F2] transition-colors whitespace-nowrap shrink-0 cursor-pointer py-1.5"
              aria-pressed={soundEnabled}
              aria-label={soundEnabled ? 'Mute Archive Audio' : 'Enable Archive Audio'}
              title={soundEnabled ? 'Mute Archive Audio' : 'Enable Archive Audio'}
            >
              {soundEnabled ? (
                <Volume2 className="w-3.5 h-3.5 text-[#A6C7A9]" aria-hidden="true" />
              ) : (
                <VolumeX className="w-3.5 h-3.5 text-[#899398]" aria-hidden="true" />
              )}
              <span className="hidden lg:inline">{soundEnabled ? 'Sound On' : 'Sound Off'}</span>
            </button>

            <button
              type="button"
              onClick={onToggleSoundPanel}
              aria-label="Open spatial audio mixer"
              aria-expanded={soundPanelOpen}
              className={`hidden sm:inline-flex p-1.5 rounded transition-colors cursor-pointer ${
                soundPanelOpen ? 'text-[#A6C7A9]' : 'text-[#899398] hover:text-[#F0F2F2]'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </div>

          <button
            type="button"
            onClick={onToggleReducedMotion}
            className="hidden lg:inline-flex items-center gap-1.5 text-[#899398] hover:text-[#F0F2F2] transition-colors whitespace-nowrap shrink-0 cursor-pointer py-1.5"
            aria-pressed={reducedMotion}
          >
            <span>{reducedMotion ? 'Motion: Reduced' : 'Motion: Full'}</span>
          </button>
        </nav>

        {/* Zone 3: Core button + Mobile/Tablet Drawer Trigger (< lg) */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onJumpToEnding}
            data-magnetic="true"
            data-cursor-kind="nav"
            data-cursor-label="CORE"
            aria-label={`Jump to Archive Core 2075, completion ${completionPercentage} percent`}
            className="inline-flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 text-[11px] sm:text-xs font-medium text-[#090B0D] bg-[#BFC7CB] hover:bg-[#F0F2F2] rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 hidden sm:inline" aria-hidden="true" />
            <span className="font-mono-archival tabular-nums">Core · {completionPercentage}%</span>
          </button>

          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Open archive chapter and utilities menu"
            aria-expanded={mobileMenuOpen}
            className="lg:hidden p-2 rounded border border-white/15 bg-[#111619] text-[#F0F2F2] hover:border-[#A6C7A9] transition-colors cursor-pointer"
          >
            <Menu className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      </header>

      {/* Mobile / Tablet Compact Navigation Drawer */}
      {mobileMenuOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Mobile Archive Navigation"
          onClick={() => setMobileMenuOpen(false)}
          className="no-print lg:hidden fixed inset-0 z-50 bg-[#090B0D]/90 flex justify-end"
        >
          <div
            ref={mobileDrawerRef}
            tabIndex={-1}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-xs h-full bg-[#111619] border-l border-white/15 p-5 overflow-y-auto flex flex-col justify-between gap-6 focus:outline-none"
          >
            <div className="space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div>
                  <div className="text-[10px] font-mono-archival text-[#A6C7A9] uppercase">
                    Archive Navigator
                  </div>
                  <div className="font-display text-base font-semibold text-[#F0F2F2]">
                    HUMAN.EXE · 2075
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  aria-label="Close mobile navigation menu"
                  className="p-2 rounded border border-white/15 text-[#BFC7CB] hover:text-[#F0F2F2] cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Chapters List */}
              <div className="space-y-1.5">
                <div className="text-[10px] font-mono-archival text-[#899398] uppercase tracking-wider mb-2">
                  Historical Eras &amp; Simulation
                </div>
                <button
                  type="button"
                  onClick={() => navigateAndClose('intro')}
                  className={`w-full text-left px-3 py-2 rounded-lg border text-xs transition-colors cursor-pointer ${
                    activeChapter === 'intro'
                      ? 'bg-[#17211C] border-[#A6C7A9] text-[#F0F2F2]'
                      : 'bg-[#090B0D] border-white/10 text-[#BFC7CB]'
                  }`}
                >
                  <span className="font-mono-archival text-[#A6C7A9] mr-2">00</span>
                  <span>Opening Sequence</span>
                </button>

                {CHAPTERS.map((ch) => {
                  const chosen = Boolean(decisions[ch.id]);
                  const isCurrent = activeChapter === ch.id;
                  return (
                    <button
                      key={ch.id}
                      type="button"
                      onClick={() => navigateAndClose(ch.id)}
                      className={`w-full text-left px-3 py-2 rounded-lg border text-xs transition-colors cursor-pointer flex items-center justify-between gap-2 ${
                        isCurrent
                          ? 'bg-[#17211C] border-[#A6C7A9] text-[#F0F2F2]'
                          : 'bg-[#090B0D] border-white/10 text-[#BFC7CB]'
                      }`}
                    >
                      <span className="truncate">
                        <span className="font-mono-archival text-[#899398] mr-2">0{ch.number}</span>
                        {ch.title}
                      </span>
                      <span
                        className={`text-[10px] font-mono-archival shrink-0 ${
                          chosen ? 'text-[#A6C7A9]' : 'text-[#899398]'
                        }`}
                      >
                        {chosen ? 'LOCKED' : 'OPEN'}
                      </span>
                    </button>
                  );
                })}

                <button
                  type="button"
                  onClick={() => navigateAndClose('ending')}
                  className={`w-full text-left px-3 py-2 rounded-lg border text-xs transition-colors cursor-pointer flex items-center justify-between ${
                    activeChapter === 'ending'
                      ? 'bg-[#17211C] border-[#A6C7A9] text-[#F0F2F2]'
                      : 'bg-[#090B0D] border-white/10 text-[#BFC7CB]'
                  }`}
                >
                  <span className="inline-flex items-center gap-2">
                    <Compass className="w-3.5 h-3.5 text-[#A6C7A9]" aria-hidden="true" />
                    <span>Archive Core (2075)</span>
                  </span>
                  <span className="font-mono-archival text-[10px] text-[#A6C7A9]">
                    {completionPercentage}%
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => navigateAndClose('credits')}
                  className={`w-full text-left px-3 py-2 rounded-lg border text-xs transition-colors cursor-pointer flex items-center justify-between ${
                    activeChapter === 'credits'
                      ? 'bg-[#17211C] border-[#A6C7A9] text-[#F0F2F2]'
                      : 'bg-[#090B0D] border-white/10 text-[#BFC7CB]'
                  }`}
                >
                  <span>Credits &amp; Colophon</span>
                  <span className="font-mono-archival text-[10px] text-[#899398]">06</span>
                </button>
              </div>

              {/* Utilities */}
              <div className="space-y-2 pt-3 border-t border-white/10">
                <div className="text-[10px] font-mono-archival text-[#899398] uppercase tracking-wider">
                  Archive Tools
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onOpenMemoryMap();
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-[#090B0D] border border-white/12 text-xs text-[#F0F2F2] cursor-pointer"
                >
                  <Map className="w-3.5 h-3.5 text-[#A6C7A9]" aria-hidden="true" />
                  <span>Memory Constellation Map</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onOpenArchiveLog();
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-[#090B0D] border border-white/12 text-xs text-[#F0F2F2] cursor-pointer"
                >
                  <Archive className="w-3.5 h-3.5 text-[#BFC7CB]" aria-hidden="true" />
                  <span>Archivist’s Journal</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onOpenArchivist();
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-[#0E1712] border border-[#A6C7A9]/40 text-xs text-[#A6C7A9] cursor-pointer"
                >
                  <Bot className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Ask the 2075 Archivist</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onToggleSoundPanel();
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-[#090B0D] border border-white/12 text-xs text-[#BFC7CB] cursor-pointer"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Spatial Audio Mixer</span>
                </button>
              </div>
            </div>

            <div className="pt-4 border-t border-white/10">
              <button
                type="button"
                onClick={onToggleReducedMotion}
                aria-pressed={reducedMotion}
                className="w-full px-3 py-2 rounded-lg bg-[#090B0D] border border-white/15 text-xs font-mono-archival text-[#BFC7CB] hover:text-[#F0F2F2] cursor-pointer"
              >
                {reducedMotion ? 'Motion: Reduced (Tap for Full)' : 'Motion: Full (Tap to Reduce)'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
