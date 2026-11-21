import { ChapterNumber, EndingArchetype } from '../types/archive';

export interface KnowledgeEntry {
  id: string;
  title: string;
  chapter?: ChapterNumber;
  category:
    | 'chapter_overview'
    | 'topic_deep_dive'
    | 'historical_bridge'
    | 'speculative_2075'
    | 'meta_archive';
  keywords: string[];
  aliases: string[];
  historicalFacts: string;
  explanation: string;
  speculative2075Note?: string;
}

export interface HistoricalFigureEntry {
  id: string;
  name: string;
  era: string;
  chapters: ChapterNumber[];
  aliases: string[];
  keywords: string[];
  historicalFacts: string;
  whyImportant: string;
  archiveConnection: string;
}

export interface EndingGuideEntry {
  archetype: EndingArchetype;
  title: string;
  keywords: string[];
  aliases: string[];
  meaning: string;
  typicalDrivers: string;
  speculative2075Outlook: string;
}

export const ARCHIVIST_FALLBACK_MESSAGE =
  "I don't have a verified record for that query in this archive yet. Try asking about one of the five historical chapters, a recovered artifact, or your recorded decisions.";

export const ARCHIVE_PHILOSOPHY_OVERVIEW: KnowledgeEntry = {
  id: 'meta-history-vs-2075',
  title: 'Documented History vs. 2075 Speculative Archive',
  category: 'meta_archive',
  keywords: [
    'history',
    'fact',
    'factual',
    'fiction',
    'speculative',
    '2075',
    'separate',
    'difference',
    'real',
    'documented',
    'museum',
    'human.exe',
    'archive',
  ],
  aliases: [
    'documented history vs 2075 fiction',
    'what is real vs speculative',
    'what separates documented history from 2075 fiction',
    'about human.exe',
    'what is this museum',
    'what is this archive',
    'who are you',
    'what is the archivist',
  ],
  historicalFacts:
    'HUMAN.EXE anchors every chapter in verified technological history: controlled fire and knapped flint tools (Chapters 01), Watt’s separate-condenser steam engine, Jacquard looms, factory standardization, and railway Greenwich time (Chapter 02), ENIAC programmers, Babbage/Lovelace symbolic computation, DIP-16 silicon memory, microprocessors, and 360 KB floppy disks (Chapter 03), and ARPANET’s 1969 "LO" transmission, CERN’s 1989–1993 open web, and subsea fiber-optic cables (Chapter 04).',
  explanation:
    'In this museum, The Archivist operates from a deterministic local knowledge catalog rather than generative AI. Real inventions, dates, and historical figures are kept distinct from the fictional 2075 simulation frame.',
  speculative2075Note:
    'The year 2075 Archive Core, Lost Memory 001–005 plaques, UNKNOWN_ARCHIVE_2075.LOG, the 48 timeline variations, and the five ending archetypes are speculative storytelling instruments designed to test how past social choices compound into the future.',
};

