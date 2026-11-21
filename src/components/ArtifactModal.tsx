import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  X,
  Sparkles,
  KeyRound,
  Volume2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Layers,
  Crosshair,
  ShieldCheck,
} from 'lucide-react';
import {
  ArtifactHotspot,
  ArtifactItem,
  LostArtifactItem,
  SecretMemoryItem,
} from '../types/archive';
import { audioEngine } from '../logic/audioEngine';
import { buildAutopsyArtifactMesh } from '../scenes/artifactMeshes';

interface ArtifactModalProps {
  artifact: ArtifactItem | null;
  narrationEnabled?: boolean;
  onClose: () => void;
}

interface ProjectedHotspot {
  id: string;
  label: string;
  x: number;
  y: number;
  visible: boolean;
}

interface AutopsyViewportProps {
  artifact: ArtifactItem;
  selectedHotspotId: string;
  onSelectHotspot: (hotspot: ArtifactHotspot) => void;
}

const ArtifactAutopsyViewport: React.FC<AutopsyViewportProps> = ({
  artifact,
  selectedHotspotId,
  onSelectHotspot,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [zoom, setZoom] = useState(1.0);
  const [resetTick, setResetTick] = useState(0);
  const [projectedSpots, setProjectedSpots] = useState<ProjectedHotspot[]>([]);
  const [glFallback, setGlFallback] = useState(false);

  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;
  const rotRef = useRef({ x: 0.14, y: -0.35 });

  useEffect(() => {
    rotRef.current = { x: 0.14, y: -0.35 };
    setZoom(1.0);
  }, [artifact.id, resetTick]);

  useEffect(() => {
    const host = containerRef.current;
    if (!host) return;

    let isSoftwareGl = false;
    try {
      const probe = document.createElement('canvas');
      const gl = probe.getContext('webgl2') || probe.getContext('webgl');
      if (!gl) {
        setGlFallback(true);
        return;
      }
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const gpu = String(gl.getParameter(ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      isSoftwareGl = /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    } catch {
      setGlFallback(true);
      return;
    }

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !isSoftwareGl,
        alpha: true,
        powerPreference: 'high-performance',
      });
    } catch {
      setGlFallback(true);
      return;
    }

    const width = Math.max(260, host.clientWidth);
    const height = Math.max(220, host.clientHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    host.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTex;
    pmrem.dispose();

    const camera = new THREE.PerspectiveCamera(36, width / height, 0.1, 40);
    camera.position.set(0, 0.15, 2.55);

    const hemi = new THREE.HemisphereLight('#D5DDE2', '#0E1317', 0.85);
    const key = new THREE.DirectionalLight('#FFF5E6', 2.2);
    key.position.set(3, 4, 5);
    const accent = new THREE.PointLight(
      artifact.layoutMode === 'relic'
        ? '#D9822B'
        : artifact.layoutMode === 'neural'
        ? '#A6C7A9'
        : '#BFC7CB',
      1.8,
      12
    );
    accent.position.set(-2, 1.5, 2.5);
    scene.add(hemi, key, accent);

    const specimenRig = buildAutopsyArtifactMesh(artifact.id);
    scene.add(specimenRig.group);

    // Subtle calibration plinth ring beneath specimen
    const baseRing = new THREE.Mesh(
      new THREE.RingGeometry(0.68, 0.71, 48),
      new THREE.MeshBasicMaterial({
        color: artifact.layoutMode === 'relic' ? '#D9822B' : '#A6C7A9',
        transparent: true,
        opacity: 0.28,
        side: THREE.DoubleSide,
      })
    );
    baseRing.rotation.x = -Math.PI / 2;
    baseRing.position.y = -0.68;
    scene.add(baseRing);

    const tmpVec = new THREE.Vector3();
    let dragging = false;
    let lastX = 0;
    let lastY = 0;
    let autoSpin = true;
    let disposed = false;
    let rafId = 0;

    const projectHotspots = () => {
      const w = host.clientWidth;
      const h = host.clientHeight;
      specimenRig.group.updateMatrixWorld(true);
      const next: ProjectedHotspot[] = artifact.hotspots.map((hs) => {
        tmpVec.set(hs.position[0], hs.position[1], hs.position[2]);
        specimenRig.group.localToWorld(tmpVec);
        tmpVec.project(camera);
        return {
          id: hs.id,
          label: hs.label,
          x: (tmpVec.x * 0.5 + 0.5) * w,
          y: (-tmpVec.y * 0.5 + 0.5) * h,
          visible: tmpVec.z < 1.0,
        };
      });
      setProjectedSpots(next);
    };

    const renderOnce = () => {
      if (disposed) return;
      specimenRig.group.rotation.x = rotRef.current.x;
      specimenRig.group.rotation.y = rotRef.current.y;
      camera.position.z = THREE.MathUtils.clamp(2.55 / zoomRef.current, 1.45, 3.6);
      camera.lookAt(0, 0, 0);
      renderer.render(scene, camera);
      projectHotspots();
    };

    const onPointerDown = (e: PointerEvent) => {
      dragging = true;
      autoSpin = false;
      lastX = e.clientX;
      lastY = e.clientY;
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!dragging) return;
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;
      rotRef.current.y += dx * 0.012;
      rotRef.current.x = THREE.MathUtils.clamp(rotRef.current.x + dy * 0.01, -1.1, 1.1);
      renderOnce();
    };

    const onPointerUp = () => {
      dragging = false;
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      setZoom((prev) =>
        Number(THREE.MathUtils.clamp(prev - e.deltaY * 0.001, 0.72, 1.75).toFixed(2))
      );
    };

    const onResize = () => {
      if (!host) return;
      const nw = Math.max(260, host.clientWidth);
      const nh = Math.max(220, host.clientHeight);
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
      renderer.setSize(nw, nh);
      renderOnce();
    };

    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    renderer.domElement.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('resize', onResize);

    // Gentle idle turntable loop; throttled under software WebGL
    let lastTick = performance.now();
    const loop = (now: number) => {
      if (disposed) return;
      const dt = Math.min(0.05, (now - lastTick) / 1000);
      lastTick = now;
      if (autoSpin && !dragging && !isSoftwareGl) {
        rotRef.current.y += dt * 0.36;
      }
      renderOnce();
      if (!isSoftwareGl) {
        rafId = requestAnimationFrame(loop);
      }
    };

    renderOnce();
    if (!isSoftwareGl) {
      rafId = requestAnimationFrame(loop);
    }

    return () => {
      disposed = true;
      cancelAnimationFrame(rafId);
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      renderer.domElement.removeEventListener('wheel', onWheel);
      window.removeEventListener('resize', onResize);

      scene.traverse((obj) => {
        if ((obj as THREE.Mesh).isMesh) {
          const m = obj as THREE.Mesh;
          m.geometry.dispose();
          if (Array.isArray(m.material)) m.material.forEach((mat) => mat.dispose());
          else m.material.dispose();
        }
      });
      specimenRig.disposeTextures();
      envTex.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === host) {
        host.removeChild(renderer.domElement);
      }
    };
  }, [artifact.id, artifact.layoutMode, artifact.hotspots]);

  return (
    <div className="relative h-64 sm:h-72 rounded-xl overflow-hidden bg-[#06080A] border border-white/12 select-none">
      {/* Subtle blueprint reticle grid background for CAD/technical mode */}
      {artifact.layoutMode === 'blueprint' && (
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none opacity-20"
          style={{
            backgroundImage:
              'linear-gradient(rgba(166,199,169,0.22) 1px, transparent 1px), linear-gradient(90deg, rgba(166,199,169,0.22) 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        />
      )}

      {glFallback ? (
        <div className="w-full h-full flex items-center justify-center text-xs font-mono-archival text-[#899398]">
          3D SPECIMEN PREVIEW UNAVAILABLE · USE COMPONENT INDEX BELOW
        </div>
      ) : (
        <div ref={containerRef} className="w-full h-full cursor-grab active:cursor-grabbing" />
      )}

      {/* Interactive 3D-Projected Component Hotspots */}
      {!glFallback &&
        projectedSpots.map((spot, idx) => {
          if (!spot.visible) return null;
          const hs = artifact.hotspots[idx];
          const isSelected = spot.id === selectedHotspotId;
          return (
            <button
              key={spot.id}
              type="button"
              onClick={() => hs && onSelectHotspot(hs)}
              style={{ left: `${spot.x}px`, top: `${spot.y}px` }}
              aria-label={`Inspect component: ${spot.label}`}
              className={`absolute -translate-x-1/2 -translate-y-1/2 z-10 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono-archival transition-all cursor-pointer border shadow-lg ${
                isSelected
                  ? 'bg-[#D9822B] text-[#090B0D] border-[#F6B26B] font-semibold scale-105'
                  : 'bg-[#090B0D]/90 text-[#F0F2F2] border-white/30 hover:border-[#A6C7A9]'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-current" />
              <span className="whitespace-nowrap">{spot.label}</span>
            </button>
          );
        })}

      {/* Viewport Controls */}
      <div className="absolute top-2.5 left-3 right-3 flex items-center justify-between pointer-events-none">
        <span className="px-2 py-0.5 rounded bg-[#090B0D]/85 border border-white/10 text-[10px] font-mono-archival text-[#899398]">
          DRAG TO ORBIT · CLICK COMPONENT TAGS
        </span>
        <div className="flex items-center gap-1 pointer-events-auto">
          <button
            type="button"
            onClick={() => setZoom((z) => Math.max(0.75, Number((z - 0.15).toFixed(2))))}
            aria-label="Zoom out specimen"
            className="p-1.5 rounded bg-[#090B0D]/85 border border-white/15 text-[#BFC7CB] hover:text-[#F0F2F2] cursor-pointer"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setZoom((z) => Math.min(1.75, Number((z + 0.15).toFixed(2))))}
            aria-label="Zoom in specimen"
            className="p-1.5 rounded bg-[#090B0D]/85 border border-white/15 text-[#BFC7CB] hover:text-[#F0F2F2] cursor-pointer"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setResetTick((t) => t + 1)}
            aria-label="Reset specimen orientation"
            className="p-1.5 rounded bg-[#090B0D]/85 border border-white/15 text-[#BFC7CB] hover:text-[#A6C7A9] cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export const ArtifactModal: React.FC<ArtifactModalProps> = ({
  artifact,
  narrationEnabled = false,
  onClose,
}) => {
  const [selectedHotspotId, setSelectedHotspotId] = useState<string>('');
  const [detailTab, setDetailTab] = useState<'context' | 'impact'>('context');

  useEffect(() => {
    if (artifact?.hotspots?.length) {
      setSelectedHotspotId(artifact.hotspots[0].id);
      setDetailTab('context');
    }
  }, [artifact]);

  const activeHotspot = useMemo(() => {
    if (!artifact) return null;
    return artifact.hotspots.find((h) => h.id === selectedHotspotId) ?? artifact.hotspots[0] ?? null;
  }, [artifact, selectedHotspotId]);

  if (!artifact) return null;

  const isRelic = artifact.layoutMode === 'relic';
  const isBlueprint = artifact.layoutMode === 'blueprint';
  const isNeural = artifact.layoutMode === 'neural';

  const modeBadge = isRelic
    ? 'RELIC AUTOPSY · MATERIAL PROVENANCE'
    : isBlueprint
    ? 'SCHEMATIC AUTOPSY · SYSTEM ARCHITECTURE'
    : 'NEURAL SYNTHESIS AUTOPSY · ETHICAL PERSPECTIVE';

  const modeAccent = isRelic
    ? 'text-[#D9822B] border-[#D9822B]/35'
    : isNeural
    ? 'text-[#A6C7A9] border-[#A6C7A9]/40'
    : 'text-[#BFC7CB] border-white/25';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="artifact-modal-title"
      className="no-print fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-[#090B0D]/85 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="modal-reveal w-full max-w-4xl bg-[#111619] border border-white/15 rounded-xl p-5 sm:p-7 shadow-2xl my-auto max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Layout-Tailored Header */}
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-white/10">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono-archival">
              <span className={`px-2 py-0.5 rounded border ${modeAccent}`}>{modeBadge}</span>
              <span className="text-[#899398]">
                {artifact.accessionCode} · {artifact.era}
                {artifact.perspectiveTag ? ` · ${artifact.perspectiveTag}` : ''}
              </span>
            </div>
            <h3 id="artifact-modal-title" className="font-display text-2xl sm:text-3xl font-semibold text-[#F0F2F2] mt-2">
              {artifact.name}
            </h3>
            <p className="mt-1 text-xs sm:text-sm text-[#A6C7A9]">{artifact.summary}</p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
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

        {/* Two-Column Autopsy Stage: Left = 3D Interactive Specimen + Component Breakdown, Right = Tailored Spec Dossier */}
        <div className="mt-5 grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Interactive 3D Specimen Column */}
          <div className="lg:col-span-6 space-y-3.5">
            <ArtifactAutopsyViewport
              artifact={artifact}
              selectedHotspotId={activeHotspot?.id ?? ''}
              onSelectHotspot={(hs) => {
                audioEngine.playEraSound('click');
                setSelectedHotspotId(hs.id);
              }}
            />

            {/* Hotspot Switcher Bar */}
            <div className="grid grid-cols-3 gap-2">
              {artifact.hotspots.map((hs) => {
                const active = activeHotspot?.id === hs.id;
                return (
                  <button
                    key={hs.id}
                    type="button"
                    onClick={() => {
                      audioEngine.playEraSound('click');
                      setSelectedHotspotId(hs.id);
                    }}
                    className={`p-2 rounded-lg border text-left transition-colors cursor-pointer ${
                      active
                        ? 'bg-[#1D1711] border-[#D9822B] text-[#F0F2F2]'
                        : 'bg-[#090B0D] border-white/10 text-[#899398] hover:border-white/30 hover:text-[#F0F2F2]'
                    }`}
                  >
                    <div className="flex items-center gap-1 text-[10px] font-mono-archival text-[#D9822B]">
                      <Crosshair className="w-3 h-3 shrink-0" />
                      <span className="truncate">{hs.label}</span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Active Component Autopsy Readout */}
            {activeHotspot && (
              <div className="p-4 rounded-lg bg-[#090B0D] border border-[#D9822B]/35">
                <div className="flex items-center justify-between gap-2 text-[11px] font-mono-archival text-[#D9822B]">
                  <span>COMPONENT AUTOPSY · {activeHotspot.label.toUpperCase()}</span>
                  <span className="text-[#899398]">{activeHotspot.part}</span>
                </div>
                <p className="mt-1.5 text-xs sm:text-sm text-[#F0F2F2]/90 leading-relaxed">
                  {activeHotspot.detail}
                </p>
              </div>
            )}
          </div>

          {/* Right Archival Metadata & Essay Column */}
          <div className="lg:col-span-6 flex flex-col justify-between gap-4">
            <div className="space-y-4">
              {/* Physical / Technical Specimen Telemetry Strip */}
              <div
                className={`p-4 rounded-lg border ${
                  isRelic
                    ? 'bg-[#14110E] border-[#D9822B]/30'
                    : isBlueprint
                    ? 'bg-[#0B1216] border-white/15'
                    : 'bg-[#0D1411] border-[#A6C7A9]/30'
                }`}
              >
                <div className="flex items-center gap-2 text-[11px] font-mono-archival text-[#899398] uppercase">
                  <Layers className="w-3.5 h-3.5 text-[#A6C7A9]" aria-hidden="true" />
                  <span>Specimen Specifications</span>
                </div>
                <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                  <div>
                    <div className="text-[10px] font-mono-archival text-[#899398]">COMPOSITION</div>
                    <div className="text-[#F0F2F2] mt-0.5">{artifact.materialProfile}</div>
                  </div>
                  <div>
                    <div className="text-[10px] font-mono-archival text-[#899398]">CALIBRATION</div>
                    <div className="font-mono-archival text-[#A6C7A9] mt-0.5">{artifact.dimensionsLabel}</div>
                  </div>
                </div>
              </div>

              {/* Tab Switcher for clean dense readability */}
              <div className="flex gap-2 p-1 rounded-lg bg-[#090B0D] border border-white/10 w-fit">
                <button
                  type="button"
                  onClick={() => setDetailTab('context')}
                  className={`px-3 py-1 text-xs rounded transition-colors cursor-pointer ${
                    detailTab === 'context'
                      ? 'bg-[#F0F2F2] text-[#090B0D] font-medium'
                      : 'text-[#899398] hover:text-[#F0F2F2]'
                  }`}
                >
                  Origins &amp; Significance
                </button>
                <button
                  type="button"
                  onClick={() => setDetailTab('impact')}
                  className={`px-3 py-1 text-xs rounded transition-colors cursor-pointer ${
                    detailTab === 'impact'
                      ? 'bg-[#A6C7A9] text-[#090B0D] font-medium'
                      : 'text-[#899398] hover:text-[#F0F2F2]'
                  }`}
                >
                  Long-Term Impact
                </button>
              </div>

              {detailTab === 'context' ? (
                <dl className="space-y-3.5 text-sm">
                  <div className="p-3.5 rounded-lg bg-[#090B0D] border border-white/10">
                    <dt className="text-[11px] font-mono-archival uppercase tracking-wider text-[#899398]">
                      Historical Context
                    </dt>
                    <dd className="mt-1.5 text-[#F0F2F2]/90 leading-relaxed text-xs sm:text-sm">
                      {artifact.historicalContext}
                    </dd>
                  </div>
                  <div className="p-3.5 rounded-lg bg-[#090B0D] border border-white/10">
                    <dt className="text-[11px] font-mono-archival uppercase tracking-wider text-[#899398]">
                      Why It Mattered
                    </dt>
                    <dd className="mt-1.5 text-[#F0F2F2]/90 leading-relaxed text-xs sm:text-sm">
                      {artifact.whyItMattered}
                    </dd>
                  </div>
                </dl>
              ) : (
                <div className="space-y-3.5 text-sm">
                  <div className="p-4 rounded-lg bg-[#090B0D] border border-[#A6C7A9]/30">
                    <div className="text-[11px] font-mono-archival uppercase tracking-wider text-[#A6C7A9]">
                      Impact on Humanity
                    </div>
                    <p className="mt-1.5 text-[#F0F2F2]/95 leading-relaxed text-xs sm:text-sm">
                      {artifact.impactOnHumanity}
                    </p>
                  </div>
                  <div className="p-3.5 rounded-lg bg-[#090B0D] border border-white/10 flex items-center gap-2.5 text-xs text-[#899398]">
                    <ShieldCheck className="w-4 h-4 text-[#A6C7A9] shrink-0" />
                    <span>
                      Verified inside Archivist’s Journal · {artifact.accessionCode} logged to Chapter 0{artifact.chapter}.
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-white/10 flex items-center justify-between gap-3">
              <span className="text-[11px] font-mono-archival text-[#899398]">
                INSPECTED SPECIMEN INDEXED
              </span>
              <button
                type="button"
                onClick={onClose}
                data-magnetic="true"
                className="px-4 py-2 text-xs font-medium bg-[#F0F2F2] text-[#090B0D] hover:bg-[#A6C7A9] rounded transition-colors cursor-pointer"
              >
                Return to Scene
              </button>
            </div>
          </div>
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
      className="no-print modal-reveal fixed bottom-5 right-5 sm:right-20 z-50 max-w-md bg-[#111619] border border-[#D9822B]/60 rounded-xl p-5 shadow-2xl"
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
      className="no-print modal-reveal fixed bottom-5 left-5 sm:left-10 z-50 max-w-md bg-[#0E1512] border border-[#A6C7A9]/65 rounded-xl p-5 shadow-2xl"
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
