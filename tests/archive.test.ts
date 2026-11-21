import assert from 'node:assert/strict';
import {
  HUMANITY_INDEX_BASELINE,
  calculateInfluenceScores,
  calculateLiveHumanityIndex,
  getAll48PathsSummary,
  resolvePathOutcome,
} from '../src/logic/decisionEngine.ts';
import {
  DEFAULT_ARCHIVE_STATE,
  applyDiscoverLostArtifact,
  applyInspectArtifact,
  applyMarkTerminalCodeVisited,
  applyRepairFile,
  sanitizeArchiveState,
} from '../src/hooks/useArchiveState.ts';
import {
  buildArchiveReportHtml,
  buildArchiveReportText,
  escapeHtml,
} from '../src/utils/archiveReport.ts';
import {
  clearArchivistConversation,
  createInitialArchivistMessages,
  queryArchivist,
} from '../src/logic/archivistEngine.ts';
import { ARCHIVIST_FALLBACK_MESSAGE } from '../src/data/archivistKnowledge.ts';

let passed = 0;

function runTest(name: string, fn: () => void | Promise<void>) {
  return Promise.resolve()
    .then(fn)
    .then(() => {
      passed += 1;
      console.log(`PASS  ${name}`);
    });
}

await runTest('All 48 decision combinations are distinct and cover all 5 archetypes', () => {
  const paths = getAll48PathsSummary();
  assert.equal(paths.length, 48, 'Expected exactly 48 combinations');

  const indices = new Set(paths.map((p) => p.pathIndex));
  const ids = new Set(paths.map((p) => p.pathId));
  assert.equal(indices.size, 48, 'All 48 path indices must be unique');
  assert.equal(ids.size, 48, 'All 48 path IDs must be unique');

  const archetypes = new Set(paths.map((p) => p.archetype));
  assert.deepEqual(
    archetypes,
    new Set([
      'renaissance',
      'machine_dependency',
      'divided_network',
      'symbiotic',
      'lost_connection',
    ]),
    'All 5 ending archetypes must be reachable across the 48 paths'
  );
});

await runTest('Partial decision factor lookup stays keyed to its chapter (no index shift bug)', () => {
  const partial = { ch2: 'productivity' as const, ch5: 'humans_lead' as const };
  const scores = calculateInfluenceScores(partial);

  assert.equal(scores.decisionFactors.length, 2);
  assert.equal(scores.decisionFactorsByChapter[1].status, 'pending');
  assert.equal(scores.decisionFactorsByChapter[1].innovationDelta, 0);
  assert.equal(scores.decisionFactorsByChapter[2].status, 'selected');
  assert.equal(scores.decisionFactorsByChapter[2].optionLabel, 'Maximum Productivity');
  assert.equal(scores.decisionFactorsByChapter[2].innovationDelta, 16);
  assert.equal(scores.decisionFactorsByChapter[3].status, 'pending');
  assert.equal(scores.decisionFactorsByChapter[4].status, 'pending');
  assert.equal(scores.decisionFactorsByChapter[5].status, 'selected');
  assert.equal(scores.decisionFactorsByChapter[5].optionLabel, 'Humans Lead');

  const outcome = resolvePathOutcome(partial);
  assert.equal(outcome.isComplete, false);
  assert.equal(outcome.selectedCount, 2);
  assert.deepEqual(outcome.pendingChapters, [1, 3, 4]);
  assert.equal(outcome.unlockedMemoriesByChapter[1], null);
  assert.ok(outcome.unlockedMemoriesByChapter[2]?.includes('MEM-B2'));
  assert.equal(outcome.unlockedMemories.length, 2);
});

await runTest('0/5 undecided state stays at baseline scores without fabricated defaults', () => {
  const outcome = resolvePathOutcome({});
  assert.equal(outcome.isComplete, false);
  assert.equal(outcome.selectedCount, 0);
  assert.deepEqual(outcome.pendingChapters, [1, 2, 3, 4, 5]);
  assert.equal(outcome.scores.innovation, HUMANITY_INDEX_BASELINE.innovation);
  assert.equal(outcome.scores.connection, HUMANITY_INDEX_BASELINE.connection);
  assert.equal(outcome.scores.humanAgency, HUMANITY_INDEX_BASELINE.humanAgency);

  const live = calculateLiveHumanityIndex({}, DEFAULT_ARCHIVE_STATE);
  assert.equal(live.innovation, HUMANITY_INDEX_BASELINE.innovation);
  assert.equal(live.connection, HUMANITY_INDEX_BASELINE.connection);
  assert.equal(live.humanAgency, HUMANITY_INDEX_BASELINE.humanAgency);
});

