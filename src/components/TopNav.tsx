import React from 'react';
import { Volume2, VolumeX, Map, Archive, Sparkles, SlidersHorizontal } from 'lucide-react';

interface TopNavProps {
  completionPercentage: number;
  soundEnabled: boolean;
  soundPanelOpen: boolean;
  reducedMotion: boolean;
  onToggleSound: () => void;
  onToggleSoundPanel: () => void;
  onToggleReducedMotion: () => void;
  onOpenMemoryMap: () => void;
  onOpenArchiveLog: () => void;
  onJumpToTop: () => void;
  onJumpToEnding: () => void;
}

export const TopNav: React.FC<TopNavProps> = ({
  completionPercentage,
  soundEnabled,
  soundPanelOpen,
  reducedMotion,
  onToggleSound,
  onToggleSoundPanel,
  onToggleReducedMotion,
  onOpenMemoryMap,
  onOpenArchiveLog,
  onJumpToTop,
  onJumpToEnding,
}) => {
  return (
    <header className="no-print fixed top-0 left-0 right-0 z-40 h-14 bg-[#090B0D]/92 border-b border-white/10 px-4 sm:px-8 flex items-center justify-between gap-4 sm:gap-8">
      {/* Zone 1: Single-line wordmark */}
      <button
        type="button"
        onClick={onJumpToTop}
        className="font-display text-sm sm:text-base font-semibold tracking-[0.18em] text-[#F0F2F2] hover:text-[#A6C7A9] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
      >
        HUMAN.EXE
      </button>

      {/* Zone 2: Clean single-line navigation & utility controls */}
      <nav aria-label="Archive navigation" className="flex items-center gap-3.5 sm:gap-6 text-xs sm:text-sm text-[#BFC7CB]">
        <button
          type="button"
          onClick={onOpenMemoryMap}
          className="inline-flex items-center gap-1.5 hover:text-[#F0F2F2] transition-colors whitespace-nowrap shrink-0 cursor-pointer py-1.5"
        >
          <Map className="w-3.5 h-3.5 text-[#A6C7A9]" aria-hidden="true" />
          <span>Memory Map</span>
        </button>

        <button
          type="button"
          onClick={onOpenArchiveLog}
          className="inline-flex items-center gap-1.5 hover:text-[#F0F2F2] transition-colors whitespace-nowrap shrink-0 cursor-pointer py-1.5"
        >
          <Archive className="w-3.5 h-3.5 text-[#BFC7CB]" aria-hidden="true" />
          <span>Archive Log</span>
        </button>

        <div className="inline-flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={onToggleSound}
            className="inline-flex items-center gap-1.5 hover:text-[#F0F2F2] transition-colors whitespace-nowrap shrink-0 cursor-pointer py-1.5"
            aria-pressed={soundEnabled}
            title={soundEnabled ? 'Mute Archive Audio' : 'Enable Archive Audio'}
          >
            {soundEnabled ? (
              <Volume2 className="w-3.5 h-3.5 text-[#A6C7A9]" aria-hidden="true" />
            ) : (
              <VolumeX className="w-3.5 h-3.5 text-[#899398]" aria-hidden="true" />
            )}
            <span className="hidden md:inline">{soundEnabled ? 'Sound On' : 'Sound Off'}</span>
          </button>

          <button
            type="button"
            onClick={onToggleSoundPanel}
            aria-label="Open spatial audio mixer"
            aria-expanded={soundPanelOpen}
            className={`p-1.5 rounded transition-colors cursor-pointer ${
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

      {/* Zone 3: Primary action */}
      <div className="flex items-center shrink-0">
        <button
          type="button"
          onClick={onJumpToEnding}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium text-[#090B0D] bg-[#BFC7CB] hover:bg-[#F0F2F2] rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5 hidden sm:inline" aria-hidden="true" />
          <span className="font-mono-archival tabular-nums">Core · {completionPercentage}%</span>
        </button>
      </div>
    </header>
  );
};
