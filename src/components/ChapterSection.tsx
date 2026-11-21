import React, { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import {
  ArrowDown,
  ArrowRight,
  Check,
  Cog,
  Compass,
  Eye,
  Globe2,
  KeyRound,
  Minus,
  Plus,
  RotateCcw,
  Sparkles,
  Terminal,
  Volume2,
  Zap,
} from 'lucide-react';
import {
  ArtifactItem,
  ChapterData,
  ChapterId,
  DecisionsState,
  LostArtifactItem,
} from '../types/archive';
import {
  ARTIFACTS,
  GLOBE_NODES,
  INTERNET_TIMELINE,
  LOST_ARTIFACTS,
  MACHINE_GEARS,
  SECRET_MEMORIES,
} from '../data/artifacts';
import { CorruptedFilesPanel } from './CorruptedFilesPanel';
import { audioEngine } from '../logic/audioEngine';

gsap.registerPlugin(ScrollTrigger);

interface ChapterSectionProps {
  chapter: ChapterData;
  activeStageIndex: number;
  isActiveChapter: boolean;
  decisions: DecisionsState;
  inspectedArtifacts: string[];
  discoveredLostArtifacts: string[];
  repairedFiles: string[];
  unlockedSecrets: string[];
  activatedGearStage: number;
  selectedGlobeNodeId: string | null;
  globeZoom: number;
  reducedMotion: boolean;
  narrationEnabled: boolean;
  whatIfPreview: { chapter: number; option: string } | null;
  onStageChange: (chapterNum: number, stageIndex: number, progress: number) => void;
  onSelectArtifact: (artifact: ArtifactItem) => void;
  onRevisitLostArtifact: (lost: LostArtifactItem) => void;
  onSelectDecision: (chapterId: `ch${1 | 2 | 3 | 4 | 5}`, value: string) => void;
  onSetWhatIfPreview: (preview: { chapter: number; option: string } | null) => void;
  onTriggerTimeFracture: () => void;
  onActivateGear: (stage: number) => void;
  onSelectGlobeNode: (nodeId: string) => void;
  onChangeGlobeZoom: (delta: number) => void;
  onRepairFile: (fileId: string) => void;
  onVisitTerminalCode: () => void;
  onNavigateNext: (nextId: ChapterId) => void;
}

const TERMINAL_MODULES: Record<'MEMORY' | 'CONNECTION' | 'CODE', { title: string; body: string; fact: string }> = {
  MEMORY: {
    title: 'Magnetic & Silicon Memory',
    body: 'From hand-woven ferrite core rings to photolithographic DRAM, memory gave machines continuity across time. What humanity once carried only in oral story and paper could now be indexed in microseconds.',
    fact: 'Early 1950s core memory planes were literally hand-threaded under magnifying lenses by skilled textile workers.',
  },
  CONNECTION: {
    title: 'Teleprinter to Packet Switching',
    body: 'Before global networks, isolated computers exchanged punched paper tape by courier. Connecting terminals over phone lines turned solitary calculators into shared civic instruments.',
    fact: 'In 1969, packet switching proved messages could break into pieces, route around damage, and reassemble intact.',
  },
  CODE: {
    title: 'Symbolic Logic & Human Intent',
    body: 'Every line of code encodes a human priority—what is measured, who gets access, and what edge cases are ignored. Algorithms are frozen human decisions descended directly from Jacquard loom cards and Babbage gears.',
    fact: 'Grace Hopper’s compiler work in 1952 proved code could be written in human-readable words rather than raw octal switches.',
  },
};

export const ChapterSection: React.FC<ChapterSectionProps> = ({
  chapter,
  activeStageIndex,
  isActiveChapter,
  decisions,
  inspectedArtifacts,
  discoveredLostArtifacts,
  repairedFiles,
  unlockedSecrets,
  activatedGearStage,
  selectedGlobeNodeId,
  globeZoom,
  reducedMotion,
  narrationEnabled,
  whatIfPreview,
  onStageChange,
  onSelectArtifact,
  onRevisitLostArtifact,
  onSelectDecision,
  onSetWhatIfPreview,
  onTriggerTimeFracture,
  onActivateGear,
  onSelectGlobeNode,
  onChangeGlobeZoom,
  onRepairFile,
  onVisitTerminalCode,
  onNavigateNext,
}) => {
  const sectionRef = useRef<HTMLElement | null>(null);
  const timelineWrapRef = useRef<HTMLDivElement | null>(null);
  const timelineTrackRef = useRef<HTMLDivElement | null>(null);

  const [terminalTab, setTerminalTab] = useState<'MEMORY' | 'CONNECTION' | 'CODE'>('MEMORY');
  const [terminalLinesVisible, setTerminalLinesVisible] = useState(5);

  const chapterArtifacts = ARTIFACTS.filter((a) => a.chapter === chapter.number);
  const chapterLost: LostArtifactItem | undefined = LOST_ARTIFACTS.find((l) => l.chapter === chapter.number);
  const isLostFound = chapterLost ? discoveredLostArtifacts.includes(chapterLost.id) : false;

  const prevChoiceKey =
    chapter.number > 1 ? decisions[`ch${chapter.number - 1}` as keyof DecisionsState] : undefined;
  const consequenceBlock =
    prevChoiceKey && chapter.consequenceFromPrevious
      ? chapter.consequenceFromPrevious[prevChoiceKey]
      : undefined;

  const currentDecision = decisions[chapter.id];
  const activeWhatIf =
    whatIfPreview && whatIfPreview.chapter === chapter.number
      ? chapter.options.find((o) => o.value === whatIfPreview.option)
      : null;

  // 6-Stage ScrollTrigger choreography + staggered reveals
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;

    const ctx = gsap.context(() => {
      const stageNodes = el.querySelectorAll<HTMLElement>('[data-stage-index]');
      stageNodes.forEach((stageNode) => {
        const idx = Number(stageNode.dataset.stageIndex || 1);
        ScrollTrigger.create({
          trigger: stageNode,
          start: 'top 58%',
          end: 'bottom 42%',
          onEnter: () => onStageChange(chapter.number, idx, 0),
          onEnterBack: () => onStageChange(chapter.number, idx, 1),
          onUpdate: (self) => onStageChange(chapter.number, idx, self.progress),
        });
      });

      if (reducedMotion) {
        const revealEls = el.querySelectorAll('.gs-reveal');
        gsap.set(revealEls, { opacity: 1, y: 0, clearProps: 'transform' });
      } else {
        const revealEls = el.querySelectorAll('.gs-reveal');
        revealEls.forEach((node) => {
          gsap.fromTo(
            node,
            { y: 20, opacity: 0 },
            {
              y: 0,
              opacity: 1,
              duration: 0.55,
              ease: 'power3.out',
              scrollTrigger: {
                trigger: node,
                start: 'top 86%',
                toggleActions: 'play none none reverse',
              },
            }
          );
        });
      }
    }, el);

    return () => ctx.revert();
  }, [chapter.number, reducedMotion, onStageChange]);

  // Chapter 4 horizontal timeline sequence
  useEffect(() => {
    if (chapter.number !== 4 || reducedMotion) return;
    const wrap = timelineWrapRef.current;
    const track = timelineTrackRef.current;
    if (!wrap || !track || window.innerWidth < 768) return;

    const ctx = gsap.context(() => {
      const scrollDist = Math.max(0, track.scrollWidth - wrap.clientWidth);
      if (scrollDist <= 20) return;
      gsap.to(track, {
        x: -scrollDist,
        ease: 'none',
        scrollTrigger: {
          trigger: wrap,
          start: 'top 65%',
          end: 'bottom 25%',
          scrub: 0.6,
        },
      });
    }, wrap);

    return () => ctx.revert();
  }, [chapter.number, reducedMotion, repairedFiles]);

  // Chapter 3 animated terminal boot lines
  useEffect(() => {
    if (chapter.number !== 3) return;
    if (reducedMotion) {
      setTerminalLinesVisible(5);
      return;
    }
    setTerminalLinesVisible(1);
    const id = window.setInterval(() => {
      setTerminalLinesVisible((prev) => {
        if (prev >= 5) {
          window.clearInterval(id);
          return 5;
        }
        return prev + 1;
      });
    }, 360);
    return () => window.clearInterval(id);
  }, [chapter.number, reducedMotion]);

  const activeGear = MACHINE_GEARS.find((g) => g.index === activatedGearStage) ?? MACHINE_GEARS[0];
  const activeGlobeNode = GLOBE_NODES.find((n) => n.id === selectedGlobeNodeId) ?? GLOBE_NODES[1];
  const nextChapterId: ChapterId = chapter.number < 5 ? (`ch${chapter.number + 1}` as ChapterId) : 'ending';

  const eraAccentText =
    chapter.number === 1
      ? 'text-[#D9822B]'
      : chapter.number === 2
      ? 'text-[#BFC7CB]'
      : 'text-[#A6C7A9]';

  const renderArtifactShelf = () => (
    <div className="gs-reveal bg-[#090B0D]/92 border border-white/10 rounded-xl p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-white/10">
        <h3 className="text-xs font-mono-archival uppercase tracking-wider text-[#BFC7CB]">
          {chapter.number <= 2 ? 'Horizontal Artifact Shelf · Click in 3D or Below' : '3D Artifacts · Click in Scene or Select Below'}
        </h3>
        <span className="text-xs font-mono-archival text-[#899398]">
          {chapterArtifacts.filter((a) => inspectedArtifacts.includes(a.id)).length} / {chapterArtifacts.length} Inspected
        </span>
      </div>

      <div
        className={
          chapterArtifacts.length > 3
            ? 'mt-4 flex gap-3 overflow-x-auto pb-2 snap-x'
            : 'mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2.5'
        }
      >
        {chapterArtifacts.map((art) => {
          const inspected = inspectedArtifacts.includes(art.id);
          return (
            <button
              key={art.id}
              type="button"
              onClick={() => onSelectArtifact(art)}
              data-cursor-kind="discovery"
              data-cursor-label="AUTOPSY"
              className={`museum-card-hover text-left p-3.5 rounded-lg border transition-colors cursor-pointer snap-start ${
                chapterArtifacts.length > 3 ? 'min-w-[195px] shrink-0' : ''
              } ${
                inspected
                  ? 'bg-[#141C18] border-[#A6C7A9]/50 hover:border-[#A6C7A9]'
                  : 'bg-[#111619] border-white/10 hover:border-white/35'
              }`}
            >
              <div className="flex items-center justify-between text-[11px] font-mono-archival text-[#899398]">
                <span>{art.accessionCode}</span>
                {inspected && <Check className="w-3.5 h-3.5 text-[#A6C7A9]" />}
              </div>
              <div className="text-sm font-medium text-[#F0F2F2] mt-1">{art.name}</div>
              <div className="text-[11px] text-[#899398] mt-0.5">{art.era}</div>
              {art.perspectiveTag && (
                <div className="text-[11px] text-[#A6C7A9] mt-1">{art.perspectiveTag}</div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );

  const renderLostSignalCard = () =>
    chapterLost && (
      <div
        data-cursor-kind="discovery"
        data-cursor-label={isLostFound ? 'MEMORY' : 'SIGNAL'}
        className="gs-reveal museum-card-hover bg-[#090B0D]/92 border border-[#D9822B]/35 rounded-xl p-5 flex flex-wrap items-center justify-between gap-3"
      >
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-mono-archival text-[#D9822B] flex items-center gap-1.5">
            <Compass className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{isLostFound ? `${chapterLost.memoryCode} · RECOVERED` : 'UNINDEXED LOST MEMORY SIGNAL'}</span>
          </div>
          <p className="text-xs text-[#899398] mt-1 leading-relaxed">
            {isLostFound ? `${chapterLost.title} — ${chapterLost.name}` : chapterLost.hint}
          </p>
        </div>
        {isLostFound && (
          <button
            type="button"
            onClick={() => onRevisitLostArtifact(chapterLost)}
            data-magnetic="true"
            className="px-3 py-1.5 text-xs border border-[#D9822B]/50 text-[#D9822B] hover:bg-[#D9822B]/15 rounded transition-colors cursor-pointer whitespace-nowrap"
          >
            Revisit Memory
          </button>
        )}
      </div>
    );

  return (
    <section
      ref={sectionRef}
      id={chapter.id}
      aria-labelledby={`${chapter.id}-heading`}
      className="relative py-20 sm:py-28 px-4 sm:px-10 lg:px-16 z-10 pointer-events-none"
    >
      {/* Sticky Chapter & Stage Telemetry Ribbon */}
      {isActiveChapter && (
        <div className="no-print hidden md:flex sticky top-16 z-20 mb-8 w-fit pointer-events-auto bg-[#090B0D]/90 border border-white/10 rounded-lg px-3.5 py-2 items-center gap-3 text-[11px] font-mono-archival">
          <span className={eraAccentText}>CH 0{chapter.number} · {chapter.period}</span>
          <span className="text-[#899398]">·</span>
          <span className="text-[#F0F2F2]">STAGE 0{activeStageIndex}/06</span>
          <span className="text-[#899398]">·</span>
          <span className="text-[#899398]">{chapter.movementLanguage}</span>
        </div>
      )}

      <div className="space-y-16 sm:space-y-24">
        {/* STAGE 1: Full-Viewport Cinematic Chapter Introduction */}
        <div
          data-stage-index="1"
          className="min-h-[82vh] flex flex-col justify-center max-w-[590px] pointer-events-auto space-y-6"
        >
          <header className="gs-reveal bg-[#090B0D]/92 border border-white/10 rounded-xl p-6 sm:p-9">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className={`text-xs font-mono-archival tracking-[0.18em] uppercase ${eraAccentText}`}>
                Chapter 0{chapter.number} · {chapter.period}
              </div>
              {narrationEnabled && (
                <button
                  type="button"
                  onClick={() =>
                    audioEngine.speak(
                      `Chapter ${chapter.number}: ${chapter.title}. ${chapter.subtitle}. ${chapter.story.join(' ')}`
                    )
                  }
                  className="inline-flex items-center gap-1.5 text-[11px] font-mono-archival text-[#A6C7A9] hover:text-[#F0F2F2] cursor-pointer"
                >
                  <Volume2 className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Narrate Era</span>
                </button>
              )}
            </div>

            <h2
              id={`${chapter.id}-heading`}
              className="font-display text-3xl sm:text-5xl font-semibold text-[#F0F2F2] mt-3 leading-[1.06]"
            >
              {chapter.title}
            </h2>
            <p className="mt-3 text-base sm:text-lg text-[#BFC7CB] font-medium">
              {chapter.subtitle}
            </p>
            <div className="mt-3 text-xs font-mono-archival text-[#899398]">
              {chapter.environmentNote}
            </div>

            <div className="mt-6 pt-5 border-t border-white/10 space-y-3 text-sm sm:text-base text-[#BFC7CB] leading-relaxed">
              {chapter.story.map((para) => (
                <p key={para}>{para}</p>
              ))}
            </div>

            {chapter.stages[0] && (
              <div className="mt-6 pt-5 border-t border-white/10">
                <div className="text-[11px] font-mono-archival text-[#A6C7A9]">{chapter.stages[0].code}</div>
                <h3 className="font-display text-xl font-semibold text-[#F0F2F2] mt-1">{chapter.stages[0].title}</h3>
                {chapter.stages[0].body.map((b) => (
                  <p key={b} className="mt-2 text-xs sm:text-sm text-[#899398] leading-relaxed">{b}</p>
                ))}
              </div>
            )}

            <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between text-[11px] font-mono-archival text-[#899398]">
              <span>6 ARCHIVAL SCENES IN THIS ERA</span>
              <span className="inline-flex items-center gap-1.5 text-[#A6C7A9]">
                <ArrowDown className="w-3 h-3" aria-hidden="true" />
                <span>Scroll to descend</span>
              </span>
            </div>
          </header>

          {consequenceBlock && (
            <div className="gs-reveal bg-[#111619]/94 border border-[#A6C7A9]/35 rounded-xl p-5">
              <div className="text-[11px] font-mono-archival text-[#A6C7A9] uppercase tracking-wider">
                {consequenceBlock.badge}
              </div>
              <h3 className="font-display text-lg font-semibold text-[#F0F2F2] mt-1">
                {consequenceBlock.heading}
              </h3>
              <p className="mt-1.5 text-xs sm:text-sm text-[#BFC7CB] leading-relaxed">
                {consequenceBlock.detail}
              </p>
              <div className="mt-2.5 text-[11px] font-mono-archival text-[#899398]">
                3D Environment Shift · {consequenceBlock.environmentShift}
              </div>
            </div>
          )}
        </div>

        {/* STAGES 2–5: Deep Scroll Storytelling Beats */}
        {chapter.stages.slice(1, 5).map((stage) => {
          const isRightBeat = stage.depthLayer === 'right';
          return (
            <div
              key={stage.index}
              data-stage-index={stage.index}
              className={`pointer-events-auto space-y-6 ${
                stage.depthLayer === 'center'
                  ? 'max-w-3xl'
                  : isRightBeat
                  ? 'max-w-[540px] lg:ml-auto lg:mr-14'
                  : 'max-w-[570px]'
              }`}
            >
              <div className="gs-reveal bg-[#090B0D]/90 border border-white/10 rounded-xl p-6 sm:p-7">
                <div className="flex items-center justify-between gap-2 text-[11px] font-mono-archival text-[#899398]">
                  <span className={eraAccentText}>{stage.code}</span>
                  <span>{stage.kicker}</span>
                </div>
                <h3 className="font-display text-2xl sm:text-3xl font-semibold text-[#F0F2F2] mt-2">
                  {stage.title}
                </h3>
                <div className="mt-3 space-y-2.5 text-sm text-[#BFC7CB] leading-relaxed">
                  {stage.body.map((b) => (
                    <p key={b}>{b}</p>
                  ))}
                </div>
              </div>

              {/* Contextual Interactive Modules Embedded Into Their Natural Scroll Stages */}
              {chapter.number === 1 && stage.index === 4 && renderArtifactShelf()}
              {chapter.number === 1 && stage.index === 5 && (
                <div className="space-y-4">
                  {renderLostSignalCard()}
                  <div className="gs-reveal bg-[#0E1512]/90 border border-[#A6C7A9]/30 rounded-xl p-4 flex items-start gap-3">
                    <KeyRound className="w-4 h-4 text-[#A6C7A9] mt-0.5 shrink-0" aria-hidden="true" />
                    <div className="text-xs text-[#BFC7CB] leading-relaxed">
                      <span className="font-mono-archival text-[#A6C7A9] block mb-0.5">
                        {unlockedSecrets.includes('secret-001') ? 'SECRET ARCHIVE 01 · UNLOCKED' : 'ANOMALY SCAN'}
                      </span>
                      {unlockedSecrets.includes('secret-001')
                        ? SECRET_MEMORIES[0].narrative
                        : SECRET_MEMORIES[0].triggerHint}
                    </div>
                  </div>
                </div>
              )}

              {chapter.number === 2 && stage.index === 3 && (
                <div className="gs-reveal bg-[#090B0D]/92 border border-white/10 rounded-xl p-5 sm:p-6">
                  <div className="flex items-center justify-between gap-2 pb-3 border-b border-white/10">
                    <div className="flex items-center gap-2 text-xs font-mono-archival text-[#D9822B]">
                      <Cog className="w-4 h-4" aria-hidden="true" />
                      <span>THE MACHINE ROOM · INTERLOCKING GEAR TRAIN</span>
                    </div>
                    <span className="text-xs font-mono-archival text-[#899398]">Stage {activatedGearStage}/4</span>
                  </div>

                  <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {MACHINE_GEARS.map((gear) => {
                      const active = gear.index <= activatedGearStage;
                      return (
                        <button
                          key={gear.id}
                          type="button"
                          onClick={() => onActivateGear(gear.index)}
                          className={`p-3 rounded-lg border text-left transition-colors cursor-pointer ${
                            active
                              ? 'bg-[#1B1712] border-[#D9822B]/60 text-[#F0F2F2]'
                              : 'bg-[#111619] border-white/10 text-[#899398] hover:border-white/30'
                          }`}
                        >
                          <div className="text-[11px] font-mono-archival">{gear.year}</div>
                          <div className="text-xs font-medium mt-1">{gear.name}</div>
                        </button>
                      );
                    })}
                  </div>

                  <div className="mt-4 p-4 rounded-lg bg-[#111619] border border-white/10">
                    <div className="text-xs font-mono-archival text-[#D9822B]">
                      STAGE 0{activeGear.index} · {activeGear.name}
                    </div>
                    <p className="text-xs sm:text-sm text-[#F0F2F2] mt-1">{activeGear.mechanism}</p>
                    <p className="text-xs text-[#A6C7A9] mt-2">Chain Effect: {activeGear.chainEffect}</p>
                  </div>
                </div>
              )}
              {chapter.number === 2 && stage.index === 5 && renderArtifactShelf()}

              {chapter.number === 3 && stage.index === 3 && renderArtifactShelf()}
              {chapter.number === 3 && stage.index === 4 && (
                <div className="gs-reveal bg-[#060B08]/95 border border-[#A6C7A9]/35 rounded-xl p-5 sm:p-6 font-mono-archival relative overflow-hidden">
                  <div className="crt-scanlines absolute inset-0 pointer-events-none opacity-40" />
                  <div className="relative z-10">
                    <div className="flex items-center justify-between pb-3 border-b border-[#A6C7A9]/20 text-xs text-[#A6C7A9]">
                      <span className="inline-flex items-center gap-2">
                        <Terminal className="w-4 h-4" aria-hidden="true" />
                        THE MEMORY TERMINAL
                      </span>
                      <span>1978 CRT CONSOLE</span>
                    </div>

                    <div className="mt-3 space-y-1.5 text-xs text-[#A6C7A9]">
                      {[
                        '> MEMORY MODULE ACTIVATED',
                        '> INFORMATION STORED',
                        '> DATA PROCESSING',
                        '> HUMAN KNOWLEDGE EXPANDING',
                        '> ETHICAL QUESTION DETECTED',
                      ]
                        .slice(0, terminalLinesVisible)
                        .map((line) => (
                          <div key={line}>{line}</div>
                        ))}
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {(['MEMORY', 'CONNECTION', 'CODE'] as const).map((key) => (
                        <button
                          key={key}
                          type="button"
                          onClick={() => {
                            setTerminalTab(key);
                            if (key === 'CODE') onVisitTerminalCode();
                          }}
                          className={`px-3.5 py-1.5 text-xs rounded border transition-colors cursor-pointer ${
                            terminalTab === key
                              ? 'bg-[#A6C7A9] text-[#090B0D] border-[#A6C7A9] font-semibold'
                              : 'bg-[#0C1410] text-[#A6C7A9] border-[#A6C7A9]/30 hover:border-[#A6C7A9]'
                          }`}
                        >
                          {key}
                        </button>
                      ))}
                    </div>

                    <div className="mt-4 p-4 rounded bg-[#0C1410] border border-[#A6C7A9]/25 font-sans">
                      <div className="text-xs font-mono-archival text-[#A6C7A9]">
                        ENTRY // {TERMINAL_MODULES[terminalTab].title}
                      </div>
                      <p className="mt-1.5 text-xs sm:text-sm text-[#F0F2F2] leading-relaxed">
                        {TERMINAL_MODULES[terminalTab].body}
                      </p>
                      <p className="mt-2 text-xs text-[#899398]">
                        Archive Note: {TERMINAL_MODULES[terminalTab].fact}
                      </p>
                    </div>
                  </div>
                </div>
              )}
              {chapter.number === 3 && stage.index === 5 && (
                <CorruptedFilesPanel
                  repairedFiles={repairedFiles}
                  discoveredLostArtifacts={discoveredLostArtifacts}
                  onRepairFile={onRepairFile}
                  filterChapter={3}
                  reducedMotion={reducedMotion}
                />
              )}

              {chapter.number === 4 && stage.index === 2 && (
                <div className="gs-reveal bg-[#090B0D]/92 border border-white/10 rounded-xl p-5 sm:p-6">
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-white/10">
                    <div className="flex items-center gap-2 text-xs font-mono-archival text-[#A6C7A9]">
                      <Globe2 className="w-4 h-4" aria-hidden="true" />
                      <span>GLOBAL NETWORK · DRAG 3D GLOBE</span>
                    </div>
                    <div className="flex items-center gap-1.5 font-mono-archival text-xs">
                      <button
                        type="button"
                        onClick={() => onChangeGlobeZoom(-0.1)}
                        aria-label="Zoom out globe"
                        className="p-1.5 rounded border border-white/15 text-[#BFC7CB] hover:text-[#F0F2F2] cursor-pointer"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="px-1.5 text-[11px] text-[#899398] tabular-nums">
                        {Math.round(globeZoom * 100)}%
                      </span>
                      <button
                        type="button"
                        onClick={() => onChangeGlobeZoom(0.1)}
                        aria-label="Zoom in globe"
                        className="p-1.5 rounded border border-white/15 text-[#BFC7CB] hover:text-[#F0F2F2] cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {GLOBE_NODES.map((node) => {
                      const selected = activeGlobeNode.id === node.id;
                      return (
                        <button
                          key={node.id}
                          type="button"
                          onClick={() => onSelectGlobeNode(node.id)}
                          className={`px-3 py-1.5 text-xs rounded border transition-colors cursor-pointer whitespace-nowrap ${
                            selected
                              ? 'bg-[#A6C7A9] text-[#090B0D] border-[#A6C7A9] font-medium'
                              : 'bg-[#111619] text-[#BFC7CB] border-white/10 hover:border-white/30'
                          }`}
                        >
                          {node.city}
                        </button>
                      );
                    })}
                  </div>

                  <div className="mt-4 p-4 rounded-lg bg-[#111619] border border-white/10">
                    <div className="text-xs font-mono-archival text-[#A6C7A9]">
                      {activeGlobeNode.year} · {activeGlobeNode.city}
                    </div>
                    <h4 className="text-base font-semibold text-[#F0F2F2] mt-1">{activeGlobeNode.title}</h4>
                    <p className="text-xs sm:text-sm text-[#BFC7CB] mt-1.5 leading-relaxed">
                      {activeGlobeNode.description}
                    </p>
                    <p className="text-xs text-[#899398] mt-2">Legacy: {activeGlobeNode.legacy}</p>
                  </div>
                </div>
              )}
              {chapter.number === 4 && stage.index === 3 && (
                <div className="space-y-6">
                  <div
                    ref={timelineWrapRef}
                    className="bg-[#090B0D]/92 border border-white/10 rounded-xl p-5 overflow-hidden"
                  >
                    <div className="text-xs font-mono-archival text-[#899398] mb-3">
                      NETWORK CHRONICLE · 1969–2020 {repairedFiles.includes('file-arpanet-69') ? '· FULL RECORD VERIFIED' : '· PARTIAL STREAM'}
                    </div>
                    <div ref={timelineTrackRef} className="flex gap-3 overflow-x-auto md:overflow-visible pb-2">
                      {INTERNET_TIMELINE.map((item) => (
                        <div
                          key={item.year}
                          className="min-w-[210px] shrink-0 p-3.5 rounded-lg bg-[#111619] border border-white/10"
                        >
                          <div className="text-xs font-mono-archival text-[#A6C7A9]">{item.year}</div>
                          <div className="text-sm font-medium text-[#F0F2F2] mt-1">{item.label}</div>
                          <p className="text-xs text-[#899398] mt-1.5 leading-relaxed">{item.detail}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                  <CorruptedFilesPanel
                    repairedFiles={repairedFiles}
                    discoveredLostArtifacts={discoveredLostArtifacts}
                    onRepairFile={onRepairFile}
                    filterChapter={4}
                    reducedMotion={reducedMotion}
                  />
                </div>
              )}
              {chapter.number === 4 && stage.index === 4 && renderArtifactShelf()}
              {chapter.number === 4 && stage.index === 5 && (
                <div className="space-y-4">
                  {renderLostSignalCard()}
                  <div className="gs-reveal bg-[#0E1512]/90 border border-[#A6C7A9]/30 rounded-xl p-4 flex items-start gap-3">
                    <KeyRound className="w-4 h-4 text-[#A6C7A9] mt-0.5 shrink-0" aria-hidden="true" />
                    <div className="text-xs text-[#BFC7CB] leading-relaxed">
                      <span className="font-mono-archival text-[#A6C7A9] block mb-0.5">
                        {unlockedSecrets.includes('secret-004') ? 'SECRET ARCHIVE 04 · UNLOCKED' : 'SUBSEA TELEMETRY ANOMALY'}
                      </span>
                      {unlockedSecrets.includes('secret-004')
                        ? SECRET_MEMORIES.find((s) => s.id === 'secret-004')?.narrative
                        : SECRET_MEMORIES.find((s) => s.id === 'secret-004')?.triggerHint}
                    </div>
                  </div>
                </div>
              )}

              {chapter.number === 5 && stage.index === 3 && renderArtifactShelf()}
              {chapter.number === 5 && stage.index === 5 && (
                <div className="space-y-6">
                  {renderLostSignalCard()}
                  <CorruptedFilesPanel
                    repairedFiles={repairedFiles}
                    discoveredLostArtifacts={discoveredLostArtifacts}
                    onRepairFile={onRepairFile}
                    filterChapter={5}
                    reducedMotion={reducedMotion}
                  />
                </div>
              )}

              <div className="hidden sm:flex items-center gap-1.5 text-[11px] font-mono-archival text-[#899398]/75">
                <ArrowDown className="w-3 h-3" aria-hidden="true" />
                <span>Scroll to continue</span>
              </div>
            </div>
          );
        })}

        {/* STAGE 6: Lost Signal (for Ch2 & Ch3) + Era Decision Panel */}
        <div data-stage-index="6" className="max-w-[570px] pointer-events-auto space-y-6">
          {(chapter.number === 2 || chapter.number === 3) && renderLostSignalCard()}

          <div className="gs-reveal bg-[#111619]/95 border border-white/15 rounded-xl p-6 sm:p-7">
            <div className="text-xs font-mono-archival text-[#A6C7A9] uppercase tracking-wider">
              {chapter.stages[5]?.code ?? `Archive Decision 0${chapter.number}`}
            </div>
            <h3 className="font-display text-xl sm:text-2xl font-semibold text-[#F0F2F2] mt-1.5">
              {chapter.decisionPrompt}
            </h3>

            <div className="mt-5 space-y-3">
              {chapter.options.map((opt) => {
                const isSelected = currentDecision === opt.value;
                const isPreviewing = activeWhatIf?.value === opt.value;
                return (
                  <div
                    key={opt.value}
                    className={`rounded-lg border p-4 transition-colors ${
                      isSelected
                        ? 'bg-[#15201A] border-[#A6C7A9]'
                        : isPreviewing
                        ? 'bg-[#1D1612] border-[#D9822B]'
                        : 'bg-[#090B0D] border-white/10'
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <div className="text-[11px] font-mono-archival text-[#899398]">
                          {opt.shortTag}
                        </div>
                        <div className="text-base font-medium text-[#F0F2F2]">{opt.label}</div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            if (!isPreviewing) onTriggerTimeFracture();
                            onSetWhatIfPreview(
                              isPreviewing ? null : { chapter: chapter.number, option: opt.value }
                            );
                          }}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs border rounded transition-colors cursor-pointer whitespace-nowrap ${
                            isPreviewing
                              ? 'border-[#D9822B] text-[#D9822B] bg-[#D9822B]/10'
                              : 'border-white/15 text-[#BFC7CB] hover:text-[#F0F2F2] hover:border-white/35'
                          }`}
                        >
                          {isPreviewing ? (
                            <Eye className="w-3.5 h-3.5" aria-hidden="true" />
                          ) : (
                            <Zap className="w-3.5 h-3.5 text-[#D9822B]" aria-hidden="true" />
                          )}
                          <span>{isPreviewing ? 'Fracture Active' : 'Time Fracture'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            onSetWhatIfPreview(null);
                            onSelectDecision(chapter.id, opt.value);
                          }}
                          data-magnetic="true"
                          className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium rounded transition-colors cursor-pointer whitespace-nowrap ${
                            isSelected
                              ? 'bg-[#A6C7A9] text-[#090B0D]'
                              : 'bg-[#F0F2F2] text-[#090B0D] hover:bg-[#A6C7A9]'
                          }`}
                        >
                          {isSelected && <Check className="w-3.5 h-3.5" aria-hidden="true" />}
                          <span>{isSelected ? 'Confirmed' : 'Choose'}</span>
                        </button>
                      </div>
                    </div>

                    <p className="mt-2.5 text-xs sm:text-sm text-[#BFC7CB] leading-relaxed">
                      {opt.consequenceSummary}
                    </p>
                  </div>
                );
              })}
            </div>

            {activeWhatIf && (
              <div className="mt-4 p-4 rounded-lg bg-[#1A130F] border border-[#D9822B]/60">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 text-xs font-mono-archival text-[#D9822B]">
                    <Zap className="w-3.5 h-3.5" aria-hidden="true" />
                    TIME FRACTURE PREVIEW · {activeWhatIf.label}
                  </span>
                  <button
                    type="button"
                    onClick={() => onSetWhatIfPreview(null)}
                    className="inline-flex items-center gap-1.5 text-xs text-[#F0F2F2] hover:text-[#A6C7A9] cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Return to My Timeline</span>
                  </button>
                </div>
                <p className="mt-2 text-xs sm:text-sm text-[#F0F2F2] leading-relaxed">
                  {activeWhatIf.whatIfNarrative}
                </p>
                <div className="mt-2 text-xs text-[#BFC7CB]">
                  Visual Shift: {activeWhatIf.whatIfVisualCue}
                </div>
                <div className="mt-1 text-xs font-mono-archival text-[#D9822B]">
                  Divergent Consequence: {activeWhatIf.whatIfConsequence}
                </div>
              </div>
            )}

            <div className="mt-6 pt-5 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <p className="text-xs text-[#899398] italic max-w-xs">{chapter.transitionText}</p>
              <button
                type="button"
                onClick={() => onNavigateNext(nextChapterId)}
                data-magnetic="true"
                data-cursor-kind="nav"
                data-cursor-label={chapter.number < 5 ? `CH 0${chapter.number + 1}` : '2075'}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-xs sm:text-sm font-medium bg-[#BFC7CB] hover:bg-[#F0F2F2] text-[#090B0D] rounded transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                <span>{chapter.number < 5 ? `Enter Chapter 0${chapter.number + 1}` : 'Enter Archive Core'}</span>
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
