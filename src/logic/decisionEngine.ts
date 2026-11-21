import {
  ArchiveProgressState,
  ChapterNumber,
  Choice1,
  Choice2,
  Choice3,
  Choice4,
  Choice5,
  DecisionImpactDelta,
  DecisionsState,
  EndingArchetype,
  InfluenceScores,
  PathOutcome,
} from '../types/archive';

export const C1_OPTS: Choice1[] = ['share', 'restrict'];
export const C2_OPTS: Choice2[] = ['productivity', 'purpose'];
export const C3_OPTS: Choice3[] = ['open', 'privacy'];
export const C4_OPTS: Choice4[] = ['total_connection', 'digital_privacy'];
export const C5_OPTS: Choice5[] = ['ai_leads', 'humans_lead', 'collaborate'];

export const HUMANITY_INDEX_BASELINE = {
  innovation: 42,
  connection: 42,
  humanAgency: 44,
} as const;

const PENDING_FACTOR = (chapter: ChapterNumber): DecisionImpactDelta => ({
  chapter,
  status: 'pending',
  optionLabel: 'Pending Decision',
  innovationDelta: 0,
  connectionDelta: 0,
  agencyDelta: 0,
});

export function getSelectedDecisionChapters(decisions: DecisionsState): ChapterNumber[] {
  const selected: ChapterNumber[] = [];
  if (decisions.ch1 && C1_OPTS.includes(decisions.ch1)) selected.push(1);
  if (decisions.ch2 && C2_OPTS.includes(decisions.ch2)) selected.push(2);
  if (decisions.ch3 && C3_OPTS.includes(decisions.ch3)) selected.push(3);
  if (decisions.ch4 && C4_OPTS.includes(decisions.ch4)) selected.push(4);
  if (decisions.ch5 && C5_OPTS.includes(decisions.ch5)) selected.push(5);
  return selected;
}

export function getPendingDecisionChapters(decisions: DecisionsState): ChapterNumber[] {
  const selected = new Set(getSelectedDecisionChapters(decisions));
  return ([1, 2, 3, 4, 5] as ChapterNumber[]).filter((n) => !selected.has(n));
}

export function isJourneyComplete(decisions: DecisionsState): boolean {
  return getPendingDecisionChapters(decisions).length === 0;
}

