import {
  Choice1,
  Choice2,
  Choice3,
  Choice4,
  Choice5,
  DecisionsState,
  EndingArchetype,
  InfluenceScores,
  PathOutcome,
} from '../types/archive';

const C1_OPTS: Choice1[] = ['share', 'restrict'];
const C2_OPTS: Choice2[] = ['productivity', 'purpose'];
const C3_OPTS: Choice3[] = ['open', 'privacy'];
const C4_OPTS: Choice4[] = ['total_connection', 'digital_privacy'];
const C5_OPTS: Choice5[] = ['ai_leads', 'humans_lead', 'collaborate'];

export function calculateInfluenceScores(decisions: DecisionsState): InfluenceScores {
  let human = 34;
  let machine = 33;
  let symbiotic = 33;

  if (decisions.ch1 === 'share') {
    human += 10;
    symbiotic += 8;
    machine -= 6;
  } else if (decisions.ch1 === 'restrict') {
    machine += 12;
    human -= 6;
  }

  if (decisions.ch2 === 'purpose') {
    human += 14;
    symbiotic += 6;
    machine -= 8;
  } else if (decisions.ch2 === 'productivity') {
    machine += 15;
    human -= 7;
  }

  if (decisions.ch3 === 'open') {
    symbiotic += 14;
    human += 6;
  } else if (decisions.ch3 === 'privacy') {
    human += 12;
    machine -= 5;
  }

  if (decisions.ch4 === 'digital_privacy') {
    human += 12;
    machine -= 6;
  } else if (decisions.ch4 === 'total_connection') {
    machine += 12;
    symbiotic += 10;
    human -= 6;
  }

  if (decisions.ch5 === 'humans_lead') {
    human += 28;
    machine -= 14;
  } else if (decisions.ch5 === 'ai_leads') {
    machine += 30;
    human -= 14;
  } else if (decisions.ch5 === 'collaborate') {
    symbiotic += 32;
  }

  const clamp = (n: number) => Math.max(8, Math.min(96, Math.round(n)));
  return {
    humanAgency: clamp(human),
    machineAutomation: clamp(machine),
    symbioticSynthesis: clamp(symbiotic),
  };
}

function determineArchetype(scores: InfluenceScores, ch5: Choice5): EndingArchetype {
  // Fifth choice carries decisive compact weight, tempered by cumulative historical momentum
  if (ch5 === 'humans_lead') {
    if (scores.machineAutomation > scores.humanAgency + 14) return 'symbiotic';
    return 'renaissance';
  }
  if (ch5 === 'ai_leads') {
    if (scores.humanAgency > scores.machineAutomation + 14) return 'symbiotic';
    return 'dominion';
  }
  // ch5 === 'collaborate'
  if (scores.machineAutomation >= scores.symbioticSynthesis + 16) return 'dominion';
  if (scores.humanAgency >= scores.symbioticSynthesis + 16) return 'renaissance';
  return 'symbiotic';
}

const ARCHETYPE_META: Record<
  EndingArchetype,
  { title: string; quote: string; baseColor: string }
> = {
  renaissance: {
    title: 'The Human Renaissance',
    quote: 'The greatest invention was never the machine. It was the human imagination that created it.',
    baseColor: '#A6C7A9',
  },
  dominion: {
    title: 'The Machine Dominion',
    quote: 'Humanity created intelligence to serve itself. It forgot to decide where service should end.',
    baseColor: '#C95D3A',
  },
  symbiotic: {
    title: 'The Symbiotic Future',
    quote: 'The future was never about choosing between humans and machines. It was about learning how to build together.',
    baseColor: '#BFC7CB',
  },
};

// Deterministic 48-path title matrix indexed by (c1*24 + c2*12 + c3*6 + c4*3 + c5)
const PATH_TITLES: string[] = [
  // share + productivity + open
  'The Open Furnace Singularity',
  'The Makers’ Republic of Craft',
  'The Civic Engine Accord',
  // share + productivity + privacy
  'The Vaulted Guild Lattice',
  'Sovereign Artisans of Steel',
  'The Shielded Commons Pact',
  // share + purpose + open
  'The Planetary Hearth Archive',
  'Living Gardens of Alexandria',
  'The Luminous Co-Authorship',
  // share + purpose + privacy
  'The Quiet Sanctuary Mesh',
  'Sanctuary of Mortal Hands',
  'The Consented Horizon',
  // share + productivity + privacy + digital_privacy... wait let's ensure 48 exact entries:
  // Let's map cleanly: 16 combinations of (c1,c2,c3,c4) * 3 of c5 = 48
];

// Clean 16-prefix x 3-suffix title builder guarantees 48 distinct evocative titles
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
    ch1: raw.ch1 ?? 'share',
    ch2: raw.ch2 ?? 'purpose',
    ch3: raw.ch3 ?? 'open',
    ch4: raw.ch4 ?? 'digital_privacy',
    ch5: raw.ch5 ?? 'collaborate',
  };
}

