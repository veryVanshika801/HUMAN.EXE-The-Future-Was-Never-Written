export type ChapterId = 'intro' | 'ch1' | 'ch2' | 'ch3' | 'ch4' | 'ch5' | 'ending' | 'credits';

export type ChapterNumber = 1 | 2 | 3 | 4 | 5;

export type Choice1 = 'share' | 'restrict';
export type Choice2 = 'productivity' | 'purpose';
export type Choice3 = 'open' | 'privacy';
export type Choice4 = 'total_connection' | 'digital_privacy';
export type Choice5 = 'ai_leads' | 'humans_lead' | 'collaborate';

export interface DecisionsState {
  ch1?: Choice1;
  ch2?: Choice2;
  ch3?: Choice3;
  ch4?: Choice4;
  ch5?: Choice5;
}

export type EndingArchetype = 'renaissance' | 'dominion' | 'symbiotic';

export interface AudioSettings {
  enabled: boolean;
  muted: boolean;
  masterVolume: number;    // 0..1
  ambientVolume: number;   // 0..1
  sfxVolume: number;       // 0..1
  musicVolume: number;     // 0..1
  narrationEnabled: boolean;
  narrationVolume: number; // 0..1
}

export interface ArchiveEvent {
  id: string;
  timestamp: string;
  chapter: ChapterId;
  category: 'chapter' | 'artifact' | 'lost' | 'file' | 'decision' | 'secret';
  title: string;
  detail: string;
}

export interface ArtifactItem {
  id: string;
  chapter: ChapterNumber;
  name: string;
  accessionCode: string;
  era: string;
  perspectiveTag?: string;
  soundType: 'stone' | 'gear' | 'steam' | 'keyclick' | 'networkPulse' | 'neuralPulse';
  summary: string;
  historicalContext: string;
  whyItMattered: string;
  impactOnHumanity: string;
}

export interface LostArtifactItem {
  id: string;
  chapter: ChapterNumber;
  memoryCode: string;
  name: string;
  title: string;
  hint: string;
  locationLabel: string;
  narrative: string;
  purpose: string;
  impact: string;
}

export interface SecretMemoryItem {
  id: string;
  chapter: ChapterNumber;
  code: string;
  title: string;
  triggerHint: string;
  narrative: string;
  historicalInsight: string;
}

export interface CorruptedFileItem {
  id: string;
  filename: string;
  chapter: ChapterNumber;
  sizeLabel: string;
  fileType: string;
  requiredLostArtifactId?: string;
  corruptedPreview: string;
  hiddenMemoryTitle: string;
  hiddenMemory: string;
  technologicalFact: string;
  narrativeFragment: string;
  forwardConnection: string;
}

export interface ChapterStage {
  index: number; // 1..6
  code: string;
  title: string;
  kicker: string;
  body: string[];
  depthLayer: 'left' | 'right' | 'center';
}

export interface DecisionOption {
  value: string;
  label: string;
  shortTag: string;
  consequenceSummary: string;
  whatIfNarrative: string;
  whatIfVisualCue: string;
  whatIfConsequence: string;
  accentTone: 'green' | 'amber' | 'silver';
}

export interface ChapterData {
  id: `ch${ChapterNumber}`;
  number: ChapterNumber;
  period: string;
  title: string;
  subtitle: string;
  movementLanguage: string;
  story: string[];
  stages: ChapterStage[];
  environmentNote: string;
  decisionPrompt: string;
  options: DecisionOption[];
  transitionText: string;
  consequenceFromPrevious?: Record<string, {
    badge: string;
    heading: string;
    detail: string;
    environmentShift: string;
  }>;
}

export interface GlobeNodeData {
  id: string;
  city: string;
  year: string;
  lat: number;
  lon: number;
  title: string;
  description: string;
  legacy: string;
}

export interface GearStageData {
  id: string;
  index: number;
  name: string;
  year: string;
  mechanism: string;
  chainEffect: string;
}

export interface InfluenceScores {
  humanAgency: number;
  machineAutomation: number;
  symbioticSynthesis: number;
}

export interface PathOutcome {
  pathIndex: number;
  pathId: string;
  signature: string;
  archetype: EndingArchetype;
  archetypeTitle: string;
  archetypeQuote: string;
  pathTitle: string;
  futureDescription: string;
  finalArchiveMessage: string;
  historicalSummary: string;
  unlockedMemories: string[];
  visualVariation: {
    label: string;
    skyHue: string;
    structureDensity: number;
    organicRatio: number;
    ringSpeed: number;
    accentHex: string;
    atmosphereNote: string;
  };
  scores: InfluenceScores;
}

export interface ArchiveProgressState {
  introCompleted: boolean;
  visitedChapters: ChapterNumber[];
  decisions: DecisionsState;
  inspectedArtifacts: string[];
  discoveredLostArtifacts: string[];
  repairedFiles: string[];
  unlockedSecrets: string[];
  eventLog: ArchiveEvent[];
  audio: AudioSettings;
  soundEnabled: boolean;
  reducedMotion: boolean;
}
