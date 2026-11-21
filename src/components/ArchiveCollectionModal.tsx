import React, { useMemo, useState } from 'react';
import { X, Compass, Lock, Check, KeyRound, History, Search } from 'lucide-react';
import { ARTIFACTS, CORRUPTED_FILES, LOST_ARTIFACTS, SECRET_MEMORIES } from '../data/artifacts';
import { ArchiveProgressState, ArtifactItem } from '../types/archive';
import { CorruptedFilesPanel } from './CorruptedFilesPanel';

interface ArchiveCollectionModalProps {
  isOpen: boolean;
  state: ArchiveProgressState;
  completionPercentage: number;
  onClose: () => void;
  onInspectArtifact: (artifact: ArtifactItem) => void;
  onRepairFile: (fileId: string) => void;
}

export const ArchiveCollectionModal: React.FC<ArchiveCollectionModalProps> = ({
  isOpen,
  state,
  completionPercentage,
  onClose,
  onInspectArtifact,
  onRepairFile,
}) => {
  const [tab, setTab] = useState<'lost' | 'artifacts' | 'files' | 'secrets' | 'events'>('lost');
  const [searchQuery, setSearchQuery] = useState('');

  const q = searchQuery.trim().toLowerCase();

  const filteredLost = useMemo(
    () =>
      LOST_ARTIFACTS.filter((l) => {
        if (!q) return true;
        const found = state.discoveredLostArtifacts.includes(l.id);
        return (
          l.memoryCode.toLowerCase().includes(q) ||
          l.hint.toLowerCase().includes(q) ||
          (found &&
            (l.name.toLowerCase().includes(q) ||
              l.title.toLowerCase().includes(q) ||
              l.purpose.toLowerCase().includes(q) ||
              l.impact.toLowerCase().includes(q)))
        );
      }),
    [q, state.discoveredLostArtifacts]
  );

  const filteredArtifacts = useMemo(
    () =>
      ARTIFACTS.filter((a) => {
        if (!q) return true;
        return (
          a.name.toLowerCase().includes(q) ||
          a.era.toLowerCase().includes(q) ||
          a.accessionCode.toLowerCase().includes(q) ||
          a.summary.toLowerCase().includes(q)
        );
      }),
    [q]
  );

  const filteredSecrets = useMemo(
    () =>
      SECRET_MEMORIES.filter((s) => {
        if (!q) return true;
        const unlocked = state.unlockedSecrets.includes(s.id);
        return (
          s.code.toLowerCase().includes(q) ||
          s.triggerHint.toLowerCase().includes(q) ||
          (unlocked &&
            (s.title.toLowerCase().includes(q) ||
              s.narrative.toLowerCase().includes(q) ||
              s.historicalInsight.toLowerCase().includes(q)))
        );
      }),
    [q, state.unlockedSecrets]
  );

  const filteredEvents = useMemo(
    () =>
      state.eventLog.filter((ev) => {
        if (!q) return true;
        return (
          ev.title.toLowerCase().includes(q) ||
          ev.detail.toLowerCase().includes(q) ||
          ev.chapter.toLowerCase().includes(q) ||
          ev.category.toLowerCase().includes(q)
        );
      }),
    [q, state.eventLog]
  );

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="archive-collection-title"
      className="no-print fixed inset-0 z-50 bg-[#090B0D]/95 flex items-center justify-center p-4 sm:p-8 overflow-y-auto"
    >
      <div className="w-full max-w-4xl bg-[#111619] border border-white/12 rounded-xl p-6 sm:p-8 my-auto max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between gap-4 pb-5 border-b border-white/10">
          <div>
            <div className="text-xs font-mono-archival text-[#A6C7A9]">
              ARCHIVE LOG · COMPLETION {completionPercentage}%
            </div>
            <h2 id="archive-collection-title" className="font-display text-2xl sm:text-3xl font-semibold text-[#F0F2F2] mt-1">
              Archive Collection &amp; Search
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Archive Log"
            className="p-2 rounded-lg border border-white/10 text-[#BFC7CB] hover:text-[#F0F2F2] cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Searchable Archive Query Bar */}
        <div className="mt-4 relative">
          <Search
            className="w-4 h-4 text-[#899398] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
            aria-hidden="true"
          />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search artifacts, eras, lost memories, files, secret records..."
            aria-label="Search archive entries"
            className="w-full bg-[#090B0D] border border-white/15 focus:border-[#A6C7A9] rounded-lg pl-10 pr-10 py-2.5 text-xs sm:text-sm text-[#F0F2F2] placeholder:text-[#899398] outline-none transition-colors"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              aria-label="Clear search query"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#899398] hover:text-[#F0F2F2] cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Segmented Tabs */}
        <div className="mt-4 flex flex-wrap gap-1.5 p-1 bg-[#090B0D] border border-white/10 rounded-lg w-fit">
          <button
            type="button"
            onClick={() => setTab('lost')}
            className={`px-3 py-1.5 text-xs font-medium rounded transition-colors cursor-pointer whitespace-nowrap ${
              tab === 'lost' ? 'bg-[#F0F2F2] text-[#090B0D]' : 'text-[#899398] hover:text-[#F0F2F2]'
            }`}
          >
            Lost Memories ({state.discoveredLostArtifacts.length}/{LOST_ARTIFACTS.length})
          </button>
          <button
            type="button"
            onClick={() => setTab('artifacts')}
            className={`px-3 py-1.5 text-xs font-medium rounded transition-colors cursor-pointer whitespace-nowrap ${
              tab === 'artifacts' ? 'bg-[#F0F2F2] text-[#090B0D]' : 'text-[#899398] hover:text-[#F0F2F2]'
            }`}
          >
            Era Artifacts ({state.inspectedArtifacts.length}/{ARTIFACTS.length})
          </button>
          <button
            type="button"
            onClick={() => setTab('files')}
            className={`px-3 py-1.5 text-xs font-medium rounded transition-colors cursor-pointer whitespace-nowrap ${
              tab === 'files' ? 'bg-[#F0F2F2] text-[#090B0D]' : 'text-[#899398] hover:text-[#F0F2F2]'
            }`}
          >
            Corrupted Files ({state.repairedFiles.length}/{CORRUPTED_FILES.length})
          </button>
          <button
            type="button"
            onClick={() => setTab('secrets')}
            className={`px-3 py-1.5 text-xs font-medium rounded transition-colors cursor-pointer whitespace-nowrap ${
              tab === 'secrets' ? 'bg-[#A6C7A9] text-[#090B0D]' : 'text-[#899398] hover:text-[#F0F2F2]'
            }`}
          >
            Secret Archive ({state.unlockedSecrets.length}/{SECRET_MEMORIES.length})
          </button>
          <button
            type="button"
            onClick={() => setTab('events')}
            className={`px-3 py-1.5 text-xs font-medium rounded transition-colors cursor-pointer whitespace-nowrap ${
              tab === 'events' ? 'bg-[#F0F2F2] text-[#090B0D]' : 'text-[#899398] hover:text-[#F0F2F2]'
            }`}
          >
            Event Log ({state.eventLog.length})
          </button>
        </div>

        <div className="mt-6">
          {tab === 'lost' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredLost.length === 0 ? (
                <div className="md:col-span-2 p-6 text-xs text-[#899398] text-center bg-[#090B0D] border border-white/10 rounded-lg">
                  No lost memories match “{searchQuery}”.
                </div>
              ) : (
                filteredLost.map((lost) => {
                  const found = state.discoveredLostArtifacts.includes(lost.id);
                  return (
                    <div
                      key={lost.id}
                      className={`p-4 rounded-lg border ${
                        found ? 'bg-[#141A1D] border-[#D9822B]/50' : 'bg-[#090B0D] border-white/8'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs font-mono-archival">
                        <span className={found ? 'text-[#D9822B]' : 'text-[#899398]'}>
                          {lost.memoryCode} · CH. 0{lost.chapter}
                        </span>
                        {found ? <Compass className="w-4 h-4 text-[#D9822B]" /> : <Lock className="w-4 h-4 text-[#899398]" />}
                      </div>
                      <h3 className="font-display text-lg font-semibold text-[#F0F2F2] mt-2">
                        {found ? `${lost.title} — ${lost.name}` : 'Undiscovered Memory Fragment'}
                      </h3>
                      <p className="mt-2 text-xs sm:text-sm text-[#BFC7CB] leading-relaxed">
                        {found ? lost.narrative : `Hint: ${lost.hint}`}
                      </p>
                      {found && (
                        <div className="mt-3 pt-2.5 border-t border-white/10 space-y-1 text-[11px]">
                          <div>
                            <span className="font-mono-archival text-[#D9822B]">PURPOSE · </span>
                            <span className="text-[#F0F2F2]/90">{lost.purpose}</span>
                          </div>
                          <div>
                            <span className="font-mono-archival text-[#A6C7A9]">IMPACT · </span>
                            <span className="text-[#899398]">{lost.impact}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}

          {tab === 'artifacts' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {filteredArtifacts.length === 0 ? (
                <div className="sm:col-span-2 md:col-span-3 p-6 text-xs text-[#899398] text-center bg-[#090B0D] border border-white/10 rounded-lg">
                  No artifacts match “{searchQuery}”.
                </div>
              ) : (
                filteredArtifacts.map((art) => {
                  const inspected = state.inspectedArtifacts.includes(art.id);
                  return (
                    <button
                      key={art.id}
                      type="button"
                      onClick={() => onInspectArtifact(art)}
                      className={`text-left p-4 rounded-lg border transition-colors cursor-pointer ${
                        inspected
                          ? 'bg-[#141A1D] border-[#A6C7A9]/40 hover:border-[#A6C7A9]'
                          : 'bg-[#090B0D] border-white/10 hover:border-white/30'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[11px] font-mono-archival text-[#899398]">
                        <span>{art.accessionCode}</span>
                        {inspected && <Check className="w-3.5 h-3.5 text-[#A6C7A9]" />}
                      </div>
                      <div className="text-sm font-semibold text-[#F0F2F2] mt-1.5">{art.name}</div>
                      <div className="text-xs text-[#899398] mt-1">{art.era}</div>
                    </button>
                  );
                })
              )}
            </div>
          )}

          {tab === 'files' && (
            <CorruptedFilesPanel
              repairedFiles={state.repairedFiles}
              discoveredLostArtifacts={state.discoveredLostArtifacts}
              onRepairFile={onRepairFile}
              reducedMotion={state.reducedMotion}
              searchQuery={searchQuery}
            />
          )}

          {tab === 'secrets' && (
            <div className="grid grid-cols-1 gap-4">
              {filteredSecrets.length === 0 ? (
                <div className="p-6 text-xs text-[#899398] text-center bg-[#090B0D] border border-white/10 rounded-lg">
                  No secret archives match “{searchQuery}”.
                </div>
              ) : (
                filteredSecrets.map((sec) => {
                  const unlocked = state.unlockedSecrets.includes(sec.id);
                  return (
                    <div
                      key={sec.id}
                      className={`p-5 rounded-lg border ${
                        unlocked ? 'bg-[#0E1712] border-[#A6C7A9]/50' : 'bg-[#090B0D] border-white/10'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs font-mono-archival">
                        <span className={unlocked ? 'text-[#A6C7A9]' : 'text-[#899398]'}>
                          {sec.code} · CH. 0{sec.chapter}
                        </span>
                        {unlocked ? <KeyRound className="w-4 h-4 text-[#A6C7A9]" /> : <Lock className="w-4 h-4 text-[#899398]" />}
                      </div>
                      <h3 className="font-display text-lg font-semibold text-[#F0F2F2] mt-2">
                        {unlocked ? sec.title : 'Encrypted Archival Secret'}
                      </h3>
                      <p className="mt-2 text-xs sm:text-sm text-[#BFC7CB] leading-relaxed">
                        {unlocked ? sec.narrative : `Discovery Clue: ${sec.triggerHint}`}
                      </p>
                      {unlocked && (
                        <p className="mt-2 text-xs font-mono-archival text-[#A6C7A9]">
                          Historical Insight: {sec.historicalInsight}
                        </p>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}

          {tab === 'events' && (
            <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
              {filteredEvents.length === 0 ? (
                <div className="p-6 rounded-lg bg-[#090B0D] border border-white/10 text-xs text-[#899398] text-center">
                  {state.eventLog.length === 0
                    ? 'No archive interactions logged yet. Inspect 3D artifacts or make choices to populate your chronometer.'
                    : `No events match “${searchQuery}”.`}
                </div>
              ) : (
                filteredEvents.map((ev) => (
                  <div
                    key={ev.id}
                    className="p-3 rounded-lg bg-[#090B0D] border border-white/10 flex items-start justify-between gap-4"
                  >
                    <div>
                      <div className="flex items-center gap-2 text-[11px] font-mono-archival text-[#A6C7A9]">
                        <History className="w-3 h-3" aria-hidden="true" />
                        <span>{ev.chapter.toUpperCase()}</span>
                        <span className="text-[#899398]">· {ev.category.toUpperCase()}</span>
                      </div>
                      <div className="text-xs sm:text-sm font-medium text-[#F0F2F2] mt-1">{ev.title}</div>
                      <div className="text-xs text-[#899398] mt-0.5">{ev.detail}</div>
                    </div>
                    <span className="text-[11px] font-mono-archival text-[#899398] shrink-0">{ev.timestamp}</span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