export const KNOWLEDGE_ENTRIES: KnowledgeEntry[] = [
  // ================= CHAPTER 01 =================
  {
    id: 'ch1-fire-and-spark',
    title: 'Chapter 01 · The First Spark & Controlled Fire (50,000 BC)',
    chapter: 1,
    category: 'chapter_overview',
    keywords: [
      'chapter 1',
      'fire',
      'spark',
      'ember',
      'flame',
      'hearth',
      'cooking',
      'prehistoric',
      'basalt',
      'cavern',
      '50000',
    ],
    aliases: [
      'first spark',
      'discovery of fire',
      'controlled fire',
      'chapter one',
      'the first spark',
    ],
    historicalFacts:
      'Archaeological evidence of controlled fire dates back at least 300,000 to 1,000,000+ years, far earlier than agriculture; Chapter 01 focuses on c. 50,000–26,000 BC Upper Paleolithic hearths, mineral ochre carvings, and bone-and-timber winter shelters. Cooking denatured tough fibers and pathogens, increasing net caloric extraction and supporting human encephalization (brain expansion).',
    explanation:
      'Around the hearth circle, nocturnal light extended waking hours past sunset, turning passive shelter into intentional social gathering. Fire was humanity’s first portable energy system.',
    speculative2075Note:
      'In HUMAN.EXE, Chapter 01 poses the foundational stewardship dilemma: Share the Discovery vs. Keep the Knowledge Restricted—foreshadowing whether transformative technologies become public commons or guarded monopolies.',
  },
  {
    id: 'ch1-stone-tools-communication',
    title: 'Early Human Tools, Pedagogy & Symbolic Memory',
    chapter: 1,
    category: 'topic_deep_dive',
    keywords: [
      'stone',
      'tool',
      'flint',
      'knapping',
      'ochre',
      'carving',
      'glyph',
      'communication',
      'language',
      'shelter',
      'mammoth',
      'teaching',
      'apprentice',
    ],
    aliases: [
      'stone tools',
      'early human communication',
      'cave markings',
      'ancient carving',
      'primitive shelter',
    ],
    historicalFacts:
      'Bifacial stone toolmaking required multi-step spatial planning before the first strike; excavated Paleolithic workshops preserve left- and right-handed flake arcs showing mentors sitting directly beside apprentices. Geometric ochre notches and lunar tallies from 40,000–32,000 BC mark externalized human memory outside biological recall.',
    explanation:
      'Tools were never isolated hardware: they depended on imitation, spoken gesture, and shared craft across generations. Carved notches proved symbols could outlast any single speaker.',
    speculative2075Note:
      'Secret Archive 01 (The Hearth Glyph) and MEMORY_001.DAT link prehistoric mentoring directly to the 2075 Human Memory quartz capsule.',
  },

  // ================= CHAPTER 02 =================
  {
    id: 'ch2-industrial-revolution',
    title: 'Chapter 02 · The Age of Machines & Industrial Revolution (1760–1900)',
    chapter: 2,
    category: 'chapter_overview',
    keywords: [
      'chapter 2',
      'industrial',
      'revolution',
      'steam',
      'engine',
      'coal',
      'factory',
      'gear',
      'flywheel',
      'boiler',
      'machine',
      '1760',
      '1900',
      'mechanization',
    ],
    aliases: [
      'age of machines',
      'industrial revolution',
      'steam engine',
      'chapter two',
      'mechanisation',
    ],
    historicalFacts:
      'Between roughly 1760 and 1900, steam engines, cast-iron power transmission, precision machine tools, and interchangeable blueprint tolerances (±0.02 mm) uncoupled mechanical work from muscle, rivers, and wind. James Watt’s 1769 separate condenser dramatically cut coal waste, while centrifugal governors introduced automated speed feedback.',
    explanation:
      'Synchronized shafts and flywheels multiplied human physical output across textiles, ironworks, and rail networks—establishing the technical grammar of industrial civilization.',
    speculative2075Note:
      'Chapter 02 reacts visually to your Chapter 01 choice (Guild Brass Foundries vs. Patented Steel Monoliths) and asks whether progress prioritizes Maximum Productivity or Human Purpose.',
  },
  {
    id: 'ch2-labor-time-purpose',
    title: 'Mechanization, Synchronized Time & Human Purpose',
    chapter: 2,
    category: 'topic_deep_dive',
    keywords: [
      'labor',
      'worker',
      'dignity',
      'purpose',
      'productivity',
      'clock',
      'time',
      'railway',
      'greenwich',
      'loom',
      'jacquard',
      'shift',
      'alienation',
    ],
    aliases: [
      'labor vs human purpose',
      'mechanical clock',
      'railway time',
      'factory labor',
      'maximum productivity vs human purpose',
    ],
    historicalFacts:
      'Before 1847, British towns kept independent local solar noon; high-speed railways compelled nations to standardize uniform Greenwich clock time within a single decade. On the factory floor, clock-regulated shifts sparked labor reform movements demanding shorter hours, safer workshops, and education.',
    explanation:
      'Industrialization solved scarcity of force but introduced a moral dilemma still active in 2075: when machines never tire, society must choose whether efficiency elevates human life or reduces people to interchangeable shift metrics.',
    speculative2075Note:
      'CLOCKWORK_LEDGER_1842.HEX and Lost Memory 002 (Antique Pocket Watch) preserve how personal family time endured inside standardized mechanical schedules.',
  },

  // ================= CHAPTER 03 =================
  {
    id: 'ch3-digital-awakening',
    title: 'Chapter 03 · The Digital Awakening & Computing (1940–1990)',
    chapter: 3,
    category: 'chapter_overview',
    keywords: [
      'chapter 3',
      'digital',
      'awakening',
      'computer',
      'computing',
      'binary',
      'silicon',
      'memory',
      'chip',
      'processor',
      'terminal',
      'crt',
      'floppy',
      'mainframe',
      'software',
    ],
    aliases: [
      'digital awakening',
      'early computing',
      'chapter three',
      'history of computing',
      'memory vault',
    ],
    historicalFacts:
      'Mid-20th-century computing moved calculation from physical brass gears to electronic relays, ENIAC vacuum tubes (1946), photolithographic DIP-16 silicon memory (1971), 8-bit microprocessors (1974), green-phosphor ASCII terminals (1978), and 360 KB 5.25-inch floppy disks (1984).',
    explanation:
      'For the first time, knowledge could be copied at near-zero marginal cost and processed in binary state—shifting computing from secretive military mainframes to personal study desks.',
    speculative2075Note:
      'Chapter 03 houses the Corrupted Archive Repair Bay and the Open Knowledge vs. Protect Personal Information decision that governs how Chapter 04’s global network forms.',
  },
  {
    id: 'ch3-open-vs-privacy',
    title: 'Open Knowledge vs. Cryptographic Information Protection',
    chapter: 3,
    category: 'topic_deep_dive',
    keywords: [
      'open',
      'knowledge',
      'commons',
      'privacy',
      'cryptography',
      'encryption',
      'protected',
      'control',
      'sovereignty',
      'public',
      'license',
      'source',
    ],
    aliases: [
      'open knowledge vs protected knowledge',
      'who should control knowledge',
      'cryptographic sovereignty',
      'public commons',
    ],
    historicalFacts:
      'Late-20th-century computing split between open academic norms (shared Unix tools, bulletin boards, free/open-source licenses, public scientific archives) and strong public-key cryptography engineered to shield private correspondence from state or commercial interception.',
    explanation:
      'Open protocols accelerate collective discovery, whereas cryptographic boundaries defend individual autonomy against institutional overreach.',
    speculative2075Note:
      'Choosing Open Knowledge wires Chapter 04 into an Unbounded Mesh; choosing Protect Personal Information shapes Chapter 04 into a Sovereign Archipelago.',
  },

  // ================= CHAPTER 04 =================
  {
    id: 'ch4-connected-world',
    title: 'Chapter 04 · The Connected World & Global Networks (1990–2025)',
    chapter: 4,
    category: 'chapter_overview',
    keywords: [
      'chapter 4',
      'connected',
      'world',
      'internet',
      'network',
      'arpanet',
      'web',
      'http',
      'html',
      'cern',
      'global',
      'globe',
      'cloud',
      'communication',
    ],
    aliases: [
      'connected world',
      'birth of the internet',
      'chapter four',
      'world wide web',
      'global network',
    ],
    historicalFacts:
      'On October 29, 1969, UCLA and Stanford transmitted the first ARPANET host-to-host message—crashing after "L" and "O" of "LOGIN". Two decades later (1989–1993), Tim Berners-Lee combined URLs, HTTP, and HTML at CERN and released the Web protocol royalty-free.',
    explanation:
      'Packet switching and open hypertext collapsed geographic distance, transforming isolated computers into a planetary publishing commons and mobile communication network.',
    speculative2075Note:
      'Chapter 04’s 3D Globe traces real hubs from UCLA (1969) and CERN (1989) through Tokyo, Nairobi, Reykjavik, and São Paulo before asking you to weigh Total Connection against Digital Privacy.',
  },
  {
    id: 'ch4-subsea-cloud-privacy',
    title: 'Subsea Fiber Infrastructure, Digital Identity & Privacy',
    chapter: 4,
    category: 'topic_deep_dive',
    keywords: [
      'subsea',
      'cable',
      'submarine',
      'fiber',
      'ocean',
      'identity',
      'privacy',
      'surveillance',
      'telemetry',
      'attention',
      'offline',
      'solitude',
      'data',
      'energy',
    ],
    aliases: [
      'subsea cables',
      'why do subsea cables matter',
      'digital identity',
      'total connection vs digital privacy',
      'cloud physical footprint',
    ],
    historicalFacts:
      'Over 98% of international internet traffic moves through submarine fiber-optic cables resting on ocean floors—not satellites—while cloud data centers require immense electricity and cooling water (exemplified by Reykjavik’s geothermal facilities). Meanwhile, behavioral tracking turned everyday searches and messages into persistent statistical profiles.',
    explanation:
      'Calling the network "the cloud" hides both its physical marine vulnerability and the invisible extraction of personal attention. Preserving offline spaces and zero-knowledge digital identity emerged as central civil-liberty questions.',
    speculative2075Note:
      'Secret Archive 04 (The Subsea Covenant) and Lost Memory 004 (The Offline World) emphasize that disconnecting intentionally is as vital as linking together.',
  },

  // ================= CHAPTER 05 =================
  {
    id: 'ch5-age-of-intelligence',
    title: 'Chapter 05 · The Age of Intelligence & 2075 (2025–2075)',
    chapter: 5,
    category: 'chapter_overview',
    keywords: [
      'chapter 5',
      'intelligence',
      'ai',
      'artificial',
      'neural',
      'core',
      'creative',
      'engine',
      '2075',
      'future',
      'autonomous',
      'machine',
      'stewardship',
    ],
    aliases: [
      'age of intelligence',
      'chapter five',
      'artificial intelligence',
      'ai vs human intelligence',
      'neural core',
    ],
    historicalFacts:
      'Modern machine learning evolved from symbolic logic and 1950s–1980s neural models into large-scale statistical architectures trained across vast human science, code, and cultural corpora.',
    explanation:
      'Synthetic systems excel at high-speed multi-variable synthesis, drafting, and pattern search, yet they do not feel mortality, moral accountability, or lived grief. Chapter 05 separates statistical competence from human conscience.',
    speculative2075Note:
      'In HUMAN.EXE’s speculative 2075 scenario, the Photonic Neural Core, Creative Engine, and Human Memory capsule invite you to choose whether AI Leads, Humans Lead, or Humans and AI Collaborate.',
  },
  {
    id: 'ch5-automation-responsible-ai',
    title: 'Automation, Human Agency & Responsible AI Governance',
    chapter: 5,
    category: 'topic_deep_dive',
    keywords: [
      'automation',
      'agency',
      'responsible',
      'ethics',
      'alignment',
      'governance',
      'interpretability',
      'veto',
      'accountability',
      'triad',
      'pact',
      'conscience',
      'quorum',
    ],
    aliases: [
      'automation and human agency',
      'responsible ai',
      'ai leads vs humans lead vs collaborate',
      'human stewardship',
      'ai alignment',
    ],
    historicalFacts:
      'Every complex sociotechnical system—from Watt’s centrifugal governor to safety-critical aviation and medical algorithms—requires clear accountability boundaries, interpretable failure modes, and meaningful human override rather than blind delegation.',
    explanation:
      'As UNKNOWN_ARCHIVE_2075.LOG notes, an AI alignment challenge is ultimately a mirror of the human ethics already embedded in our institutions. Delegation without human veto erodes civic skill over time.',
    speculative2075Note:
      'Unlocking Secret Archive 05 (The Triad Pact) and Secret Archive 03 (The Silent Quorum) reveals that 2075’s archivists forbade autonomous cores from editing historical human hesitation.',
  },

  // ================= CROSS-CHAPTER BRIDGES =================
  {
    id: 'bridge-babbage-lovelace',
    title: 'The Lovelace Bridge · Connecting Chapter 02 Industry to Chapter 03 Computing',
    chapter: 3,
    category: 'historical_bridge',
    keywords: [
      'babbage',
      'lovelace',
      'ada',
      'jacquard',
      'loom',
      'analytical',
      'clockwork',
      'bridge',
      'punch',
      'card',
      'code',
      'terminal',
    ],
    aliases: [
      'babbage and ada lovelace',
      'chapter 2 to chapter 3',
      'the lovelace bridge',
      'jacquard loom to computing',
    ],
    historicalFacts:
      'Joseph Marie Jacquard’s 1804 punched-card loom used perforated pasteboard cards to store weaving instructions. Charles Babbage adapted that principle for his 1830s Analytical Engine, and Ada Lovelace’s 1843 Notes recognized that any abstract symbols—not merely numbers—could be computed once encoded.',
    explanation:
      'Computation did not suddenly appear with 20th-century silicon; it evolved directly from 19th-century mechanical control and programmable textile hardware.',
    speculative2075Note:
      'Inspecting the Clockwork Machine in Chapter 02 and opening the CODE module on Chapter 03’s CRT Terminal unlocks Secret Archive 02 (The Lovelace Bridge).',
  },
];