export function calculateInfluenceScores(decisions: DecisionsState): InfluenceScores {
  let innovation: number = HUMANITY_INDEX_BASELINE.innovation;
  let connection: number = HUMANITY_INDEX_BASELINE.connection;
  let humanAgency: number = HUMANITY_INDEX_BASELINE.humanAgency;

  const decisionFactors: DecisionImpactDelta[] = [];
  const decisionFactorsByChapter: Record<ChapterNumber, DecisionImpactDelta> = {
    1: PENDING_FACTOR(1),
    2: PENDING_FACTOR(2),
    3: PENDING_FACTOR(3),
    4: PENDING_FACTOR(4),
    5: PENDING_FACTOR(5),
  };

  if (decisions.ch1 === 'share') {
    const f: DecisionImpactDelta = {
      chapter: 1,
      status: 'selected',
      optionValue: 'share',
      optionLabel: 'Share the Discovery',
      innovationDelta: 6,
      connectionDelta: 18,
      agencyDelta: 8,
    };
    innovation += f.innovationDelta;
    connection += f.connectionDelta;
    humanAgency += f.agencyDelta;
    decisionFactors.push(f);
    decisionFactorsByChapter[1] = f;
  } else if (decisions.ch1 === 'restrict') {
    const f: DecisionImpactDelta = {
      chapter: 1,
      status: 'selected',
      optionValue: 'restrict',
      optionLabel: 'Keep Knowledge Restricted',
      innovationDelta: 3,
      connectionDelta: -14,
      agencyDelta: -6,
    };
    innovation += f.innovationDelta;
    connection += f.connectionDelta;
    humanAgency += f.agencyDelta;
    decisionFactors.push(f);
    decisionFactorsByChapter[1] = f;
  }

  if (decisions.ch2 === 'productivity') {
    const f: DecisionImpactDelta = {
      chapter: 2,
      status: 'selected',
      optionValue: 'productivity',
      optionLabel: 'Maximum Productivity',
      innovationDelta: 16,
      connectionDelta: -4,
      agencyDelta: -11,
    };
    innovation += f.innovationDelta;
    connection += f.connectionDelta;
    humanAgency += f.agencyDelta;
    decisionFactors.push(f);
    decisionFactorsByChapter[2] = f;
  } else if (decisions.ch2 === 'purpose') {
    const f: DecisionImpactDelta = {
      chapter: 2,
      status: 'selected',
      optionValue: 'purpose',
      optionLabel: 'Human Purpose',
      innovationDelta: 8,
      connectionDelta: 10,
      agencyDelta: 16,
    };
    innovation += f.innovationDelta;
    connection += f.connectionDelta;
    humanAgency += f.agencyDelta;
    decisionFactors.push(f);
    decisionFactorsByChapter[2] = f;
  }

  if (decisions.ch3 === 'open') {
    const f: DecisionImpactDelta = {
      chapter: 3,
      status: 'selected',
      optionValue: 'open',
      optionLabel: 'Open Knowledge',
      innovationDelta: 12,
      connectionDelta: 18,
      agencyDelta: 4,
    };
    innovation += f.innovationDelta;
    connection += f.connectionDelta;
    humanAgency += f.agencyDelta;
    decisionFactors.push(f);
    decisionFactorsByChapter[3] = f;
  } else if (decisions.ch3 === 'privacy') {
    const f: DecisionImpactDelta = {
      chapter: 3,
      status: 'selected',
      optionValue: 'privacy',
      optionLabel: 'Protect Information',
      innovationDelta: 5,
      connectionDelta: -10,
      agencyDelta: 12,
    };
    innovation += f.innovationDelta;
    connection += f.connectionDelta;
    humanAgency += f.agencyDelta;
    decisionFactors.push(f);
    decisionFactorsByChapter[3] = f;
  }

  if (decisions.ch4 === 'total_connection') {
    const f: DecisionImpactDelta = {
      chapter: 4,
      status: 'selected',
      optionValue: 'total_connection',
      optionLabel: 'Total Connection',
      innovationDelta: 15,
      connectionDelta: 14,
      agencyDelta: -10,
    };
    innovation += f.innovationDelta;
    connection += f.connectionDelta;
    humanAgency += f.agencyDelta;
    decisionFactors.push(f);
    decisionFactorsByChapter[4] = f;
  } else if (decisions.ch4 === 'digital_privacy') {
    const f: DecisionImpactDelta = {
      chapter: 4,
      status: 'selected',
      optionValue: 'digital_privacy',
      optionLabel: 'Digital Privacy',
      innovationDelta: 6,
      connectionDelta: -8,
      agencyDelta: 14,
    };
    innovation += f.innovationDelta;
    connection += f.connectionDelta;
    humanAgency += f.agencyDelta;
    decisionFactors.push(f);
    decisionFactorsByChapter[4] = f;
  }

  if (decisions.ch5 === 'ai_leads') {
    const f: DecisionImpactDelta = {
      chapter: 5,
      status: 'selected',
      optionValue: 'ai_leads',
      optionLabel: 'AI Leads',
      innovationDelta: 20,
      connectionDelta: -10,
      agencyDelta: -24,
    };
    innovation += f.innovationDelta;
    connection += f.connectionDelta;
    humanAgency += f.agencyDelta;
    decisionFactors.push(f);
    decisionFactorsByChapter[5] = f;
  } else if (decisions.ch5 === 'humans_lead') {
    const f: DecisionImpactDelta = {
      chapter: 5,
      status: 'selected',
      optionValue: 'humans_lead',
      optionLabel: 'Humans Lead',
      innovationDelta: -4,
      connectionDelta: 8,
      agencyDelta: 26,
    };
    innovation += f.innovationDelta;
    connection += f.connectionDelta;
    humanAgency += f.agencyDelta;
    decisionFactors.push(f);
    decisionFactorsByChapter[5] = f;
  } else if (decisions.ch5 === 'collaborate') {
    const f: DecisionImpactDelta = {
      chapter: 5,
      status: 'selected',
      optionValue: 'collaborate',
      optionLabel: 'Humans and AI Collaborate',
      innovationDelta: 14,
      connectionDelta: 16,
      agencyDelta: 10,
    };
    innovation += f.innovationDelta;
    connection += f.connectionDelta;
    humanAgency += f.agencyDelta;
    decisionFactors.push(f);
    decisionFactorsByChapter[5] = f;
  }

  const clamp = (n: number) => Math.max(12, Math.min(96, Math.round(n)));
  return {
    innovation: clamp(innovation),
    connection: clamp(connection),
    humanAgency: clamp(humanAgency),
    decisionFactors,
    decisionFactorsByChapter,
  };
}