await runTest('Complete 5/5 decisions mark outcome finalized with valid path index 1..48', () => {
  const full = {
    ch1: 'share' as const,
    ch2: 'purpose' as const,
    ch3: 'open' as const,
    ch4: 'digital_privacy' as const,
    ch5: 'collaborate' as const,
  };
  const outcome = resolvePathOutcome(full);
  assert.equal(outcome.isComplete, true);
  assert.equal(outcome.selectedCount, 5);
  assert.deepEqual(outcome.pendingChapters, []);
  assert.ok(outcome.pathIndex >= 1 && outcome.pathIndex <= 48);
  assert.equal(outcome.unlockedMemories.length, 5);
});

await runTest('Live Humanity Index applies exploration bonuses deterministically and caps cleanly', () => {
  const progress = {
    ...DEFAULT_ARCHIVE_STATE,
    inspectedArtifacts: [
      'art-ember',
      'art-stone-tool',
      'art-shared-flame',
      'art-steam-engine',
      'art-factory-gear',
      'art-clockwork-machine',
    ],
    discoveredLostArtifacts: ['lost-001', 'lost-002', 'lost-003'],
    unlockedSecrets: ['secret-001', 'secret-002'],
    repairedFiles: ['file-fire-telemetry', 'file-steam-census'],
  };
  const live = calculateLiveHumanityIndex(
    { ch1: 'share', ch2: 'purpose', ch3: 'open', ch4: 'digital_privacy', ch5: 'collaborate' },
    progress
  );
  assert.equal(live.isComplete, true);
  assert.equal(live.explorationBonuses.innovation, 2);
  assert.equal(live.explorationBonuses.connection, 4);
  assert.equal(live.explorationBonuses.humanAgency, 2);
  assert.ok(live.innovation <= 99 && live.connection <= 99 && live.humanAgency <= 99);
});

await runTest('sanitizeArchiveState validates corrupted localStorage and restores state safely across reloads', () => {
  const restored = sanitizeArchiveState({
    introCompleted: true,
    visitedChapters: [1, 2, 99, 'bad', 2, 5],
    decisions: { ch1: 'share', ch2: 'invalid_choice', ch5: 'ai_leads' },
    inspectedArtifacts: ['art-ember', 'unknown-id', 'art-ember'],
    discoveredLostArtifacts: ['lost-001', 'lost-999'],
    repairedFiles: ['file-unknown-2075', 'bad'],
    unlockedSecrets: ['secret-002', 'fake-secret'],
    unlockedClues: ['clue-lovelace-bridge', 'bad-clue'],
    visitedTerminalCode: true,
    audio: { enabled: true, muted: true, masterVolume: 4.5, ambientVolume: -2, sfxVolume: 0.7 },
  });

  assert.equal(restored.introCompleted, true);
  assert.deepEqual(restored.visitedChapters, [1, 2, 5]);
  assert.deepEqual(restored.decisions, { ch1: 'share', ch5: 'ai_leads' });
  assert.deepEqual(restored.inspectedArtifacts, ['art-ember']);
  assert.deepEqual(restored.discoveredLostArtifacts, ['lost-001']);
  assert.deepEqual(restored.repairedFiles, ['file-unknown-2075']);
  assert.deepEqual(restored.unlockedSecrets, ['secret-002']);
  assert.deepEqual(restored.unlockedClues, ['clue-lovelace-bridge']);
  assert.equal(restored.visitedTerminalCode, true);
  assert.equal(restored.audio.enabled, false, 'Audio autoplay must remain disabled across reloads');
  assert.equal(restored.audio.muted, true);
  assert.equal(restored.audio.masterVolume, 1);
  assert.equal(restored.audio.ambientVolume, 0);
  assert.equal(restored.audio.sfxVolume, 0.7);
});

