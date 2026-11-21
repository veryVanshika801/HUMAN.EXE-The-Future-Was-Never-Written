import React, { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ArrowDown, ArrowRight, Info, SlidersHorizontal, Terminal, Volume2, VolumeX, X } from 'lucide-react';
import { ARTIFACTS, CORRUPTED_FILES, LOST_ARTIFACTS, SECRET_MEMORIES } from '../data/artifacts';
import { ArchiveProgressState } from '../types/archive';

gsap.registerPlugin(ScrollTrigger);

interface OpeningSequenceProps {
  state: ArchiveProgressState;
  completionPercentage: number;
  currentSceneIndex: number;
  onSceneChange: (sceneIndex: number, progress: number) => void;
  onEnterArchive: () => void;
  onSkipIntro: () => void;
  onToggleSound: () => void;
  onOpenSoundPanel: () => void;
  onToggleReducedMotion: () => void;
}

const OPENING_SCENES = [
  {
    index: 1,
    code: 'SCENE 01 · THE VOID',
    headline: 'Before the archive opens, only signal and metal remain.',
    caption: 'Out of 2075 darkness, an obsidian memory core initializes.',
  },
  {
    index: 2,
    code: 'SCENE 02 · THE FIRST MEMORY',
    headline: 'We built machines to make life easier.',
    caption: 'Reflections of firelight, forged iron, and human labor surface across its polished shell.',
  },
  {
    index: 3,
    code: 'SCENE 03 · THE CONNECTION',
    headline: 'We built networks to bring the world closer.',
    caption: 'Metallic filaments branch outward, linking distant voices into a planetary lattice.',
  },
  {
    index: 4,
    code: 'SCENE 04 · THE INTELLIGENCE',
    headline: "We built intelligence to answer questions we couldn't.",
    caption: 'Network lines converge inward—forming an inner synthetic architecture.',
  },
  {
    index: 5,
    code: 'SCENE 05 · THE QUESTION',
    headline: 'BUT WHO WAS TECHNOLOGY BUILT FOR?',
    caption: 'Every motor pauses. Every signal falls silent so only the human question remains.',
  },
  {
    index: 6,
    code: 'SCENE 06 · ARCHIVE ACCESS',
    headline: 'THE FUTURE WAS NEVER WRITTEN.',
    caption: 'The metallic core opens. Step inside five eras of human invention and decide what progress means.',
  },
];