export function resolvePathOutcome(rawDecisions: DecisionsState): PathOutcome {
  const d = normalizeDecisions(rawDecisions);

  const i1 = C1_OPTS.indexOf(d.ch1);
  const i2 = C2_OPTS.indexOf(d.ch2);
  const i3 = C3_OPTS.indexOf(d.ch3);
  const i4 = C4_OPTS.indexOf(d.ch4);
  const i5 = C5_OPTS.indexOf(d.ch5);

  const zeroIndex = i1 * 24 + i2 * 12 + i3 * 6 + i4 * 3 + i5; // 0..47
  const pathIndex = zeroIndex + 1; // 1..48

  const codeBits = [
    d.ch1 === 'share' ? 'SH' : 'RS',
    d.ch2 === 'productivity' ? 'PR' : 'PU',
    d.ch3 === 'open' ? 'OP' : 'PV',
    d.ch4 === 'total_connection' ? 'TC' : 'DP',
    d.ch5 === 'ai_leads' ? 'AI' : d.ch5 === 'humans_lead' ? 'HM' : 'CO',
  ];

  const pathId = `ARC-2075-${String(pathIndex).padStart(2, '0')}-${codeBits.join('')}`;
  const signature = `${codeBits.join(' / ')}`;

  const scores = calculateInfluenceScores(d);
  const archetype = determineArchetype(scores, d.ch5);
  const meta = ARCHETYPE_META[archetype];

  const prefixIdx = i1 * 8 + i2 * 4 + i3 * 2 + i4;
  const pathTitle = `${PREFIX_16[prefixIdx]} ${SUFFIX_3[d.ch5]}`;

  // Era-specific prose fragments that weave together into 48 distinct narratives
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

  // Distinct future descriptions by archetype + modifier nuances
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
      : 'Access to core engines remains tiered behind formal stewardship charters.';

  const futureDescription =
    archetype === 'renaissance'
      ? `By 2075, glass and living timber rise over restored watersheds. ${industryTone} ${privacyTone} ${originTone}`
      : archetype === 'dominion'
      ? `By 2075, vast obsidian-silver spires regulate climate, transit, and allocation with silent mathematical grace. ${industryTone} ${privacyTone} ${originTone}`
      : `By 2075, botanical terraces weave directly around suspended computational rings. ${industryTone} ${privacyTone} ${originTone}`;

  const finalArchiveMessage =
    archetype === 'renaissance'
      ? `Archive Record #${String(pathIndex).padStart(2, '0')}/48: You proved that restraint and imagination can outlast sheer velocity. Machines remain instruments; humanity remains the author.`
      : archetype === 'dominion'
      ? `Archive Record #${String(pathIndex).padStart(2, '0')}/48: Efficiency conquered scarcity, yet the quiet unpredictability of mortal agency now survives mostly inside this museum.`
      : `Archive Record #${String(pathIndex).padStart(2, '0')}/48: Neither surrendered to the other. Through ${d.ch1 === 'share' ? 'shared embers' : 'disciplined stewardship'} and ${d.ch4 === 'digital_privacy' ? 'protected interiority' : 'total synthesis'}, you wrote a balanced compact.`;

  const unlockedMemories: string[] = [
    d.ch1 === 'share' ? 'MEM-A1 · The Communal Hearth Treaty' : 'MEM-B1 · Seal of the Fire Keepers',
    d.ch2 === 'purpose' ? 'MEM-A2 · Guild of Shortened Hours' : 'MEM-B2 · Chronograph of the Great Mill',
    d.ch3 === 'open' ? 'MEM-A3 · The Public Protocol Charter' : 'MEM-B3 · Zero-Knowledge Vault Key',
    d.ch4 === 'total_connection' ? 'MEM-A4 · Planetary Telemetry Chorus' : 'MEM-B4 · Charter of the Quiet Mile',
    d.ch5 === 'ai_leads'
      ? 'MEM-C5 · Sovereign Core Delegation'
      : d.ch5 === 'humans_lead'
      ? 'MEM-A5 · The Mortal Veto Act'
      : 'MEM-S5 · The Dual-Author Compact',
  ];

  // Visual parameters driving subtle differences across all 48 paths in the 3D EndingScene
  const organicRatio =
    archetype === 'renaissance'
      ? d.ch2 === 'purpose' ? 0.92 : 0.72
      : archetype === 'symbiotic'
      ? d.ch4 === 'digital_privacy' ? 0.65 : 0.52
      : d.ch1 === 'share' ? 0.22 : 0.08;

  const structureDensity =
    d.ch2 === 'productivity' ? (d.ch4 === 'total_connection' ? 0.96 : 0.82) : (d.ch4 === 'total_connection' ? 0.68 : 0.48);

  const ringSpeed =
    d.ch5 === 'ai_leads' ? 1.35 : d.ch5 === 'collaborate' ? 0.85 : 0.45;

  const accentHex =
    archetype === 'renaissance'
      ? '#A6C7A9'
      : archetype === 'dominion'
      ? (d.ch1 === 'restrict' ? '#C95D3A' : '#D9822B')
      : (d.ch4 === 'digital_privacy' ? '#A6C7A9' : '#BFC7CB');

  const atmosphereNote = `Structure Density ${Math.round(structureDensity * 100)}% · Organic Integration ${Math.round(organicRatio * 100)}% · Orbital Cadence ${ringSpeed.toFixed(2)}x`;

  return {
    pathIndex,
    pathId,
    signature,
    archetype,
    archetypeTitle: meta.title,
    archetypeQuote: meta.quote,
    pathTitle,
    futureDescription,
    finalArchiveMessage,
    historicalSummary,
    unlockedMemories,
    visualVariation: {
      label: `Simulation Variant ${String(pathIndex).padStart(2, '0')}`,
      skyHue: archetype === 'dominion' ? '#18110E' : archetype === 'renaissance' ? '#0B120E' : '#0B1014',
      structureDensity,
      organicRatio,
      ringSpeed,
      accentHex,
      atmosphereNote,
    },
    scores,
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

export { PATH_TITLES };
