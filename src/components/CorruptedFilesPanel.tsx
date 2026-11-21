import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Lock,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Move,
  Check,
  HelpCircle,
} from 'lucide-react';
import { CORRUPTED_FILES, LOST_ARTIFACTS } from '../data/artifacts';
import { CorruptedFileItem } from '../types/archive';
import { audioEngine } from '../logic/audioEngine';

interface CorruptedFilesPanelProps {
  repairedFiles: string[];
  discoveredLostArtifacts: string[];
  onRepairFile: (fileId: string) => void;
  filterChapter?: number;
  reducedMotion?: boolean;
  searchQuery?: string;
}

const CIPHER_FRAGMENTS = [
  '0x7F [BAD_SECTOR] :: PARITY_ERR',
  '0x9A [FRAG_MISSING] :: CRC_FAIL',
  '0x3C [UNINDEXED_BLK] :: RETRY',
  '0xE2 [SECTOR_DRIFT] :: CHECKSUM',
];

interface VisualTraceProps {
  file: CorruptedFileItem;
  isRepaired: boolean;
  isRepairing: boolean;
  isLocked: boolean;
  matchedCount: number;
  progress: number;
  tick: number;
}

const CorruptedVisualTrace: React.FC<VisualTraceProps> = ({
  file,
  isRepaired,
  isRepairing,
  isLocked,
  matchedCount,
  progress,
  tick,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#06080A';
    ctx.fillRect(0, 0, w, h);

    // Background archival calibration grid
    ctx.strokeStyle = 'rgba(191, 199, 203, 0.08)';
    ctx.lineWidth = 1;
    for (let x = 24; x < w; x += 32) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }

    const seed = file.id.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
    const ratio = isRepaired
      ? 1
      : isRepairing
      ? progress / 100
      : matchedCount / Math.max(1, file.fragments.length);
    const cleanCutoff = ratio * w;

    if (isLocked) {
      ctx.fillStyle = 'rgba(137, 147, 152, 0.22)';
      for (let x = 12; x < w - 12; x += 14) {
        ctx.fillRect(x, h * 0.44, 6, 4);
      }
      return;
    }

    if (file.visualType === 'photo_matrix') {
      // Visual photographic / matrix grid reconstruction
      const cellW = 10;
      const cellH = 8;
      for (let x = 8; x < w - 8; x += cellW) {
        for (let y = 6; y < h - 6; y += cellH) {
          const v = Math.abs(Math.sin(x * 0.09 + y * 0.14 + seed));
          if (x < cleanCutoff || isRepaired) {
            const bright = Math.floor(85 + v * 130);
            ctx.fillStyle = `rgba(${Math.floor(bright * 0.72)}, ${bright}, ${Math.floor(bright * 0.78)}, 0.85)`;
            ctx.fillRect(x, y, cellW - 2, cellH - 2);
          } else {
            const glitchShift = ((seed + tick * 7 + y) % 5) - 2;
            ctx.fillStyle = v > 0.65 ? 'rgba(201, 93, 58, 0.55)' : 'rgba(217, 130, 43, 0.25)';
            ctx.fillRect(x + glitchShift, y, cellW - 3, cellH - 3);
          }
        }
      }
      return;
    }

    if (file.visualType === 'document_fragment') {
      // Redacted manuscript lines un-scrambling progressively
      for (let row = 0; row < 4; row++) {
        const y = 10 + row * 12;
        for (let x = 10; x < w - 16; x += 22) {
          const segW = 12 + ((x + row * 7 + seed) % 8);
          if (x < cleanCutoff || isRepaired) {
            ctx.fillStyle = isRepaired ? '#A6C7A9' : '#D9822B';
            ctx.fillRect(x, y, segW, 4);
          } else {
            const jitter = Math.sin(x * 0.3 + tick + row) * 2;
            ctx.fillStyle = 'rgba(201, 93, 58, 0.5)';
            ctx.fillRect(x, y + jitter, segW * 0.7, 3);
          }
        }
      }
      return;
    }

    // signal_trace waveform synchronization
    ctx.strokeStyle = isRepaired ? '#A6C7A9' : 'rgba(166, 199, 169, 0.45)';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    for (let x = 0; x < w; x += 4) {
      const freq = 0.035 + (seed % 5) * 0.008;
      const coherentY = h * 0.5 + Math.sin(x * freq + seed) * (h * 0.28) * Math.cos(x * 0.014);
      const corruptY =
        h * 0.5 + Math.sin(x * 0.4 + seed + tick * 2.1) * (h * 0.35);
      const y = x <= cleanCutoff || isRepaired ? coherentY : corruptY;
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    if (isRepaired) {
      ctx.fillStyle = '#A6C7A9';
      for (let nodeX = 24; nodeX < w - 16; nodeX += 48) {
        const y =
          h * 0.5 +
          Math.sin(nodeX * (0.035 + (seed % 5) * 0.008) + seed) *
            (h * 0.28) *
            Math.cos(nodeX * 0.014);
        ctx.fillRect(nodeX - 2, y - 2, 4, 4);
      }
    }
  }, [file.id, file.visualType, file.fragments.length, isRepaired, isRepairing, isLocked, matchedCount, progress, tick]);

  return (
    <canvas
      ref={canvasRef}
      width={360}
      height={58}
      aria-label={isRepaired ? 'Restored archival media trace' : 'Fragmented archival media trace'}
      className="w-full h-14 rounded border border-white/10 block mt-2.5"
    />
  );
};