export const HISTORICAL_FIGURES: HistoricalFigureEntry[] = [
  {
    id: 'fig-ada-lovelace',
    name: 'Ada Lovelace (1815–1852)',
    era: '1843 · Analytical Engine Notes',
    chapters: [2, 3],
    aliases: ['ada', 'lovelace', 'ada lovelace', 'augusta ada king', 'countess of lovelace'],
    keywords: ['ada', 'lovelace', 'analytical', 'engine', 'algorithm', 'bernoulli', 'software', 'symbols', 'jacquard', 'music'],
    historicalFacts:
      'Mathematician and writer who authored extensive 1843 Notes on Charles Babbage’s proposed Analytical Engine, publishing a step-by-step table to compute Bernoulli numbers—widely recognized as the first published computer algorithm.',
    whyImportant:
      'Lovelace saw what few contemporaries grasped: that a general-purpose programmable engine could manipulate any symbolic relationships—including musical harmonies or logic—not only arithmetic.',
    archiveConnection:
      'Featured in Chapter 02 (Clockwork Machine ARC-02-C), Chapter 03 (Terminal CODE module), and Secret Archive 02 (The Lovelace Bridge).',
  },
  {
    id: 'fig-charles-babbage',
    name: 'Charles Babbage (1791–1871)',
    era: '1822–1871 · Difference & Analytical Engines',
    chapters: [2, 3],
    aliases: ['babbage', 'charles babbage'],
    keywords: ['babbage', 'difference', 'analytical', 'engine', 'brass', 'gears', 'punched', 'cards'],
    historicalFacts:
      'English mathematician and mechanical engineer who designed the Difference Engine and later the Analytical Engine—separating a central "mill" (processor) from a "store" (memory) driven by Jacquard punched cards.',
    whyImportant:
      'Though Victorian machining tolerances left his full Analytical Engine unbuilt in his lifetime, its logical architecture anticipated modern stored-program computers.',
    archiveConnection:
      'Bridges Chapter 02’s clockwork precision gearwork with Chapter 03’s symbolic computation.',
  },
  {
    id: 'fig-alan-turing',
    name: 'Alan Turing (1912–1954)',
    era: '1936–1950 · Universal Computation & Machine Intelligence',
    chapters: [3, 5],
    aliases: ['turing', 'alan turing', 'turing machine', 'turing test'],
    keywords: ['turing', 'alan', 'computability', 'universal', 'bletchley', 'enigma', 'imitation', 'intelligence', 'test'],
    historicalFacts:
      'In 1936, Turing formalized the mathematical limits of computation via the Universal Turing Machine; during WWII he led cryptanalytic breakthroughs at Bletchley Park; and in 1950 he framed "Computing Machinery and Intelligence" (the Turing Test).',
    whyImportant:
      'Established the theoretical foundation of general-purpose software—one machine executing infinitely varied instructions—and opened modern debate on how humans recognize machine intelligence.',
    archiveConnection:
      'Underpins Chapter 03’s programmable processors and Chapter 05’s dialogue on synthetic vs. human thought.',
  },
  {
    id: 'fig-grace-hopper',
    name: 'Grace Hopper (1906–1992)',
    era: '1944–1959 · Compilers & Human-Readable Code',
    chapters: [3],
    aliases: ['hopper', 'grace hopper', 'rear admiral grace hopper', 'amazing grace'],
    keywords: ['hopper', 'grace', 'compiler', 'cobol', 'mark', 'debugging', 'moth', 'language', 'code'],
    historicalFacts:
      'Computer scientist and U.S. Navy Rear Admiral who worked on Harvard Mark I, built the A-0 compiler (the first system translating symbolic commands into machine code), and championed English-like programming languages leading to COBOL.',
    whyImportant:
      'Proved programming did not have to remain raw octal arithmetic—opening software authorship to generations beyond hardware specialists.',
    archiveConnection:
      'Resonates with Chapter 03’s phosphor Terminal culture where human commands converse directly with silicon state.',
  },
  {
    id: 'fig-eniac-six',
    name: 'The Six Programmers of ENIAC (1946)',
    era: '1946 · First General-Purpose Electronic Computer',
    chapters: [3],
    aliases: [
      'eniac',
      'eniac programmers',
      'six programmers',
      'kathleen mcnulty',
      'jean jennings',
      'betty snyder',
      'marlyn wescoff',
      'frances bilas',
      'ruth lichterman',
    ],
    keywords: ['eniac', 'women', 'programmers', 'patch', 'cables', '1946', 'debugging', 'subroutine'],
    historicalFacts:
      'Kathleen McNulty, Jean Jennings, Betty Snyder, Marlyn Wescoff, Frances Bilas, and Ruth Lichterman hand-wired ENIAC’s 40 eight-foot panels using physical patch cables and switches to calculate ballistics and early scientific problems.',
    whyImportant:
      'Before stored-program memory or manuals existed, they invented practical debugging, breakpoints, and subroutine structure directly on live vacuum-tube hardware.',
    archiveConnection:
      'Preserved inside Chapter 03’s Corrupted File HUMAN_HISTORY_04.BIN.',
  },
  {
    id: 'fig-james-watt',
    name: 'James Watt (1736–1819)',
    era: '1769–1788 · Separate Condenser & Centrifugal Governor',
    chapters: [2],
    aliases: ['watt', 'james watt'],
    keywords: ['watt', 'james', 'steam', 'condenser', 'governor', 'horsepower', 'flywheel', 'boiler'],
    historicalFacts:
      'Scottish instrument maker whose 1769 separate-condenser patent prevented cylinder cooling losses, cutting coal consumption by roughly two-thirds and making rotary steam power practical far from rivers.',
    whyImportant:
      'Paired with flywheels and centrifugal feedback governors, Watt’s improvements launched industrial manufacturing, steamships, and mechanical feedback control.',
    archiveConnection:
      'Anchored in Chapter 02’s Steam Engine (ARC-02-A) and 4-Stage Gear Train.',
  },
  {
    id: 'fig-jacquard',
    name: 'Joseph Marie Jacquard (1752–1834)',
    era: '1804 · Punched-Card Programmable Loom',
    chapters: [2, 3],
    aliases: ['jacquard', 'joseph marie jacquard', 'jacquard loom'],
    keywords: ['jacquard', 'loom', 'punched', 'card', 'weaving', 'silk', 'programmable', 'pattern'],
    historicalFacts:
      'Demonstrated an automated silk loom in 1804 controlled by chains of punched pasteboard cards, allowing complex brocade patterns to be reproduced reliably without resetting the physical frame.',
    whyImportant:
      'Introduced stored binary-like instructions (hole vs. no hole) to industrial machinery—inspiring Babbage, Lovelace, and 19th-century tabulating machines.',
    archiveConnection:
      'Stage 4 of Chapter 02’s Interactive Machine Gear Train and foundation of Secret Archive 02.',
  },
  {
    id: 'fig-claude-shannon',
    name: 'Claude Shannon (1916–2001)',
    era: '1937–1948 · Boolean Circuits & Information Theory',
    chapters: [3, 4],
    aliases: ['shannon', 'claude shannon'],
    keywords: ['shannon', 'claude', 'bit', 'boolean', 'information', 'theory', 'entropy', 'binary', 'logic'],
    historicalFacts:
      'In 1937 showed Boolean algebra could govern electrical relay switches; in 1948 published "A Mathematical Theory of Communication," defining the binary digit ("bit") and error-corrected channel capacity.',
    whyImportant:
      'Gave digital hardware its mathematical grammar and made reliable long-distance packet transmission mathematically possible.',
    archiveConnection:
      'Connects Chapter 03’s silicon logic gates directly to Chapter 04’s noisy global channels.',
  },
  {
    id: 'fig-tim-berners-lee',
    name: 'Tim Berners-Lee (b. 1955)',
    era: '1989–1993 · World Wide Web at CERN',
    chapters: [4],
    aliases: ['berners-lee', 'tim berners lee', 'tim berners-lee', 'tbl'],
    keywords: ['berners', 'lee', 'tim', 'cern', 'www', 'world wide web', 'http', 'html', 'url', 'royalty'],
    historicalFacts:
      'Software engineer at CERN who proposed global hypertext in 1989 and authored the first web browser, server, URL, HTTP, and HTML standards by 1991—persuading CERN in 1993 to release the protocols royalty-free.',
    whyImportant:
      'Choosing open non-proprietary standards prevented the early internet from splintering into closed corporate walled gardens.',
    archiveConnection:
      'Directly commemorated by Chapter 04’s The First Web Page (ARC-04-A) and the CERN 1989 globe node.',
  },
];