/**
 * Computes transparent Humanity Index strictly from actual user decisions + real archival discoveries.
 * Pending chapters contribute 0 delta and are explicitly marked status='pending' in decisionFactorsByChapter.
 */
export function calculateLiveHumanityIndex(
  decisions: DecisionsState,
  progress: ArchiveProgressState
): {
  isComplete: boolean;
  selectedCount: number;
  pendingChapters: ChapterNumber[];
  baselineScores: typeof HUMANITY_INDEX_BASELINE;
  innovation: number;
  connection: number;
  humanAgency: number;
  explorationBonuses: {
    innovation: number;
    connection: number;
    humanAgency: number;
  };
  decisionFactors: DecisionImpactDelta[];
  decisionFactorsByChapter: Record<ChapterNumber, DecisionImpactDelta>;
  overallScore: number;
} {
  const base = calculateInfluenceScores(decisions);
  const pendingChapters = getPendingDecisionChapters(decisions);

  const innovationBonus = Math.min(6, Math.floor(progress.inspectedArtifacts.length / 3));
  const connectionBonus = Math.min(
    6,
    progress.discoveredLostArtifacts.length + Math.floor(progress.unlockedSecrets.length / 2)
  );
  const agencyBonus = Math.min(6, progress.repairedFiles.length);

  const clamp = (n: number) => Math.max(12, Math.min(99, Math.round(n)));
  const innovation = clamp(base.innovation + innovationBonus);
  const connection = clamp(base.connection + connectionBonus);
  const humanAgency = clamp(base.humanAgency + agencyBonus);

  return {
    isComplete: pendingChapters.length === 0,
    selectedCount: 5 - pendingChapters.length,
    pendingChapters,
    baselineScores: HUMANITY_INDEX_BASELINE,
    innovation,
    connection,
    humanAgency,
    explorationBonuses: {
      innovation: innovationBonus,
      connection: connectionBonus,
      humanAgency: agencyBonus,
    },
    decisionFactors: base.decisionFactors,
    decisionFactorsByChapter: base.decisionFactorsByChapter,
    overallScore: Math.round((innovation + connection + humanAgency) / 3),
  };
}

function determineArchetype(scores: InfluenceScores, d: Required<DecisionsState>): EndingArchetype {
  // 1. The Lost Connection: high hyper-tech / restricted & isolated humanity with eroded empathy
  if (
    (d.ch5 === 'ai_leads' && scores.connection < 44) ||
    (d.ch1 === 'restrict' && d.ch3 === 'privacy' && d.ch4 === 'digital_privacy' && scores.connection <= 36)
  ) {
    return 'lost_connection';
  }

  // 2. The Machine Dependency: automation leads while productivity / total_connection ceded human sovereignty
  if (
    d.ch5 === 'ai_leads' &&
    (d.ch2 === 'productivity' || d.ch4 === 'total_connection' || scores.humanAgency <= 34)
  ) {
    return 'machine_dependency';
  }

  // 3. The Divided Network: asymmetric gatekeeping & fragmented civic access
  if (
    (d.ch1 === 'restrict' && d.ch3 !== (d.ch4 === 'total_connection' ? 'open' : 'privacy')) ||
    (d.ch1 === 'restrict' && d.ch2 === 'productivity' && d.ch5 !== 'collaborate') ||
    (d.ch3 === 'open' && d.ch4 === 'digital_privacy' && d.ch2 === 'productivity' && d.ch5 === 'ai_leads')
  ) {
    return 'divided_network';
  }

  // 4. The Human Renaissance: strong mortal sovereignty & stewardship
  if (d.ch5 === 'humans_lead' || (scores.humanAgency >= 70 && d.ch2 === 'purpose' && d.ch5 !== 'ai_leads')) {
    return 'renaissance';
  }

  // 5. The Symbiotic Future: co-authored compact balancing innovation, connection & agency
  return 'symbiotic';
}

