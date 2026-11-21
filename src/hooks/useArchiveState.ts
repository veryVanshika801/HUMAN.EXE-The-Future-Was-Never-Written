import { useCallback, useEffect, useMemo, useState } from 'react';
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
import {
  C1_OPTS,
  C2_OPTS,
  C3_OPTS,
  C4_OPTS,
  C5_OPTS,
} from '../logic/decisionEngine';

export const STORAGE_KEY = 'human_exe_archive_v2';
export const LEGACY_STORAGE_KEY = 'human_exe_archive_v1';

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

const VALID_ARTIFACT_IDS = new Set(ARTIFACTS.map((a) => a.id));
const VALID_LOST_IDS = new Set(LOST_ARTIFACTS.map((l) => l.id));
const VALID_FILE_IDS = new Set(CORRUPTED_FILES.map((f) => f.id));
const VALID_SECRET_IDS = new Set(SECRET_MEMORIES.map((s) => s.id));
const VALID_CLUE_IDS = new Set(JOURNAL_CLUES.map((c) => c.id));
const VALID_CHAPTER_IDS = new Set<ChapterId>([
  'intro',
  'ch1',
  'ch2',
  'ch3',
  'ch4',
  'ch5',
  'ending',
  'credits',
]);
const VALID_EVENT_CATEGORIES = new Set<ArchiveEvent['category']>([
  'chapter',
  'artifact',
  'lost',
  'file',
  'decision',
  'secret',
  'clue',
]);

const getInitialReducedMotion = () => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
};

export const DEFAULT_ARCHIVE_STATE: ArchiveProgressState = {
  introCompleted: false,
  visitedChapters: [],
  decisions: {},
  inspectedArtifacts: [],
  discoveredLostArtifacts: [],
  repairedFiles: [],
  unlockedSecrets: [],
  unlockedClues: [],
  visitedTerminalCode: false,
  eventLog: [],
  audio: { ...DEFAULT_AUDIO_SETTINGS },
  soundEnabled: false,
  reducedMotion: false,
};

function clampUnit(value: unknown, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.max(0, Math.min(1, value));
}

function sanitizeStringIdList(raw: unknown, validSet: Set<string>): string[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of raw) {
    if (typeof item === 'string' && validSet.has(item) && !seen.has(item)) {
      seen.add(item);
      out.push(item);
    }
  }
  return out;
}

function sanitizeVisitedChapters(raw: unknown): ChapterNumber[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<ChapterNumber>();
  for (const item of raw) {
    if (typeof item === 'number' && Number.isInteger(item) && item >= 1 && item <= 5) {
      seen.add(item as ChapterNumber);
    }
  }
  return Array.from(seen).sort((a, b) => a - b);
}

export function sanitizeDecisions(raw: unknown): DecisionsState {
  if (!raw || typeof raw !== 'object') return {};
  const obj = raw as Record<string, unknown>;
  const next: DecisionsState = {};
  if (typeof obj.ch1 === 'string' && (C1_OPTS as string[]).includes(obj.ch1)) {
    next.ch1 = obj.ch1 as DecisionsState['ch1'];
  }
  if (typeof obj.ch2 === 'string' && (C2_OPTS as string[]).includes(obj.ch2)) {
    next.ch2 = obj.ch2 as DecisionsState['ch2'];
  }
  if (typeof obj.ch3 === 'string' && (C3_OPTS as string[]).includes(obj.ch3)) {
    next.ch3 = obj.ch3 as DecisionsState['ch3'];
  }
  if (typeof obj.ch4 === 'string' && (C4_OPTS as string[]).includes(obj.ch4)) {
    next.ch4 = obj.ch4 as DecisionsState['ch4'];
  }
  if (typeof obj.ch5 === 'string' && (C5_OPTS as string[]).includes(obj.ch5)) {
    next.ch5 = obj.ch5 as DecisionsState['ch5'];
  }
  return next;
}

function sanitizeEventLog(raw: unknown): ArchiveEvent[] {
  if (!Array.isArray(raw)) return [];
  const out: ArchiveEvent[] = [];
  for (const item of raw.slice(0, 80)) {
    if (!item || typeof item !== 'object') continue;
    const ev = item as Record<string, unknown>;
    if (
      typeof ev.id !== 'string' ||
      typeof ev.title !== 'string' ||
      typeof ev.detail !== 'string' ||
      typeof ev.timestamp !== 'string'
    ) {
      continue;
    }
    const chapter =
      typeof ev.chapter === 'string' && VALID_CHAPTER_IDS.has(ev.chapter as ChapterId)
        ? (ev.chapter as ChapterId)
        : 'intro';
    const category =
      typeof ev.category === 'string' &&
      VALID_EVENT_CATEGORIES.has(ev.category as ArchiveEvent['category'])
        ? (ev.category as ArchiveEvent['category'])
        : 'chapter';
    out.push({
      id: ev.id.slice(0, 64),
      timestamp: ev.timestamp.slice(0, 32),
      chapter,
      category,
      title: ev.title.slice(0, 140),
      detail: ev.detail.slice(0, 320),
    });
  }
  return out;
}