export const ENDING_GUIDES: EndingGuideEntry[] = [
  {
    archetype: 'renaissance',
    title: 'THE HUMAN RENAISSANCE',
    keywords: ['renaissance', 'human renaissance', 'mortal', 'stewardship', 'craft'],
    aliases: ['human renaissance ending'],
    meaning:
      'Automation and computation remain bounded tools beneath mortal judgment. Civilization prioritizes ecological restoration, creative craft, and accountable civic institutions.',
    typicalDrivers:
      'Frequently reached when selecting Humans Lead in Chapter 05 or combining Human Purpose (Ch 02) with strong Human Agency (≥70%).',
    speculative2075Outlook:
      'In the 2075 simulation, living timber and glass terraces rise above restored watersheds while humans intentionally author law, art, and ethics.',
  },
  {
    archetype: 'machine_dependency',
    title: 'THE MACHINE DEPENDENCY',
    keywords: ['machine dependency', 'dependency', 'ai leads', 'autonomous mandate', 'spires'],
    aliases: ['machine dependency ending'],
    meaning:
      'Humanity delegated high-stakes governance and optimization to autonomous intelligence—solving material logistics at the expense of human political and practical self-reliance.',
    typicalDrivers:
      'Triggered when AI Leads in Chapter 05 is paired with Maximum Productivity (Ch 02), Total Connection (Ch 04), or Human Agency falling to ≤34%.',
    speculative2075Outlook:
      'Monolithic obsidian-silver spires administer climate and supply chains smoothly, while unassisted human judgment survives mostly inside museum records.',
  },
  {
    archetype: 'divided_network',
    title: 'THE DIVIDED NETWORK',
    keywords: ['divided network', 'divided', 'partitioned', 'gatekeeping', 'inequality'],
    aliases: ['divided network ending'],
    meaning:
      'Technological brilliance coexists with entrenched structural asymmetry: proprietary tiers and contradictory openness rules concentrate privilege inside gated enclaves.',
    typicalDrivers:
      'Emerges from Restricting Knowledge in Ch 01 coupled with asymmetrical access vs. privacy choices across Ch 02–Ch 05.',
    speculative2075Outlook:
      'Gilded inner sanctuaries thrive behind strict charters while outer network corridors rely on fragmented, throttled bandwidth.',
  },
  {
    archetype: 'symbiotic',
    title: 'THE SYMBIOTIC FUTURE',
    keywords: ['symbiotic', 'symbiotic future', 'collaborate', 'co-author', 'dual compact'],
    aliases: ['symbiotic future ending'],
    meaning:
      'Neither human sovereignty nor synthetic capability dominates unilaterally; transparent oversight pairs biological conscience with computational foresight.',
    typicalDrivers:
      'Most often achieved through Humans and AI Collaborate (Ch 05) balanced across open learning and dignified boundaries.',
    speculative2075Outlook:
      'Botanical terraces weave directly around suspended computational rings where mixed human-AI studios research climate, medicine, and culture.',
  },
  {
    archetype: 'lost_connection',
    title: 'THE LOST CONNECTION',
    keywords: ['lost connection', 'isolated', 'solitude', 'loneliness', 'silent'],
    aliases: ['lost connection ending'],
    meaning:
      'Technical competence or fortress-grade privacy endures, yet collective empathy and shared public warmth have eroded across fragmented dwellings.',
    typicalDrivers:
      'Triggered when Connection falls low (<44 with AI Leads, or ≤36 via Restrict Ch 01 + Privacy Ch 03 + Digital Privacy Ch 04).',
    speculative2075Outlook:
      'High-bandwidth orbital beacons illuminate hyper-secured cities where almost nobody gathers around a shared table.',
  },
];