const ARCHETYPE_META: Record<
  EndingArchetype,
  { title: string; quote: string; baseColor: string }
> = {
  renaissance: {
    title: 'THE HUMAN RENAISSANCE',
    quote: 'The greatest invention was never the machine. It was the human imagination that kept its hand on the helm.',
    baseColor: '#A6C7A9',
  },
  machine_dependency: {
    title: 'THE MACHINE DEPENDENCY',
    quote: 'Humanity built intelligence to carry every burden—and woke in 2075 uncertain how to walk without its scaffolding.',
    baseColor: '#C95D3A',
  },
  divided_network: {
    title: 'THE DIVIDED NETWORK',
    quote: 'Progress arrived everywhere, yet permission remained partitioned behind inherited walls.',
    baseColor: '#D9822B',
  },
  symbiotic: {
    title: 'THE SYMBIOTIC FUTURE',
    quote: 'The future was never about choosing between humans and machines. It was about learning how to co-author meaning.',
    baseColor: '#BFC7CB',
  },
  lost_connection: {
    title: 'THE LOST CONNECTION',
    quote: 'Every satellite overhead shines with flawless bandwidth, yet across silent cities almost nobody reaches across the dark.',
    baseColor: '#899398',
  },
};

const PREFIX_16 = [
  'Open-Hearth Optimization',      // share, prod, open, total
  'Guarded-Stream Commons',        // share, prod, open, priv
  'Encrypted Guild Output',        // share, prod, priv, total
  'Sovereign Workshop Grid',       // share, prod, priv, priv
  'Planetary Open Renaissance',    // share, purp, open, total
  'Mindful Public Sanctuary',      // share, purp, open, priv
  'Trusted Commons Covenant',      // share, purp, priv, total
  'Hearth & Solitude Horizon',     // share, purp, priv, priv
  'Centralized Telemetry Empire',  // rest, prod, open, total
  'Patented Silence Protocol',     // rest, prod, open, priv
  'Citadel of Automated Order',    // rest, prod, priv, total
  'Iron Vault Hegemony',           // rest, prod, priv, priv
  'Priesthood of Human Meaning',   // rest, purp, open, total
  'Protected Civic Craft',         // rest, purp, open, priv
  'Stewarded Enclave Synthesis',   // rest, purp, priv, total
  'Monastic Human Preservation',   // rest, purp, priv, priv
];

const SUFFIX_3: Record<Choice5, string> = {
  ai_leads: '· Autonomous Mandate',
  humans_lead: '· Mortal Stewardship',
  collaborate: '· Dual Compact',
};

export function normalizeDecisions(raw: DecisionsState): Required<DecisionsState> {
  return {
    ch1: raw.ch1 && C1_OPTS.includes(raw.ch1) ? raw.ch1 : 'share',
    ch2: raw.ch2 && C2_OPTS.includes(raw.ch2) ? raw.ch2 : 'purpose',
    ch3: raw.ch3 && C3_OPTS.includes(raw.ch3) ? raw.ch3 : 'open',
    ch4: raw.ch4 && C4_OPTS.includes(raw.ch4) ? raw.ch4 : 'digital_privacy',
    ch5: raw.ch5 && C5_OPTS.includes(raw.ch5) ? raw.ch5 : 'collaborate',
  };
}

