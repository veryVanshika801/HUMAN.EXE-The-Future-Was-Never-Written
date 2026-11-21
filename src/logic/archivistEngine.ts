import {
  ARCHIVE_PHILOSOPHY_OVERVIEW,
  ARCHIVIST_FALLBACK_MESSAGE,
  ENDING_GUIDES,
  HISTORICAL_FIGURES,
  KNOWLEDGE_ENTRIES,
  EndingGuideEntry,
  HistoricalFigureEntry,
  KnowledgeEntry,
} from '../data/archivistKnowledge';
import { CHAPTERS } from '../data/chapters';
import {
  ARTIFACTS,
  CORRUPTED_FILES,
  GLOBE_NODES,
  INTERNET_TIMELINE,
  LOST_ARTIFACTS,
  MACHINE_GEARS,
  SECRET_MEMORIES,
} from '../data/artifacts';
import { JOURNAL_CLUES } from '../hooks/useArchiveState';
import {
  calculateLiveHumanityIndex,
  getPendingDecisionChapters,
  getSelectedDecisionChapters,
  resolvePathOutcome,
} from './decisionEngine';
import { ArchiveProgressState, ChapterId, ChapterNumber, PathOutcome } from '../types/archive';

export interface ArchivistConversationMessage {
  id: string;
  role: 'user' | 'archivist';
  text: string;
  topics?: string[];
  recordType?: ArchivistRecordType;
}

export type ArchivistRecordType =
  | 'archive_state'
  | 'historical'
  | 'hybrid'
  | 'speculative_2075'
  | 'meta_archive'
  | 'fallback';

export interface ArchivistSection {
  label: string;
  text: string;
}

export interface ArchivistQueryInput {
  question: string;
  activeChapter: ChapterId;
  state: ArchiveProgressState;
  outcome?: PathOutcome;
  completionPercentage?: number;
}

export type ArchivistResponse =
  | {
      ok: false;
      code: 'EMPTY_INPUT';
      error: string;
    }
  | {
      ok: true;
      matched: boolean;
      answer: string;
      topics: string[];
      sections: ArchivistSection[];
      recordType: ArchivistRecordType;
    };

export function createInitialArchivistMessages(): ArchivistConversationMessage[] {
  return [];
}

export function clearArchivistConversation(): ArchivistConversationMessage[] {
  return [];
}

const STOP_WORDS = new Set([
  'a',
  'an',
  'and',
  'are',
  'as',
  'at',
  'be',
  'been',
  'being',
  'between',
  'but',
  'by',
  'can',
  'could',
  'did',
  'do',
  'does',
  'doing',
  'done',
  'for',
  'from',
  'get',
  'give',
  'had',
  'has',
  'have',
  'he',
  'her',
  'here',
  'hers',
  'him',
  'his',
  'how',
  'i',
  'if',
  'in',
  'into',
  'is',
  'it',
  'its',
  'just',
  'know',
  'let',
  'make',
  'me',
  'more',
  'most',
  'my',
  'of',
  'on',
  'or',
  'our',
  'out',
  'please',
  'said',
  'say',
  'see',
  'she',
  'should',
  'so',
  'some',
  'tell',
  'than',
  'that',
  'the',
  'their',
  'them',
  'then',
  'there',
  'these',
  'they',
  'this',
  'those',
  'to',
  'up',
  'us',
  'very',
  'was',
  'we',
  'were',
  'what',
  'when',
  'where',
  'which',
  'who',
  'whom',
  'why',
  'will',
  'with',
  'would',
  'you',
  'your',
  'explain',
  'describe',
  'about',
  'important',
  'mean',
  'means',
  'meaning',
  'reveal',
  'reveals',
  'really',
]);

const OFF_TOPIC_MARKERS = new Set([
  'weather',
  'forecast',
  'temperature',
  'rain',
  'recipe',
  'recipes',
  'cook',
  'cooking',
  'bake',
  'baking',
  'pasta',
  'pizza',
  'cake',
  'bitcoin',
  'ethereum',
  'crypto',
  'cryptocurrency',
  'stock',
  'stocks',
  'nasdaq',
  'football',
  'soccer',
  'cricket',
  'nba',
  'nfl',
  'fifa',
  'movie',
  'movies',
  'netflix',
  'lyrics',
  'horoscope',
  'astrology',
  'joke',
  'riddle',
  'translate',
  'homework',
]);

const SPELLING_EQUIVALENTS: Record<string, string> = {
  labour: 'labor',
  mechanisation: 'mechanization',
  analyse: 'analyze',
  analysis: 'analyze',
  organisation: 'organization',
  civilisation: 'civilization',
  programme: 'program',
  programmes: 'programs',
  colour: 'color',
  centre: 'center',
  artefact: 'artifact',
  artefacts: 'artifacts',
  humankind: 'humanity',
  ai: 'ai',
};

const SYNONYM_EXPANSIONS: Record<string, string[]> = {
  ada: ['ada', 'lovelace'],
  lovelace: ['ada', 'lovelace'],
  turing: ['turing', 'alan'],
  hopper: ['hopper', 'grace'],
  watt: ['watt', 'james', 'steam'],
  babbage: ['babbage', 'charles', 'analytical'],
  berners: ['berners', 'tim', 'web', 'cern'],
  shannon: ['shannon', 'claude', 'bit'],
  jacquard: ['jacquard', 'loom', 'punched'],
  eniac: ['eniac', 'programmers', '1946'],
  industrialization: ['industrial', 'revolution', 'mechanization'],
  mechanization: ['industrial', 'gear', 'machine', 'factory'],
  cybernetic: ['ai', 'intelligence', 'neural'],
  fiction: ['fiction', 'speculative', '2075'],
  speculative: ['fiction', 'speculative', '2075'],
  reality: ['fact', 'documented', 'real'],
  score: ['score', 'index', 'humanity'],
  scores: ['score', 'index', 'humanity'],
  points: ['score', 'index', 'humanity'],
  choice: ['decision', 'choice'],
  choices: ['decision', 'choice'],
  choose: ['decision', 'choice'],
  chosen: ['decision', 'choice'],
  chose: ['decision', 'choice'],
  outcome: ['ending', 'outcome', 'future'],
  endings: ['ending', 'archetype'],
  artifacts: ['artifact', 'relic'],
  relics: ['artifact', 'relic'],
  secret: ['secret', 'hidden'],
  secrets: ['secret', 'hidden'],
  memories: ['lost', 'memory', 'secret'],
  unexplored: ['next', 'undiscovered', 'remaining'],
  remaining: ['next', 'undiscovered', 'remaining'],
  undiscovered: ['next', 'undiscovered', 'remaining'],
  submarine: ['subsea', 'submarine', 'cable'],
  oceanic: ['subsea', 'ocean', 'cable'],
};

