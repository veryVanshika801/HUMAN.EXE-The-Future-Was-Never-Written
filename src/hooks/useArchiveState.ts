import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArchiveEvent,
  ArchiveProgressState,
  AudioSettings,
  ChapterId,
  ChapterNumber,
  DecisionsState,
} from '../types/archive';
import {
  ARTIFACTS,
  CORRUPTED_FILES,
  LOST_ARTIFACTS,
  SECRET_MEMORIES,
} from '../data/artifacts';
import { audioEngine, DEFAULT_AUDIO_SETTINGS } from '../logic/audioEngine';

const STORAGE_KEY = 'human_exe_archive_v2';

export interface JournalClueDef {
  id: string;
  chapter: ChapterNumber | 0;
  code: string;
  title: string;
  note: string;
}

export const JOURNAL_CLUES: JournalClueDef[] = [
  {
    id: 'clue-hearth-covenant',
    chapter: 1,
    code: 'CLUE 01',
    title: 'Shared Fire & Early Pedagogy',
    note: 'Cavern flint flakes and shared embers suggest communal instruction predated metallurgy by millennia.',
  },
  {
    id: 'clue-industrial-cadence',
    chapter: 2,
    code: 'CLUE 02',
    title: 'The Mechanized Hour',
    note: 'Clockwork escapements bridged maritime astronomy and factory whistles—turning lived time into scheduled shifts.',
  },
  {
    id: 'clue-lovelace-bridge',
    chapter: 3,
    code: 'CLUE 03',
    title: 'Jacquard Loom to Symbolic Silicon',
    note: 'Compare the Chapter 2 Clockwork Machine with the Chapter 3 Terminal CODE module to verify Ada Lovelace’s leap.',
  },
  {
    id: 'clue-subsea-cables',
    chapter: 4,
    code: 'CLUE 04',
    title: 'Physical Foundations of the Cloud',
    note: 'Transoceanic glass fibers on the seafloor carry 98% of international packets beneath the orbital mesh.',
  },
  {
    id: 'clue-2075-quorum',
    chapter: 5,
    code: 'CLUE 05',
    title: 'The Final Seal of 2074',
    note: 'Recovery of Lost Memory 005 alongside UNKNOWN_ARCHIVE_2075.LOG unlocks the Silent Quorum pact.',
  },
];

const getInitialReducedMotion = () => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
};

const DEFAULT_STATE: ArchiveProgressState = {
  introCompleted: false,
  visitedChapters: [],
  decisions: {},
  inspectedArtifacts: [],
  discoveredLostArtifacts: [],
  repairedFiles: [],
  unlockedSecrets: [],
  unlockedClues: [],
  eventLog: [],
  audio: { ...DEFAULT_AUDIO_SETTINGS },
  soundEnabled: false,
  reducedMotion: false,
};

function makeEvent(
  chapter: ChapterId,
  category: ArchiveEvent['category'],
  title: string,
  detail: string
): ArchiveEvent {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    chapter,
    category,
    title,
    detail,
  };
}

function loadState(): ArchiveProgressState {
  if (typeof window === 'undefined') return DEFAULT_STATE;
  try {
    const raw =
      window.localStorage.getItem(STORAGE_KEY) ||
      window.localStorage.getItem('human_exe_archive_v1');
    if (!raw) {
      return { ...DEFAULT_STATE, reducedMotion: getInitialReducedMotion() };
    }
    const parsed = JSON.parse(raw) as Partial<ArchiveProgressState>;
    const mergedAudio: AudioSettings = {
      ...DEFAULT_AUDIO_SETTINGS,
      ...(parsed.audio && typeof parsed.audio === 'object' ? parsed.audio : {}),
      enabled: false,
    };
    return {
      ...DEFAULT_STATE,
      ...parsed,
      visitedChapters: Array.isArray(parsed.visitedChapters) ? parsed.visitedChapters : [],
      inspectedArtifacts: Array.isArray(parsed.inspectedArtifacts) ? parsed.inspectedArtifacts : [],
      discoveredLostArtifacts: Array.isArray(parsed.discoveredLostArtifacts) ? parsed.discoveredLostArtifacts : [],
      repairedFiles: Array.isArray(parsed.repairedFiles) ? parsed.repairedFiles : [],
      unlockedSecrets: Array.isArray(parsed.unlockedSecrets) ? parsed.unlockedSecrets : [],
      unlockedClues: Array.isArray(parsed.unlockedClues) ? parsed.unlockedClues : [],
      eventLog: Array.isArray(parsed.eventLog) ? parsed.eventLog : [],
      decisions: parsed.decisions && typeof parsed.decisions === 'object' ? parsed.decisions : {},
      audio: mergedAudio,
      soundEnabled: false,
    };
  } catch {
    return { ...DEFAULT_STATE, reducedMotion: getInitialReducedMotion() };
  }
}

