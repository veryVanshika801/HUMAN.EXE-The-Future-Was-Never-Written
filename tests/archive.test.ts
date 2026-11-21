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
  MAX_QUESTION_LENGTH,
  createRateLimiter,
  extractClientIp,
  handleArchivistRequest,
  resolveConfiguredModel,
} from '../server/archivistCore.ts';

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

await runTest('Archivist API enforces per-IP rate limiting and isolates separate client IPs', async () => {
  const limiter = createRateLimiter(2, 60_000);
  const mockSuccess = async () => ({ text: 'Archive verified.' });

  const r1 = await handleArchivistRequest(
    { question: 'Hello Archivist' },
    { apiKey: 'test-key', clientIp: '10.0.0.1', rateLimiter: limiter, nowMs: 1_000, generateContentFn: mockSuccess }
  );
  const r2 = await handleArchivistRequest(
    { question: 'Second question' },
    { apiKey: 'test-key', clientIp: '10.0.0.1', rateLimiter: limiter, nowMs: 2_000, generateContentFn: mockSuccess }
  );
  const r3Blocked = await handleArchivistRequest(
    { question: 'Third question blocked' },
    { apiKey: 'test-key', clientIp: '10.0.0.1', rateLimiter: limiter, nowMs: 3_000, generateContentFn: mockSuccess }
  );
  const otherIpOk = await handleArchivistRequest(
    { question: 'Different IP stays allowed' },
    { apiKey: 'test-key', clientIp: '10.0.0.2', rateLimiter: limiter, nowMs: 3_000, generateContentFn: mockSuccess }
  );
  const afterWindow = await handleArchivistRequest(
    { question: 'Window expired' },
    { apiKey: 'test-key', clientIp: '10.0.0.1', rateLimiter: limiter, nowMs: 65_000, generateContentFn: mockSuccess }
  );

  assert.equal(r1.status, 200);
  assert.equal(r2.status, 200);
  assert.equal(r3Blocked.status, 429);
  assert.equal(r3Blocked.body.ok, false);
  if (!r3Blocked.body.ok) {
    assert.equal(r3Blocked.body.code, 'RATE_LIMITED');
    assert.ok((r3Blocked.body.retryAfterSeconds ?? 0) >= 1);
  }
  assert.equal(otherIpOk.status, 200);
  assert.equal(afterWindow.status, 200);
  assert.equal(extractClientIp({ 'x-forwarded-for': '203.0.113.9, 10.0.0.1' }), '203.0.113.9');
});

await runTest('Archivist API rejects invalid, malformed, empty, and oversized payloads', async () => {
  const nonObj = await handleArchivistRequest([] as unknown as { question: string }, 'fake-key');
  assert.equal(nonObj.status, 400);

  const emptyQ = await handleArchivistRequest({ question: '   ' }, 'fake-key');
  assert.equal(emptyQ.status, 400);

  const longQ = await handleArchivistRequest({ question: 'a'.repeat(MAX_QUESTION_LENGTH + 1) }, 'fake-key');
  assert.equal(longQ.status, 400);

  const badHistory = await handleArchivistRequest(
    { question: 'Valid?', history: 'not-an-array' },
    'fake-key'
  );
  assert.equal(badHistory.status, 400);

  const badRole = await handleArchivistRequest(
    { question: 'Valid?', history: [{ role: 'system', text: 'hijack' }] },
    'fake-key'
  );
  assert.equal(badRole.status, 400);

  const badContext = await handleArchivistRequest(
    { question: 'Valid?', archiveContext: 'bad-context-string' },
    'fake-key'
  );
  assert.equal(badContext.status, 400);

  const hugePayload = await handleArchivistRequest(
    {
      question: 'Valid?',
      history: Array.from({ length: 20 }, (_, i) => ({
        role: i % 2 === 0 ? 'user' : 'model',
        text: 'x'.repeat(2500),
      })),
    },
    'fake-key'
  );
  assert.equal(hugePayload.status, 413);
  if (!hugePayload.body.ok) {
    assert.equal(hugePayload.body.code, 'PAYLOAD_TOO_LARGE');
  }
});

await runTest('Archivist API handles missing keys, invalid models, quotas, and sanitizes upstream errors', async () => {
  const noKey = await handleArchivistRequest({ question: 'Tell me about Chapter 1' }, '');
  assert.equal(noKey.status, 503);
  if (!noKey.body.ok) {
    assert.equal(noKey.body.code, 'MISSING_API_KEY');
    assert.equal(noKey.body.configured, false);
  }

  assert.equal(resolveConfiguredModel('gemini-4-hydrogen').valid, true);
  assert.equal(resolveConfiguredModel('gemini-unknown-99').valid, false);

  const badModelConfig = await handleArchivistRequest(
    { question: 'Tell me about Chapter 1' },
    { apiKey: 'test-key', modelOverride: 'unsupported-model-x' }
  );
  assert.equal(badModelConfig.status, 500);
  if (!badModelConfig.body.ok) {
    assert.equal(badModelConfig.body.code, 'INVALID_MODEL_CONFIG');
  }

  const quotaHit = await handleArchivistRequest(
    { question: 'Analyze 2075' },
    {
      apiKey: 'test-key',
      generateContentFn: async () => {
        const e = new Error('RESOURCE_EXHAUSTED: Quota exceeded for internal project 999') as Error & { status?: number };
        e.status = 429;
        throw e;
      },
    }
  );
  assert.equal(quotaHit.status, 429);
  if (!quotaHit.body.ok) {
    assert.equal(quotaHit.body.code, 'QUOTA_EXCEEDED');
    assert.ok(!quotaHit.body.error.includes('999'));
  }

  const badAuth = await handleArchivistRequest(
    { question: 'Analyze 2075' },
    {
      apiKey: 'test-key',
      generateContentFn: async () => {
        const e = new Error('API_KEY_INVALID for key AIzaFakeSecret123') as Error & { status?: number };
        e.status = 403;
        throw e;
      },
    }
  );
  assert.equal(badAuth.status, 503);
  if (!badAuth.body.ok) {
    assert.equal(badAuth.body.code, 'INVALID_API_KEY');
    assert.ok(!badAuth.body.error.includes('AIzaFakeSecret123'));
  }

  const upstreamLeakCheck = await handleArchivistRequest(
    { question: 'Analyze 2075' },
    {
      apiKey: 'test-key',
      generateContentFn: async () => {
        throw new Error('ECONNRESET https://secret-internal-host.internal/v1 sk-raw-secret');
      },
    }
  );
  assert.equal(upstreamLeakCheck.status, 502);
  if (!upstreamLeakCheck.body.ok) {
    assert.equal(upstreamLeakCheck.body.code, 'UPSTREAM_ERROR');
    assert.ok(!upstreamLeakCheck.body.error.includes('secret-internal-host'));
    assert.ok(!upstreamLeakCheck.body.error.includes('sk-raw-secret'));
  }

  const emptyOutput = await handleArchivistRequest(
    { question: 'Analyze 2075' },
    { apiKey: 'test-key', generateContentFn: async () => ({ text: '   ' }) }
  );
  assert.equal(emptyOutput.status, 502);
  if (!emptyOutput.body.ok) {
    assert.equal(emptyOutput.body.code, 'UPSTREAM_ERROR');
  }
});

console.log(`\nAll ${passed} tests passed.`);
