import React from 'react';
import { X, Sparkles, KeyRound, Volume2 } from 'lucide-react';
import { ArtifactItem, LostArtifactItem, SecretMemoryItem } from '../types/archive';
import { audioEngine } from '../logic/audioEngine';

interface ArtifactModalProps {
  artifact: ArtifactItem | null;
  narrationEnabled?: boolean;
  onClose: () => void;
}

export const ArtifactModal: React.FC<ArtifactModalProps> = ({
  artifact,
  narrationEnabled = false,
  onClose,
}) => {
  if (!artifact) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="artifact-modal-title"
      className="no-print fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:justify-start sm:pl-12 lg:pl-20 p-4 bg-[#090B0D]/70"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-[#111619] border border-white/15 rounded-xl p-6 sm:p-8 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-white/10">
          <div>
            <div className="text-xs font-mono-archival text-[#899398]">
              {artifact.accessionCode} · {artifact.era}
              {artifact.perspectiveTag ? ` · ${artifact.perspectiveTag}` : ''}
            </div>
            <h3 id="artifact-modal-title" className="font-display text-2xl font-semibold text-[#F0F2F2] mt-1">
              {artifact.name}
            </h3>
          </div>
          <div className="flex items-center gap-1.5">
            {narrationEnabled && (
              <button
                type="button"
                onClick={() =>
                  audioEngine.speak(
                    `${artifact.name}. ${artifact.summary} ${artifact.whyItMattered}`
                  )
                }
                aria-label="Narrate artifact description"
                title="Narrate entry"
                className="p-2 rounded-lg border border-[#A6C7A9]/35 text-[#A6C7A9] hover:bg-[#A6C7A9]/10 transition-colors cursor-pointer"
              >
                <Volume2 className="w-4 h-4" />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close artifact details"
              className="p-2 rounded-lg border border-white/10 text-[#BFC7CB] hover:text-[#F0F2F2] hover:border-white/30 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <p className="mt-4 text-sm text-[#A6C7A9] font-medium">{artifact.summary}</p>

        <dl className="mt-5 space-y-4 text-sm">
          <div>
            <dt className="text-xs font-mono-archival uppercase tracking-wider text-[#899398]">
              Historical Context
            </dt>
            <dd className="mt-1 text-[#F0F2F2]/90 leading-relaxed">{artifact.historicalContext}</dd>
          </div>
          <div className="pt-3 border-t border-white/8">
            <dt className="text-xs font-mono-archival uppercase tracking-wider text-[#899398]">
              Why It Mattered
            </dt>
            <dd className="mt-1 text-[#F0F2F2]/90 leading-relaxed">{artifact.whyItMattered}</dd>
          </div>
          <div className="pt-3 border-t border-white/8">
            <dt className="text-xs font-mono-archival uppercase tracking-wider text-[#899398]">
              Impact on Humanity
            </dt>
            <dd className="mt-1 text-[#F0F2F2]/90 leading-relaxed">{artifact.impactOnHumanity}</dd>
          </div>
        </dl>

        <div className="mt-6 pt-4 border-t border-white/10 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium bg-[#F0F2F2] text-[#090B0D] hover:bg-[#A6C7A9] rounded transition-colors cursor-pointer"
          >
            Return to Scene
          </button>
        </div>
      </div>
    </div>
  );
};

interface LostMemoryToastProps {
  lostArtifact: LostArtifactItem | null;
  onDismiss: () => void;
}

export const LostMemoryToast: React.FC<LostMemoryToastProps> = ({ lostArtifact, onDismiss }) => {
  if (!lostArtifact) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="no-print fixed bottom-5 right-5 sm:right-20 z-50 max-w-md bg-[#111619] border border-[#D9822B]/60 rounded-xl p-5 shadow-2xl"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 text-xs font-mono-archival text-[#D9822B]">
          <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
          <span>{lostArtifact.memoryCode} UNLOCKED</span>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss notification"
          className="text-[#899398] hover:text-[#F0F2F2] cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <h4 className="font-display text-lg font-semibold text-[#F0F2F2] mt-1.5">
        {lostArtifact.title} · {lostArtifact.name}
      </h4>
      <p className="mt-2 text-xs sm:text-sm text-[#BFC7CB] leading-relaxed">
        {lostArtifact.narrative}
      </p>
      <div className="mt-3 pt-2.5 border-t border-white/10 space-y-1.5 text-[11px]">
        <div>
          <span className="font-mono-archival text-[#D9822B]">PURPOSE · </span>
          <span className="text-[#F0F2F2]/90">{lostArtifact.purpose}</span>
        </div>
        <div>
          <span className="font-mono-archival text-[#A6C7A9]">IMPACT · </span>
          <span className="text-[#BFC7CB]">{lostArtifact.impact}</span>
        </div>
      </div>
    </div>
  );
};

interface SecretMemoryToastProps {
  secret: SecretMemoryItem | null;
  onDismiss: () => void;
}

export const SecretMemoryToast: React.FC<SecretMemoryToastProps> = ({ secret, onDismiss }) => {
  if (!secret) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="no-print fixed bottom-5 left-5 sm:left-10 z-50 max-w-md bg-[#0E1512] border border-[#A6C7A9]/65 rounded-xl p-5 shadow-2xl"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 text-xs font-mono-archival text-[#A6C7A9]">
          <KeyRound className="w-3.5 h-3.5" aria-hidden="true" />
          <span>{secret.code} DISCOVERED</span>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss secret archive notification"
          className="text-[#899398] hover:text-[#F0F2F2] cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <h4 className="font-display text-lg font-semibold text-[#F0F2F2] mt-1.5">
        {secret.title}
      </h4>
      <p className="mt-2 text-xs sm:text-sm text-[#BFC7CB] leading-relaxed">
        {secret.narrative}
      </p>
      <p className="mt-2 text-[11px] font-mono-archival text-[#A6C7A9]">
        {secret.historicalInsight}
      </p>
    </div>
  );
};

