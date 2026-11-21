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
  sanitizeArchiveState,
} from '../src/hooks/useArchiveState.ts';
import { handleArchivistRequest } from '../server/archivistCore.ts';

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

await runTest('sanitizeArchiveState validates corrupted localStorage and preserves cross-refresh code flag', () => {
  const restored = sanitizeArchiveState({
    introCompleted: true,
    visitedChapters: [1, 2, 99, 'bad', 2, 5],
    decisions: { ch1: 'share', ch2: 'invalid_choice', ch5: 'ai_leads' },
    inspectedArtifacts: ['art-ember', 'unknown-id', 'art-ember'],
    discoveredLostArtifacts: ['lost-001', 'lost-999'],
    repairedFiles: ['file-unknown-2075', 'bad'],
    unlockedSecrets: ['secret-002', 'fake-secret'],
    audio: { enabled: true, masterVolume: 4.5, ambientVolume: -2, sfxVolume: 0.7 },
  });

  assert.deepEqual(restored.visitedChapters, [1, 2, 5]);
  assert.deepEqual(restored.decisions, { ch1: 'share', ch5: 'ai_leads' });
  assert.deepEqual(restored.inspectedArtifacts, ['art-ember']);
  assert.deepEqual(restored.discoveredLostArtifacts, ['lost-001']);
  assert.deepEqual(restored.repairedFiles, ['file-unknown-2075']);
  assert.deepEqual(restored.unlockedSecrets, ['secret-002']);
  assert.equal(restored.visitedTerminalCode, true, 'secret-002 implies terminal code was visited');
  assert.equal(restored.audio.enabled, false, 'Audio autoplay must remain disabled across reloads');
  assert.equal(restored.audio.masterVolume, 1);
  assert.equal(restored.audio.ambientVolume, 0);
  assert.equal(restored.audio.sfxVolume, 0.7);
});

await runTest('Archivist AI endpoint returns honest 503 setup message when GEMINI_API_KEY is absent', async () => {
  const res = await handleArchivistRequest({ question: 'Tell me about Chapter 1' }, '');
  assert.equal(res.status, 503);
  assert.equal(res.body.ok, false);
  if (!res.body.ok) {
    assert.equal(res.body.code, 'MISSING_API_KEY');
    assert.equal(res.body.configured, false);
  }

  const badInput = await handleArchivistRequest({ question: '   ' }, 'fake-nonempty-key');
  assert.equal(badInput.status, 400);
  assert.equal(badInput.body.ok, false);
});

console.log(`\nAll ${passed} tests passed.`);