export function sanitizeArchiveState(
  raw: unknown,
  defaultReducedMotion = false
): ArchiveProgressState {
  if (!raw || typeof raw !== 'object') {
    return { ...DEFAULT_ARCHIVE_STATE, reducedMotion: defaultReducedMotion };
  }
  const parsed = raw as Record<string, unknown>;
  const rawAudio =
    parsed.audio && typeof parsed.audio === 'object'
      ? (parsed.audio as Record<string, unknown>)
      : {};

  // Audio playback starts inactive across full reloads to comply with browser autoplay policies,
  // while preserving user volume levels and muted/narration preferences.
  const mergedAudio: AudioSettings = {
    enabled: false,
    muted: typeof rawAudio.muted === 'boolean' ? rawAudio.muted : DEFAULT_AUDIO_SETTINGS.muted,
    masterVolume: clampUnit(rawAudio.masterVolume, DEFAULT_AUDIO_SETTINGS.masterVolume),
    ambientVolume: clampUnit(rawAudio.ambientVolume, DEFAULT_AUDIO_SETTINGS.ambientVolume),
    sfxVolume: clampUnit(rawAudio.sfxVolume, DEFAULT_AUDIO_SETTINGS.sfxVolume),
    musicVolume: clampUnit(rawAudio.musicVolume, DEFAULT_AUDIO_SETTINGS.musicVolume),
    narrationEnabled:
      typeof rawAudio.narrationEnabled === 'boolean'
        ? rawAudio.narrationEnabled
        : DEFAULT_AUDIO_SETTINGS.narrationEnabled,
    narrationVolume: clampUnit(rawAudio.narrationVolume, DEFAULT_AUDIO_SETTINGS.narrationVolume),
  };

  const unlockedSecrets = sanitizeStringIdList(parsed.unlockedSecrets, VALID_SECRET_IDS);
  const visitedTerminalCode =
    typeof parsed.visitedTerminalCode === 'boolean'
      ? parsed.visitedTerminalCode
      : unlockedSecrets.includes('secret-002');

  return {
    introCompleted: Boolean(parsed.introCompleted),
    visitedChapters: sanitizeVisitedChapters(parsed.visitedChapters),
    decisions: sanitizeDecisions(parsed.decisions),
    inspectedArtifacts: sanitizeStringIdList(parsed.inspectedArtifacts, VALID_ARTIFACT_IDS),
    discoveredLostArtifacts: sanitizeStringIdList(
      parsed.discoveredLostArtifacts,
      VALID_LOST_IDS
    ),
    repairedFiles: sanitizeStringIdList(parsed.repairedFiles, VALID_FILE_IDS),
    unlockedSecrets,
    unlockedClues: sanitizeStringIdList(parsed.unlockedClues, VALID_CLUE_IDS),
    visitedTerminalCode,
    eventLog: sanitizeEventLog(parsed.eventLog),
    audio: mergedAudio,
    soundEnabled: false,
    reducedMotion:
      typeof parsed.reducedMotion === 'boolean' ? parsed.reducedMotion : defaultReducedMotion,
  };
}

function makeEvent(
  chapter: ChapterId,
  category: ArchiveEvent['category'],
  title: string,
  detail: string
): ArchiveEvent {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    timestamp: new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }),
    chapter,
    category,
    title,
    detail,
  };
}

function loadState(): ArchiveProgressState {
  if (typeof window === 'undefined') return DEFAULT_ARCHIVE_STATE;
  try {
    const raw =
      window.localStorage.getItem(STORAGE_KEY) ||
      window.localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!raw) {
      return { ...DEFAULT_ARCHIVE_STATE, reducedMotion: getInitialReducedMotion() };
    }
    const parsed: unknown = JSON.parse(raw);
    return sanitizeArchiveState(parsed, getInitialReducedMotion());
  } catch {
    return { ...DEFAULT_ARCHIVE_STATE, reducedMotion: getInitialReducedMotion() };
  }
}

function addClueUnique(existing: string[] | undefined, clueId: string): string[] {
  const list = existing ?? [];
  return list.includes(clueId) ? list : [...list, clueId];
}

