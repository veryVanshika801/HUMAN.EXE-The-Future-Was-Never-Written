import React, { useRef } from 'react';
import { Volume2, VolumeX, SlidersHorizontal, X, Mic, MicOff } from 'lucide-react';
import { AudioSettings } from '../types/archive';
import { useDialogAccessibility } from '../hooks/useDialogAccessibility';

interface SoundControlPanelProps {
  isOpen: boolean;
  audio: AudioSettings;
  onClose: () => void;
  onUpdateAudio: (patch: Partial<AudioSettings>) => void;
}

export const SoundControlPanel: React.FC<SoundControlPanelProps> = ({
  isOpen,
  audio,
  onClose,
  onUpdateAudio,
}) => {
  const panelRef = useRef<HTMLDivElement | null>(null);
  useDialogAccessibility(isOpen, onClose, panelRef, { lockScroll: false });

  if (!isOpen) return null;

  const sliders: Array<{
    key: 'masterVolume' | 'ambientVolume' | 'sfxVolume' | 'musicVolume';
    label: string;
    value: number;
  }> = [
    { key: 'masterVolume', label: 'Master Volume', value: audio.masterVolume },
    { key: 'ambientVolume', label: 'Ambient Environment', value: audio.ambientVolume },
    { key: 'sfxVolume', label: 'Sound Effects', value: audio.sfxVolume },
    { key: 'musicVolume', label: 'Background Music', value: audio.musicVolume },
  ];

  return (
    <div
      ref={panelRef}
      tabIndex={-1}
      role="dialog"
      aria-label="Archive Sound Mixer"
      className="no-print fixed top-16 right-4 sm:right-8 z-50 w-72 sm:w-80 bg-[#111619] border border-white/15 rounded-xl p-5 shadow-2xl focus:outline-none"
    >
      <div className="flex items-center justify-between pb-3 border-b border-white/10">
        <div className="flex items-center gap-2 text-xs font-mono-archival text-[#A6C7A9] uppercase tracking-wider">
          <SlidersHorizontal className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Spatial Audio Engine</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close audio controls"
          className="p-1 text-[#899398] hover:text-[#F0F2F2] cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Primary Power & Mute Controls */}
      <div className="mt-4 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => onUpdateAudio({ enabled: !audio.enabled })}
          className={`flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded border transition-colors cursor-pointer ${
            audio.enabled
              ? 'bg-[#A6C7A9] text-[#090B0D] border-[#A6C7A9]'
              : 'bg-[#090B0D] text-[#BFC7CB] border-white/15 hover:border-white/35'
          }`}
        >
          {audio.enabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
          <span>{audio.enabled ? 'Sound On' : 'Enable Sound'}</span>
        </button>

        <button
          type="button"
          onClick={() => onUpdateAudio({ muted: !audio.muted })}
          className={`px-3 py-2 text-xs font-medium rounded border transition-colors cursor-pointer ${
            audio.muted
              ? 'bg-[#C95D3A]/20 text-[#C95D3A] border-[#C95D3A]/50'
              : 'bg-[#090B0D] text-[#BFC7CB] border-white/15 hover:border-white/35'
          }`}
        >
          {audio.muted ? 'Muted All' : 'Mute All'}
        </button>
      </div>

      {/* Four Independent Mix Sliders */}
      <div className="mt-5 space-y-3.5">
        {sliders.map((slider) => {
          const pct = Math.round(slider.value * 100);
          return (
            <label key={slider.key} className="block">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-[#BFC7CB]">{slider.label}</span>
                <span className="font-mono-archival text-[#F0F2F2] tabular-nums">{pct}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={pct}
                onChange={(e) =>
                  onUpdateAudio({
                    enabled: true,
                    [slider.key]: Number(e.target.value) / 100,
                  })
                }
                className="w-full h-1.5 bg-[#090B0D] rounded-lg appearance-none cursor-pointer accent-[#A6C7A9]"
              />
            </label>
          );
        })}
      </div>

      {/* Optional Narration Channel */}
      <div className="mt-4 pt-4 border-t border-white/10 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-[#BFC7CB]">Optional Archivist Narration</span>
          <button
            type="button"
            onClick={() =>
              onUpdateAudio({
                enabled: true,
                narrationEnabled: !audio.narrationEnabled,
              })
            }
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-mono-archival rounded border transition-colors cursor-pointer ${
              audio.narrationEnabled
                ? 'bg-[#A6C7A9]/20 text-[#A6C7A9] border-[#A6C7A9]/60'
                : 'bg-[#090B0D] text-[#899398] border-white/15 hover:text-[#F0F2F2]'
            }`}
          >
            {audio.narrationEnabled ? <Mic className="w-3 h-3" /> : <MicOff className="w-3 h-3" />}
            <span>{audio.narrationEnabled ? 'Active' : 'Off'}</span>
          </button>
        </div>

        <label className="block">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-[#899398]">Narration Voice Level</span>
            <span className="font-mono-archival text-[#F0F2F2] tabular-nums">
              {Math.round(audio.narrationVolume * 100)}%
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={Math.round(audio.narrationVolume * 100)}
            onChange={(e) =>
              onUpdateAudio({
                enabled: true,
                narrationEnabled: true,
                narrationVolume: Number(e.target.value) / 100,
              })
            }
            className="w-full h-1.5 bg-[#090B0D] rounded-lg appearance-none cursor-pointer accent-[#A6C7A9]"
          />
        </label>
      </div>

      <p className="mt-4 pt-3 border-t border-white/10 text-[11px] font-mono-archival text-[#899398] leading-relaxed">
        Procedural Web Audio synth & optional voice narration adapt per era and discovery.
      </p>
    </div>
  );
};