await runTest('Secret unlock rules trigger in both orders and survive simulated JSON reload', () => {
  // Order A: Clockwork in Ch2 -> Terminal CODE in Ch3 -> unlocks secret-002
  const s1 = applyInspectArtifact(DEFAULT_ARCHIVE_STATE, 'art-clockwork-machine');
  assert.deepEqual(s1.newlyUnlockedSecrets, []);
  assert.ok((s1.nextState.unlockedClues ?? []).includes('clue-lovelace-bridge'));

  const s2 = applyMarkTerminalCodeVisited(s1.nextState);
  assert.equal(s2.unlockedLovelace, true);
  assert.ok(s2.nextState.unlockedSecrets.includes('secret-002'));

  // Order B: Terminal CODE first -> simulated refresh (JSON serialize + sanitize) -> Clockwork -> unlocks secret-002
  const codeFirst = applyMarkTerminalCodeVisited(DEFAULT_ARCHIVE_STATE);
  assert.equal(codeFirst.unlockedLovelace, false);
  assert.equal(codeFirst.nextState.visitedTerminalCode, true);

  const afterRefresh = sanitizeArchiveState(JSON.parse(JSON.stringify(codeFirst.nextState)));
  assert.equal(afterRefresh.visitedTerminalCode, true);

  const thenClockwork = applyInspectArtifact(afterRefresh, 'art-clockwork-machine');
  assert.deepEqual(thenClockwork.newlyUnlockedSecrets, ['secret-002']);
  assert.ok(thenClockwork.nextState.unlockedSecrets.includes('secret-002'));

  // Secret 005: inspecting all 3 Chapter 5 artifacts unlocks The Triad Pact
  const c1 = applyInspectArtifact(DEFAULT_ARCHIVE_STATE, 'art-neural-core').nextState;
  const c2 = applyInspectArtifact(c1, 'art-creative-engine').nextState;
  const c3 = applyInspectArtifact(c2, 'art-human-memory');
  assert.deepEqual(c3.newlyUnlockedSecrets, ['secret-005']);

  // Secret 003: Lost Memory 005 unlocks clue + repairing UNKNOWN_ARCHIVE_2075.LOG unlocks secret-003
  const afterLost5 = applyDiscoverLostArtifact(DEFAULT_ARCHIVE_STATE, 'lost-005');
  assert.ok((afterLost5.unlockedClues ?? []).includes('clue-2075-quorum'));
  const repaired2075 = applyRepairFile(afterLost5, 'file-unknown-2075');
  assert.equal(repaired2075.unlockedQuorum, true);
  assert.ok(repaired2075.nextState.unlockedSecrets.includes('secret-003'));
});

await runTest('Offline HTML dossier and TXT report accurately reflect progress without inventing choices', () => {
  const partialDecisions = { ch1: 'share' as const, ch3: 'open' as const };
  const state = {
    ...DEFAULT_ARCHIVE_STATE,
    decisions: partialDecisions,
    inspectedArtifacts: ['art-ember'],
    unlockedSecrets: ['secret-001'],
  };
  const outcome = resolvePathOutcome(partialDecisions);

  const live = calculateLiveHumanityIndex(partialDecisions, state);
  const ch1Label = live.decisionFactorsByChapter[1].optionLabel;
  const ch3Label = live.decisionFactorsByChapter[3].optionLabel;

  const html = buildArchiveReportHtml(state, outcome, 18, '2075-03-14T12:00:00.000Z');
  assert.ok(html.startsWith('<!doctype html>'));
  assert.ok(html.includes('@media print'));
  assert.ok(html.includes('DRAFT TELEMETRY · 2 OF 5 DECISIONS RECORDED'));
  assert.ok(html.includes(ch1Label));
  assert.ok(html.includes(ch3Label));
  assert.ok(html.includes('PENDING'));
  assert.ok(html.includes('ARC-01-A'));
  assert.ok(html.includes('The Ember'));
  assert.ok(html.includes('The Hearth Glyph'));
  assert.ok(html.includes('No corrupted terminal files reconstructed yet.'));

  const txt = buildArchiveReportText(state, outcome, 18);
  assert.ok(txt.includes('CH 02 (The Age of Machines): PENDING'));
  assert.ok(txt.includes(ch1Label));

  assert.equal(escapeHtml('<script>"test"&\'x\'</script>'), '&lt;script&gt;&quot;test&quot;&amp;&#39;x&#39;&lt;/script&gt;');
});

await runTest('Archivist (1): Chapter-based queries and contextual "this chapter" resolve accurately', () => {
  const ch2 = queryArchivist({
    question: 'Tell me about Chapter 2',
    activeChapter: 'ch1',
    state: DEFAULT_ARCHIVE_STATE,
  });
  assert.equal(ch2.ok, true);
  if (ch2.ok) {
    assert.equal(ch2.matched, true);
    assert.ok(ch2.answer.includes('Age of Machines'));
    assert.ok(ch2.answer.includes('James Watt'));
    assert.ok(ch2.answer.includes('Maximum Productivity'));
  }

  const contextualCh4 = queryArchivist({
    question: 'Explain this chapter',
    activeChapter: 'ch4',
    state: DEFAULT_ARCHIVE_STATE,
  });
  assert.equal(contextualCh4.ok, true);
  if (contextualCh4.ok) {
    assert.equal(contextualCh4.matched, true);
    assert.ok(contextualCh4.answer.includes('The Connected World'));
    assert.ok(contextualCh4.answer.includes('ARPANET'));
  }
});

