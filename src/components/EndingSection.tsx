import React, { useMemo, useState } from 'react';
import {
  Download,
  Printer,
  RotateCcw,
  GitCompare,
  X,
  ArrowUpRight,
} from 'lucide-react';
import {
  ArchiveProgressState,
  ChapterId,
  DecisionsState,
  PathOutcome,
} from '../types/archive';
import { CHAPTERS } from '../data/chapters';
import { ARTIFACTS, CORRUPTED_FILES, LOST_ARTIFACTS, SECRET_MEMORIES } from '../data/artifacts';
import { getAll48PathsSummary, resolvePathOutcome } from '../logic/decisionEngine';

interface EndingSectionProps {
  state: ArchiveProgressState;
  outcome: PathOutcome;
  completionPercentage: number;
  allDecisionsMade: boolean;
  onNavigateChapter: (id: ChapterId) => void;
  onReplay: (keepCollection: boolean) => void;
}

export const EndingSection: React.FC<EndingSectionProps> = ({
  state,
  outcome,
  completionPercentage,
  allDecisionsMade,
  onNavigateChapter,
  onReplay,
}) => {
  const [compareOpen, setCompareOpen] = useState(false);
  const [simDecisions, setSimDecisions] = useState<Required<DecisionsState>>({
    ch1: state.decisions.ch1 ?? 'share',
    ch2: state.decisions.ch2 ?? 'purpose',
    ch3: state.decisions.ch3 ?? 'open',
    ch4: state.decisions.ch4 ?? 'digital_privacy',
    ch5: state.decisions.ch5 ?? 'collaborate',
  });

  const all48Paths = useMemo(() => getAll48PathsSummary(), []);
  const simulatedOutcome = useMemo(() => resolvePathOutcome(simDecisions), [simDecisions]);

  const handleDownloadReport = () => {
    const lines = [
      'HUMAN.EXE — ARCHIVIST FINAL REPORT (2075)',
      '========================================',
      `Archive Path ID: ${outcome.pathId}`,
      `Path Index: ${outcome.pathIndex} / 48`,
      `Ending Archetype: ${outcome.archetypeTitle}`,
      `Path Title: ${outcome.pathTitle}`,
      '',
      'INFLUENCE SCORES',
      `- Human Agency: ${outcome.scores.humanAgency}%`,
      `- Machine Automation: ${outcome.scores.machineAutomation}%`,
      `- Symbiotic Synthesis: ${outcome.scores.symbioticSynthesis}%`,
      '',
      'HISTORICAL SUMMARY',
      outcome.historicalSummary,
      '',
      '2075 PROJECTION',
      outcome.futureDescription,
      '',
      'FINAL ARCHIVE MESSAGE',
      outcome.finalArchiveMessage,
      '',
      `Completion: ${completionPercentage}%`,
      `Era Artifacts Inspected: ${state.inspectedArtifacts.length}/${ARTIFACTS.length}`,
      `Lost Memories Discovered: ${state.discoveredLostArtifacts.length}/${LOST_ARTIFACTS.length}`,
      `Corrupted Files Repaired: ${state.repairedFiles.length}/${CORRUPTED_FILES.length}`,
      `Secret Archives Unlocked: ${state.unlockedSecrets.length}/${SECRET_MEMORIES.length}`,
      '',
      'Technology is what we build. The future is what we choose.',
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${outcome.pathId}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <section
      id="ending"
      aria-labelledby="ending-heading"
      className="relative min-h-screen py-24 sm:py-32 px-4 sm:px-10 lg:px-16 z-10 pointer-events-none"
    >
      <div className="max-w-3xl pointer-events-auto space-y-8">
        {/* Ending Archetype Reveal */}
        <div className="print-report bg-[#090B0D]/92 border border-white/15 rounded-xl p-6 sm:p-10">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono-archival text-[#A6C7A9]">
            <span>ARCHIVE CORE · YEAR 2075 SIMULATION</span>
            <span>PATH {String(outcome.pathIndex).padStart(2, '0')} OF 48</span>
          </div>

          <h2
            id="ending-heading"
            className="font-display text-3xl sm:text-5xl font-semibold text-[#F0F2F2] mt-3 leading-[1.08]"
          >
            {outcome.archetypeTitle}
          </h2>
          <div className="text-sm sm:text-base font-medium text-[#BFC7CB] mt-2">
            {outcome.pathTitle}
          </div>

          {!allDecisionsMade && (
            <div className="mt-4 p-3.5 rounded-lg bg-[#1A130F] border border-[#D9822B]/45 text-xs text-[#D9822B]">
              Some earlier chapter decisions were defaulted. Revisit any chapter in the Memory Map to lock in all five choices.
            </div>
          )}

          <blockquote className="mt-6 py-4 border-y border-white/10 font-display text-xl sm:text-2xl italic text-[#F0F2F2] leading-snug">
            “{outcome.archetypeQuote}”
          </blockquote>

          <div className="mt-6 space-y-4 text-sm sm:text-base text-[#BFC7CB] leading-relaxed">
            <p>{outcome.futureDescription}</p>
            <p className="text-[#899398]">{outcome.historicalSummary}</p>
            <p className="text-[#A6C7A9] font-medium">{outcome.finalArchiveMessage}</p>
          </div>
        </div>

        {/* Personalized Archivist Profile Card */}
        <div className="print-report bg-[#111619]/95 border border-white/15 rounded-xl p-6 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4 pb-5 border-b border-white/10">
            <div>
              <div className="text-xs font-mono-archival text-[#899398]">PERSONALIZED ARCHIVIST PROFILE</div>
              <h3 className="font-display text-2xl font-semibold text-[#F0F2F2] mt-1">
                {outcome.pathId}
              </h3>
              <div className="text-xs font-mono-archival text-[#A6C7A9] mt-1">
                {outcome.visualVariation.atmosphereNote}
              </div>
            </div>
            <div className="text-right font-mono-archival">
              <div className="text-2xl font-semibold text-[#F0F2F2] tabular-nums">{completionPercentage}%</div>
              <div className="text-[11px] text-[#899398]">Archive Completion</div>
            </div>
          </div>

          {/* Influence Scores */}
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { label: 'Human Agency', value: outcome.scores.humanAgency, color: 'bg-[#A6C7A9]' },
              { label: 'Machine Automation', value: outcome.scores.machineAutomation, color: 'bg-[#C95D3A]' },
              { label: 'Symbiotic Synthesis', value: outcome.scores.symbioticSynthesis, color: 'bg-[#BFC7CB]' },
            ].map((score) => (
              <div key={score.label} className="p-3.5 rounded-lg bg-[#090B0D] border border-white/10">
                <div className="flex items-center justify-between text-xs text-[#BFC7CB]">
                  <span>{score.label}</span>
                  <span className="font-mono-archival tabular-nums text-[#F0F2F2]">{score.value}%</span>
                </div>
                <div className="mt-2.5 h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div className={`h-full ${score.color}`} style={{ width: `${score.value}%` }} />
                </div>
              </div>
            ))}
          </div>

          {/* 5 Recorded Choices */}
          <div className="mt-6 pt-5 border-t border-white/10">
            <div className="text-xs font-mono-archival text-[#899398] uppercase tracking-wider mb-3">
              Recorded Decisions & Unlocked Memories
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-2.5">
              {CHAPTERS.map((ch, idx) => {
                const val = state.decisions[ch.id];
                const opt = ch.options.find((o) => o.value === val);
                return (
                  <button
                    key={ch.id}
                    type="button"
                    onClick={() => onNavigateChapter(ch.id)}
                    className="text-left p-3 rounded-lg bg-[#090B0D] border border-white/10 hover:border-[#A6C7A9]/60 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center justify-between text-[11px] font-mono-archival text-[#899398]">
                      <span>CH 0{ch.number}</span>
                      <ArrowUpRight className="w-3 h-3" />
                    </div>
                    <div className="text-xs font-medium text-[#F0F2F2] mt-1">
                      {opt ? opt.label : 'Defaulted'}
                    </div>
                    <div className="text-[11px] text-[#A6C7A9] mt-1 truncate">
                      {outcome.unlockedMemories[idx]}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Artifact, File & Secret Summary */}
          <dl className="mt-6 pt-5 border-t border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-4 text-center font-mono-archival">
            <div>
              <dt className="text-[11px] text-[#899398]">Lost Artifacts</dt>
              <dd className="text-lg text-[#F0F2F2] mt-0.5">{state.discoveredLostArtifacts.length} / {LOST_ARTIFACTS.length}</dd>
            </div>
            <div>
              <dt className="text-[11px] text-[#899398]">Repaired Files</dt>
              <dd className="text-lg text-[#F0F2F2] mt-0.5">{state.repairedFiles.length} / {CORRUPTED_FILES.length}</dd>
            </div>
            <div>
              <dt className="text-[11px] text-[#899398]">Era Artifacts</dt>
              <dd className="text-lg text-[#F0F2F2] mt-0.5">{state.inspectedArtifacts.length} / {ARTIFACTS.length}</dd>
            </div>
            <div>
              <dt className="text-[11px] text-[#899398]">Secret Archives</dt>
              <dd className="text-lg text-[#A6C7A9] mt-0.5">{state.unlockedSecrets.length} / {SECRET_MEMORIES.length}</dd>
            </div>
          </dl>

          {/* Actions */}
          <div className="no-print mt-6 pt-5 border-t border-white/10 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setCompareOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-medium bg-[#F0F2F2] hover:bg-[#A6C7A9] text-[#090B0D] rounded transition-colors cursor-pointer whitespace-nowrap"
            >
              <GitCompare className="w-4 h-4" aria-hidden="true" />
              <span>Compare Decisions (48 Paths)</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadReport}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-medium bg-[#090B0D] border border-white/15 hover:border-white/40 text-[#F0F2F2] rounded transition-colors cursor-pointer whitespace-nowrap"
            >
              <Download className="w-4 h-4" aria-hidden="true" />
              <span>Download Report</span>
            </button>

            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-medium bg-[#090B0D] border border-white/15 hover:border-white/40 text-[#F0F2F2] rounded transition-colors cursor-pointer whitespace-nowrap"
            >
              <Printer className="w-4 h-4" aria-hidden="true" />
              <span>Print Report</span>
            </button>

            <button
              type="button"
              onClick={() => onReplay(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-medium bg-[#090B0D] border border-[#D9822B]/50 hover:border-[#D9822B] text-[#D9822B] rounded transition-colors cursor-pointer whitespace-nowrap"
            >
              <RotateCcw className="w-4 h-4" aria-hidden="true" />
              <span>Replay History</span>
            </button>
          </div>
        </div>

        {/* Closing Statement */}
        <footer className="pb-12 pt-4 text-center sm:text-left">
          <p className="font-display text-lg sm:text-xl text-[#F0F2F2]">
            Technology is what we build. The future is what we choose.
          </p>
          <p className="text-xs font-mono-archival text-[#899398] mt-2">
            HUMAN.EXE · 2075 Digital Archaeology Museum
          </p>
        </footer>
      </div>

      {/* Compare Decisions 48-Path Explorer Modal */}
      {compareOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="compare-paths-title"
          className="no-print fixed inset-0 z-50 bg-[#090B0D]/95 flex items-center justify-center p-4 sm:p-8 overflow-y-auto pointer-events-auto"
        >
          <div className="w-full max-w-5xl bg-[#111619] border border-white/15 rounded-xl p-6 sm:p-8 my-auto max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-4 pb-5 border-b border-white/10">
              <div>
                <div className="text-xs font-mono-archival text-[#A6C7A9]">
                  BRANCHING DECISION ENGINE · 2 × 2 × 2 × 2 × 3 = 48 OUTCOMES
                </div>
                <h2 id="compare-paths-title" className="font-display text-2xl font-semibold text-[#F0F2F2] mt-1">
                  Compare Decisions & Explore All 48 Timelines
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setCompareOpen(false)}
                aria-label="Close comparison explorer"
                className="p-2 rounded-lg border border-white/10 text-[#BFC7CB] hover:text-[#F0F2F2] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-3">
                <div className="text-xs font-mono-archival text-[#899398] uppercase">
                  Toggle Any Choice to Simulate Outcome
                </div>
                {CHAPTERS.map((ch) => (
                  <div key={ch.id} className="p-3 rounded-lg bg-[#090B0D] border border-white/10">
                    <div className="text-[11px] font-mono-archival text-[#899398]">
                      0{ch.number}. {ch.decisionPrompt}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {ch.options.map((opt) => {
                        const active = simDecisions[ch.id] === opt.value;
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() =>
                              setSimDecisions((prev) => ({ ...prev, [ch.id]: opt.value }))
                            }
                            className={`px-3 py-1.5 text-xs rounded border transition-colors cursor-pointer ${
                              active
                                ? 'bg-[#A6C7A9] text-[#090B0D] border-[#A6C7A9] font-medium'
                                : 'bg-[#111619] text-[#BFC7CB] border-white/10 hover:border-white/30'
                            }`}
                          >
                            {opt.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-5 rounded-xl bg-[#090B0D] border border-[#A6C7A9]/40 flex flex-col justify-between gap-4">
                <div>
                  <div className="text-xs font-mono-archival text-[#A6C7A9]">
                    SIMULATED PATH {String(simulatedOutcome.pathIndex).padStart(2, '0')} / 48 · {simulatedOutcome.pathId}
                  </div>
                  <h3 className="font-display text-2xl font-semibold text-[#F0F2F2] mt-2">
                    {simulatedOutcome.archetypeTitle}
                  </h3>
                  <div className="text-sm text-[#BFC7CB] mt-1">{simulatedOutcome.pathTitle}</div>
                  <p className="mt-4 text-xs sm:text-sm text-[#BFC7CB] leading-relaxed">
                    {simulatedOutcome.futureDescription}
                  </p>
                  <p className="mt-3 text-xs text-[#899398] leading-relaxed">
                    {simulatedOutcome.finalArchiveMessage}
                  </p>
                </div>

                <div className="pt-4 border-t border-white/10 grid grid-cols-3 gap-2 text-xs font-mono-archival">
                  <div>
                    <div className="text-[#899398]">Human</div>
                    <div className="text-[#A6C7A9]">{simulatedOutcome.scores.humanAgency}%</div>
                  </div>
                  <div>
                    <div className="text-[#899398]">Machine</div>
                    <div className="text-[#C95D3A]">{simulatedOutcome.scores.machineAutomation}%</div>
                  </div>
                  <div>
                    <div className="text-[#899398]">Symbiotic</div>
                    <div className="text-[#F0F2F2]">{simulatedOutcome.scores.symbioticSynthesis}%</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-white/10">
              <div className="text-xs font-mono-archival text-[#899398] mb-3">
                COMPLETE 48-TIMELINE ARCHIVE INDEX (CLICK ANY PATH TO LOAD INTO SIMULATOR)
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-64 overflow-y-auto pr-1">
                {all48Paths.map((p) => {
                  const isCurrentReal = p.pathIndex === outcome.pathIndex;
                  const isSim = p.pathIndex === simulatedOutcome.pathIndex;
                  return (
                    <button
                      key={p.pathId}
                      type="button"
                      onClick={() => setSimDecisions(p.decisions)}
                      className={`text-left p-2.5 rounded border text-xs transition-colors cursor-pointer ${
                        isSim
                          ? 'bg-[#16221B] border-[#A6C7A9]'
                          : isCurrentReal
                          ? 'bg-[#17181B] border-white/40'
                          : 'bg-[#090B0D] border-white/8 hover:border-white/25'
                      }`}
                    >
                      <div className="flex items-center justify-between font-mono-archival text-[11px] text-[#899398]">
                        <span>#{String(p.pathIndex).padStart(2, '0')} · {p.archetype.toUpperCase()}</span>
                        {isCurrentReal && <span className="text-[#A6C7A9]">YOURS</span>}
                      </div>
                      <div className="text-[#F0F2F2] font-medium truncate mt-0.5">{p.pathTitle}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