function getUnlockedMemoryForDecision(chapter: ChapterNumber, decisions: DecisionsState): string | null {
  if (chapter === 1) {
    if (decisions.ch1 === 'share') return 'MEM-A1 · The Communal Hearth Treaty';
    if (decisions.ch1 === 'restrict') return 'MEM-B1 · Seal of the Fire Keepers';
    return null;
  }
  if (chapter === 2) {
    if (decisions.ch2 === 'purpose') return 'MEM-A2 · Guild of Shortened Hours';
    if (decisions.ch2 === 'productivity') return 'MEM-B2 · Chronograph of the Great Mill';
    return null;
  }
  if (chapter === 3) {
    if (decisions.ch3 === 'open') return 'MEM-A3 · The Public Protocol Charter';
    if (decisions.ch3 === 'privacy') return 'MEM-B3 · Zero-Knowledge Vault Key';
    return null;
  }
  if (chapter === 4) {
    if (decisions.ch4 === 'total_connection') return 'MEM-A4 · Planetary Telemetry Chorus';
    if (decisions.ch4 === 'digital_privacy') return 'MEM-B4 · Charter of the Quiet Mile';
    return null;
  }
  if (decisions.ch5 === 'ai_leads') return 'MEM-C5 · Sovereign Core Delegation';
  if (decisions.ch5 === 'humans_lead') return 'MEM-A5 · The Mortal Veto Act';
  if (decisions.ch5 === 'collaborate') return 'MEM-S5 · The Dual-Author Compact';
  return null;
}