await runTest('Archivist (2 & 3): Historical figure recognition works across varied phrasings', () => {
  const phrasings = [
    'Who was Ada Lovelace?',
    'Who is Ada?',
    'Tell me about Ada',
    'Why was Lovelace important?',
  ];
  for (const q of phrasings) {
    const res = queryArchivist({
      question: q,
      activeChapter: 'intro',
      state: DEFAULT_ARCHIVE_STATE,
    });
    assert.equal(res.ok, true, `Failed on phrasing: ${q}`);
    if (res.ok) {
      assert.equal(res.matched, true, `Expected match for phrasing: ${q}`);
      assert.ok(res.answer.includes('Ada Lovelace'), `Expected Ada Lovelace details for: ${q}`);
      assert.ok(res.answer.includes('Analytical Engine'));
    }
  }

  const turing = queryArchivist({
    question: 'Who was Alan Turing?',
    activeChapter: 'ch3',
    state: DEFAULT_ARCHIVE_STATE,
  });
  assert.equal(turing.ok, true);
  if (turing.ok) {
    assert.equal(turing.matched, true);
    assert.ok(turing.answer.includes('Universal Turing Machine'));
  }

  const berners = queryArchivist({
    question: 'Why does Tim Berners-Lee matter in Chapter 4?',
    activeChapter: 'ch4',
    state: DEFAULT_ARCHIVE_STATE,
  });
  assert.equal(berners.ok, true);
  if (berners.ok) {
    assert.equal(berners.matched, true);
    assert.ok(berners.answer.includes('CERN'));
    assert.ok(berners.answer.includes('royalty-free'));
  }
});

await runTest('Archivist (4): Multi-topic queries combine relevant complementary records cleanly', () => {
  const bridge = queryArchivist({
    question: 'How do Babbage and Ada Lovelace connect Chapter 2 to Chapter 3?',
    activeChapter: 'ch3',
    state: DEFAULT_ARCHIVE_STATE,
  });
  assert.equal(bridge.ok, true);
  if (bridge.ok) {
    assert.equal(bridge.matched, true);
    assert.ok(bridge.topics.length >= 2, 'Expected multiple matched topics for bridge query');
    assert.ok(bridge.answer.includes('Babbage'));
    assert.ok(bridge.answer.includes('Ada Lovelace'));
  }

  const crossTopics = queryArchivist({
    question: 'Compare ENIAC and Grace Hopper with Chapter 5 Artificial Intelligence',
    activeChapter: 'ch5',
    state: DEFAULT_ARCHIVE_STATE,
  });
  assert.equal(crossTopics.ok, true);
  if (crossTopics.ok) {
    assert.equal(crossTopics.matched, true);
    assert.ok(crossTopics.topics.length >= 2);
    assert.ok(crossTopics.answer.includes('Grace Hopper'));
  }
});

await runTest('Archivist (5): Out-of-scope or unknown queries return exact honest fallback', () => {
  const outOfScopeQueries = [
    'What is the weather in Tokyo tomorrow?',
    'Give me a recipe for chocolate cake',
    'What is Bitcoin trading at today?',
    'xkcd qzplmn',
  ];
  for (const q of outOfScopeQueries) {
    const res = queryArchivist({
      question: q,
      activeChapter: 'ch4',
      state: DEFAULT_ARCHIVE_STATE,
    });
    assert.equal(res.ok, true);
    if (res.ok) {
      assert.equal(res.matched, false, `Unexpected match for out-of-scope query: ${q}`);
      assert.equal(res.recordType, 'fallback');
      assert.equal(res.answer, ARCHIVIST_FALLBACK_MESSAGE);
    }
  }
});