export function useArchiveState() {
  const [state, setState] = useState<ArchiveProgressState>(loadState);

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

  // Keep audio engine parameters synced with persisted audio mixer levels
  useEffect(() => {
    audioEngine.updateSettings(state.audio);
  }, [state.audio]);

  const markIntroCompleted = useCallback(() => {
    audioEngine.playEraSound('sphereOpen');
    setState((prev) => ({
      ...prev,
      introCompleted: true,
      visitedChapters: prev.visitedChapters.includes(1)
        ? prev.visitedChapters
        : ([...prev.visitedChapters, 1] as ChapterNumber[]),
      unlockedClues: addClueUnique(prev.unlockedClues, 'clue-hearth-covenant'),
      eventLog: [
        makeEvent(
          'intro',
          'chapter',
          'Archive Access Granted',
          'Entered Chapter 01 — The First Spark.'
        ),
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
        visitedChapters: [...prev.visitedChapters, chapter].sort((a, b) => a - b),
        unlockedClues: nextClues,
        eventLog: [
          makeEvent(
            `ch${chapter}` as ChapterId,
            'chapter',
            `Entered Chapter 0${chapter}`,
            'Historical layer indexed.'
          ),
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
        makeEvent(
          key as ChapterId,
          'decision',
          `Timeline Choice (${key.toUpperCase()})`,
          `Recorded choice: ${String(value)}.`
        ),
        ...prev.eventLog,
      ].slice(0, 80),
    }));
  }, []);

  const unlockSecret = useCallback(
    (secretId: string, onNewlyUnlocked?: (secretId: string) => void) => {
      let didUnlock = false;
      setState((prev) => {
        if (prev.unlockedSecrets.includes(secretId)) return prev;
        didUnlock = true;
        const secret = SECRET_MEMORIES.find((s) => s.id === secretId);
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
      if (didUnlock) {
        audioEngine.playEraSound('secret');
        onNewlyUnlocked?.(secretId);
      }
    },
    []
  );

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
          (artifactId === 'art-clockwork-machine' ||
            nextInspected.includes('art-clockwork-machine')) &&
          Boolean(prev.visitedTerminalCode) &&
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
            makeEvent(
              `ch${artifact.chapter}` as ChapterId,
              'artifact',
              `Inspected ${artifact.name}`,
              artifact.summary
            )
          );
        }

        if (shouldUnlockSecret002) {
          newlyUnlockedSecrets.push('secret-002');
          nextSecrets.push('secret-002');
          const sec = SECRET_MEMORIES.find((s) => s.id === 'secret-002');
          events.unshift(
            makeEvent(
              'ch3',
              'secret',
              `Secret Discovered · ${sec?.title}`,
              sec?.historicalInsight ?? ''
            )
          );
        }

        if (shouldUnlockSecret005) {
          newlyUnlockedSecrets.push('secret-005');
          nextSecrets.push('secret-005');
          const sec = SECRET_MEMORIES.find((s) => s.id === 'secret-005');
          events.unshift(
            makeEvent(
              'ch5',
              'secret',
              `Secret Discovered · ${sec?.title}`,
              sec?.historicalInsight ?? ''
            )
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

  const markTerminalCodeVisited = useCallback(
    (onSecretDiscovered?: (secretId: string) => void) => {
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
            visitedTerminalCode: true,
            unlockedSecrets: [...prev.unlockedSecrets, 'secret-002'],
            unlockedClues: nextClues,
            eventLog: [
              makeEvent(
                'ch3',
                'secret',
                `Secret Discovered · ${sec?.title}`,
                sec?.historicalInsight ?? ''
              ),
              ...prev.eventLog,
            ].slice(0, 80),
          };
        }
        return {
          ...prev,
          visitedTerminalCode: true,
          unlockedClues: nextClues,
        };
      });

      if (unlockedLovelace) {
        audioEngine.playEraSound('secret');
        onSecretDiscovered?.('secret-002');
      }
    },
    []
  );

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

  const repairFile = useCallback(
    (fileId: string, onSecretDiscovered?: (secretId: string) => void) => {
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
            makeEvent(
              `ch${file.chapter}` as ChapterId,
              'file',
              `Restored ${file.filename}`,
              file.hiddenMemoryTitle
            )
          );
        }

        if (fileId === 'file-unknown-2075' && !prev.unlockedSecrets.includes('secret-003')) {
          unlockedQuorum = true;
          nextSecrets = [...nextSecrets, 'secret-003'];
          nextClues = addClueUnique(nextClues, 'clue-2075-quorum');
          const sec = SECRET_MEMORIES.find((s) => s.id === 'secret-003');
          events.unshift(
            makeEvent(
              'ch5',
              'secret',
              `Secret Discovered · ${sec?.title}`,
              sec?.historicalInsight ?? ''
            )
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
    },
    []
  );

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
      ...DEFAULT_ARCHIVE_STATE,
      audio: prev.audio,
      soundEnabled: prev.soundEnabled,
      reducedMotion: prev.reducedMotion,
      introCompleted: true,
      visitedChapters: [1],
      visitedTerminalCode: keepCollection ? Boolean(prev.visitedTerminalCode) : false,
      discoveredLostArtifacts: keepCollection ? prev.discoveredLostArtifacts : [],
      repairedFiles: keepCollection ? prev.repairedFiles : [],
      inspectedArtifacts: keepCollection ? prev.inspectedArtifacts : [],
      unlockedSecrets: keepCollection ? prev.unlockedSecrets : [],
      unlockedClues: keepCollection ? prev.unlockedClues ?? [] : ['clue-hearth-covenant'],
      eventLog: [
        makeEvent(
          'intro',
          'chapter',
          keepCollection ? 'Choices Reset (Discoveries Kept)' : 'Full Archive Reset',
          keepCollection
            ? 'Decisions cleared while preserving recovered artifacts, lost memories, and secrets.'
            : 'All decisions, discoveries, clues, and files restored to initial 2075 state.'
        ),
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
