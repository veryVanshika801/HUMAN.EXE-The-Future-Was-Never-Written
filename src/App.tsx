import React, { Suspense, lazy, useCallback, useEffect, useMemo, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { CHAPTERS } from './data/chapters';
import { ARTIFACTS, LOST_ARTIFACTS, SECRET_MEMORIES } from './data/artifacts';
import { resolvePathOutcome } from './logic/decisionEngine';
import { audioEngine } from './logic/audioEngine';
import { useArchiveState } from './hooks/useArchiveState';
import {
  ArtifactItem,
  ChapterId,
  ChapterNumber,
  DecisionsState,
  LostArtifactItem,
  SecretMemoryItem,
} from './types/archive';
import type { HoveredSceneTarget } from './scenes/ArchiveCanvas';
import { TopNav } from './components/TopNav';
import { MemoryMapRail } from './components/MemoryMapRail';
import { OpeningSequence } from './components/OpeningSequence';
import { ChapterSection } from './components/ChapterSection';
import { ArtifactModal, LostMemoryToast, SecretMemoryToast } from './components/ArtifactModal';
import { ArchiveCollectionModal } from './components/ArchiveCollectionModal';
import { EndingSection } from './components/EndingSection';
import { CreditsSection } from './components/CreditsSection';
import { SoundControlPanel } from './components/SoundControlPanel';
import { CustomCursor } from './components/CustomCursor';

const LazyArchiveCanvas = lazy(() => import('./scenes/ArchiveCanvas'));

gsap.registerPlugin(ScrollTrigger);

const SECTION_ORDER: ChapterId[] = ['intro', 'ch1', 'ch2', 'ch3', 'ch4', 'ch5', 'ending', 'credits'];

export function App() {
  const {
    state,
    completionPercentage,
    allDecisionsMade,
    markIntroCompleted,
    markChapterVisited,
    setDecision,
    inspectArtifact,
    markTerminalCodeVisited,
    discoverLostArtifact,
    repairFile,
    unlockSecret,
    updateAudioSettings,
    toggleSound,
    toggleReducedMotion,
    resetTimeline,
  } = useArchiveState();

  const [activeChapter, setActiveChapter] = useState<ChapterId>('intro');
  const [chapterProgress, setChapterProgress] = useState(0);
  const [stageIndex, setStageIndex] = useState(1);
  const [stageProgress, setStageProgress] = useState(0);

  const [selectedArtifact, setSelectedArtifact] = useState<ArtifactItem | null>(null);
  const [toastLostArtifact, setToastLostArtifact] = useState<LostArtifactItem | null>(null);
  const [toastSecret, setToastSecret] = useState<SecretMemoryItem | null>(null);
  const [hoveredTarget, setHoveredTarget] = useState<HoveredSceneTarget | null>(null);

  const [memoryMapOpen, setMemoryMapOpen] = useState(false);
  const [collectionOpen, setCollectionOpen] = useState(false);
  const [soundPanelOpen, setSoundPanelOpen] = useState(false);

  const [activatedGearStage, setActivatedGearStage] = useState(1);
  const [selectedGlobeNodeId, setSelectedGlobeNodeId] = useState<string | null>('node-cern');
  const [globeZoom, setGlobeZoom] = useState(1.0);
  const [whatIfPreview, setWhatIfPreview] = useState<{ chapter: number; option: string } | null>(null);
  const [timeFractureActive, setTimeFractureActive] = useState(false);
  const [cursorBurst, setCursorBurst] = useState<{ type: 'unlock' | 'secret' | 'chapter'; tick: number } | null>(
    null
  );

  const activeChapterRef = React.useRef<ChapterId>(activeChapter);
  activeChapterRef.current = activeChapter;
  const timeFractureTimerRef = React.useRef<number | null>(null);
  const seenChaptersRef = React.useRef<Set<ChapterNumber>>(new Set(state.visitedChapters));

  useEffect(() => {
    return () => {
      if (timeFractureTimerRef.current !== null) {
        window.clearTimeout(timeFractureTimerRef.current);
      }
    };
  }, []);

  const triggerCursorBurst = useCallback((type: 'unlock' | 'secret' | 'chapter') => {
    setCursorBurst((prev) => ({ type, tick: (prev?.tick ?? 0) + 1 }));
  }, []);

  const endingOutcome = useMemo(() => resolvePathOutcome(state.decisions), [state.decisions]);

  useEffect(() => {
    audioEngine.setEra(activeChapter, endingOutcome.archetype);
  }, [activeChapter, endingOutcome.archetype]);

  // Opening Scene 5 Freeze: briefly suspend sound during THE QUESTION freeze frame
  useEffect(() => {
    audioEngine.setFreezeSilence(activeChapter === 'intro' && stageIndex === 5);
  }, [activeChapter, stageIndex]);

  useEffect(() => {
    const triggers: ScrollTrigger[] = [];

    SECTION_ORDER.forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;

      const st = ScrollTrigger.create({
        trigger: el,
        start: 'top 52%',
        end: 'bottom 48%',
        onEnter: () => {
          setActiveChapter(id);
          setHoveredTarget(null);
          if (id.startsWith('ch')) {
            const num = Number(id.slice(2)) as ChapterNumber;
            if (!seenChaptersRef.current.has(num)) {
              seenChaptersRef.current.add(num);
              audioEngine.playEraSound('chapterUnlock');
              triggerCursorBurst('chapter');
            }
            markChapterVisited(num);
          } else if (id === 'ending') {
            audioEngine.playEraSound('endingReveal');
            triggerCursorBurst('chapter');
          }
        },
        onEnterBack: () => {
          setActiveChapter(id);
          setHoveredTarget(null);
          if (id.startsWith('ch')) {
            markChapterVisited(Number(id.slice(2)) as ChapterNumber);
          }
        },
        onUpdate: (self) => {
          setChapterProgress(self.progress);
        },
      });
      triggers.push(st);
    });

    return () => {
      triggers.forEach((t) => t.kill());
    };
  }, [markChapterVisited, triggerCursorBurst]);

  const showSecretToast = useCallback(
    (secretId: string) => {
      const sec = SECRET_MEMORIES.find((s) => s.id === secretId);
      if (sec) {
        setToastSecret(sec);
        triggerCursorBurst('secret');
      }
    },
    [triggerCursorBurst]
  );

  const handleIntroSceneChange = useCallback((sceneIdx: number, progress: number) => {
    if (activeChapterRef.current === 'intro') {
      setStageIndex(sceneIdx);
      setStageProgress(progress);
    }
  }, []);

  const handleChapterStageChange = useCallback((chapterNum: number, idx: number, progress: number) => {
    if (activeChapterRef.current === `ch${chapterNum}`) {
      setStageIndex(idx);
      setStageProgress(progress);
    }
  }, []);

  const navigateToChapter = useCallback(
    (id: ChapterId) => {
      audioEngine.playEraSound('click');
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ behavior: state.reducedMotion ? 'auto' : 'smooth', block: 'start' });
      }
      if (id.startsWith('ch')) {
        markChapterVisited(Number(id.slice(2)) as ChapterNumber);
      }
    },
    [state.reducedMotion, markChapterVisited]
  );

  const handleEnterArchive = useCallback(() => {
    markIntroCompleted();
    navigateToChapter('ch1');
  }, [markIntroCompleted, navigateToChapter]);

  const handleSelectArtifactById = useCallback(
    (artifactId: string) => {
      const found = ARTIFACTS.find((a) => a.id === artifactId);
      if (!found) return;
      if (!state.inspectedArtifacts.includes(found.id)) {
        triggerCursorBurst('unlock');
      }
      inspectArtifact(found.id, showSecretToast);
      setSelectedArtifact(found);
    },
    [state.inspectedArtifacts, inspectArtifact, showSecretToast, triggerCursorBurst]
  );

  const handleSelectArtifactObj = useCallback(
    (artifact: ArtifactItem) => {
      if (!state.inspectedArtifacts.includes(artifact.id)) {
        triggerCursorBurst('unlock');
      }
      inspectArtifact(artifact.id, showSecretToast);
      setSelectedArtifact(artifact);
    },
    [state.inspectedArtifacts, inspectArtifact, showSecretToast, triggerCursorBurst]
  );

  const handleDiscoverLost = useCallback(
    (lostId: string) => {
      const lost = LOST_ARTIFACTS.find((l) => l.id === lostId);
      if (!lost) return;
      if (activeChapter !== `ch${lost.chapter}`) return;
      if (state.discoveredLostArtifacts.includes(lost.id)) return;
      discoverLostArtifact(lost.id);
      setToastLostArtifact(lost);
      triggerCursorBurst('secret');
    },
    [activeChapter, state.discoveredLostArtifacts, discoverLostArtifact, triggerCursorBurst]
  );

  const handleDiscoverSecret = useCallback(
    (secretId: string) => {
      const sec = SECRET_MEMORIES.find((item) => item.id === secretId);
      if (sec && activeChapter !== `ch${sec.chapter}`) return;
      unlockSecret(secretId, showSecretToast);
    },
    [activeChapter, unlockSecret, showSecretToast]
  );

  const handleTriggerTimeFracture = useCallback(() => {
    audioEngine.playEraSound('transitionWhoosh');
    if (state.reducedMotion) return;
    setTimeFractureActive(true);
    if (timeFractureTimerRef.current !== null) {
      window.clearTimeout(timeFractureTimerRef.current);
    }
    timeFractureTimerRef.current = window.setTimeout(() => {
      setTimeFractureActive(false);
      timeFractureTimerRef.current = null;
    }, 450);
  }, [state.reducedMotion]);

  const handleNavigateArtifact = useCallback(
    (chapterId: ChapterId, artifact: ArtifactItem) => {
      navigateToChapter(chapterId);
      handleSelectArtifactObj(artifact);
    },
    [navigateToChapter, handleSelectArtifactObj]
  );

  const handleRevisitLost = useCallback((lost: LostArtifactItem) => {
    audioEngine.playEraSound('click');
    setToastLostArtifact(lost);
  }, []);

  const handleSelectDecision = useCallback(
    (chapterId: `ch${1 | 2 | 3 | 4 | 5}`, value: string) => {
      setDecision(chapterId, value as DecisionsState[typeof chapterId]);
      triggerCursorBurst('unlock');
    },
    [setDecision, triggerCursorBurst]
  );

  const handleActivateGear = useCallback((stage: number) => {
    audioEngine.playEraSound('gear');
    setActivatedGearStage(stage);
  }, []);

  const handleSelectGlobeNode = useCallback((nodeId: string) => {
    audioEngine.playEraSound('networkPulse');
    setSelectedGlobeNodeId(nodeId);
  }, []);

  const handleChangeGlobeZoom = useCallback((delta: number) => {
    audioEngine.playEraSound('click');
    setGlobeZoom((prev) => Math.max(0.85, Math.min(1.35, Number((prev + delta).toFixed(2)))));
  }, []);

  const handleRepairFile = useCallback(
    (fileId: string) => {
      repairFile(fileId, showSecretToast);
      triggerCursorBurst('unlock');
    },
    [repairFile, showSecretToast, triggerCursorBurst]
  );

  const handleReplay = useCallback(
    (keepCollection: boolean) => {
      resetTimeline(keepCollection);
      setWhatIfPreview(null);
      navigateToChapter('ch1');
    },
    [resetTimeline, navigateToChapter]
  );

  return (
    <div className="relative min-h-screen bg-[#090B0D] text-[#F0F2F2]">
      {/* Lazy-Loaded Persistent WebGL 3D Stage */}
      <Suspense
        fallback={
          <div className="fixed inset-0 z-0 bg-[#090B0D] flex items-center justify-end pr-20 pointer-events-none">
            <div className="text-xs font-mono-archival text-[#899398]">INITIALIZING 3D ARCHIVE...</div>
          </div>
        }
      >
        <LazyArchiveCanvas
          activeChapter={activeChapter}
          chapterProgress={chapterProgress}
          stageIndex={stageIndex}
          stageProgress={stageProgress}
          decisions={state.decisions}
          focusedArtifactId={selectedArtifact?.id ?? null}
          discoveredLostArtifacts={state.discoveredLostArtifacts}
          unlockedSecrets={state.unlockedSecrets}
          activatedGearStage={activatedGearStage}
          selectedGlobeNodeId={selectedGlobeNodeId}
          globeZoom={globeZoom}
          endingOutcome={endingOutcome}
          reducedMotion={state.reducedMotion}
          whatIfPreview={whatIfPreview}
          onSelectArtifact={handleSelectArtifactById}
          onDiscoverLostArtifact={handleDiscoverLost}
          onDiscoverSecret={handleDiscoverSecret}
          onSelectGlobeNode={handleSelectGlobeNode}
          onActivateGear={handleActivateGear}
          onHoverTarget={setHoveredTarget}
        />
      </Suspense>

      {/* Crisp Floating Physical 3D Hover Label */}
      {hoveredTarget && !selectedArtifact && (
        <div
          aria-hidden="true"
          className="no-print fixed z-30 pointer-events-none -translate-x-1/2 -translate-y-full pb-2"
          style={{
            left: `${Math.min(window.innerWidth - 120, Math.max(120, hoveredTarget.x))}px`,
            top: `${Math.min(window.innerHeight - 40, Math.max(72, hoveredTarget.y - 12))}px`,
          }}
        >
          <div className="bg-[#090B0D]/95 border border-white/20 rounded px-2.5 py-1.5 shadow-xl text-center">
            <div className="text-[10px] font-mono-archival text-[#A6C7A9]">{hoveredTarget.sublabel}</div>
            <div className="text-xs font-medium text-[#F0F2F2] whitespace-nowrap">{hoveredTarget.label}</div>
          </div>
        </div>
      )}

      {/* Controlled Time Fracture Visual Flash */}
      {timeFractureActive && (
        <div
          aria-hidden="true"
          className="no-print time-fracture-veil fixed inset-0 z-40 pointer-events-none border-y-2 border-[#D9822B]/45 bg-[#D9822B]/5"
        />
      )}

      {/* Minimal Top Bar */}
      <TopNav
        completionPercentage={completionPercentage}
        soundEnabled={state.soundEnabled}
        soundPanelOpen={soundPanelOpen}
        reducedMotion={state.reducedMotion}
        onToggleSound={toggleSound}
        onToggleSoundPanel={() => setSoundPanelOpen((prev) => !prev)}
        onToggleReducedMotion={toggleReducedMotion}
        onOpenMemoryMap={() => setMemoryMapOpen(true)}
        onOpenArchiveLog={() => setCollectionOpen(true)}
        onJumpToTop={() => navigateToChapter('intro')}
        onJumpToEnding={() => navigateToChapter('ending')}
      />

      {/* Persistent Spatial Sound Mixer Panel */}
      <SoundControlPanel
        isOpen={soundPanelOpen}
        audio={state.audio}
        onClose={() => setSoundPanelOpen(false)}
        onUpdateAudio={updateAudioSettings}
      />

      {/* Persistent Memory Constellation Side Rail & Modal */}
      <MemoryMapRail
        activeChapter={activeChapter}
        activeStageIndex={stageIndex}
        visitedChapters={state.visitedChapters}
        decisions={state.decisions}
        inspectedArtifacts={state.inspectedArtifacts}
        discoveredLostArtifacts={state.discoveredLostArtifacts}
        repairedFiles={state.repairedFiles}
        unlockedSecrets={state.unlockedSecrets}
        completionPercentage={completionPercentage}
        endingOutcome={endingOutcome}
        isModalOpen={memoryMapOpen}
        onCloseModal={() => setMemoryMapOpen(false)}
        onOpenModal={() => setMemoryMapOpen(true)}
        onNavigateChapter={navigateToChapter}
        onNavigateArtifact={handleNavigateArtifact}
      />

      {/* Continuous Multi-Stage Scroll Storytelling Journey */}
      <main>
        <OpeningSequence
          state={state}
          completionPercentage={completionPercentage}
          currentSceneIndex={activeChapter === 'intro' ? stageIndex : 6}
          onSceneChange={handleIntroSceneChange}
          onEnterArchive={handleEnterArchive}
          onSkipIntro={handleEnterArchive}
          onToggleSound={toggleSound}
          onOpenSoundPanel={() => setSoundPanelOpen(true)}
          onToggleReducedMotion={toggleReducedMotion}
        />

        {CHAPTERS.map((chapter) => (
          <ChapterSection
            key={chapter.id}
            chapter={chapter}
            activeStageIndex={activeChapter === chapter.id ? stageIndex : 1}
            isActiveChapter={activeChapter === chapter.id}
            decisions={state.decisions}
            inspectedArtifacts={state.inspectedArtifacts}
            discoveredLostArtifacts={state.discoveredLostArtifacts}
            repairedFiles={state.repairedFiles}
            unlockedSecrets={state.unlockedSecrets}
            activatedGearStage={activatedGearStage}
            selectedGlobeNodeId={selectedGlobeNodeId}
            globeZoom={globeZoom}
            reducedMotion={state.reducedMotion}
            narrationEnabled={state.audio.narrationEnabled}
            whatIfPreview={whatIfPreview}
            onStageChange={handleChapterStageChange}
            onSelectArtifact={handleSelectArtifactObj}
            onRevisitLostArtifact={handleRevisitLost}
            onSelectDecision={handleSelectDecision}
            onSetWhatIfPreview={setWhatIfPreview}
            onTriggerTimeFracture={handleTriggerTimeFracture}
            onActivateGear={handleActivateGear}
            onSelectGlobeNode={handleSelectGlobeNode}
            onChangeGlobeZoom={handleChangeGlobeZoom}
            onRepairFile={handleRepairFile}
            onVisitTerminalCode={() => markTerminalCodeVisited(showSecretToast)}
            onNavigateNext={navigateToChapter}
          />
        ))}

        <EndingSection
          state={state}
          outcome={endingOutcome}
          completionPercentage={completionPercentage}
          allDecisionsMade={allDecisionsMade}
          onNavigateChapter={navigateToChapter}
          onReplay={handleReplay}
        />

        <CreditsSection
          reducedMotion={state.reducedMotion}
          onNavigateChapter={navigateToChapter}
          onOpenMemoryMap={() => setMemoryMapOpen(true)}
          onOpenCollection={() => setCollectionOpen(true)}
        />
      </main>

      {/* Modals & Notifications */}
      <ArtifactModal
        artifact={selectedArtifact}
        narrationEnabled={state.audio.narrationEnabled}
        reducedMotion={state.reducedMotion}
        onClose={() => setSelectedArtifact(null)}
      />

      <LostMemoryToast
        lostArtifact={toastLostArtifact}
        onDismiss={() => setToastLostArtifact(null)}
      />

      <SecretMemoryToast
        secret={toastSecret}
        onDismiss={() => setToastSecret(null)}
      />

      <ArchiveCollectionModal
        isOpen={collectionOpen}
        state={state}
        completionPercentage={completionPercentage}
        onClose={() => setCollectionOpen(false)}
        onInspectArtifact={(art) => {
          setCollectionOpen(false);
          handleSelectArtifactObj(art);
        }}
        onRepairFile={handleRepairFile}
        onNavigateChapter={navigateToChapter}
      />

      {/* Archivist's Custom Cursor (Auto-disables on touch/reduced motion) */}
      <CustomCursor
        activeChapter={activeChapter}
        reducedMotion={state.reducedMotion}
        hovered3dKind={hoveredTarget?.kind ?? null}
        burstSignal={cursorBurst}
      />
    </div>
  );
}

export default App;