await runTest('Archivist (6 & 7): Archive-state awareness reflects real discoveries and pending choices honestly', () => {
  const partialState = {
    ...DEFAULT_ARCHIVE_STATE,
    visitedChapters: [1, 2, 3] as const,
    decisions: { ch1: 'share' as const, ch3: 'privacy' as const },
    inspectedArtifacts: ['art-ember', 'art-steam-engine'],
    discoveredLostArtifacts: ['lost-001'],
    repairedFiles: ['file-mem-001'],
    unlockedSecrets: ['secret-001'],
  };

  const progressRes = queryArchivist({
    question: 'Which artifacts have I inspected and what should I explore next?',
    activeChapter: 'ch2',
    state: { ...partialState, visitedChapters: [...partialState.visitedChapters] },
    completionPercentage: 22,
  });
  assert.equal(progressRes.ok, true);
  if (progressRes.ok) {
    assert.equal(progressRes.matched, true);
    assert.ok(progressRes.answer.includes('Era Artifacts Inspected: 2/'));
    assert.ok(progressRes.answer.includes('The Ember'));
    assert.ok(progressRes.answer.includes('Antique Pocket Watch'));
  }

  const indexRes = queryArchivist({
    question: 'Analyse my Humanity Index.',
    activeChapter: 'ending',
    state: { ...partialState, visitedChapters: [...partialState.visitedChapters] },
  });
  assert.equal(indexRes.ok, true);
  if (indexRes.ok) {
    assert.equal(indexRes.matched, true);
    assert.ok(indexRes.answer.includes('2/5 decisions recorded'));
    assert.ok(indexRes.answer.includes('Pending (0 delta counted until you choose)'));
  }

  const ch4PendingRes = queryArchivist({
    question: 'What did I decide in chapter 4?',
    activeChapter: 'ch4',
    state: { ...partialState, visitedChapters: [...partialState.visitedChapters] },
  });
  assert.equal(ch4PendingRes.ok, true);
  if (ch4PendingRes.ok) {
    assert.equal(ch4PendingRes.matched, true);
    assert.ok(ch4PendingRes.answer.includes('have not made a decision in Chapter 04'));
    assert.ok(!ch4PendingRes.answer.includes('your recorded choice is'));
  }
});

await runTest('Archivist (8): Ending explanations distinguish unsealed draft state vs complete 5/5 outcome', () => {
  const incompleteOutcome = resolvePathOutcome({ ch1: 'share' });
  const draftEnding = queryArchivist({
    question: 'What does my ending reveal?',
    activeChapter: 'ending',
    state: { ...DEFAULT_ARCHIVE_STATE, decisions: { ch1: 'share' } },
    outcome: incompleteOutcome,
  });
  assert.equal(draftEnding.ok, true);
  if (draftEnding.ok) {
    assert.equal(draftEnding.matched, true);
    assert.ok(draftEnding.answer.includes('not finalized yet'));
    assert.ok(draftEnding.answer.includes('CH 02, CH 03, CH 04, CH 05'));
  }

  const fullDecisions = {
    ch1: 'share' as const,
    ch2: 'purpose' as const,
    ch3: 'open' as const,
    ch4: 'digital_privacy' as const,
    ch5: 'collaborate' as const,
  };
  const sealedOutcome = resolvePathOutcome(fullDecisions);
  const sealedEnding = queryArchivist({
    question: 'What does my ending reveal?',
    activeChapter: 'ending',
    state: { ...DEFAULT_ARCHIVE_STATE, decisions: fullDecisions },
    outcome: sealedOutcome,
  });
  assert.equal(sealedEnding.ok, true);
  if (sealedEnding.ok) {
    assert.equal(sealedEnding.matched, true);
    assert.ok(sealedEnding.answer.includes(sealedOutcome.archetypeTitle));
    assert.ok(sealedEnding.answer.includes(sealedOutcome.pathId));
  }
});

await runTest('Archivist (9 & 10): Empty input is rejected cleanly and conversation resets cleanly', () => {
  const empty = queryArchivist({
    question: '   \n\t  ',
    activeChapter: 'intro',
    state: DEFAULT_ARCHIVE_STATE,
  });
  assert.equal(empty.ok, false);
  if (!empty.ok) {
    assert.equal(empty.code, 'EMPTY_INPUT');
    assert.ok(empty.error.length > 0);
  }

  const initial = createInitialArchivistMessages();
  assert.deepEqual(initial, []);

  const afterConversation = [
    ...initial,
    { id: 'u1', role: 'user' as const, text: 'Explain this chapter.' },
    { id: 'a1', role: 'archivist' as const, text: 'Chapter 01 summary.' },
  ];
  assert.equal(afterConversation.length, 2);
  const cleared = clearArchivistConversation();
  assert.deepEqual(cleared, []);
});

console.log(`\nAll ${passed} tests passed.`);