export const CorruptedFilesPanel: React.FC<CorruptedFilesPanelProps> = ({
  repairedFiles,
  discoveredLostArtifacts,
  onRepairFile,
  filterChapter,
  reducedMotion = false,
  searchQuery = '',
}) => {
  const [activeLabFileId, setActiveLabFileId] = useState<string | null>(null);
  const [matchedSlots, setMatchedSlots] = useState<Record<string, string[]>>({});
  const [pickedFragmentId, setPickedFragmentId] = useState<string | null>(null);
  const [mismatchMessage, setMismatchMessage] = useState<string | null>(null);

  const [repairingId, setRepairingId] = useState<string | null>(null);
  const [repairProgress, setRepairProgress] = useState(0);
  const [expandedFileId, setExpandedFileId] = useState<string | null>(null);
  const [cipherTick, setCipherTick] = useState(0);
  const restoreTimersRef = useRef<number[]>([]);

  useEffect(() => {
    return () => {
      restoreTimersRef.current.forEach((id) => window.clearTimeout(id));
      restoreTimersRef.current = [];
    };
  }, []);

  useEffect(() => {
    if (reducedMotion) return;
    const id = window.setInterval(() => {
      setCipherTick((t) => (t + 1) % CIPHER_FRAGMENTS.length);
    }, 1100);
    return () => window.clearInterval(id);
  }, [reducedMotion]);

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const files = CORRUPTED_FILES.filter((f) => {
    if (filterChapter && f.chapter !== filterChapter) return false;
    if (!normalizedQuery) return true;
    return (
      f.filename.toLowerCase().includes(normalizedQuery) ||
      f.hiddenMemoryTitle.toLowerCase().includes(normalizedQuery) ||
      f.hiddenMemory.toLowerCase().includes(normalizedQuery) ||
      f.technologicalFact.toLowerCase().includes(normalizedQuery)
    );
  });

  // Deterministic per-file shuffled fragment order so puzzle feels organic cleanly without jumping
  const shuffledFragmentsByFile = useMemo(() => {
    const map = new Map<string, CorruptedFileItem['fragments']>();
    CORRUPTED_FILES.forEach((f) => {
      const list = [...f.fragments];
      if (list.length === 3) {
        map.set(f.id, [list[2], list[0], list[1]]);
      } else {
        map.set(f.id, list);
      }
    });
    return map;
  }, []);

  const triggerFinalRestore = (file: CorruptedFileItem) => {
    if (repairingId || repairedFiles.includes(file.id)) return;
    audioEngine.playEraSound('glitch');
    setRepairingId(file.id);
    setRepairProgress(reducedMotion ? 50 : 22);

    const step1 = reducedMotion ? 40 : 220;
    const step2 = reducedMotion ? 80 : 460;
    const doneMs = reducedMotion ? 120 : 740;

    restoreTimersRef.current.forEach((id) => window.clearTimeout(id));
    restoreTimersRef.current = [
      window.setTimeout(() => setRepairProgress(60), step1),
      window.setTimeout(() => setRepairProgress(90), step2),
      window.setTimeout(() => {
        onRepairFile(file.id);
        setRepairingId(null);
        setRepairProgress(0);
        setActiveLabFileId(null);
        setExpandedFileId(file.id);
      }, doneMs),
    ];
  };

  const handlePlaceFragment = (file: CorruptedFileItem, expectedFragId: string, candidateFragId: string) => {
    const currentMatched = matchedSlots[file.id] ?? [];
    if (currentMatched.includes(expectedFragId)) return;

    if (expectedFragId === candidateFragId) {
      audioEngine.playEraSound('fragmentSnap');
      setMismatchMessage(null);
      setPickedFragmentId(null);
      const next = [...currentMatched, expectedFragId];
      setMatchedSlots((prev) => ({ ...prev, [file.id]: next }));

      if (next.length >= file.fragments.length) {
        triggerFinalRestore(file);
      }
    } else {
      audioEngine.playEraSound('glitch');
      setMismatchMessage('Fragment signature mismatch — align the block code to its matching sector.');
    }
  };

  const handleAutoAlignNext = (file: CorruptedFileItem) => {
    const currentMatched = matchedSlots[file.id] ?? [];
    const nextUnmatched = file.fragments.find((f) => !currentMatched.includes(f.id));
    if (!nextUnmatched) return;
    handlePlaceFragment(file, nextUnmatched.id, nextUnmatched.id);
  };

  return (
    <div className="bg-[#080C0A] border border-[#A6C7A9]/25 rounded-lg p-4 sm:p-5 font-mono-archival">
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#A6C7A9]/20">
        <div>
          <div className="text-xs text-[#A6C7A9]">
            MEMORY RECONSTRUCTION LAB · {repairedFiles.length} / {CORRUPTED_FILES.length} RESTORED
          </div>
          <div className="text-[11px] text-[#899398] font-sans mt-0.5">
            Drag or select fragments to match damaged memory sectors and decrypt archival telemetry.
          </div>
        </div>
        <span className="text-[10px] px-2 py-0.5 rounded bg-[#111915] border border-[#A6C7A9]/30 text-[#A6C7A9]">
          SIGNAL + PHOTO + TEXT LAB
        </span>
      </div>

      <div className="mt-4 space-y-3.5">
        {files.length === 0 ? (
          <div className="p-4 text-xs text-[#899398] text-center border border-white/10 rounded">
            No corrupted records match “{searchQuery}”.
          </div>
        ) : (
          files.map((file, idx) => {
            const isRepaired = repairedFiles.includes(file.id);
            const isRepairing = repairingId === file.id;
            const missingReq = Boolean(
              file.requiredLostArtifactId &&
                !discoveredLostArtifacts.includes(file.requiredLostArtifactId)
            );
            const requiredLost = file.requiredLostArtifactId
              ? LOST_ARTIFACTS.find((l) => l.id === file.requiredLostArtifactId)
              : null;
            const isExpanded = expandedFileId === file.id;
            const isLabOpen = activeLabFileId === file.id;
            const fileMatched = matchedSlots[file.id] ?? [];
            const liveCipher = CIPHER_FRAGMENTS[(cipherTick + idx) % CIPHER_FRAGMENTS.length];
            const shuffled = shuffledFragmentsByFile.get(file.id) ?? file.fragments;

            return (
              <div
                key={file.id}
                className={`rounded-lg border p-3.5 transition-colors ${
                  isRepaired
                    ? 'bg-[#0C1410] border-[#A6C7A9]/40'
                    : missingReq
                    ? 'bg-[#0B0D0F] border-white/10'
                    : isLabOpen
                    ? 'bg-[#121614] border-[#D9822B]/65'
                    : 'bg-[#120E0D] border-[#C95D3A]/45'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 text-xs sm:text-sm font-medium text-[#F0F2F2]">
                      {isRepaired ? (
                        <CheckCircle2 className="w-4 h-4 text-[#A6C7A9] shrink-0" aria-hidden="true" />
                      ) : missingReq ? (
                        <Lock className="w-4 h-4 text-[#899398] shrink-0" aria-hidden="true" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-[#C95D3A] shrink-0" aria-hidden="true" />
                      )}
                      <span className="truncate">{file.filename}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-[#899398] shrink-0">
                        {file.visualType.replace('_', ' ').toUpperCase()}
                      </span>
                    </div>
                    <div className="text-[11px] mt-1 text-[#899398]">
                      {isRepaired
                        ? `RESTORED · ${file.hiddenMemoryTitle}`
                        : isRepairing
                        ? `DECRYPTING PARITY WAVEFORM... ${repairProgress}%`
                        : missingReq
                        ? file.corruptedPreview
                        : `${liveCipher} · ${file.corruptedPreview}`}
                    </div>
                  </div>

                  {isRepaired ? (
                    <button
                      type="button"
                      onClick={() => setExpandedFileId(isExpanded ? null : file.id)}
                      className="px-3 py-1.5 text-xs border border-[#A6C7A9]/40 text-[#A6C7A9] hover:bg-[#A6C7A9]/10 rounded cursor-pointer whitespace-nowrap"
                    >
                      {isExpanded ? 'Hide Record' : 'Read Record'}
                    </button>
                  ) : missingReq ? (
                    <span className="text-[11px] text-[#899398] whitespace-nowrap">
                      Requires Lost Memory 0{requiredLost?.chapter}
                    </span>
                  ) : (
                    <button
                      type="button"
                      disabled={isRepairing}
                      onClick={() => {
                        audioEngine.playEraSound('click');
                        setPickedFragmentId(null);
                        setMismatchMessage(null);
                        setActiveLabFileId(isLabOpen ? null : file.id);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs bg-[#D9822B] hover:bg-[#F6B26B] text-[#090B0D] font-medium rounded transition-colors cursor-pointer disabled:opacity-60 whitespace-nowrap"
                    >
                      <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>
                        {isRepairing
                          ? `Restoring ${repairProgress}%`
                          : isLabOpen
                          ? 'Collapse Lab'
                          : `Reconstruct (${fileMatched.length}/${file.fragments.length})`}
                      </span>
                    </button>
                  )}
                </div>

                <CorruptedVisualTrace
                  file={file}
                  isRepaired={isRepaired}
                  isRepairing={isRepairing}
                  isLocked={missingReq}
                  matchedCount={fileMatched.length}
                  progress={repairProgress}
                  tick={cipherTick}
                />

                {isRepairing && (
                  <div className="mt-2.5 h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#A6C7A9] transition-all duration-200"
                      style={{ width: `${repairProgress}%` }}
                    />
                  </div>
                )}

                {/* Interactive Fragment Assembly Lab Stage */}
                {!isRepaired && !isRepairing && !missingReq && isLabOpen && (
                  <div className="mt-4 pt-3.5 border-t border-white/12 space-y-3.5 font-sans">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono-archival">
                      <span className="text-[#D9822B] inline-flex items-center gap-1.5">
                        <Move className="w-3.5 h-3.5" />
                        STEP 1: DRAG OR CLICK A FRAGMENT · STEP 2: PLACE INTO MATCHING SECTOR
                      </span>
                      <button
                        type="button"
                        onClick={() => handleAutoAlignNext(file)}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-white/15 text-[#BFC7CB] hover:text-[#A6C7A9] cursor-pointer"
                        title="Automatically align next corrupted sector"
                      >
                        <HelpCircle className="w-3 h-3" />
                        <span>Assist Next Slot</span>
                      </button>
                    </div>

                    {/* Source Fragments Pool */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {shuffled.map((frag) => {
                        const used = fileMatched.includes(frag.id);
                        const selected = pickedFragmentId === frag.id;
                        return (
                          <button
                            key={frag.id}
                            type="button"
                            draggable={!used}
                            disabled={used}
                            onDragStart={(e) => {
                              e.dataTransfer.setData('text/plain', frag.id);
                              setPickedFragmentId(frag.id);
                            }}
                            onClick={() => {
                              audioEngine.playEraSound('click');
                              setPickedFragmentId(selected ? null : frag.id);
                              setMismatchMessage(null);
                            }}
                            className={`p-2.5 rounded border text-left transition-all ${
                              used
                                ? 'bg-[#0C1410] border-[#A6C7A9]/30 opacity-45 cursor-default'
                                : selected
                                ? 'bg-[#21180E] border-[#F6B26B] ring-1 ring-[#F6B26B] cursor-grabbing'
                                : 'bg-[#090B0D] border-white/20 hover:border-[#D9822B] cursor-grab'
                            }`}
                          >
                            <div className="flex items-center justify-between text-[10px] font-mono-archival text-[#D9822B]">
                              <span>FRAGMENT · {frag.code}</span>
                              {used && <Check className="w-3 h-3 text-[#A6C7A9]" />}
                            </div>
                            <div className="text-[11px] font-mono-archival text-[#F0F2F2] mt-1 truncate">
                              {frag.snippet}
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {/* Damaged Sector Target Slots */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {file.fragments.map((slot) => {
                        const matched = fileMatched.includes(slot.id);
                        return (
                          <button
                            key={`slot-${slot.id}`}
                            type="button"
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={(e) => {
                              e.preventDefault();
                              const payload = e.dataTransfer.getData('text/plain') || pickedFragmentId;
                              if (payload) {
                                handlePlaceFragment(file, slot.id, payload);
                              }
                            }}
                            onClick={() => {
                              if (pickedFragmentId) {
                                handlePlaceFragment(file, slot.id, pickedFragmentId);
                              } else if (!matched) {
                                audioEngine.playEraSound('click');
                                setMismatchMessage('Select or drag a fragment above first, then click its matching sector.');
                              }
                            }}
                            className={`p-3 rounded border border-dashed text-left transition-colors ${
                              matched
                                ? 'bg-[#0F1E16] border-[#A6C7A9] text-[#A6C7A9] border-solid'
                                : pickedFragmentId
                                ? 'bg-[#17120E] border-[#D9822B] hover:bg-[#221912] cursor-pointer'
                                : 'bg-[#07090B] border-white/20 text-[#899398]'
                            }`}
                          >
                            <div className="text-[10px] font-mono-archival">
                              SECTOR · {slot.code}
                            </div>
                            <div className="text-xs font-medium text-[#F0F2F2] mt-0.5">
                              {slot.slotLabel}
                            </div>
                            <div className="text-[10px] font-mono-archival mt-1">
                              {matched
                                ? `LOCKED: ${slot.snippet}`
                                : pickedFragmentId
                                ? 'Click or Drop Fragment Here'
                                : 'Awaiting Matching Code'}
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {mismatchMessage && (
                      <div className="text-[11px] font-mono-archival text-[#C95D3A]">
                        {mismatchMessage}
                      </div>
                    )}
                  </div>
                )}

                {isRepaired && isExpanded && (
                  <div className="mt-4 pt-3 border-t border-[#A6C7A9]/20 space-y-2.5 text-xs font-sans text-[#BFC7CB]">
                    <p className="text-[#F0F2F2] font-medium">{file.hiddenMemory}</p>
                    <p>
                      <span className="text-[#A6C7A9] font-mono-archival">TECH FACT: </span>
                      {file.technologicalFact}
                    </p>
                    <p className="italic text-[#899398]">“{file.narrativeFragment}”</p>
                    <div className="text-[11px] font-mono-archival text-[#A6C7A9]">
                      {file.forwardConnection}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