export const OpeningSequence: React.FC<OpeningSequenceProps> = ({
  state,
  completionPercentage,
  currentSceneIndex,
  onSceneChange,
  onEnterArchive,
  onSkipIntro,
  onToggleSound,
  onOpenSoundPanel,
  onToggleReducedMotion,
}) => {
  const wrapperRef = useRef<HTMLElement | null>(null);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [logOpen, setLogOpen] = useState(false);

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    if (state.reducedMotion) {
      onSceneChange(6, 1);
      return;
    }

    const trigger = ScrollTrigger.create({
      trigger: el,
      start: 'top top',
      end: 'bottom bottom',
      onUpdate: (self) => {
        const scaled = self.progress * 6;
        const idx = Math.min(6, Math.max(1, Math.floor(scaled) + 1));
        const localProgress = Math.min(1, Math.max(0, scaled - (idx - 1)));
        onSceneChange(idx, localProgress);
      },
    });

    return () => trigger.kill();
  }, [state.reducedMotion, onSceneChange]);

  const activeIdx = state.reducedMotion ? 6 : currentSceneIndex;
  const activeScene = OPENING_SCENES[Math.min(5, Math.max(0, activeIdx - 1))];

  return (
    <section
      ref={wrapperRef}
      id="intro"
      className={`relative z-20 pointer-events-none ${
        state.reducedMotion ? 'min-h-screen' : 'min-h-[340vh]'
      }`}
    >
      <div className="sticky top-0 min-h-screen pt-20 pb-8 px-5 sm:px-10 lg:px-16 flex flex-col justify-between">
        {/* Top Scene Progress Line */}
        <div className="flex items-center justify-between gap-4 pointer-events-auto max-w-xl">
          <div className="text-xs font-mono-archival text-[#A6C7A9] tracking-[0.2em] uppercase">
            Year 2075 · Digital Archaeology Museum
          </div>
          <div className="text-[11px] font-mono-archival text-[#899398] tabular-nums">
            {activeScene.index}/6
          </div>
        </div>

        {/* Left-aligned Editorial Column keeping center-right 3D sphere unobstructed */}
        <div className="max-w-xl my-auto pt-36 sm:pt-44 lg:pt-0 pointer-events-auto">
          <div className="bg-[#090B0D]/86 lg:bg-transparent border border-white/10 lg:border-0 rounded-xl p-5 sm:p-6 lg:p-0">
            <div className="text-xs font-mono-archival text-[#899398] tracking-[0.18em] uppercase mb-3">
              {activeScene.code}
            </div>

            {activeScene.index === 5 ? (
              <h1 className="font-display text-3xl sm:text-5xl lg:text-[3.25rem] font-semibold tracking-tight text-[#D9822B] leading-[1.06]">
                {activeScene.headline}
              </h1>
            ) : activeScene.index === 6 ? (
              <h1 className="font-display text-3xl sm:text-5xl lg:text-[3.5rem] font-semibold tracking-tight text-[#F0F2F2] leading-[1.06]">
                {activeScene.headline}
              </h1>
            ) : (
              <h1 className="font-display text-2xl sm:text-4xl lg:text-[2.85rem] font-semibold tracking-tight text-[#F0F2F2] leading-[1.12]">
                {activeScene.headline}
              </h1>
            )}

            <p className="mt-4 text-sm sm:text-base text-[#BFC7CB] max-w-lg leading-relaxed">
              {activeScene.caption}
            </p>

            {/* Scene Step Progress Bars */}
            <div className="mt-6 flex items-center gap-1.5 max-w-xs" aria-label="Opening sequence progress">
              {OPENING_SCENES.map((sc) => (
                <div
                  key={sc.index}
                  className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                    sc.index <= activeScene.index ? 'bg-[#A6C7A9]' : 'bg-white/12'
                  }`}
                />
              ))}
            </div>

            {/* Action Buttons (Always accessible; emphasized on Scene 6) */}
            <div className="mt-7 flex flex-wrap items-center gap-3.5">
              <button
                type="button"
                onClick={onEnterArchive}
                data-magnetic="true"
                data-cursor-kind="nav"
                data-cursor-label="ENTER"
                className={`inline-flex items-center gap-3 px-6 py-3 font-medium text-sm rounded transition-colors cursor-pointer whitespace-nowrap ${
                  activeScene.index >= 6
                    ? 'bg-[#A6C7A9] hover:bg-[#F0F2F2] text-[#090B0D]'
                    : 'bg-[#F0F2F2] hover:bg-[#A6C7A9] text-[#090B0D]'
                }`}
              >
                <span>Enter the Archive</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              {activeScene.index < 6 && (
                <button
                  type="button"
                  onClick={onSkipIntro}
                  className="px-4 py-3 text-sm text-[#BFC7CB] hover:text-[#F0F2F2] border border-white/15 hover:border-white/35 rounded transition-colors cursor-pointer whitespace-nowrap"
                >
                  Skip Intro
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Utility Ribbon + Subtle Scroll Cue */}
        <div className="pt-5 border-t border-white/10 flex flex-wrap items-center justify-between gap-4 text-xs text-[#899398] pointer-events-auto max-w-3xl">
          <div className="flex flex-wrap items-center gap-4 sm:gap-5">
            <button
              type="button"
              onClick={() => setAboutOpen(true)}
              className="inline-flex items-center gap-1.5 hover:text-[#F0F2F2] transition-colors cursor-pointer"
            >
              <Info className="w-3.5 h-3.5" />
              <span>About</span>
            </button>

            <button
              type="button"
              onClick={() => setLogOpen(true)}
              className="inline-flex items-center gap-1.5 hover:text-[#F0F2F2] transition-colors cursor-pointer"
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>Session Stats</span>
            </button>

            <button
              type="button"
              onClick={onToggleSound}
              className="inline-flex items-center gap-1.5 hover:text-[#F0F2F2] transition-colors cursor-pointer"
            >
              {state.soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-[#A6C7A9]" /> : <VolumeX className="w-3.5 h-3.5" />}
              <span>{state.soundEnabled ? 'Sound On' : 'Sound Off'}</span>
            </button>

            <button
              type="button"
              onClick={onOpenSoundPanel}
              className="inline-flex items-center gap-1.5 hover:text-[#F0F2F2] transition-colors cursor-pointer"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Audio Mixer</span>
            </button>

            <button
              type="button"
              onClick={onToggleReducedMotion}
              className="hover:text-[#F0F2F2] transition-colors cursor-pointer"
            >
              {state.reducedMotion ? 'Motion: Reduced' : 'Motion: Full'}
            </button>
          </div>

          <div className="inline-flex items-center gap-1.5 font-mono-archival text-[#A6C7A9]">
            <ArrowDown className="w-3.5 h-3.5" aria-hidden="true" />
            <span>
              {activeScene.index < 6
                ? 'Scroll to advance opening'
                : 'Scroll to descend into 50,000 BC'}
            </span>
          </div>
        </div>
      </div>

      {/* About Modal */}
      {aboutOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="about-archive-title"
          className="fixed inset-0 z-50 bg-[#090B0D]/92 flex items-center justify-center p-4 pointer-events-auto"
        >
          <div className="w-full max-w-lg bg-[#111619] border border-white/15 rounded-xl p-6 sm:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-xs font-mono-archival text-[#A6C7A9]">CURATORIAL BRIEF · 2075</div>
                <h2 id="about-archive-title" className="text-xl font-semibold text-[#F0F2F2] mt-1">
                  About HUMAN.EXE
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setAboutOpen(false)}
                className="p-1.5 text-[#899398] hover:text-[#F0F2F2] cursor-pointer"
                aria-label="Close About dialog"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="mt-4 space-y-3 text-sm text-[#BFC7CB] leading-relaxed">
              <p>
                Set in the year 2075, HUMAN.EXE invites you as an Archivist inside an abandoned digital museum preserving five defining eras of technological evolution.
              </p>
              <p>
                Every era presents multi-stage scroll storytelling, interactive 3D artifacts, hidden Lost Memories inside the 3D scene, rare Secret Archives, and a defining choice across 48 historical timelines.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Session Stats Modal */}
      {logOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="system-log-title"
          className="fixed inset-0 z-50 bg-[#090B0D]/92 flex items-center justify-center p-4 pointer-events-auto"
        >
          <div className="w-full max-w-lg bg-[#111619] border border-white/15 rounded-xl p-6 sm:p-8 font-mono-archival">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-xs text-[#A6C7A9]">LOCAL ARCHIVE SESSION</div>
                <h2 id="system-log-title" className="font-display text-xl font-semibold text-[#F0F2F2] mt-1">
                  Archive Session Summary
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setLogOpen(false)}
                className="p-1.5 text-[#899398] hover:text-[#F0F2F2] cursor-pointer"
                aria-label="Close Session Summary"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <dl className="mt-5 space-y-2.5 text-xs border-t border-white/10 pt-4">
              <div className="flex justify-between">
                <dt className="text-[#899398]">Archive Completion</dt>
                <dd className="text-[#F0F2F2]">{completionPercentage}%</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[#899398]">Decisions Recorded</dt>
                <dd className="text-[#F0F2F2]">{Object.values(state.decisions).filter(Boolean).length} / 5</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[#899398]">Artifacts Inspected</dt>
                <dd className="text-[#F0F2F2]">{state.inspectedArtifacts.length} / {ARTIFACTS.length}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[#899398]">Lost Memories Discovered</dt>
                <dd className="text-[#D9822B]">{state.discoveredLostArtifacts.length} / {LOST_ARTIFACTS.length}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[#899398]">Secret Archives Unlocked</dt>
                <dd className="text-[#A6C7A9]">{state.unlockedSecrets.length} / {SECRET_MEMORIES.length}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[#899398]">Corrupted Files Repaired</dt>
                <dd className="text-[#F0F2F2]">{state.repairedFiles.length} / {CORRUPTED_FILES.length}</dd>
              </div>
            </dl>
          </div>
        </div>
      )}
    </section>
  );
};