function stemToken(token: string): string {
  if (token.length <= 3) return token;
  if (token.endsWith('ies') && token.length > 4) return `${token.slice(0, -3)}y`;
  if (token.endsWith('ing') && token.length > 5) return token.slice(0, -3);
  if (token.endsWith('ed') && token.length > 4) return token.slice(0, -2);
  if (token.endsWith('es') && token.length > 4) return token.slice(0, -2);
  if (token.endsWith('s') && !token.endsWith('ss') && token.length > 3) return token.slice(0, -1);
  return token;
}

interface NormalizedQuery {
  raw: string;
  normalizedText: string;
  rawTokens: string[];
  meaningfulTokens: string[];
  expandedTokens: Set<string>;
  stemmedTokens: Set<string>;
  mentionedChapters: ChapterNumber[];
  refersToCurrentChapter: boolean;
  refersToSelfProgress: boolean;
  asksAboutDecision: boolean;
  asksAboutEnding: boolean;
  asksAboutHumanityIndex: boolean;
  asksAboutProgressOrNext: boolean;
  asksAboutConnectionToFuture: boolean;
  asksAboutHistoryVsFiction: boolean;
  asksAboutIdentity: boolean;
  hasOffTopicMarker: boolean;
}

function normalizeText(input: string): string {
  return input
    .toLowerCase()
    .replace(/[’']/g, "'")
    .replace(/\bwhat's\b/g, 'what is')
    .replace(/\bwho's\b/g, 'who is')
    .replace(/\bwhere's\b/g, 'where is')
    .replace(/\bhow's\b/g, 'how is')
    .replace(/\bit's\b/g, 'it is')
    .replace(/\bi'm\b/g, 'i am')
    .replace(/\bi've\b/g, 'i have')
    .replace(/\bdidn't\b/g, 'did not')
    .replace(/\bdoesn't\b/g, 'does not')
    .replace(/\bcan't\b/g, 'cannot')
    .replace(/\bchapter\s+one\b|\bfirst\s+chapter\b|\bch\s*0?1\b|\bchapter\s*0?1\b/g, 'chapter 1')
    .replace(/\bchapter\s+two\b|\bsecond\s+chapter\b|\bch\s*0?2\b|\bchapter\s*0?2\b/g, 'chapter 2')
    .replace(/\bchapter\s+three\b|\bthird\s+chapter\b|\bch\s*0?3\b|\bchapter\s*0?3\b/g, 'chapter 3')
    .replace(/\bchapter\s+four\b|\bfourth\s+chapter\b|\bch\s*0?4\b|\bchapter\s*0?4\b/g, 'chapter 4')
    .replace(/\bchapter\s+five\b|\bfifth\s+chapter\b|\bch\s*0?5\b|\bchapter\s*0?5\b/g, 'chapter 5')
    .replace(/[^a-z0-9.\-_\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function analyzeQuery(question: string, activeChapter: ChapterId): NormalizedQuery {
  const normalizedText = normalizeText(question);
  const rawTokens = normalizedText.split(' ').filter(Boolean);

  const normalizedWords = rawTokens.map((t) => SPELLING_EQUIVALENTS[t] ?? t);
  const meaningfulTokens = normalizedWords.filter((t) => !STOP_WORDS.has(t));

  const expandedTokens = new Set<string>();
  const stemmedTokens = new Set<string>();

  for (const tok of normalizedWords) {
    expandedTokens.add(tok);
    stemmedTokens.add(stemToken(tok));
    const syn = SYNONYM_EXPANSIONS[tok];
    if (syn) {
      for (const s of syn) {
        expandedTokens.add(s);
        stemmedTokens.add(stemToken(s));
      }
    }
  }

  const chapterMatches = Array.from(normalizedText.matchAll(/\bchapter ([1-5])\b/g)).map(
    (m) => Number(m[1]) as ChapterNumber
  );
  const activeNumMatch = activeChapter.match(/^ch([1-5])$/);
  const activeNum = activeNumMatch ? (Number(activeNumMatch[1]) as ChapterNumber) : null;

  const refersToCurrentChapter = /\b(this chapter|current chapter|this era|current era|here)\b/.test(
    normalizedText
  );
  const mentionedChaptersSet = new Set<ChapterNumber>(chapterMatches);
  if (refersToCurrentChapter && activeNum) {
    mentionedChaptersSet.add(activeNum);
  }

  const refersToSelfProgress =
    /\b(i|my|mine|so far|recorded|unlocked|inspected|repaired|discovered|visited|incomplete|pending|undecided)\b/.test(
      normalizedText
    );

  const asksAboutDecision =
    /\b(decision|decisions|choice|choices|decide|decided|chose|chosen|pick|picked|selected|pending|undecided)\b/.test(
      normalizedText
    );
  const asksAboutEnding =
    /\b(ending|endings|outcome|archetype|path|trajectory|simulation|2075)\b/.test(normalizedText) &&
    (/\b(my|mean|represent|reveal|explain|explore|unlock|archetype|outcome|ending|48|five)\b/.test(
      normalizedText
    ) ||
      refersToSelfProgress);
  const asksAboutHumanityIndex =
    /\b(humanity index|index|score|scores|innovation|connection|agency|human agency)\b/.test(
      normalizedText
    );
  const asksAboutProgressOrNext =
    /\b(artifact|artifacts|secret|secrets|clue|clues|lost memory|lost memories|corrupted|file|files|progress|completion|next|explore|missing|remaining|undiscovered|visited)\b/.test(
      normalizedText
    ) &&
    (refersToSelfProgress || /\b(next|should i|look for|missing|remaining)\b/.test(normalizedText));

  const asksAboutConnectionToFuture =
    /\b(connect|connected|connection|shape|shaping|lead|leads|affect|impact|ripple|butterfly|future)\b/.test(
      normalizedText
    ) &&
    (asksAboutDecision || refersToSelfProgress || /\bfuture\b/.test(normalizedText));

  const asksAboutHistoryVsFiction =
    /\b(separate|separates|difference|real|documented|factual|fact)\b/.test(normalizedText) &&
    /\b(fiction|speculative|2075|story|narrative)\b/.test(normalizedText);

  const asksAboutIdentity =
    /^(who are you|what are you|how do you work|are you ai|are you gemini|tell me about yourself)\b/.test(
      normalizedText
    ) || /\b(what is the archivist|offline mode|rule based)\b/.test(normalizedText);

  const hasOffTopicMarker = normalizedWords.some((w) => OFF_TOPIC_MARKERS.has(w));

  return {
    raw: question.trim(),
    normalizedText,
    rawTokens: normalizedWords,
    meaningfulTokens,
    expandedTokens,
    stemmedTokens,
    mentionedChapters: Array.from(mentionedChaptersSet).sort((a, b) => a - b),
    refersToCurrentChapter,
    refersToSelfProgress,
    asksAboutDecision,
    asksAboutEnding,
    asksAboutHumanityIndex,
    asksAboutProgressOrNext,
    asksAboutConnectionToFuture,
    asksAboutHistoryVsFiction,
    asksAboutIdentity,
    hasOffTopicMarker,
  };
}

function formatSections(sections: ArchivistSection[]): string {
  return sections.map((s) => `[${s.label}]\n${s.text}`).join('\n\n');
}

function getDecisionLabelForChapter(
  chapterNum: ChapterNumber,
  value: string | undefined
): { label: string; consequence: string } | null {
  if (!value) return null;
  const ch = CHAPTERS.find((c) => c.number === chapterNum);
  const opt = ch?.options.find((o) => o.value === value);
  if (!opt) return null;
  return { label: opt.label, consequence: opt.consequenceSummary };
}

function buildHumanityIndexReport(
  state: ArchiveProgressState,
  _outcome: PathOutcome
): ArchivistResponse {
  const index = calculateLiveHumanityIndex(state.decisions, state);
  const factorLines = CHAPTERS.map((ch) => {
    const f = index.decisionFactorsByChapter[ch.number];
    if (f.status === 'selected') {
      const sign = (n: number) => (n >= 0 ? `+${n}` : `${n}`);
      return `• CH 0${ch.number} (${ch.title}): ${f.optionLabel} [INN ${sign(f.innovationDelta)}, CON ${sign(f.connectionDelta)}, AGN ${sign(f.agencyDelta)}]`;
    }
    return `• CH 0${ch.number} (${ch.title}): Pending (0 delta counted until you choose)`;
  }).join('\n');

  const sections: ArchivistSection[] = [
    {
      label: 'Humanity Index Telemetry',
      text: `Current Live Scores (${index.selectedCount}/5 decisions recorded):\n• Innovation: ${index.innovation}% (Baseline ${index.baselineScores.innovation}% + decisions + ${index.explorationBonuses.innovation}% from ${state.inspectedArtifacts.length} inspected artifacts)\n• Connection: ${index.connection}% (Baseline ${index.baselineScores.connection}% + decisions + ${index.explorationBonuses.connection}% from ${state.discoveredLostArtifacts.length} lost memories & ${state.unlockedSecrets.length} secrets)\n• Human Agency: ${index.humanAgency}% (Baseline ${index.baselineScores.humanAgency}% + decisions + ${index.explorationBonuses.humanAgency}% from ${state.repairedFiles.length} repaired files)\n• Overall Composite: ${index.overallScore}%`,
    },
    {
      label: 'Per-Chapter Decision Deltas',
      text: factorLines,
    },
    {
      label: 'Calibration Note',
      text: index.isComplete
        ? 'All five historical decisions are locked. Your Humanity Index reflects the complete butterfly-effect trajectory plus discovery bonuses.'
        : `Chapters ${index.pendingChapters.map((c) => `CH 0${c}`).join(', ')} are still undecided and remain at 0 delta so progress is never invented.`,
    },
  ];

  return {
    ok: true,
    matched: true,
    answer: formatSections(sections),
    topics: ['Humanity Index', 'Decision Telemetry'],
    sections,
    recordType: 'archive_state',
  };
}

function buildPersonalDecisionsReport(
  query: NormalizedQuery,
  state: ArchiveProgressState,
  outcome: PathOutcome
): ArchivistResponse {
  const index = calculateLiveHumanityIndex(state.decisions, state);
  const selectedChapters = getSelectedDecisionChapters(state.decisions);
  const pendingChapters = getPendingDecisionChapters(state.decisions);

  // If asking about a single specific chapter's decision (e.g., "What did I decide in chapter 3?")
  if (query.mentionedChapters.length === 1 && !/\b(all|so far|decisions|summarize|connect|connected)\b/.test(query.normalizedText)) {
    const chNum = query.mentionedChapters[0];
    const ch = CHAPTERS.find((c) => c.number === chNum)!;
    const key = `ch${chNum}` as keyof ArchiveProgressState['decisions'];
    const rawChoice = state.decisions[key];
    const resolved = getDecisionLabelForChapter(chNum, rawChoice);
    const factor = index.decisionFactorsByChapter[chNum];

    if (resolved) {
      const sign = (n: number) => (n >= 0 ? `+${n}` : `${n}`);
      const sections: ArchivistSection[] = [
        {
          label: `Recorded Decision · Chapter 0${chNum}`,
          text: `In Chapter 0${chNum} (${ch.title}, ${ch.period}), your recorded choice is "${resolved.label}".\n${resolved.consequence}`,
        },
        {
          label: 'Impact on Timeline & Index',
          text: `Index Deltas: Innovation ${sign(factor.innovationDelta)}, Connection ${sign(factor.connectionDelta)}, Human Agency ${sign(factor.agencyDelta)}.\nCausal Memory Unlocked: ${outcome.unlockedMemoriesByChapter[chNum] ?? 'Recorded'}.`,
        },
      ];
      return {
        ok: true,
        matched: true,
        answer: formatSections(sections),
        topics: [`CH 0${chNum} Decision`],
        sections,
        recordType: 'archive_state',
      };
    }

    const availableList = ch.options.map((o) => `• ${o.label} — ${o.shortTag}`).join('\n');
    const sections: ArchivistSection[] = [
      {
        label: `Pending Decision · Chapter 0${chNum}`,
        text: `You have not made a decision in Chapter 0${chNum} (${ch.title}) yet. No default choice is recorded for pending chapters.`,
      },
      {
        label: 'Prompt Awaiting Your Choice',
        text: `"${ch.decisionPrompt}"\n${availableList}`,
      },
    ];
    return {
      ok: true,
      matched: true,
      answer: formatSections(sections),
      topics: [`CH 0${chNum} Pending`],
      sections,
      recordType: 'archive_state',
    };
  }

  // Full multi-chapter decision summary & causal linkage
  const lines = CHAPTERS.map((ch) => {
    const key = `ch${ch.number}` as keyof ArchiveProgressState['decisions'];
    const raw = state.decisions[key];
    const resolved = getDecisionLabelForChapter(ch.number, raw);
    if (resolved) {
      return `• CH 0${ch.number} (${ch.title}): ${resolved.label} — ${resolved.consequence}`;
    }
    return `• CH 0${ch.number} (${ch.title}): PENDING (not decided yet — prompt: "${ch.decisionPrompt}")`;
  }).join('\n');

  const sections: ArchivistSection[] = [
    {
      label: `Your Archive Decisions (${selectedChapters.length}/5 Recorded)`,
      text:
        selectedChapters.length === 0
          ? `No decisions have been recorded yet. Every chapter from CH 01 to CH 05 awaits your choice.\n\n${lines}`
          : lines,
    },
    {
      label: 'Causal Connection Toward 2075',
      text: outcome.isComplete
        ? `All 5 decisions are sealed into ${outcome.pathId} (${outcome.archetypeTitle}). ${outcome.historicalSummary}`
        : `Because ${pendingChapters.length} chapter${pendingChapters.length === 1 ? '' : 's'} remain${pendingChapters.length === 1 ? 's' : ''} undecided (${pendingChapters.map((c) => `CH 0${c}`).join(', ')}), your 2075 timeline stays in draft mode. Each choice alters both the next era’s architectural tone and the three Humanity Index axes (${index.innovation}/${index.connection}/${index.humanAgency}).`,
    },
  ];

  return {
    ok: true,
    matched: true,
    answer: formatSections(sections),
    topics: ['Recorded Decisions', outcome.isComplete ? outcome.archetypeTitle : 'Draft Trajectory'],
    sections,
    recordType: 'archive_state',
  };
}

function buildPersonalEndingReport(
  query: NormalizedQuery,
  state: ArchiveProgressState,
  outcome: PathOutcome
): ArchivistResponse {
  // Check if user is asking specifically about one named archetype
  const specificArchetype = scoreEndingGuides(query)[0];
  if (
    specificArchetype &&
    specificArchetype.score >= 8 &&
    !query.refersToSelfProgress &&
    !/\b(my ending|my outcome|my future)\b/.test(query.normalizedText)
  ) {
    const guide = specificArchetype.item;
    const sections: ArchivistSection[] = [
      {
        label: `2075 Speculative Archetype · ${guide.title}`,
        text: guide.meaning,
      },
      {
        label: 'How Choices Trigger It',
        text: guide.typicalDrivers,
      },
      {
        label: '2075 World State',
        text: guide.speculative2075Outlook,
      },
    ];
    return {
      ok: true,
      matched: true,
      answer: formatSections(sections),
      topics: [guide.title],
      sections,
      recordType: 'speculative_2075',
    };
  }

  // Asking about all five archetypes in general
  if (
    /\b(five endings|5 endings|all endings|48 paths|48 timelines)\b/.test(query.normalizedText) &&
    !query.refersToSelfProgress
  ) {
    const list = ENDING_GUIDES.map((g) => `• ${g.title}: ${g.meaning}`).join('\n');
    const sections: ArchivistSection[] = [
      {
        label: 'The 48 Causal Paths & 5 Ending Archetypes',
        text: `Across Chapters 01–05 (2 × 2 × 2 × 2 × 3 choices), HUMAN.EXE branches into 48 distinct path IDs grouped into five 2075 archetypes:\n${list}`,
      },
      {
        label: 'Archive Status Note',
        text: outcome.isComplete
          ? `Your sealed trajectory is ${outcome.archetypeTitle} (${outcome.pathId}).`
          : `You currently have ${outcome.selectedCount}/5 decisions recorded (${outcome.pendingChapters.map((c) => `CH 0${c}`).join(', ')} pending).`,
      },
    ];
    return {
      ok: true,
      matched: true,
      answer: formatSections(sections),
      topics: ['48 Paths', '5 Ending Archetypes'],
      sections,
      recordType: 'speculative_2075',
    };
  }

  const index = calculateLiveHumanityIndex(state.decisions, state);
  if (!outcome.isComplete) {
    const pendingList = outcome.pendingChapters.map((c) => `CH 0${c}`).join(', ');
    const sections: ArchivistSection[] = [
      {
        label: `Unsealed Ending · ${outcome.selectedCount}/5 Decisions Complete`,
        text: `Your 2075 ending is not finalized yet because ${pendingList} still ${outcome.pendingChapters.length === 1 ? 'needs' : 'need'} a recorded decision. The Archive never invents default answers for unfinished eras.`,
      },
      {
        label: 'Current Draft Telemetry',
        text: `${outcome.historicalSummary}\nCurrent Humanity Index: Innovation ${index.innovation}%, Connection ${index.connection}%, Human Agency ${index.humanAgency}%.`,
      },
      {
        label: 'How to Seal Your Outcome',
        text: `Return to ${pendingList} to make the remaining choice${outcome.pendingChapters.length === 1 ? '' : 's'}, then inspect Archive Core (2075) to reveal your 1-of-48 path and final archetype.`,
      },
    ];
    return {
      ok: true,
      matched: true,
      answer: formatSections(sections),
      topics: ['Unsealed Ending', `Pending ${pendingList}`],
      sections,
      recordType: 'archive_state',
    };
  }

  const guide = ENDING_GUIDES.find((g) => g.archetype === outcome.archetype);
  const sections: ArchivistSection[] = [
    {
      label: `Sealed 2075 Outcome · ${outcome.archetypeTitle}`,
      text: `Path #${String(outcome.pathIndex).padStart(2, '0')}/48 (${outcome.pathId}) — ${outcome.pathTitle}.\n“${outcome.archetypeQuote}”`,
    },
    {
      label: 'What Your Ending Reveals',
      text: `${guide?.meaning ?? outcome.futureDescription}\n\n${outcome.futureDescription}`,
    },
    {
      label: 'Causal Lineage Across All Five Eras',
      text: `${outcome.historicalSummary}\n\n${outcome.finalArchiveMessage}\nFinal Humanity Index: Innovation ${index.innovation}% · Connection ${index.connection}% · Human Agency ${index.humanAgency}%.`,
    },
  ];
  return {
    ok: true,
    matched: true,
    answer: formatSections(sections),
    topics: [outcome.archetypeTitle, outcome.pathId],
    sections,
    recordType: 'archive_state',
  };
}

function buildProgressAndDiscoveryReport(
  query: NormalizedQuery,
  state: ArchiveProgressState,
  completionPercentage?: number
): ArchivistResponse {
  const inspected = ARTIFACTS.filter((a) => state.inspectedArtifacts.includes(a.id));
  const missingArtifacts = ARTIFACTS.filter((a) => !state.inspectedArtifacts.includes(a.id));
  const foundLost = LOST_ARTIFACTS.filter((l) => state.discoveredLostArtifacts.includes(l.id));
  const missingLost = LOST_ARTIFACTS.filter((l) => !state.discoveredLostArtifacts.includes(l.id));
  const repaired = CORRUPTED_FILES.filter((f) => state.repairedFiles.includes(f.id));
  const missingFiles = CORRUPTED_FILES.filter((f) => !state.repairedFiles.includes(f.id));
  const unlockedSecrets = SECRET_MEMORIES.filter((s) => state.unlockedSecrets.includes(s.id));
  const missingSecrets = SECRET_MEMORIES.filter((s) => !state.unlockedSecrets.includes(s.id));
  const unlockedClues = JOURNAL_CLUES.filter((c) => (state.unlockedClues ?? []).includes(c.id));
  const pendingDecisions = getPendingDecisionChapters(state.decisions);

  const selectedCount = 5 - pendingDecisions.length;
  const pctText =
    typeof completionPercentage === 'number' ? ` (${completionPercentage}% weighted completion)` : '';

  const hints: string[] = [];
  if (missingLost.length > 0) {
    hints.push(
      `• Unrecovered Lost Memory in CH 0${missingLost[0].chapter}: "${missingLost[0].name}" — ${missingLost[0].hint}`
    );
  }
  if (missingFiles.length > 0) {
    const nextFile = missingFiles[0];
    hints.push(
      `• Corrupted File to repair: ${nextFile.filename} (Ch. 0${nextFile.chapter}${
        nextFile.requiredLostArtifactId &&
        !state.discoveredLostArtifacts.includes(nextFile.requiredLostArtifactId)
          ? ' — requires its paired Lost Memory first'
          : ' — ready to reconstruct in the Parity Recovery Bay'
      })`
    );
  }
  if (missingSecrets.length > 0) {
    hints.push(
      `• Secret Archive still sealed: ${missingSecrets[0].code} — ${missingSecrets[0].triggerHint}`
    );
  }
  if (missingArtifacts.length > 0) {
    const nextArt = missingArtifacts[0];
    hints.push(
      `• Uninspected Era Artifact: ${nextArt.name} (${nextArt.accessionCode}) in Chapter 0${nextArt.chapter}`
    );
  }
  if (pendingDecisions.length > 0) {
    hints.push(
      `• Pending Decisions: ${pendingDecisions.map((c) => `CH 0${c}`).join(', ')}`
    );
  }

  const sections: ArchivistSection[] = [
    {
      label: `Personal Archive Ledger${pctText}`,
      text: [
        `• Chapters Visited: ${state.visitedChapters.length}/5 (${
          state.visitedChapters.length > 0
            ? state.visitedChapters.map((c) => `CH 0${c}`).join(', ')
            : 'None yet'
        })`,
        `• Decisions Recorded: ${selectedCount}/5`,
        `• Era Artifacts Inspected: ${inspected.length}/${ARTIFACTS.length}${
          inspected.length > 0 ? ` (${inspected.map((a) => a.name).slice(0, 6).join(', ')}${inspected.length > 6 ? ', ...' : ''})` : ''
        }`,
        `• Lost Memories Recovered: ${foundLost.length}/${LOST_ARTIFACTS.length}`,
        `• Corrupted Files Repaired: ${repaired.length}/${CORRUPTED_FILES.length}`,
        `• Secret Archives Unlocked: ${unlockedSecrets.length}/${SECRET_MEMORIES.length}`,
        `• Journal Clues Indexed: ${unlockedClues.length}/${JOURNAL_CLUES.length}`,
      ].join('\n'),
    },
    {
      label:
        hints.length > 0
          ? 'Recommended Next Discoveries'
          : 'Full Archive Completion Achieved',
      text:
        hints.length > 0
          ? hints.join('\n')
          : 'You have inspected every artifact, repaired every corrupted file, recovered all lost memories, and unlocked every secret archive.',
    },
  ];

  // Suppress unused variable warning cleanly while keeping signature expressive
  void query;

  return {
    ok: true,
    matched: true,
    answer: formatSections(sections),
    topics: ['Archive Progress', 'Discovery Hints'],
    sections,
    recordType: 'archive_state',
  };
}

interface ScoredItem<T> {
  item: T;
  score: number;
  label: string;
}

function scoreKeywordSet(
  query: NormalizedQuery,
  keywords: string[],
  aliases: string[],
  title: string,
  extraChapter?: ChapterNumber
): number {
  let score = 0;

  // Phrase / alias exact substring matches
  for (const alias of aliases) {
    const normAlias = normalizeText(alias);
    if (!normAlias) continue;
    if (query.normalizedText.includes(normAlias)) {
      score += normAlias.includes(' ') ? 12 : 7;
    }
  }

  const normTitle = normalizeText(title);
  if (normTitle && query.normalizedText.includes(normTitle)) {
    score += 12;
  }

  // Word-level and stemmed matches
  let matchedDistinct = 0;
  for (const kw of keywords) {
    const parts = normalizeText(kw).split(' ').filter(Boolean);
    if (parts.length > 1) {
      const phrase = parts.join(' ');
      if (query.normalizedText.includes(phrase)) {
        score += 10;
        matchedDistinct += 2;
      }
      continue;
    }
    const word = parts[0];
    if (!word) continue;
    const stemmedKw = stemToken(word);
    if (query.expandedTokens.has(word)) {
      score += word.length >= 5 ? 5 : 3.5;
      matchedDistinct += 1;
    } else if (query.stemmedTokens.has(stemmedKw)) {
      score += 3;
      matchedDistinct += 1;
    }
  }

  // Chapter alignment boost
  if (extraChapter && query.mentionedChapters.includes(extraChapter)) {
    score += 5;
  }

  // Reward multiple distinct concept hits
  if (matchedDistinct >= 2) score += 2.5;
  if (matchedDistinct >= 4) score += 2.5;

  return score;
}

function scoreEndingGuides(query: NormalizedQuery): ScoredItem<EndingGuideEntry>[] {
  return ENDING_GUIDES.map((entry) => ({
    item: entry,
    label: entry.title,
    score: scoreKeywordSet(query, entry.keywords, entry.aliases, entry.title),
  }))
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score);
}

function scoreFigures(query: NormalizedQuery): ScoredItem<HistoricalFigureEntry>[] {
  return HISTORICAL_FIGURES.map((fig) => {
    let score = scoreKeywordSet(query, fig.keywords, fig.aliases, fig.name);
    if (
      /\b(who|person|inventor|pioneer|scientist|mathematician|engineer|why was|tell me about)\b/.test(
        query.normalizedText
      ) &&
      score > 0
    ) {
      score += 2;
    }
    return { item: fig, score, label: fig.name };
  })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score);
}

function scoreKnowledgeEntries(query: NormalizedQuery): ScoredItem<KnowledgeEntry>[] {
  return KNOWLEDGE_ENTRIES.map((entry) => {
    let score = scoreKeywordSet(
      query,
      entry.keywords,
      entry.aliases,
      entry.title,
      entry.chapter
    );
    if (
      entry.category === 'chapter_overview' &&
      entry.chapter &&
      query.mentionedChapters.includes(entry.chapter) &&
      /\b(chapter|explain|overview|summary|tell me about|this era)\b/.test(query.normalizedText)
    ) {
      score += 6;
    }
    return { item: entry, score, label: entry.title };
  })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score);
}

interface DynamicMuseumRecord {
  id: string;
  label: string;
  chapter?: ChapterNumber;
  recordType: 'historical' | 'hybrid' | 'speculative_2075';
  historicalFacts: string;
  explanation: string;
  speculativeNote?: string;
  keywords: string[];
  aliases: string[];
}

const DYNAMIC_RECORDS: DynamicMuseumRecord[] = [
  ...ARTIFACTS.map((a) => ({
    id: `dyn-${a.id}`,
    label: `${a.name} (${a.accessionCode}, ${a.era})`,
    chapter: a.chapter,
    recordType: 'historical' as const,
    historicalFacts: `${a.historicalContext} Material profile: ${a.materialProfile} (${a.dimensionsLabel}).`,
    explanation: `${a.whyItMattered} ${a.impactOnHumanity}`,
    speculativeNote: `Part of Chapter 0${a.chapter}'s inspectable 3D vault with ${a.hotspots.length} structural hotspots.`,
    keywords: [
      ...normalizeText(a.name).split(' '),
      a.accessionCode.toLowerCase(),
      a.era.toLowerCase(),
      ...a.hotspots.flatMap((h) => normalizeText(h.label).split(' ')),
    ],
    aliases: [a.name, a.accessionCode],
  })),
  ...LOST_ARTIFACTS.map((l) => ({
    id: `dyn-${l.id}`,
    label: `${l.memoryCode} · ${l.name} ("${l.title}")`,
    chapter: l.chapter,
    recordType: 'speculative_2075' as const,
    historicalFacts: `Purpose: ${l.purpose}`,
    explanation: `${l.narrative} ${l.impact}`,
    speculativeNote: `Hidden 3D discovery in Chapter 0${l.chapter} (${l.locationLabel}).`,
    keywords: [
      ...normalizeText(l.name).split(' '),
      ...normalizeText(l.title).split(' '),
      l.memoryCode.toLowerCase(),
    ],
    aliases: [l.name, l.title, l.memoryCode],
  })),
  ...CORRUPTED_FILES.map((f) => ({
    id: `dyn-${f.id}`,
    label: `${f.filename} · ${f.hiddenMemoryTitle}`,
    chapter: f.chapter,
    recordType: 'hybrid' as const,
    historicalFacts: `${f.technologicalFact} ${f.hiddenMemory}`,
    explanation: `${f.narrativeFragment}`,
    speculativeNote: `Repaired in the Chapter 0${f.chapter} Parity Recovery Bay. ${f.forwardConnection}.`,
    keywords: [
      f.filename.toLowerCase(),
      ...normalizeText(f.hiddenMemoryTitle).split(' '),
      ...f.filename.toLowerCase().split(/[._]/),
    ],
    aliases: [f.filename, f.hiddenMemoryTitle],
  })),
  ...SECRET_MEMORIES.map((s) => ({
    id: `dyn-${s.id}`,
    label: `${s.code} · ${s.title}`,
    chapter: s.chapter,
    recordType: 'hybrid' as const,
    historicalFacts: s.historicalInsight,
    explanation: s.narrative,
    speculativeNote: `Unlock condition: ${s.triggerHint}`,
    keywords: [
      ...normalizeText(s.title).split(' '),
      s.code.toLowerCase(),
    ],
    aliases: [s.title, s.code],
  })),
  ...GLOBE_NODES.map((n) => ({
    id: `dyn-${n.id}`,
    label: `${n.city} (${n.year}) · ${n.title}`,
    chapter: 4 as ChapterNumber,
    recordType: 'historical' as const,
    historicalFacts: `${n.description} Coordinates: ${n.lat.toFixed(2)}°, ${n.lon.toFixed(2)}°.`,
    explanation: n.legacy,
    keywords: [
      ...normalizeText(n.city).split(' '),
      ...normalizeText(n.title).split(' '),
      n.year,
      'globe',
      'node',
      'network',
    ],
    aliases: [n.city, n.title],
  })),
  ...MACHINE_GEARS.map((g) => ({
    id: `dyn-${g.id}`,
    label: `Gear Stage 0${g.index} · ${g.name} (${g.year})`,
    chapter: 2 as ChapterNumber,
    recordType: 'historical' as const,
    historicalFacts: `${g.mechanism}`,
    explanation: `Mechanical chain effect: ${g.chainEffect}`,
    keywords: [...normalizeText(g.name).split(' '), g.year, 'gear', 'train'],
    aliases: [g.name],
  })),
];

function scoreDynamicRecords(query: NormalizedQuery): ScoredItem<DynamicMuseumRecord>[] {
  return DYNAMIC_RECORDS.map((rec) => {
    const score = scoreKeywordSet(query, rec.keywords, rec.aliases, rec.label, rec.chapter);
    return { item: rec, score, label: rec.label };
  })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score);
}

function buildChapterFullOverview(
  chapterNum: ChapterNumber,
  state: ArchiveProgressState
): ArchivistResponse {
  const ch = CHAPTERS.find((c) => c.number === chapterNum)!;
  const knowledge = KNOWLEDGE_ENTRIES.filter((k) => k.chapter === chapterNum);
  const eraArtifacts = ARTIFACTS.filter((a) => a.chapter === chapterNum);
  const key = `ch${chapterNum}` as keyof ArchiveProgressState['decisions'];
  const currentChoice = getDecisionLabelForChapter(chapterNum, state.decisions[key]);

  const historicalFactParts = knowledge.map((k) => k.historicalFacts);
  if (chapterNum === 4) {
    historicalFactParts.push(
      `Network milestones: ${INTERNET_TIMELINE.map((t) => `${t.year} ${t.label}`).join(' -> ')}.`
    );
  }

  const sections: ArchivistSection[] = [
    {
      label: `Documented History · Chapter 0${chapterNum} (${ch.period})`,
      text: historicalFactParts.join(' '),
    },
    {
      label: `Museum Narrative · ${ch.title}`,
      text: `${ch.subtitle} ${ch.story.join(' ')}\nEra Artifacts (${eraArtifacts.length}): ${eraArtifacts
        .map((a) => `${a.name} (${a.accessionCode})`)
        .join(', ')}.`,
    },
    {
      label: '2075 Speculative Archive & Your Decision',
      text: `${
        knowledge.find((k) => k.speculative2075Note)?.speculative2075Note ??
        `Archive lens prompt: "${ch.decisionPrompt}"`
      }\nYour Status in CH 0${chapterNum}: ${
        currentChoice
          ? `Recorded "${currentChoice.label}".`
          : `Pending — "${ch.decisionPrompt}" (${ch.options.map((o) => o.label).join(' vs. ')})`
      }`,
    },
  ];

  return {
    ok: true,
    matched: true,
    answer: formatSections(sections),
    topics: [`CH 0${chapterNum} · ${ch.title}`],
    sections,
    recordType: 'hybrid',
  };
}

export function queryArchivist(input: ArchivistQueryInput): ArchivistResponse {
  const trimmed = input.question.trim();
  if (!trimmed) {
    return {
      ok: false,
      code: 'EMPTY_INPUT',
      error: 'Please enter a question about a historical chapter, artifact, or your decisions.',
    };
  }

  const outcome = input.outcome ?? resolvePathOutcome(input.state.decisions);
  const q = analyzeQuery(trimmed, input.activeChapter);

  // 1. Identity / Methodology Transparency
  if (q.asksAboutIdentity) {
    const sections: ArchivistSection[] = [
      {
        label: 'THE ARCHIVIST · Offline Knowledge Catalog',
        text: 'I am The Archivist for HUMAN.EXE, powered completely locally inside your browser by a deterministic historical knowledge base and museum archive engine. I do not connect to external AI models, external APIs, or live internet search.',
      },
      {
        label: 'What I Can Analyze',
        text: '• All five historical chapters (CH 01–CH 05), verified technological milestones, and figures (James Watt, Jacquard, Charles Babbage, Ada Lovelace, Alan Turing, Grace Hopper, ENIAC’s six programmers, Claude Shannon, Tim Berners-Lee).\n• Every museum artifact, hidden lost memory, corrupted file, and secret archive.\n• Your real local decisions, Humanity Index scores, unfinished chapters, and 1-of-48 2075 ending.',
      },
    ];
    return {
      ok: true,
      matched: true,
      answer: formatSections(sections),
      topics: ['The Archivist', 'Offline Knowledge System'],
      sections,
      recordType: 'meta_archive',
    };
  }

  // 2. Documented History vs. 2075 Fiction Separation
  if (q.asksAboutHistoryVsFiction) {
    const activeNumMatch = input.activeChapter.match(/^ch([1-5])$/);
    const targetChapter = q.mentionedChapters[0] ?? (activeNumMatch ? (Number(activeNumMatch[1]) as ChapterNumber) : undefined);
    const chapterKnowledge = targetChapter
      ? KNOWLEDGE_ENTRIES.find((k) => k.chapter === targetChapter)
      : undefined;

    const sections: ArchivistSection[] = [
      {
        label: 'Documented Historical Facts',
        text: chapterKnowledge
          ? `In Chapter 0${targetChapter}: ${chapterKnowledge.historicalFacts}`
          : ARCHIVE_PHILOSOPHY_OVERVIEW.historicalFacts,
      },
      {
        label: '2075 Speculative Archive Framing',
        text: chapterKnowledge?.speculative2075Note
          ? `${chapterKnowledge.speculative2075Note}\n\nAcross the full museum: ${ARCHIVE_PHILOSOPHY_OVERVIEW.speculative2075Note ?? ''}`
          : ARCHIVE_PHILOSOPHY_OVERVIEW.speculative2075Note ?? ARCHIVE_PHILOSOPHY_OVERVIEW.explanation,
      },
    ];
    return {
      ok: true,
      matched: true,
      answer: formatSections(sections),
      topics: targetChapter
        ? [`CH 0${targetChapter} History vs. 2075`]
        : ['Documented History vs. 2075 Fiction'],
      sections,
      recordType: 'hybrid',
    };
  }

  // 3. Dedicated Archive-State Queries (prioritized when user asks about their own record)
  if (q.asksAboutHumanityIndex && !q.hasOffTopicMarker) {
    return buildHumanityIndexReport(input.state, outcome);
  }

  if (q.asksAboutDecision && !q.asksAboutEnding && !q.hasOffTopicMarker) {
    return buildPersonalDecisionsReport(q, input.state, outcome);
  }

  if (q.asksAboutConnectionToFuture && !q.asksAboutEnding && !q.hasOffTopicMarker) {
    return buildPersonalDecisionsReport(q, input.state, outcome);
  }

  if (q.asksAboutEnding && !q.hasOffTopicMarker) {
    return buildPersonalEndingReport(q, input.state, outcome);
  }

  if (q.asksAboutProgressOrNext && !q.hasOffTopicMarker) {
    return buildProgressAndDiscoveryReport(q, input.state, input.completionPercentage);
  }

  // 4. "This chapter" or explicit single-chapter overview request ("Tell me about Chapter 2", "Explain this chapter")
  if (
    q.refersToCurrentChapter &&
    input.activeChapter === 'ending' &&
    !/\b(weather|recipe|sport|song)\b/.test(q.normalizedText)
  ) {
    return buildPersonalEndingReport(q, input.state, outcome);
  }

  if (
    q.mentionedChapters.length === 1 &&
    !/\b(babbage|lovelace|ada|turing|hopper|watt|shannon|berners|eniac|jacquard|compare|between|and|vs)\b/.test(
      q.normalizedText
    )
  ) {
    const chNum = q.mentionedChapters[0];
    // Verify user isn't asking specifically about one artifact/file inside that chapter
    const dynCheck = scoreDynamicRecords(q);
    if (!dynCheck[0] || dynCheck[0].score < 11) {
      return buildChapterFullOverview(chNum, input.state);
    }
  }

  // If user is on intro/credits and asks "explain this chapter"
  if (
    q.refersToCurrentChapter &&
    (input.activeChapter === 'intro' || input.activeChapter === 'credits')
  ) {
    const sections: ArchivistSection[] = [
      {
        label: 'HUMAN.EXE Museum Architecture',
        text: ARCHIVE_PHILOSOPHY_OVERVIEW.explanation,
      },
      {
        label: 'Historical Foundation & 2075 Frame',
        text: `${ARCHIVE_PHILOSOPHY_OVERVIEW.historicalFacts}\n\n${ARCHIVE_PHILOSOPHY_OVERVIEW.speculative2075Note ?? ''}`,
      },
    ];
    return {
      ok: true,
      matched: true,
      answer: formatSections(sections),
      topics: ['HUMAN.EXE Archive Overview'],
      sections,
      recordType: 'hybrid',
    };
  }

  // 5. General Scoring Across Figures, Knowledge Topics, Ending Guides, and Museum Items
  const scoredFigures = scoreFigures(q);
  const scoredTopics = scoreKnowledgeEntries(q);
  const scoredEndings = scoreEndingGuides(q);
  const scoredDynamic = scoreDynamicRecords(q);

  // Also allow meta overview when directly asked ("What is HUMAN.EXE?", "Who built this archive?")
  const metaScore = scoreKeywordSet(
    q,
    ARCHIVE_PHILOSOPHY_OVERVIEW.keywords,
    ARCHIVE_PHILOSOPHY_OVERVIEW.aliases,
    ARCHIVE_PHILOSOPHY_OVERVIEW.title
  );

  // Strong out-of-scope guard: if an off-topic marker (weather, bitcoin, recipe, sports, etc.)
  // appears and no high-confidence historical figure or museum entity was matched clearly, return honest fallback.
  const topCandidateScore = Math.max(
    scoredFigures[0]?.score ?? 0,
    scoredTopics[0]?.score ?? 0,
    scoredEndings[0]?.score ?? 0,
    scoredDynamic[0]?.score ?? 0,
    metaScore
  );

  if (q.hasOffTopicMarker && topCandidateScore < 14) {
    return {
      ok: true,
      matched: false,
      answer: ARCHIVIST_FALLBACK_MESSAGE,
      topics: [],
      sections: [{ label: 'Archive Scope Notice', text: ARCHIVIST_FALLBACK_MESSAGE }],
      recordType: 'fallback',
    };
  }

  // Minimum confidence threshold to eliminate false positives on vague/unrelated queries
  const MIN_CONFIDENCE = 6.5;
  if (topCandidateScore < MIN_CONFIDENCE) {
    return {
      ok: true,
      matched: false,
      answer: ARCHIVIST_FALLBACK_MESSAGE,
      topics: [],
      sections: [{ label: 'Archive Scope Notice', text: ARCHIVIST_FALLBACK_MESSAGE }],
      recordType: 'fallback',
    };
  }

  // Build unified multi-topic ranked list (combining up to 3 genuinely distinct complementary entries)
  type CombinedMatch =
    | { kind: 'figure'; score: number; label: string; entry: HistoricalFigureEntry }
    | { kind: 'topic'; score: number; label: string; entry: KnowledgeEntry }
    | { kind: 'dynamic'; score: number; label: string; entry: DynamicMuseumRecord }
    | { kind: 'ending'; score: number; label: string; entry: EndingGuideEntry }
    | { kind: 'meta'; score: number; label: string; entry: KnowledgeEntry };

  const pool: CombinedMatch[] = [
    ...scoredFigures.map((s) => ({
      kind: 'figure' as const,
      score: s.score,
      label: s.label,
      entry: s.item,
    })),
    ...scoredTopics.map((s) => ({
      kind: 'topic' as const,
      score: s.score,
      label: s.label,
      entry: s.item,
    })),
    ...scoredDynamic.map((s) => ({
      kind: 'dynamic' as const,
      score: s.score,
      label: s.label,
      entry: s.item,
    })),
    ...scoredEndings.map((s) => ({
      kind: 'ending' as const,
      score: s.score,
      label: s.label,
      entry: s.item,
    })),
  ];

  if (metaScore >= MIN_CONFIDENCE) {
    pool.push({
      kind: 'meta',
      score: metaScore,
      label: ARCHIVE_PHILOSOPHY_OVERVIEW.title,
      entry: ARCHIVE_PHILOSOPHY_OVERVIEW,
    });
  }

  pool.sort((a, b) => b.score - a.score);

  const selected: CombinedMatch[] = [];
  const seenIds = new Set<string>();
  const topScore = pool[0]?.score ?? 0;

  for (const cand of pool) {
    if (selected.length >= 3) break;
    const id =
      cand.kind === 'dynamic'
        ? cand.entry.id
        : cand.kind === 'ending'
        ? cand.entry.archetype
        : cand.entry.id;
    if (seenIds.has(id)) continue;

    // First entry must meet confidence; secondary entries must pass secondary threshold
    // AND be reasonably close to topScore so minor coincidental matches aren't dragged in.
    if (selected.length === 0) {
      selected.push(cand);
      seenIds.add(id);
    } else if (cand.score >= Math.max(7.5, topScore * 0.48)) {
      selected.push(cand);
      seenIds.add(id);
    }
  }

  const sections: ArchivistSection[] = [];
  const topics: string[] = [];
  let hasHistorical = false;
  let hasSpeculative = false;

  for (const item of selected) {
    topics.push(item.label);
    if (item.kind === 'figure') {
      hasHistorical = true;
      sections.push({
        label: `Historical Figure · ${item.entry.name}`,
        text: `${item.entry.historicalFacts}\nWhy it mattered: ${item.entry.whyImportant}\nMuseum connection: ${item.entry.archiveConnection}`,
      });
    } else if (item.kind === 'topic' || item.kind === 'meta') {
      hasHistorical = true;
      if (item.entry.speculative2075Note) hasSpeculative = true;
      sections.push({
        label: item.entry.title,
        text: [
          `Documented History: ${item.entry.historicalFacts}`,
          `Context: ${item.entry.explanation}`,
          item.entry.speculative2075Note
            ? `2075 Archive Frame: ${item.entry.speculative2075Note}`
            : null,
        ]
          .filter(Boolean)
          .join('\n'),
      });
    } else if (item.kind === 'dynamic') {
      if (item.entry.recordType === 'speculative_2075') hasSpeculative = true;
      else hasHistorical = true;
      if (item.entry.speculativeNote) hasSpeculative = true;
      sections.push({
        label: `Archive Record · ${item.entry.label}`,
        text: [
          item.entry.historicalFacts,
          item.entry.explanation,
          item.entry.speculativeNote ? `Archive Placement: ${item.entry.speculativeNote}` : null,
        ]
          .filter(Boolean)
          .join('\n'),
      });
    } else if (item.kind === 'ending') {
      hasSpeculative = true;
      sections.push({
        label: `2075 Ending Archetype · ${item.entry.title}`,
        text: `${item.entry.meaning}\nPath Drivers: ${item.entry.typicalDrivers}\nSimulation Outlook: ${item.entry.speculative2075Outlook}`,
      });
    }
  }

  // If multiple chapters were asked about in one query (e.g., "How does Chapter 1 connect to Chapter 5?")
  if (q.mentionedChapters.length >= 2 && selected.length < 3) {
    for (const chNum of q.mentionedChapters) {
      const chOverview = KNOWLEDGE_ENTRIES.find(
        (k) => k.category === 'chapter_overview' && k.chapter === chNum
      );
      if (chOverview && !seenIds.has(chOverview.id)) {
        seenIds.add(chOverview.id);
        topics.push(chOverview.title);
        hasHistorical = true;
        if (chOverview.speculative2075Note) hasSpeculative = true;
        sections.push({
          label: chOverview.title,
          text: `${chOverview.historicalFacts} ${chOverview.explanation}`,
        });
      }
    }
  }

  const recordType: ArchivistRecordType =
    hasHistorical && hasSpeculative
      ? 'hybrid'
      : hasSpeculative
      ? 'speculative_2075'
      : 'historical';

  return {
    ok: true,
    matched: true,
    answer: formatSections(sections),
    topics,
    sections,
    recordType,
  };
}
