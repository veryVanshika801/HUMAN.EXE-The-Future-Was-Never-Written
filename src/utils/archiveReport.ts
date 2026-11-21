import { ArchiveProgressState, PathOutcome } from '../types/archive';
import { CHAPTERS } from '../data/chapters';
import {
  ARTIFACTS,
  CORRUPTED_FILES,
  LOST_ARTIFACTS,
  SECRET_MEMORIES,
} from '../data/artifacts';
import { calculateLiveHumanityIndex } from '../logic/decisionEngine';
import { JOURNAL_CLUES } from '../hooks/useArchiveState';

export function escapeHtml(raw: string): string {
  return raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatDelta(n: number): string {
  return n >= 0 ? `+${n}` : `${n}`;
}

export function buildArchiveReportText(
  state: ArchiveProgressState,
  outcome: PathOutcome,
  completionPercentage: number
): string {
  const humanityIndex = calculateLiveHumanityIndex(state.decisions, state);
  const inspectedItems = ARTIFACTS.filter((a) => state.inspectedArtifacts.includes(a.id));
  const lostItems = LOST_ARTIFACTS.filter((l) => state.discoveredLostArtifacts.includes(l.id));
  const repairedItems = CORRUPTED_FILES.filter((f) => state.repairedFiles.includes(f.id));
  const secretItems = SECRET_MEMORIES.filter((s) => state.unlockedSecrets.includes(s.id));
  const clueItems = JOURNAL_CLUES.filter((c) => (state.unlockedClues ?? []).includes(c.id));

  const decisionLines = CHAPTERS.map((ch) => {
    const factor = humanityIndex.decisionFactorsByChapter[ch.number];
    if (factor.status === 'pending') {
      return `- CH 0${ch.number} (${ch.title}): PENDING — Not decided yet`;
    }
    return `- CH 0${ch.number} (${ch.title}): ${factor.optionLabel} [INN ${formatDelta(
      factor.innovationDelta
    )}, CON ${formatDelta(factor.connectionDelta)}, AGN ${formatDelta(factor.agencyDelta)}]`;
  });

  const lines = [
    'HUMAN.EXE — ARCHIVIST OFFICIAL DOSSIER (2075)',
    '=============================================',
    `Status: ${
      outcome.isComplete
        ? `FINALIZED ARCHIVE RECORD (${outcome.pathIndex} / 48)`
        : `DRAFT TELEMETRY (${outcome.selectedCount} / 5 DECISIONS RECORDED)`
    }`,
    `Archive Profile ID: ${outcome.pathId}`,
    `Decision Signature: ${outcome.signature}`,
    `Classification: ${outcome.archetypeTitle}`,
    `Path Title: ${outcome.pathTitle}`,
    `Overall Archive Completion: ${completionPercentage}%`,
    '',
    '1. RECORDED CHAPTER DECISIONS',
    ...decisionLines,
    '',
    '2. HUMANITY INDEX BREAKDOWN',
    `- Baseline Calibration: Innovation ${humanityIndex.baselineScores.innovation}%, Connection ${humanityIndex.baselineScores.connection}%, Human Agency ${humanityIndex.baselineScores.humanAgency}%`,
    `- Exploration Bonuses: Innovation +${humanityIndex.explorationBonuses.innovation}% (${state.inspectedArtifacts.length} artifacts), Connection +${humanityIndex.explorationBonuses.connection}% (${state.discoveredLostArtifacts.length} lost memories, ${state.unlockedSecrets.length} secrets), Agency +${humanityIndex.explorationBonuses.humanAgency}% (${state.repairedFiles.length} repaired files)`,
    `- Composite Result -> Innovation: ${humanityIndex.innovation}% | Connection: ${humanityIndex.connection}% | Human Agency: ${humanityIndex.humanAgency}% | Overall Balance: ${humanityIndex.overallScore}%`,
    '',
    '3. NARRATIVE SYNTHESIS',
    outcome.historicalSummary,
    '',
    outcome.futureDescription,
    '',
    outcome.finalArchiveMessage,
    '',
    '4. RECOVERED EXHIBITS & FILES',
    `Artifacts Inspected (${inspectedItems.length}/${ARTIFACTS.length}): ${
      inspectedItems.length > 0
        ? inspectedItems.map((a) => `${a.accessionCode} ${a.name}`).join('; ')
        : 'None inspected yet'
    }`,
    `Lost Memories Discovered (${lostItems.length}/${LOST_ARTIFACTS.length}): ${
      lostItems.length > 0
        ? lostItems.map((l) => `${l.memoryCode} ${l.title}`).join('; ')
        : 'None recovered yet'
    }`,
    `Corrupted Files Repaired (${repairedItems.length}/${CORRUPTED_FILES.length}): ${
      repairedItems.length > 0
        ? repairedItems.map((f) => f.filename).join('; ')
        : 'None repaired yet'
    }`,
    `Secret Archives Unlocked (${secretItems.length}/${SECRET_MEMORIES.length}): ${
      secretItems.length > 0
        ? secretItems.map((s) => `${s.code} ${s.title}`).join('; ')
        : 'None unlocked yet'
    }`,
    `Journal Clues Logged (${clueItems.length}/${JOURNAL_CLUES.length}): ${
      clueItems.length > 0
        ? clueItems.map((c) => `${c.code} ${c.title}`).join('; ')
        : 'None logged yet'
    }`,
    '',
    'Technology is what we build. The future is what we choose.',
    'HUMAN.EXE — Digital Archaeology Museum',
  ];

  return lines.join('\n');
}

export function buildArchiveReportHtml(
  state: ArchiveProgressState,
  outcome: PathOutcome,
  completionPercentage: number,
  generatedAtIso = new Date().toISOString()
): string {
  const humanityIndex = calculateLiveHumanityIndex(state.decisions, state);
  const inspectedItems = ARTIFACTS.filter((a) => state.inspectedArtifacts.includes(a.id));
  const lostItems = LOST_ARTIFACTS.filter((l) => state.discoveredLostArtifacts.includes(l.id));
  const repairedItems = CORRUPTED_FILES.filter((f) => state.repairedFiles.includes(f.id));
  const secretItems = SECRET_MEMORIES.filter((s) => state.unlockedSecrets.includes(s.id));
  const clueItems = JOURNAL_CLUES.filter((c) => (state.unlockedClues ?? []).includes(c.id));

  const decisionRowsHtml = CHAPTERS.map((ch) => {
    const factor = humanityIndex.decisionFactorsByChapter[ch.number];
    const memoryTag = outcome.unlockedMemoriesByChapter[ch.number];
    const isSelected = factor.status === 'selected';
    return `
      <tr>
        <td class="mono">CH 0${ch.number}</td>
        <td><strong>${escapeHtml(ch.title)}</strong><div class="muted">${escapeHtml(ch.period)}</div></td>
        <td>${
          isSelected
            ? `<span class="badge badge-ok">SELECTED</span>`
            : `<span class="badge badge-pending">PENDING</span>`
        }</td>
        <td>${
          isSelected
            ? `<strong>${escapeHtml(factor.optionLabel)}</strong>${
                memoryTag ? `<div class="muted">${escapeHtml(memoryTag)}</div>` : ''
              }`
            : `<span class="muted">No decision recorded</span>`
        }</td>
        <td class="mono">${
          isSelected
            ? `INN ${formatDelta(factor.innovationDelta)} · CON ${formatDelta(
                factor.connectionDelta
              )} · AGN ${formatDelta(factor.agencyDelta)}`
            : '—'
        }</td>
      </tr>`;
  }).join('');

  const renderDiscoveryList = (items: string[], emptyLabel: string) => {
    if (items.length === 0) {
      return `<p class="muted empty-note">${escapeHtml(emptyLabel)}</p>`;
    }
    return `<ul>${items.map((entry) => `<li>${entry}</li>`).join('')}</ul>`;
  };

  const statusLabel = outcome.isComplete
    ? `FINALIZED ARCHIVE RECORD · PATH ${String(outcome.pathIndex).padStart(2, '0')} OF 48`
    : `DRAFT TELEMETRY · ${outcome.selectedCount} OF 5 DECISIONS RECORDED`;

  const generatedDisplay = escapeHtml(generatedAtIso.slice(0, 19).replace('T', ' ') + ' UTC');

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>HUMAN.EXE Archivist Dossier — ${escapeHtml(outcome.pathId)}</title>
  <style>
    :root {
      --bg: #f6f7f5;
      --paper: #ffffff;
      --ink: #111619;
      --muted: #526067;
      --line: #d7ddd9;
      --accent: #2c6e49;
      --amber: #b35c14;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 28px 18px 48px;
      background: var(--bg);
      color: var(--ink);
      font-family: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      line-height: 1.55;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .dossier {
      max-width: 920px;
      margin: 0 auto;
      background: var(--paper);
      border: 1px solid var(--line);
      border-radius: 10px;
      padding: 36px 40px;
    }
    .mono {
      font-family: "IBM Plex Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      font-size: 12px;
    }
    .muted {
      color: var(--muted);
      font-size: 12px;
    }
    .masthead {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      align-items: flex-start;
      gap: 16px;
      padding-bottom: 20px;
      border-bottom: 2px solid var(--ink);
    }
    .kicker {
      font-size: 11px;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: var(--accent);
      font-weight: 600;
    }
    h1 {
      margin: 6px 0 4px;
      font-family: Georgia, "Times New Roman", serif;
      font-size: 32px;
      line-height: 1.12;
      color: var(--ink);
    }
    h2 {
      margin: 26px 0 12px;
      font-size: 13px;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: var(--muted);
      border-bottom: 1px solid var(--line);
      padding-bottom: 6px;
    }
    .meta-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
      gap: 12px;
      margin-top: 18px;
    }
    .meta-box {
      padding: 12px 14px;
      border: 1px solid var(--line);
      border-radius: 6px;
      background: #fafbfa;
    }
    .meta-label {
      font-size: 10px;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: var(--muted);
    }
    .meta-value {
      margin-top: 4px;
      font-weight: 600;
      font-size: 15px;
    }
    blockquote {
      margin: 18px 0;
      padding: 14px 18px;
      border-left: 3px solid var(--accent);
      background: #f3f7f4;
      font-family: Georgia, "Times New Roman", serif;
      font-size: 18px;
      font-style: italic;
    }
    .index-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 14px;
    }
    .index-card {
      border: 1px solid var(--line);
      border-radius: 6px;
      padding: 14px;
    }
    .index-score {
      font-size: 26px;
      font-weight: 700;
      margin: 4px 0;
    }
    .bar-track {
      height: 7px;
      background: #e6ebe8;
      border-radius: 999px;
      overflow: hidden;
      margin: 8px 0;
    }
    .bar-fill {
      height: 100%;
      border-radius: 999px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
    }
    th, td {
      text-align: left;
      vertical-align: top;
      padding: 10px 8px;
      border-bottom: 1px solid var(--line);
    }
    th {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--muted);
    }
    .badge {
      display: inline-block;
      padding: 2px 7px;
      border-radius: 4px;
      font-size: 10px;
      font-weight: 600;
      letter-spacing: 0.06em;
    }
    .badge-ok {
      background: #e4f2e8;
      color: var(--accent);
      border: 1px solid #b6d8c0;
    }
    .badge-pending {
      background: #fdf1e6;
      color: var(--amber);
      border: 1px solid #f0cba8;
    }
    .discovery-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
      gap: 14px;
    }
    .discovery-card {
      border: 1px solid var(--line);
      border-radius: 6px;
      padding: 14px;
    }
    .discovery-card h3 {
      margin: 0 0 8px;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--ink);
    }
    .discovery-card ul {
      margin: 0;
      padding-left: 18px;
      font-size: 12.5px;
    }
    .discovery-card li {
      margin-bottom: 5px;
    }
    .empty-note {
      margin: 4px 0 0;
      font-style: italic;
    }
    .print-toolbar {
      max-width: 920px;
      margin: 0 auto 14px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
    }
    .print-btn {
      appearance: none;
      border: 1px solid var(--ink);
      background: var(--ink);
      color: #ffffff;
      padding: 8px 14px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
    }
    footer {
      margin-top: 28px;
      padding-top: 16px;
      border-top: 1px solid var(--line);
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      gap: 8px;
      font-size: 12px;
      color: var(--muted);
    }
    @media print {
      body {
        background: #ffffff;
        padding: 0;
      }
      .print-toolbar {
        display: none !important;
      }
      .dossier {
        border: none;
        border-radius: 0;
        padding: 0;
        max-width: 100%;
      }
      .index-card, .discovery-card, tr {
        break-inside: avoid;
      }
    }
  </style>