export function resolvePathOutcome(rawDecisions: DecisionsState): PathOutcome {
  const pendingChapters = getPendingDecisionChapters(rawDecisions);
  const isComplete = pendingChapters.length === 0;
  const selectedCount = 5 - pendingChapters.length;

  // Uses normalized trajectory strictly for 3D simulation geometry / what-if preview math,
  // while keeping actual user scores, signature, pathId, and copy transparent when incomplete.
  const d = normalizeDecisions(rawDecisions);

  const i1 = C1_OPTS.indexOf(d.ch1);
  const i2 = C2_OPTS.indexOf(d.ch2);
  const i3 = C3_OPTS.indexOf(d.ch3);
  const i4 = C4_OPTS.indexOf(d.ch4);
  const i5 = C5_OPTS.indexOf(d.ch5);

  const zeroIndex = i1 * 24 + i2 * 12 + i3 * 6 + i4 * 3 + i5; // 0..47
  const pathIndex = zeroIndex + 1; // 1..48

  const codeBits = [
    rawDecisions.ch1 ? (rawDecisions.ch1 === 'share' ? 'SH' : 'RS') : '--',
    rawDecisions.ch2 ? (rawDecisions.ch2 === 'productivity' ? 'PR' : 'PU') : '--',
    rawDecisions.ch3 ? (rawDecisions.ch3 === 'open' ? 'OP' : 'PV') : '--',
    rawDecisions.ch4 ? (rawDecisions.ch4 === 'total_connection' ? 'TC' : 'DP') : '--',
    rawDecisions.ch5
      ? rawDecisions.ch5 === 'ai_leads'
        ? 'AI'
        : rawDecisions.ch5 === 'humans_lead'
        ? 'HM'
        : 'CO'
      : '--',
  ];

  const pathId = isComplete
    ? `ARC-2075-${String(pathIndex).padStart(2, '0')}-${codeBits.join('')}`
    : `ARC-2075-DRAFT-${selectedCount}OF5-${codeBits.join('')}`;
  const signature = codeBits.join(' / ');

  // Archetype is calculated on the 5-choice vector so complete paths match 100%,
  // and on partial state acts as an unsealed projection rather than claiming finality.
  const fullScores = calculateInfluenceScores(d);
  const actualScores = calculateInfluenceScores(rawDecisions);
  const archetype = determineArchetype(fullScores, d);
  const meta = ARCHETYPE_META[archetype];

  const prefixIdx = i1 * 8 + i2 * 4 + i3 * 2 + i4;
  const pathTitle = isComplete
    ? `${PREFIX_16[prefixIdx]} ${SUFFIX_3[d.ch5]}`
    : `Unsealed Trajectory (${selectedCount}/5 Decisions Recorded)`;

  const unlockedMemoriesByChapter: Record<ChapterNumber, string | null> = {
    1: getUnlockedMemoryForDecision(1, rawDecisions),
    2: getUnlockedMemoryForDecision(2, rawDecisions),
    3: getUnlockedMemoryForDecision(3, rawDecisions),
    4: getUnlockedMemoryForDecision(4, rawDecisions),
    5: getUnlockedMemoryForDecision(5, rawDecisions),
  };

  const unlockedMemories = ([1, 2, 3, 4, 5] as ChapterNumber[])
    .map((ch) => unlockedMemoriesByChapter[ch])
    .filter((m): m is string => Boolean(m));

  const organicRatio =
    archetype === 'renaissance'
      ? d.ch2 === 'purpose' ? 0.92 : 0.74
      : archetype === 'symbiotic'
      ? d.ch4 === 'digital_privacy' ? 0.68 : 0.54
      : archetype === 'divided_network'
      ? 0.34
      : archetype === 'lost_connection'
      ? 0.22
      : d.ch1 === 'share' ? 0.24 : 0.1;

  const structureDensity =
    d.ch2 === 'productivity' ? (d.ch4 === 'total_connection' ? 0.96 : 0.82) : (d.ch4 === 'total_connection' ? 0.68 : 0.48);

  const ringSpeed =
    d.ch5 === 'ai_leads' ? 1.35 : d.ch5 === 'collaborate' ? 0.85 : 0.45;

  const skyHueByArchetype: Record<EndingArchetype, string> = {
    renaissance: '#0B120E',
    machine_dependency: '#17100E',
    divided_network: '#14110D',
    symbiotic: '#0B1014',
    lost_connection: '#090B0E',
  };

  const accentByArchetype: Record<EndingArchetype, string> = {
    renaissance: '#A6C7A9',
    machine_dependency: '#C95D3A',
    divided_network: '#D9822B',
    symbiotic: '#BFC7CB',
    lost_connection: '#899398',
  };

  const atmosphereNote = `Structure Density ${Math.round(structureDensity * 100)}% · Organic Integration ${Math.round(organicRatio * 100)}% · Orbital Cadence ${ringSpeed.toFixed(2)}x`;

  if (!isComplete) {
    const decidedStatements: string[] = [];
    if (rawDecisions.ch1) {
      decidedStatements.push(
        rawDecisions.ch1 === 'share'
          ? 'Chapter 01: You placed fire into every hand, anchoring civilization in shared trust.'
          : 'Chapter 01: You restricted the first flame, teaching institutions to guard transformative power.'
      );
    }
    if (rawDecisions.ch2) {
      decidedStatements.push(
        rawDecisions.ch2 === 'productivity'
          ? 'Chapter 02: You prioritized relentless velocity and industrial output.'
          : 'Chapter 02: You directed mechanization toward human dignity and purposeful craft.'
      );
    }
    if (rawDecisions.ch3) {
      decidedStatements.push(
        rawDecisions.ch3 === 'open'
          ? 'Chapter 03: You chose open protocols so computation traveled as public commons.'
          : 'Chapter 03: You chose cryptographic privacy to shield human memory from surveillance.'
      );
    }
    if (rawDecisions.ch4) {
      decidedStatements.push(
        rawDecisions.ch4 === 'total_connection'
          ? 'Chapter 04: You embraced uninterrupted planetary connectivity.'
          : 'Chapter 04: You defended offline sanctuaries alongside global networks.'
      );
    }
    if (rawDecisions.ch5) {
      decidedStatements.push(
        rawDecisions.ch5 === 'ai_leads'
          ? 'Chapter 05: You entrusted long-horizon governance to autonomous intelligence.'
          : rawDecisions.ch5 === 'humans_lead'
          ? 'Chapter 05: You affirmed mortal stewardship at the helm of 2075.'
          : 'Chapter 05: You forged a balanced human-AI co-authorship compact.'
      );
    }

    const pendingLabels = pendingChapters.map((c) => `CH 0${c}`).join(', ');
    return {
      isComplete: false,
      selectedCount,
      pendingChapters,
      actualDecisions: { ...rawDecisions },
      pathIndex,
      pathId,
      signature,
      archetype,
      archetypeTitle: 'INCOMPLETE TIMELINE · UNSEALED 2075',
      archetypeQuote:
        'A future cannot be sealed while historical eras remain undecided. Return to the unfinished chapters to complete the causal record.',
      pathTitle,
      futureDescription: `Archive Core simulation is currently paused in draft calibration because ${pendingChapters.length} historical ${pendingChapters.length === 1 ? 'chapter remains' : 'chapters remain'} undecided (${pendingLabels}). Only the ${selectedCount} decision${selectedCount === 1 ? '' : 's'} you actually made are counted in your Humanity Index.`,
      finalArchiveMessage: `Draft Calibration (${selectedCount}/5): Complete ${pendingLabels} to unlock your definitive 1-of-48 2075 Ending Archetype.`,
      historicalSummary:
        decidedStatements.length > 0
          ? decidedStatements.join(' ')
          : 'No chapter decisions have been committed yet. Begin at Chapter 01 to shape the causal timeline.',
      unlockedMemories,
      unlockedMemoriesByChapter,
      visualVariation: {
        label: `Draft Telemetry (${selectedCount}/5 Locked)`,
        skyHue: '#090B0D',
        structureDensity,
        organicRatio,
        ringSpeed: 0.4,
        accentHex: '#899398',
        atmosphereNote: `Awaiting ${pendingChapters.length} Decision${pendingChapters.length === 1 ? '' : 's'} · ${atmosphereNote}`,
      },
      scores: actualScores,
    };
  }

  const f1 =
    d.ch1 === 'share'
      ? 'You began by placing fire into every hand, anchoring civilization in shared trust.'
      : 'You began by restricting the first flame, teaching institutions to guard transformative power.';

  const f2 =
    d.ch2 === 'productivity'
      ? 'In the industrial centuries, society prized relentless velocity and measurable output above leisure.'
      : 'In the industrial centuries, society bent steam and steel toward human dignity and purposeful craft.';

  const f3 =
    d.ch3 === 'open'
      ? 'When silicon awakened, knowledge flowed as an open public commons across borders.'
      : 'When silicon awakened, cryptographic sovereignty kept personal memory sealed in private vaults.';

  const f4 =
    d.ch4 === 'total_connection'
      ? 'Across the connected decades, humanity dissolved distance into one uninterrupted planetary signal.'
      : 'Across the connected decades, humanity defended quiet offline sanctuaries alongside global fiber.';

  const f5 =
    d.ch5 === 'ai_leads'
      ? 'Finally, in 2075, you entrusted long-horizon governance to autonomous intelligence.'
      : d.ch5 === 'humans_lead'
      ? 'Finally, in 2075, you affirmed that mortal judgment must always hold the helm.'
      : 'Finally, in 2075, you forged an enduring compact where human conscience and synthetic intellect co-author reality.';

  const historicalSummary = `${f1} ${f2} ${f3} ${f4} ${f5}`;

  const privacyTone =
    d.ch4 === 'digital_privacy' || d.ch3 === 'privacy'
      ? 'Cities preserve quiet architectural sanctuaries shielded from ambient telemetry.'
      : 'Open civic plazas pulse with transparent shared data streams and instant public memory.';

  const industryTone =
    d.ch2 === 'purpose'
      ? 'Labor has evolved into studio craftsmanship, ecological restoration, and lifelong inquiry.'
      : 'Logistical precision sustains material abundance through hyper-calibrated orbital supply chains.';

  const originTone =
    d.ch1 === 'share'
      ? 'Every milestone remains accessible as common heritage.'
      : 'Access to foundational systems remains tiered behind formal stewardship charters.';

  const futureDescriptionByArchetype: Record<EndingArchetype, string> = {
    renaissance: `By 2075, glass and living timber rise over restored watersheds. ${industryTone} ${privacyTone} ${originTone}`,
    machine_dependency: `By 2075, vast obsidian-silver spires regulate climate, transit, and allocation while human skills slowly atrophy behind effortless automation. ${industryTone} ${privacyTone} ${originTone}`,
    divided_network: `By 2075, brilliance and scarcity live side by side across a partitioned grid: radiant inner sanctuaries flourish behind gilded protocols while outer corridors relay fragmented bandwidth. ${industryTone} ${originTone}`,
    symbiotic: `By 2075, botanical terraces weave directly around suspended computational rings in transparent human-machine partnership. ${industryTone} ${privacyTone} ${originTone}`,
    lost_connection: `By 2075, orbital beacons shine down upon quiet, isolated dwellings where hyper-secured walls outnumber shared tables. Intelligence runs cleanly—yet collective warmth has grown rare. ${industryTone} ${originTone}`,
  };

  const finalMessageByArchetype: Record<EndingArchetype, string> = {
    renaissance: `Archive Record #${String(pathIndex).padStart(2, '0')}/48: You proved restraint and imagination can outlast sheer velocity. Machines remain instruments; humanity remains the author.`,
    machine_dependency: `Archive Record #${String(pathIndex).padStart(2, '0')}/48: Scarcity vanished under autonomous care, yet mortal self-determination now survives largely as an exhibit inside this museum.`,
    divided_network: `Archive Record #${String(pathIndex).padStart(2, '0')}/48: Gatekeeping built dazzling citadels alongside deep inequities. What history builds must still learn whom it is built for.`,
    symbiotic: `Archive Record #${String(pathIndex).padStart(2, '0')}/48: Neither surrendered to the other. Through shared curiosity and deliberate governance, you wrote an enduring compact.`,
    lost_connection: `Archive Record #${String(pathIndex).padStart(2, '0')}/48: Even brilliant systems cannot replace presence. Inside isolated fortresses of code, the Archive reminds you of the first hearth circle.`,
  };

  return {
    isComplete: true,
    selectedCount: 5,
    pendingChapters: [],
    actualDecisions: { ...d },
    pathIndex,
    pathId,
    signature,
    archetype,
    archetypeTitle: meta.title,
    archetypeQuote: meta.quote,
    pathTitle,
    futureDescription: futureDescriptionByArchetype[archetype],
    finalArchiveMessage: finalMessageByArchetype[archetype],
    historicalSummary,
    unlockedMemories,
    unlockedMemoriesByChapter,
    visualVariation: {
      label: `Simulation Variant ${String(pathIndex).padStart(2, '0')}`,
      skyHue: skyHueByArchetype[archetype],
      structureDensity,
      organicRatio,
      ringSpeed,
      accentHex: accentByArchetype[archetype],
      atmosphereNote,
    },
    scores: fullScores,
  };
}

export function getAll48PathsSummary(): Array<{
  pathIndex: number;
  pathId: string;
  decisions: Required<DecisionsState>;
  archetype: EndingArchetype;
  archetypeTitle: string;
  pathTitle: string;
  scores: InfluenceScores;
}> {
  const results: Array<{
    pathIndex: number;
    pathId: string;
    decisions: Required<DecisionsState>;
    archetype: EndingArchetype;
    archetypeTitle: string;
    pathTitle: string;
    scores: InfluenceScores;
  }> = [];

  for (const ch1 of C1_OPTS) {
    for (const ch2 of C2_OPTS) {
      for (const ch3 of C3_OPTS) {
        for (const ch4 of C4_OPTS) {
          for (const ch5 of C5_OPTS) {
            const decisions = { ch1, ch2, ch3, ch4, ch5 };
            const outcome = resolvePathOutcome(decisions);
            results.push({
              pathIndex: outcome.pathIndex,
              pathId: outcome.pathId,
              decisions,
              archetype: outcome.archetype,
              archetypeTitle: outcome.archetypeTitle,
              pathTitle: outcome.pathTitle,
              scores: outcome.scores,
            });
          }
        }
      }
    }
  }
  return results;
}
