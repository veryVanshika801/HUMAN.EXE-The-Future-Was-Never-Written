import React, { useEffect, useRef, useState } from 'react';
import { Lock, CheckCircle2, Wrench, AlertTriangle } from 'lucide-react';
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
  fileId: string;
  isRepaired: boolean;
  isRepairing: boolean;
  isLocked: boolean;
  progress: number;
  tick: number;
}

const CorruptedVisualTrace: React.FC<VisualTraceProps> = ({
  fileId,
  isRepaired,
  isRepairing,
  isLocked,
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
    ctx.fillStyle = '#060807';
    ctx.fillRect(0, 0, w, h);

    // Subtle background reference ticks
    ctx.strokeStyle = 'rgba(191, 199, 203, 0.08)';
    ctx.lineWidth = 1;
    for (let x = 20; x < w; x += 28) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }

    const seed = fileId.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);

    if (isRepaired) {
      // Crisp restored waveform + circuit diagram trace
      ctx.strokeStyle = '#A6C7A9';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      for (let x = 0; x < w; x += 4) {
        const freq = 0.035 + (seed % 5) * 0.008;
        const y = h * 0.5 + Math.sin(x * freq + seed) * (h * 0.28) * Math.cos(x * 0.014);
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      ctx.fillStyle = '#A6C7A9';
      for (let nodeX = 24; nodeX < w - 16; nodeX += 48) {
        const y = h * 0.5 + Math.sin(nodeX * (0.035 + (seed % 5) * 0.008) + seed) * (h * 0.28) * Math.cos(nodeX * 0.014);
        ctx.fillRect(nodeX - 2, y - 2, 4, 4);
      }
      return;
    }

    if (isLocked) {
      ctx.fillStyle = 'rgba(137, 147, 152, 0.25)';
      for (let x = 10; x < w - 10; x += 14) {
        ctx.fillRect(x, h * 0.45, 6, 4);
      }
      return;
    }

    // Corrupted / reconstructing visual fragment bars
    const cleanCutoff = isRepairing ? (progress / 100) * w : 0;
    for (let x = 4; x < w - 6; x += 8) {
      const n = Math.sin(x * 0.41 + seed + tick * 1.9);
      if (x < cleanCutoff) {
        ctx.fillStyle = '#A6C7A9';
        const y = h * 0.5 + Math.sin(x * 0.04 + seed) * (h * 0.24);
        ctx.fillRect(x, y - 2, 5, 4);
      } else {
        ctx.fillStyle = n > 0.25 ? '#C95D3A' : 'rgba(217, 130, 43, 0.45)';
        const barH = 4 + Math.abs(Math.floor(n * 18));
        const barY = Math.max(4, Math.min(h - barH - 4, h * 0.5 + n * 16));
        ctx.fillRect(x, barY, 5, barH);
      }
    }
  }, [fileId, isRepaired, isRepairing, isLocked, progress, tick]);

  return (
    <canvas
      ref={canvasRef}
      width={320}
      height={48}
      aria-label={isRepaired ? 'Restored archival waveform visual' : 'Fragmented visual telemetry'}
      className="w-full h-12 rounded border border-white/10 block mt-2.5"
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
  const [repairingId, setRepairingId] = useState<string | null>(null);
  const [repairProgress, setRepairProgress] = useState(0);
  const [expandedFileId, setExpandedFileId] = useState<string | null>(null);
  const [cipherTick, setCipherTick] = useState(0);

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

  const handleRepair = (file: CorruptedFileItem) => {
    if (repairingId) return;
    audioEngine.playEraSound('glitch');
    setRepairingId(file.id);
    setRepairProgress(18);

    const step1 = window.setTimeout(() => setRepairProgress(56), 260);
    const step2 = window.setTimeout(() => setRepairProgress(88), 540);
    const done = window.setTimeout(() => {
      onRepairFile(file.id);
      setRepairingId(null);
      setRepairProgress(0);
      setExpandedFileId(file.id);
    }, 820);

    return () => {
      window.clearTimeout(step1);
      window.clearTimeout(step2);
      window.clearTimeout(done);
    };
  };

  return (
    <div className="bg-[#080C0A] border border-[#A6C7A9]/25 rounded-lg p-4 sm:p-5 font-mono-archival">
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#A6C7A9]/20">
        <div className="text-xs text-[#A6C7A9]">
          CORRUPTED ARCHIVE RECOVERY · {repairedFiles.length} / {CORRUPTED_FILES.length} RESTORED
        </div>
        <div className="text-[11px] text-[#899398]">Visual &amp; Parity Reconstruction</div>
      </div>

      <div className="mt-4 space-y-3">
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
            const liveCipher = CIPHER_FRAGMENTS[(cipherTick + idx) % CIPHER_FRAGMENTS.length];

            return (
              <div
                key={file.id}
                className={`rounded border p-3.5 transition-colors ${
                  isRepaired
                    ? 'bg-[#0C1410] border-[#A6C7A9]/40'
                    : missingReq
                    ? 'bg-[#0B0D0F] border-white/10'
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
                      <span className="text-xs text-[#899398] shrink-0">· {file.sizeLabel}</span>
                    </div>
                    <div className="text-[11px] mt-1 text-[#899398]">
                      {isRepaired
                        ? `RESTORED · ${file.hiddenMemoryTitle}`
                        : isRepairing
                        ? `RECONSTRUCTING VISUAL & PARITY BLOCKS... ${repairProgress}%`
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
                      onClick={() => handleRepair(file)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs bg-[#C95D3A] hover:bg-[#D9822B] text-[#090B0D] font-medium rounded transition-colors cursor-pointer disabled:opacity-60 whitespace-nowrap"
                    >
                      <Wrench className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>{isRepairing ? `Restoring ${repairProgress}%` : 'Restore Visual & Record'}</span>
                    </button>
                  )}
                </div>

                <CorruptedVisualTrace
                  fileId={file.id}
                  isRepaired={isRepaired}
                  isRepairing={isRepairing}
                  isLocked={missingReq}
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

                {!isRepaired && !isRepairing && !missingReq && (
                  <div className="mt-2 text-[11px] text-[#C95D3A]/85 flex flex-wrap gap-3">
                    <span>[VISUAL_TRACE: FRAGMENTED]</span>
                    <span>[PARITY: RECOVERABLE]</span>
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

