import { AudioSettings, ChapterId, EndingArchetype } from '../types/archive';

export type ArchiveSfxType =
  | 'click'
  | 'hover'
  | 'stone'
  | 'ignition'
  | 'gear'
  | 'steam'
  | 'keyclick'
  | 'floppy'
  | 'networkPulse'
  | 'neuralPulse'
  | 'glitch'
  | 'repairSuccess'
  | 'fragmentSnap'
  | 'decision'
  | 'sphereOpen'
  | 'portalTransition'
  | 'chapterUnlock'
  | 'endingReveal'
  | 'transitionWhoosh'
  | 'metallicResonance'
  | 'secret'
  | 'discovery'
  | 'repair';

export const DEFAULT_AUDIO_SETTINGS: AudioSettings = {
  enabled: false,
  muted: false,
  masterVolume: 0.72,
  ambientVolume: 0.65,
  sfxVolume: 0.8,
  musicVolume: 0.55,
  narrationEnabled: false,
  narrationVolume: 0.85,
};

class ArchiveAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private ambientGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private musicGain: GainNode | null = null;

  private droneOsc1: OscillatorNode | null = null;
  private droneOsc2: OscillatorNode | null = null;
  private musicOsc1: OscillatorNode | null = null;
  private musicOsc2: OscillatorNode | null = null;
  private filter: BiquadFilterNode | null = null;
  private musicFilter: BiquadFilterNode | null = null;
  private noiseSource: AudioBufferSourceNode | null = null;
  private noiseFilter: BiquadFilterNode | null = null;
  private noiseGain: GainNode | null = null;

  private settings: AudioSettings = { ...DEFAULT_AUDIO_SETTINGS };
  private freezeSilence = false;
  private currentEra: ChapterId = 'intro';
  private currentArchetype: EndingArchetype | undefined;
  private lastPlayedMap = new Map<string, number>();

  private initContext() {
    if (this.ctx) return;
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    this.ctx = new AudioCtx();

    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0;
    this.masterGain.connect(this.ctx.destination);

    this.ambientGain = this.ctx.createGain();
    this.ambientGain.gain.value = this.settings.ambientVolume * 0.25;
    this.ambientGain.connect(this.masterGain);

    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.value = this.settings.musicVolume * 0.16;
    this.musicGain.connect(this.masterGain);

    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.value = this.settings.sfxVolume * 0.45;
    this.sfxGain.connect(this.masterGain);

    // Ambient Drone Layer
    this.filter = this.ctx.createBiquadFilter();
    this.filter.type = 'lowpass';
    this.filter.frequency.value = 260;
    this.filter.Q.value = 1.2;
    this.filter.connect(this.ambientGain);

    this.droneOsc1 = this.ctx.createOscillator();
    this.droneOsc1.type = 'sine';
    this.droneOsc1.frequency.value = 55;

    this.droneOsc2 = this.ctx.createOscillator();
    this.droneOsc2.type = 'triangle';
    this.droneOsc2.frequency.value = 82.41;

    const droneMix = this.ctx.createGain();
    droneMix.gain.value = 0.28;
    this.droneOsc1.connect(droneMix);
    this.droneOsc2.connect(droneMix);
    droneMix.connect(this.filter);
    this.droneOsc1.start();
    this.droneOsc2.start();

    // Harmonic Music Pad Layer
    this.musicFilter = this.ctx.createBiquadFilter();
    this.musicFilter.type = 'lowpass';
    this.musicFilter.frequency.value = 540;
    this.musicFilter.connect(this.musicGain);

    this.musicOsc1 = this.ctx.createOscillator();
    this.musicOsc1.type = 'sine';
    this.musicOsc1.frequency.value = 110;

    this.musicOsc2 = this.ctx.createOscillator();
    this.musicOsc2.type = 'sine';
    this.musicOsc2.frequency.value = 164.81;

    const padMix = this.ctx.createGain();
    padMix.gain.value = 0.24;
    this.musicOsc1.connect(padMix);
    this.musicOsc2.connect(padMix);
    padMix.connect(this.musicFilter);
    this.musicOsc1.start();
    this.musicOsc2.start();

    // Procedural Brown/Pink Noise Layer (Hearth Crackle / Wind / Steam / CRT)
    const bufferSize = this.ctx.sampleRate * 2;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    let lastOut = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      data[i] = (lastOut + 0.03 * white) / 1.03;
      lastOut = data[i];
      data[i] *= 2.4;
    }

    this.noiseSource = this.ctx.createBufferSource();
    this.noiseSource.buffer = noiseBuffer;
    this.noiseSource.loop = true;

    this.noiseFilter = this.ctx.createBiquadFilter();
    this.noiseFilter.type = 'bandpass';
    this.noiseFilter.frequency.value = 520;
    this.noiseFilter.Q.value = 0.9;

    this.noiseGain = this.ctx.createGain();
    this.noiseGain.gain.value = 0.06;

    this.noiseSource.connect(this.noiseFilter);
    this.noiseFilter.connect(this.noiseGain);
    this.noiseGain.connect(this.ambientGain);
    this.noiseSource.start();
  }

  private syncBusGains() {
    if (!this.ctx || !this.masterGain || !this.ambientGain || !this.sfxGain || !this.musicGain) {
      return;
    }
    const now = this.ctx.currentTime;
    const active = this.settings.enabled && !this.settings.muted && !this.freezeSilence;
    const masterTarget = active ? this.settings.masterVolume * 0.42 : 0;

    this.masterGain.gain.setTargetAtTime(masterTarget, now, this.freezeSilence ? 0.08 : 0.28);
    this.ambientGain.gain.setTargetAtTime(this.settings.ambientVolume * 0.45, now, 0.2);
    this.sfxGain.gain.setTargetAtTime(this.settings.sfxVolume * 0.55, now, 0.12);
    this.musicGain.gain.setTargetAtTime(this.settings.musicVolume * 0.36, now, 0.25);

    if (this.settings.muted || !this.settings.narrationEnabled || this.freezeSilence) {
      this.stopNarration();
    }
  }

  public updateSettings(next: AudioSettings) {
    const wasEnabled = this.settings.enabled;
    this.settings = { ...next };

    if (next.enabled) {
      this.initContext();
      if (this.ctx && this.ctx.state === 'suspended') {
        void this.ctx.resume();
      }
      if (!wasEnabled) {
        this.applyEraTone(this.currentEra, this.currentArchetype);
      }
    }
    this.syncBusGains();
  }

  public setEnabled(on: boolean) {
    this.updateSettings({ ...this.settings, enabled: on });
  }

  public setFreezeSilence(frozen: boolean) {
    if (this.freezeSilence === frozen) return;
    this.freezeSilence = frozen;
    this.syncBusGains();
  }

  public setEra(era: ChapterId, archetype?: EndingArchetype) {
    const changed = this.currentEra !== era;
    const archChanged = this.currentArchetype !== archetype;
    this.currentEra = era;
    this.currentArchetype = archetype;
    if (!this.settings.enabled || !this.ctx) return;
    this.applyEraTone(era, archetype);
    if (changed) {
      this.playEraSound(era === 'ending' ? 'endingReveal' : 'portalTransition');
    } else if (era === 'ending' && archChanged) {
      this.playEraSound('endingReveal');
    }
  }

  public speak(text: string) {
    if (
      typeof window === 'undefined' ||
      !('speechSynthesis' in window) ||
      !this.settings.narrationEnabled ||
      this.settings.muted ||
      this.freezeSilence
    ) {
      return;
    }
    try {
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(text);
      utter.rate = 0.94;
      utter.pitch = 0.96;
      utter.volume = Math.min(1, Math.max(0, this.settings.narrationVolume * this.settings.masterVolume));
      window.speechSynthesis.speak(utter);
    } catch {
      // ignore SpeechSynthesis errors on unsupported platforms
    }
  }

  public stopNarration() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // ignore
      }
    }
  }

  private getEndingPreset(archetype?: EndingArchetype) {
    switch (archetype) {
      case 'machine_dependency':
        return {
          f1: 48.99,
          f2: 73.42,
          m1: 98.0,
          m2: 116.54,
          cutoff: 290,
          mCutoff: 410,
          noiseFreq: 260,
          noise: 0.085,
        };
      case 'divided_network':
        return {
          f1: 58.27,
          f2: 87.31,
          m1: 116.54,
          m2: 164.81,
          cutoff: 390,
          mCutoff: 540,
          noiseFreq: 690,
          noise: 0.065,
        };
      case 'lost_connection':
        return {
          f1: 43.65,
          f2: 65.41,
          m1: 87.31,
          m2: 130.81,
          cutoff: 205,
          mCutoff: 320,
          noiseFreq: 950,
          noise: 0.07,
        };
      case 'renaissance':
        return {
          f1: 65.41,
          f2: 98.0,
          m1: 130.81,
          m2: 164.81,
          cutoff: 760,
          mCutoff: 960,
          noiseFreq: 720,
          noise: 0.042,
        };
      case 'symbiotic':
      default:
        return {
          f1: 73.42,
          f2: 110.0,
          m1: 146.83,
          m2: 220.0,
          cutoff: 690,
          mCutoff: 860,
          noiseFreq: 540,
          noise: 0.04,
        };
    }
  }

  private applyEraTone(era: ChapterId, archetype?: EndingArchetype) {
    if (
      !this.ctx ||
      !this.droneOsc1 ||
      !this.droneOsc2 ||
      !this.musicOsc1 ||
      !this.musicOsc2 ||
      !this.filter ||
      !this.musicFilter ||
      !this.noiseFilter ||
      !this.noiseGain
    ) {
      return;
    }

    const now = this.ctx.currentTime;
    const presets: Record<
      ChapterId,
      {
        f1: number;
        f2: number;
        m1: number;
        m2: number;
        cutoff: number;
        mCutoff: number;
        noiseFreq: number;
        noise: number;
      }
    > = {
      intro: {
        f1: 55,
        f2: 82.41,
        m1: 110,
        m2: 164.81,
        cutoff: 220,
        mCutoff: 420,
        noiseFreq: 380,
        noise: 0.04,
      },
      ch1: {
        f1: 61.74,
        f2: 92.5,
        m1: 123.47,
        m2: 185.0,
        cutoff: 360,
        mCutoff: 510,
        noiseFreq: 680,
        noise: 0.2,
      },
      ch2: {
        f1: 49.0,
        f2: 73.42,
        m1: 98.0,
        m2: 146.83,
        cutoff: 210,
        mCutoff: 340,
        noiseFreq: 310,
        noise: 0.16,
      },
      ch3: {
        f1: 65.41,
        f2: 130.81,
        m1: 130.81,
        m2: 196.0,
        cutoff: 440,
        mCutoff: 640,
        noiseFreq: 1100,
        noise: 0.045,
      },
      ch4: {
        f1: 73.42,
        f2: 110.0,
        m1: 146.83,
        m2: 220.0,
        cutoff: 560,
        mCutoff: 780,
        noiseFreq: 900,
        noise: 0.06,
      },
      ch5: {
        f1: 82.41,
        f2: 123.47,
        m1: 164.81,
        m2: 246.94,
        cutoff: 660,
        mCutoff: 880,
        noiseFreq: 620,
        noise: 0.035,
      },
      ending: this.getEndingPreset(archetype),
      credits: {
        f1: 65.41,
        f2: 98.0,
        m1: 130.81,
        m2: 196.0,
        cutoff: 480,
        mCutoff: 680,
        noiseFreq: 460,
        noise: 0.03,
      },
    };

    const p = presets[era];
    this.droneOsc1.frequency.setTargetAtTime(p.f1, now, 0.7);
    this.droneOsc2.frequency.setTargetAtTime(p.f2, now, 0.7);
    this.musicOsc1.frequency.setTargetAtTime(p.m1, now, 0.8);
    this.musicOsc2.frequency.setTargetAtTime(p.m2, now, 0.8);
    this.filter.frequency.setTargetAtTime(p.cutoff, now, 0.7);
    this.musicFilter.frequency.setTargetAtTime(p.mCutoff, now, 0.8);
    this.noiseFilter.frequency.setTargetAtTime(p.noiseFreq, now, 0.7);
    this.noiseGain.gain.setTargetAtTime(p.noise, now, 0.6);
  }

  private canPlay(key: string, cooldownMs: number): boolean {
    const now = performance.now();
    const prev = this.lastPlayedMap.get(key) ?? 0;
    if (now - prev < cooldownMs) return false;
    this.lastPlayedMap.set(key, now);
    return true;
  }

  public playEraSound(type: ArchiveSfxType) {
    if (!this.settings.enabled || this.settings.muted || this.freezeSilence) return;
    const cooldown =
      type === 'hover'
        ? 140
        : type === 'transitionWhoosh' || type === 'portalTransition'
        ? 700
        : 65;
    if (!this.canPlay(type, cooldown)) return;

    this.initContext();
    if (!this.ctx || !this.sfxGain) return;
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }

    const now = this.ctx.currentTime;

    if (type === 'discovery') {
      this.playLostArtifactFanfare();
      return;
    }

    if (type === 'endingReveal') {
      this.triggerSequence([220, 329.63, 440, 659.25], 'sine', 0.11, 0.22);
      return;
    }

    if (type === 'chapterUnlock') {
      this.triggerSequence([261.63, 392.0, 523.25], 'triangle', 0.085, 0.14);
      return;
    }

    if (type === 'fragmentSnap') {
      this.triggerSweep(420, 860, 'sine', 0.09, 0.12);
      return;
    }

    if (type === 'repair' || type === 'repairSuccess') {
      this.triggerSequence([320, 480, 720], 'triangle', 0.08, 0.14);
      return;
    }

    if (type === 'secret') {
      this.triggerSequence([392, 587.33, 783.99, 1046.5], 'sine', 0.095, 0.2);
      return;
    }

    if (type === 'sphereOpen') {
      this.triggerSweep(95, 440, 'sine', 0.18, 0.55);
      this.triggerNoiseBurst(520, 0.12, 0.45);
      return;
    }

    if (type === 'transitionWhoosh' || type === 'portalTransition') {
      this.triggerNoiseBurst(440, 0.1, 0.42);
      this.triggerSweep(160, 310, 'sine', 0.07, 0.38);
      return;
    }

    if (type === 'metallicResonance') {
      this.triggerSequence([440, 660, 990], 'sine', 0.06, 0.06);
      return;
    }

    if (type === 'hover') {
      this.triggerSweep(640, 720, 'sine', 0.04, 0.055);
      return;
    }

    if (type === 'stone') {
      this.triggerSweep(180, 95, 'triangle', 0.16, 0.14);
      return;
    }

    if (type === 'ignition') {
      this.triggerSweep(220, 520, 'sawtooth', 0.12, 0.24);
      return;
    }

    if (type === 'gear') {
      this.triggerSequence([165, 220], 'square', 0.06, 0.07);
      return;
    }

    if (type === 'steam') {
      this.triggerNoiseBurst(1200, 0.16, 0.3);
      return;
    }

    if (type === 'keyclick') {
      this.triggerSweep(920, 480, 'square', 0.05, 0.045);
      return;
    }

    if (type === 'floppy') {
      this.triggerSequence([240, 180], 'triangle', 0.09, 0.08);
      return;
    }

    if (type === 'networkPulse') {
      this.triggerSweep(520, 780, 'sine', 0.11, 0.18);
      return;
    }

    if (type === 'neuralPulse') {
      this.triggerSequence([329.63, 493.88], 'sine', 0.12, 0.18);
      return;
    }

    if (type === 'glitch') {
      this.triggerSequence([140, 620, 210], 'sawtooth', 0.06, 0.06);
      return;
    }

    if (type === 'decision') {
      this.triggerSequence([329.63, 440, 659.25], 'sine', 0.14, 0.16);
      return;
    }

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(520, now);
    osc.frequency.exponentialRampToValueAtTime(320, now + 0.08);
    gain.gain.setValueAtTime(0.11, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.1);
  }

  public playLostArtifactFanfare() {
    if (!this.settings.enabled || this.settings.muted || this.freezeSilence) return;
    if (!this.canPlay('lost-fanfare', 400)) return;
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;

    const now = this.ctx.currentTime;
    this.scheduleNote(523.25, now, 0.22, 'sine', 0.16);
    this.scheduleNote(783.99, now + 0.11, 0.42, 'triangle', 0.14);
    this.scheduleNote(1046.5, now + 0.24, 0.55, 'sine', 0.16);
  }

  public playChime(type: 'click' | 'discovery' | 'repair' | 'decision') {
    this.playEraSound(type);
  }

  private scheduleNote(
    freq: number,
    startTime: number,
    duration: number,
    wave: OscillatorType,
    peakGain: number
  ) {
    if (!this.ctx || !this.sfxGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = wave;
    osc.frequency.setValueAtTime(freq, startTime);
    gain.gain.setValueAtTime(0.001, startTime);
    gain.gain.linearRampToValueAtTime(peakGain, startTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(startTime);
    osc.stop(startTime + duration + 0.02);
  }

  private triggerSequence(freqs: number[], wave: OscillatorType, peak: number, stepSec: number) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    freqs.forEach((f, i) => {
      this.scheduleNote(f, now + i * stepSec, stepSec * 1.8, wave, peak);
    });
  }

  private triggerSweep(
    fromFreq: number,
    toFreq: number,
    wave: OscillatorType,
    peak: number,
    durSec: number
  ) {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = wave;
    osc.frequency.setValueAtTime(fromFreq, now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(40, toFreq), now + durSec);
    gain.gain.setValueAtTime(peak, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + durSec);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + durSec + 0.02);
  }

  private triggerNoiseBurst(cutoff: number, peak: number, durSec: number) {
    if (!this.ctx || !this.sfxGain) return;
    const len = Math.floor(this.ctx.sampleRate * durSec);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const ch = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      ch[i] = (Math.random() * 2 - 1) * (1 - i / len);
    }
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const filt = this.ctx.createBiquadFilter();
    filt.type = 'bandpass';
    filt.frequency.value = cutoff;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(peak, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + durSec);
    src.connect(filt);
    filt.connect(gain);
    gain.connect(this.sfxGain);
    src.start();
  }
}

export const audioEngine = new ArchiveAudioEngine();