function addClueUnique(existing: string[] | undefined, clueId: string): string[] {
  const list = existing ?? [];
  return list.includes(clueId) ? list : [...list, clueId];
}

export function useArchiveState() {
  const [state, setState] = useState<ArchiveProgressState>(loadState);
  const visitedCodeModuleRef = useRef(false);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // ignore storage quota errors
    }
  }, [state]);

  useEffect(() => {
    if (state.reducedMotion) {
      document.documentElement.classList.add('reduced-motion');
    } else {
      document.documentElement.classList.remove('reduced-motion');
    }
  }, [state.reducedMotion]);

  const markIntroCompleted = useCallback(() => {
    audioEngine.playEraSound('sphereOpen');
    setState((prev) => ({
      ...prev,
      introCompleted: true,
      visitedChapters: prev.visitedChapters.includes(1) ? prev.visitedChapters : [...prev.visitedChapters, 1],
      unlockedClues: addClueUnique(prev.unlockedClues, 'clue-hearth-covenant'),
      eventLog: [
        makeEvent('intro', 'chapter', 'Archive Access Granted', 'Entered Chapter 01 — The First Spark.'),
        ...prev.eventLog,
      ].slice(0, 80),
    }));
  }, []);

  const markChapterVisited = useCallback((chapter: ChapterNumber) => {
    setState((prev) => {
      if (prev.visitedChapters.includes(chapter)) return prev;
      audioEngine.playEraSound('chapterUnlock');
      let nextClues = prev.unlockedClues ?? [];
      if (chapter === 1) nextClues = addClueUnique(nextClues, 'clue-hearth-covenant');
      if (chapter === 2) nextClues = addClueUnique(nextClues, 'clue-industrial-cadence');
      if (chapter === 4) nextClues = addClueUnique(nextClues, 'clue-subsea-cables');
      return {
        ...prev,
        visitedChapters: [...prev.visitedChapters, chapter],
        unlockedClues: nextClues,
        eventLog: [
          makeEvent(`ch${chapter}` as ChapterId, 'chapter', `Entered Chapter 0${chapter}`, 'Historical layer indexed.'),
          ...prev.eventLog,
        ].slice(0, 80),
      };
    });
  }, []);

  const setDecision = useCallback(<K extends keyof DecisionsState>(key: K, value: DecisionsState[K]) => {
    audioEngine.playEraSound('decision');
    setState((prev) => ({
      ...prev,
      decisions: { ...prev.decisions, [key]: value },
      eventLog: [
        makeEvent(key as ChapterId, 'decision', `Timeline Choice (${key.toUpperCase()})`, `Recorded choice: ${String(value)}.`),
        ...prev.eventLog,
      ].slice(0, 80),
    }));
  }, []);

  const unlockSecret = useCallback((secretId: string, onNewlyUnlocked?: (secretId: string) => void) => {
    setState((prev) => {
      if (prev.unlockedSecrets.includes(secretId)) return prev;
      const secret = SECRET_MEMORIES.find((s) => s.id === secretId);
      audioEngine.playEraSound('secret');
      onNewlyUnlocked?.(secretId);
      let nextClues = prev.unlockedClues ?? [];
      if (secretId === 'secret-004') nextClues = addClueUnique(nextClues, 'clue-subsea-cables');
      return {
        ...prev,
        unlockedSecrets: [...prev.unlockedSecrets, secretId],
        unlockedClues: nextClues,
        eventLog: [
          makeEvent(
            `ch${secret?.chapter ?? 1}` as ChapterId,
            'secret',
            `Secret Discovered · ${secret?.title ?? secretId}`,
            secret?.historicalInsight ?? 'Rare archival layer uncovered.'
          ),
          ...prev.eventLog,
        ].slice(0, 80),
      };
    });
  }, []);

  const inspectArtifact = useCallback(
    (artifactId: string, onSecretDiscovered?: (secretId: string) => void) => {
      const artifact = ARTIFACTS.find((a) => a.id === artifactId);
      audioEngine.playEraSound(artifact?.soundType ?? 'click');

      const newlyUnlockedSecrets: string[] = [];
      setState((prev) => {
        const nextInspected = prev.inspectedArtifacts.includes(artifactId)
          ? prev.inspectedArtifacts
          : [...prev.inspectedArtifacts, artifactId];

        const shouldUnlockSecret002 =
          (artifactId === 'art-clockwork-machine' || nextInspected.includes('art-clockwork-machine')) &&
          visitedCodeModuleRef.current &&
          !prev.unlockedSecrets.includes('secret-002');

        const shouldUnlockSecret005 =
          ['art-neural-core', 'art-creative-engine', 'art-human-memory'].every((id) =>
            nextInspected.includes(id)
          ) && !prev.unlockedSecrets.includes('secret-005');

        let nextSecrets = [...prev.unlockedSecrets];
        let nextClues = prev.unlockedClues ?? [];
        if (artifactId === 'art-clockwork-machine') {
          nextClues = addClueUnique(nextClues, 'clue-lovelace-bridge');
        }
        const events = [...prev.eventLog];

        if (!prev.inspectedArtifacts.includes(artifactId) && artifact) {
          events.unshift(
            makeEvent(`ch${artifact.chapter}` as ChapterId, 'artifact', `Inspected ${artifact.name}`, artifact.summary)
          );
        }

        if (shouldUnlockSecret002) {
          newlyUnlockedSecrets.push('secret-002');
          nextSecrets.push('secret-002');
          const sec = SECRET_MEMORIES.find((s) => s.id === 'secret-002');
          events.unshift(
            makeEvent('ch3', 'secret', `Secret Discovered · ${sec?.title}`, sec?.historicalInsight ?? '')
          );
        }

        if (shouldUnlockSecret005) {
          newlyUnlockedSecrets.push('secret-005');
          nextSecrets.push('secret-005');
          const sec = SECRET_MEMORIES.find((s) => s.id === 'secret-005');
          events.unshift(
            makeEvent('ch5', 'secret', `Secret Discovered · ${sec?.title}`, sec?.historicalInsight ?? '')
          );
        }

        return {
          ...prev,
          inspectedArtifacts: nextInspected,
          unlockedSecrets: nextSecrets,
          unlockedClues: nextClues,
          eventLog: events.slice(0, 80),
        };
      });

      if (newlyUnlockedSecrets.length > 0) {
        audioEngine.playEraSound('secret');
        onSecretDiscovered?.(newlyUnlockedSecrets[0]);
      }
    },
    []
  );

  const markTerminalCodeVisited = useCallback((onSecretDiscovered?: (secretId: string) => void) => {
    visitedCodeModuleRef.current = true;
    audioEngine.playEraSound('keyclick');
    let unlockedLovelace = false;

    setState((prev) => {
      const nextClues = addClueUnique(prev.unlockedClues, 'clue-lovelace-bridge');
      if (
        prev.inspectedArtifacts.includes('art-clockwork-machine') &&
        !prev.unlockedSecrets.includes('secret-002')
      ) {
        unlockedLovelace = true;
        const sec = SECRET_MEMORIES.find((s) => s.id === 'secret-002');
        return {
          ...prev,
          unlockedSecrets: [...prev.unlockedSecrets, 'secret-002'],
          unlockedClues: nextClues,
          eventLog: [
            makeEvent('ch3', 'secret', `Secret Discovered · ${sec?.title}`, sec?.historicalInsight ?? ''),
            ...prev.eventLog,
          ].slice(0, 80),
        };
      }
      return { ...prev, unlockedClues: nextClues };
    });

    if (unlockedLovelace) {
      audioEngine.playEraSound('secret');
      onSecretDiscovered?.('secret-002');
    }
  }, []);

  const discoverLostArtifact = useCallback((lostId: string) => {
    audioEngine.playLostArtifactFanfare();
    const lost = LOST_ARTIFACTS.find((l) => l.id === lostId);
    setState((prev) => {
      if (prev.discoveredLostArtifacts.includes(lostId)) return prev;
      let nextClues = prev.unlockedClues ?? [];
      if (lostId === 'lost-005') nextClues = addClueUnique(nextClues, 'clue-2075-quorum');
      return {
        ...prev,
        discoveredLostArtifacts: [...prev.discoveredLostArtifacts, lostId],
        unlockedClues: nextClues,
        eventLog: [
          makeEvent(
            `ch${lost?.chapter ?? 1}` as ChapterId,
            'lost',
            `Lost Memory Recovered · ${lost?.name ?? lostId}`,
            lost?.title ?? ''
          ),
          ...prev.eventLog,
        ].slice(0, 80),
      };
    });
  }, []);

  const repairFile = useCallback((fileId: string, onSecretDiscovered?: (secretId: string) => void) => {
    audioEngine.playEraSound('repairSuccess');
    const file = CORRUPTED_FILES.find((f) => f.id === fileId);
    let unlockedQuorum = false;

    setState((prev) => {
      const nextRepaired = prev.repairedFiles.includes(fileId)
        ? prev.repairedFiles
        : [...prev.repairedFiles, fileId];

      let nextSecrets = prev.unlockedSecrets;
      let nextClues = prev.unlockedClues ?? [];
      const events = [...prev.eventLog];

      if (!prev.repairedFiles.includes(fileId) && file) {
        events.unshift(
          makeEvent(`ch${file.chapter}` as ChapterId, 'file', `Restored ${file.filename}`, file.hiddenMemoryTitle)
        );
      }

      if (fileId === 'file-unknown-2075' && !prev.unlockedSecrets.includes('secret-003')) {
        unlockedQuorum = true;
        nextSecrets = [...nextSecrets, 'secret-003'];
        nextClues = addClueUnique(nextClues, 'clue-2075-quorum');
        const sec = SECRET_MEMORIES.find((s) => s.id === 'secret-003');
        events.unshift(
          makeEvent('ch5', 'secret', `Secret Discovered · ${sec?.title}`, sec?.historicalInsight ?? '')
        );
      }

      return {
        ...prev,
        repairedFiles: nextRepaired,
        unlockedSecrets: nextSecrets,
        unlockedClues: nextClues,
        eventLog: events.slice(0, 80),
      };
    });

    if (unlockedQuorum) {
      audioEngine.playEraSound('secret');
      onSecretDiscovered?.('secret-003');
    }
  }, []);

  const updateAudioSettings = useCallback((patch: Partial<AudioSettings>) => {
    setState((prev) => {
      const nextAudio: AudioSettings = { ...prev.audio, ...patch };
      audioEngine.updateSettings(nextAudio);
      return {
        ...prev,
        audio: nextAudio,
        soundEnabled: nextAudio.enabled && !nextAudio.muted,
      };
    });
  }, []);

  const toggleSound = useCallback(() => {
    setState((prev) => {
      const nextEnabled = !prev.audio.enabled;
      const nextAudio: AudioSettings = { ...prev.audio, enabled: nextEnabled, muted: false };
      audioEngine.updateSettings(nextAudio);
      return { ...prev, audio: nextAudio, soundEnabled: nextEnabled };
    });
  }, []);

  const toggleReducedMotion = useCallback(() => {
    setState((prev) => ({ ...prev, reducedMotion: !prev.reducedMotion }));
  }, []);

  const resetTimeline = useCallback((keepCollection = false) => {
    audioEngine.playEraSound('click');
    setState((prev) => ({
      ...DEFAULT_STATE,
      audio: prev.audio,
      soundEnabled: prev.soundEnabled,
      reducedMotion: prev.reducedMotion,
      introCompleted: true,
      visitedChapters: [1],
      discoveredLostArtifacts: keepCollection ? prev.discoveredLostArtifacts : [],
      repairedFiles: keepCollection ? prev.repairedFiles : [],
      inspectedArtifacts: keepCollection ? prev.inspectedArtifacts : [],
      unlockedSecrets: keepCollection ? prev.unlockedSecrets : [],
      unlockedClues: keepCollection ? (prev.unlockedClues ?? []) : ['clue-hearth-covenant'],
      eventLog: [
        makeEvent('intro', 'chapter', 'Timeline Reset', keepCollection ? 'Kept recovered journal archive.' : 'Full archive reset.'),
        ...(keepCollection ? prev.eventLog : []),
      ].slice(0, 80),
    }));
  }, []);

  const completionPercentage = useMemo(() => {
    const decisionCount = Object.values(state.decisions).filter(Boolean).length;
    const earned =
      decisionCount * 2 +
      state.inspectedArtifacts.length +
      state.discoveredLostArtifacts.length * 2 +
      state.repairedFiles.length +
      state.unlockedSecrets.length * 2;

    const maxWeighted =
      5 * 2 +
      ARTIFACTS.length +
      LOST_ARTIFACTS.length * 2 +
      CORRUPTED_FILES.length +
      SECRET_MEMORIES.length * 2;

    return Math.min(100, Math.round((earned / maxWeighted) * 100));
  }, [
    state.decisions,
    state.inspectedArtifacts.length,
    state.discoveredLostArtifacts.length,
    state.repairedFiles.length,
    state.unlockedSecrets.length,
  ]);

  const allDecisionsMade = Boolean(
    state.decisions.ch1 &&
      state.decisions.ch2 &&
      state.decisions.ch3 &&
      state.decisions.ch4 &&
      state.decisions.ch5
  );

  return {
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
  };
}