</head>
<body>
  <div class="print-toolbar">
    <span class="mono muted">OFFLINE ARCHIVAL DOSSIER · SELF-CONTAINED HTML RECORD</span>
    <button type="button" class="print-btn" onclick="window.print()">Print / Save PDF</button>
  </div>

  <main class="dossier">
    <header class="masthead">
      <div>
        <div class="kicker mono">${escapeHtml(statusLabel)}</div>
        <h1>${escapeHtml(outcome.archetypeTitle)}</h1>
        <div style="font-size: 15px; font-weight: 500; color: var(--muted);">${escapeHtml(
          outcome.pathTitle
        )}</div>
      </div>
      <div class="mono" style="text-align: right;">
        <div><strong>${escapeHtml(outcome.pathId)}</strong></div>
        <div class="muted">Signature: ${escapeHtml(outcome.signature)}</div>
        <div class="muted">Generated: ${generatedDisplay}</div>
      </div>
    </header>

    <section class="meta-grid" aria-label="Archive Telemetry Summary">
      <div class="meta-box">
        <div class="meta-label mono">Archive Completion</div>
        <div class="meta-value mono">${completionPercentage}%</div>
      </div>
      <div class="meta-box">
        <div class="meta-label mono">Decisions Sealed</div>
        <div class="meta-value mono">${outcome.selectedCount} / 5</div>
      </div>
      <div class="meta-box">
        <div class="meta-label mono">Overall Balance</div>
        <div class="meta-value mono">${humanityIndex.overallScore}%</div>
      </div>
      <div class="meta-box">
        <div class="meta-label mono">Discoveries Logged</div>
        <div class="meta-value mono">${
          inspectedItems.length + lostItems.length + repairedItems.length + secretItems.length
        } Exhibits</div>
      </div>
    </section>

    <blockquote>“${escapeHtml(outcome.archetypeQuote)}”</blockquote>

    <p>${escapeHtml(outcome.futureDescription)}</p>
    <p class="muted" style="font-size: 13.5px;">${escapeHtml(outcome.historicalSummary)}</p>
    <p style="font-weight: 600; color: var(--accent);">${escapeHtml(outcome.finalArchiveMessage)}</p>

    <h2 class="mono">1. The Humanity Index Breakdown</h2>
    <section class="index-grid" aria-label="Humanity Index Scores">
      <div class="index-card">
        <div class="meta-label mono">Innovation</div>
        <div class="index-score mono">${humanityIndex.innovation}%</div>
        <div class="bar-track"><div class="bar-fill" style="width: ${humanityIndex.innovation}%; background: #d9822b;"></div></div>
        <div class="muted">Baseline ${humanityIndex.baselineScores.innovation}% · Artifact bonus +${humanityIndex.explorationBonuses.innovation}%</div>
      </div>
      <div class="index-card">
        <div class="meta-label mono">Connection</div>
        <div class="index-score mono">${humanityIndex.connection}%</div>
        <div class="bar-track"><div class="bar-fill" style="width: ${humanityIndex.connection}%; background: #4f646f;"></div></div>
        <div class="muted">Baseline ${humanityIndex.baselineScores.connection}% · Memory/Secret bonus +${humanityIndex.explorationBonuses.connection}%</div>
      </div>
      <div class="index-card">
        <div class="meta-label mono">Human Agency</div>
        <div class="index-score mono">${humanityIndex.humanAgency}%</div>
        <div class="bar-track"><div class="bar-fill" style="width: ${humanityIndex.humanAgency}%; background: #2c6e49;"></div></div>
        <div class="muted">Baseline ${humanityIndex.baselineScores.humanAgency}% · Repaired file bonus +${humanityIndex.explorationBonuses.humanAgency}%</div>
      </div>
    </section>

    <h2 class="mono">2. Recorded Chapter Decisions (${outcome.selectedCount}/5)</h2>
    <table>
      <thead>
        <tr>
          <th>Chapter</th>
          <th>Historical Era</th>
          <th>Status</th>
          <th>Recorded Choice</th>
          <th>Index Deltas</th>
        </tr>
      </thead>
      <tbody>
        ${decisionRowsHtml}
      </tbody>
    </table>

    <h2 class="mono">3. Verified Discoveries &amp; Recovered Evidence</h2>
    <section class="discovery-grid" aria-label="Discovered Archive Exhibits">
      <div class="discovery-card">
        <h3 class="mono">Era Artifacts Inspected (${inspectedItems.length}/${ARTIFACTS.length})</h3>
        ${renderDiscoveryList(
          inspectedItems.map(
            (a) =>
              `<span class="mono">${escapeHtml(a.accessionCode)}</span> — <strong>${escapeHtml(
                a.name
              )}</strong> (${escapeHtml(a.era)})`
          ),
          'No 3D era artifacts inspected during this session.'
        )}
      </div>

      <div class="discovery-card">
        <h3 class="mono">Lost Memories Recovered (${lostItems.length}/${LOST_ARTIFACTS.length})</h3>
        ${renderDiscoveryList(
          lostItems.map(
            (l) =>
              `<span class="mono">${escapeHtml(l.memoryCode)}</span> — <strong>${escapeHtml(
                l.title
              )}</strong> (${escapeHtml(l.locationLabel)})`
          ),
          'No hidden Lost Memories recovered yet.'
        )}
      </div>

      <div class="discovery-card">
        <h3 class="mono">Corrupted Files Repaired (${repairedItems.length}/${CORRUPTED_FILES.length})</h3>
        ${renderDiscoveryList(
          repairedItems.map(
            (f) =>
              `<span class="mono">${escapeHtml(f.filename)}</span> — ${escapeHtml(
                f.hiddenMemoryTitle
              )}`
          ),
          'No corrupted terminal files reconstructed yet.'
        )}
      </div>

      <div class="discovery-card">
        <h3 class="mono">Secret Archives &amp; Clues (${secretItems.length}/${SECRET_MEMORIES.length} secrets · ${clueItems.length}/${JOURNAL_CLUES.length} clues)</h3>
        ${renderDiscoveryList(
          [
            ...secretItems.map(
              (s) =>
                `<span class="mono">${escapeHtml(s.code)}</span> — <strong>${escapeHtml(
                  s.title
                )}</strong>`
            ),
            ...clueItems.map(
              (c) =>
                `<span class="mono">${escapeHtml(c.code)}</span> — ${escapeHtml(c.title)}`
            ),
          ],
          'No secret archives or journal clues unlocked yet.'
        )}
      </div>
    </section>

    <footer>
      <span>Technology is what we build. The future is what we choose.</span>
      <span class="mono">HUMAN.EXE · 2075 Digital Archaeology Museum</span>
    </footer>
  </main>
</body>
</html>`;
}
