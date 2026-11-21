import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  ChapterId,
  DecisionsState,
  PathOutcome,
} from '../types/archive';
import { ARTIFACTS, GLOBE_NODES, LOST_ARTIFACTS, SECRET_MEMORIES } from '../data/artifacts';
import { audioEngine } from '../logic/audioEngine';
import {
  createAnimatedCRTCanvas,
  createBlueprintTexture,
  createBrushedMetalMaps,
  createClockFaceTexture,
  createDisplacedTerrainGeometry,
  createGaugeDialTexture,
  createGlyphTexture,
  createNoteTexture,
  createPCBTexture,
  createProceduralGearGeometry,
  createSoftParticleTexture,
  createWebSlateTexture,
  createWorldGlobeMaps,
} from './proceduralAssets';

export interface HoveredSceneTarget {
  id: string;
  label: string;
  sublabel: string;
  kind: 'artifact' | 'lost' | 'secret' | 'globe' | 'gear';
  x: number;
  y: number;
}

interface ArchiveCanvasProps {
  activeChapter: ChapterId;
  chapterProgress: number;
  stageIndex: number;
  stageProgress: number;
  decisions: DecisionsState;
  focusedArtifactId: string | null;
  discoveredLostArtifacts: string[];
  unlockedSecrets: string[];
  activatedGearStage: number;
  selectedGlobeNodeId: string | null;
  globeZoom: number;
  endingOutcome: PathOutcome;
  reducedMotion: boolean;
  whatIfPreview: { chapter: number; option: string } | null;
  onSelectArtifact: (artifactId: string) => void;
  onDiscoverLostArtifact: (lostId: string) => void;
  onDiscoverSecret: (secretId: string) => void;
  onSelectGlobeNode: (nodeId: string) => void;
  onActivateGear: (stageIndex: number) => void;
  onHoverTarget?: (target: HoveredSceneTarget | null) => void;
}

const _v1 = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _vProj = new THREE.Vector3();
const _rayMouse = new THREE.Vector2();

function latLonToVector3(lat: number, lon: number, radius: number): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  const x = -(radius * Math.sin(phi) * Math.cos(theta));
  const z = radius * Math.sin(phi) * Math.sin(theta);
  const y = radius * Math.cos(phi);
  return new THREE.Vector3(x, y, z);
}

function tagInteractiveTree(obj: THREE.Object3D, tagKey: string, tagVal: string) {
  obj.userData[tagKey] = tagVal;
  obj.traverse((child) => {
    child.userData[tagKey] = tagVal;
  });
}

function isObjectEffectivelyVisible(obj: THREE.Object3D): boolean {
  let curr: THREE.Object3D | null = obj;
  while (curr) {
    if (!curr.visible) return false;
    curr = curr.parent;
  }
  return true;
}

export const ArchiveCanvas: React.FC<ArchiveCanvasProps> = ({
  activeChapter,
  chapterProgress,
  stageIndex,
  stageProgress,
  decisions,
  focusedArtifactId,
  discoveredLostArtifacts,
  unlockedSecrets,
  activatedGearStage,
  selectedGlobeNodeId,
  globeZoom,
  endingOutcome,
  reducedMotion,
  whatIfPreview,
  onSelectArtifact,
  onDiscoverLostArtifact,
  onDiscoverSecret,
  onSelectGlobeNode,
  onActivateGear,
  onHoverTarget,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [webglError, setWebglError] = useState(false);

  const stateRef = useRef({
    activeChapter,
    chapterProgress,
    stageIndex,
    stageProgress,
    decisions,
    focusedArtifactId,
    discoveredLostArtifacts,
    unlockedSecrets,
    activatedGearStage,
    selectedGlobeNodeId,
    globeZoom,
    endingOutcome,
    reducedMotion,
    whatIfPreview,
  });
  stateRef.current = {
    activeChapter,
    chapterProgress,
    stageIndex,
    stageProgress,
    decisions,
    focusedArtifactId,
    discoveredLostArtifacts,
    unlockedSecrets,
    activatedGearStage,
    selectedGlobeNodeId,
    globeZoom,
    endingOutcome,
    reducedMotion,
    whatIfPreview,
  };

  const callbacksRef = useRef({
    onSelectArtifact,
    onDiscoverLostArtifact,
    onDiscoverSecret,
    onSelectGlobeNode,
    onActivateGear,
    onHoverTarget,
  });
  callbacksRef.current = {
    onSelectArtifact,
    onDiscoverLostArtifact,
    onDiscoverSecret,
    onSelectGlobeNode,
    onActivateGear,
    onHoverTarget,
  };

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    let isSoftwareGl = false;
    try {
      const probeCanvas = document.createElement('canvas');
      const gl = probeCanvas.getContext('webgl2') || probeCanvas.getContext('webgl');
      if (!gl) {
        setWebglError(true);
        return;
      }
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      isSoftwareGl = /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    } catch {
      setWebglError(true);
      return;
    }

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !isSoftwareGl,
        powerPreference: 'high-performance',
        alpha: false,
      });
    } catch {
      setWebglError(true);
      return;
    }

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';

    container.appendChild(renderer.domElement);

    const handleContextLost = (e: Event) => {
      e.preventDefault();
      setWebglError(true);
    };
    const handleContextRestored = () => {
      setWebglError(false);
    };
    renderer.domElement.addEventListener('webglcontextlost', handleContextLost);
    renderer.domElement.addEventListener('webglcontextrestored', handleContextRestored);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#090B0D');
    scene.fog = new THREE.FogExp2('#090B0D', 0.04);

    const camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.1, 140);
    camera.position.set(0, 0.3, 7.6);

    const pmrem = new THREE.PMREMGenerator(renderer);
    const roomEnv = new RoomEnvironment();
    const envTex = pmrem.fromScene(roomEnv, 0.04).texture;
    scene.environment = envTex;
    roomEnv.dispose();
    pmrem.dispose();

    // 3-Point Studio Rig + Era Accent Light
    const hemiLight = new THREE.HemisphereLight('#C7D0D4', '#101518', 0.65);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight('#FFF5E8', 2.0);
    keyLight.position.set(6, 9, 7);
    if (!isSoftwareGl) {
      keyLight.castShadow = true;
      keyLight.shadow.mapSize.set(1024, 1024);
      keyLight.shadow.bias = -0.0005;
      keyLight.shadow.normalBias = 0.02;
    }
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight('#A6C7A9', 1.1);
    rimLight.position.set(-6, 4, -5);
    scene.add(rimLight);

    const eraPointLight = new THREE.PointLight('#D9822B', 2.6, 22, 1.4);
    eraPointLight.position.set(1.8, 1.0, 2.5);
    scene.add(eraPointLight);

    const hoverPointLight = new THREE.PointLight('#F0D5A8', 0, 4.8, 1.6);
    scene.add(hoverPointLight);

    // Subtle Volumetric-Looking Overhead Light Beam Cone across eras
    const eraBeamMat = new THREE.MeshBasicMaterial({
      color: '#BFC7CB',
      transparent: true,
      opacity: isSoftwareGl ? 0.025 : 0.055,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const eraLightBeam = new THREE.Mesh(new THREE.ConeGeometry(2.65, 6.8, 28, 1, true), eraBeamMat);
    eraLightBeam.position.set(1.5, 1.25, -0.4);
    eraLightBeam.rotation.z = 0.22;
    scene.add(eraLightBeam);

    // Procedural PBR Maps
    const maxAniso = renderer.capabilities.getMaxAnisotropy();
    const metalMaps = createBrushedMetalMaps();
    metalMaps.roughnessMap.anisotropy = maxAniso;
    metalMaps.bumpMap.anisotropy = maxAniso;

    const smokeTex = createSoftParticleTexture('rgba(190,196,200,0.28)', 'rgba(130,140,145,0.08)');
    const crtRig = createAnimatedCRTCanvas();
    crtRig.texture.anisotropy = maxAniso;
    const pcbTex = createPCBTexture();
    pcbTex.anisotropy = maxAniso;
    const dialTex = createGaugeDialTexture();
    dialTex.anisotropy = maxAniso;
    const clockFaceTex = createClockFaceTexture();
    clockFaceTex.anisotropy = maxAniso;
    const blueprintTex = createBlueprintTexture();
    blueprintTex.anisotropy = maxAniso;
    const glyphTex = createGlyphTexture(false);
    glyphTex.anisotropy = maxAniso;
    const secretGlyphTex = createGlyphTexture(true);
    secretGlyphTex.anisotropy = maxAniso;
    const globeMaps = createWorldGlobeMaps();
    globeMaps.map.anisotropy = maxAniso;
    const webSlateTex = createWebSlateTexture();
    webSlateTex.anisotropy = maxAniso;
    const noteTex = createNoteTexture();
    noteTex.anisotropy = maxAniso;

    // Materials Library
    const chromeHeroMat = new THREE.MeshPhysicalMaterial({
      color: '#DCE2E6',
      metalness: 0.98,
      roughness: 0.14,
      roughnessMap: metalMaps.roughnessMap,
      bumpMap: metalMaps.bumpMap,
      bumpScale: 0.012,
      clearcoat: 0.85,
      clearcoatRoughness: 0.08,
      envMapIntensity: 1.35,
    });
    const brushedSilverMat = new THREE.MeshStandardMaterial({
      color: '#BFC7CB',
      metalness: 0.88,
      roughness: 0.28,
      roughnessMap: metalMaps.roughnessMap,
      bumpMap: metalMaps.bumpMap,
      bumpScale: 0.01,
    });
    const darkTitaniumMat = new THREE.MeshStandardMaterial({
      color: '#20272C',
      metalness: 0.78,
      roughness: 0.44,
    });
    const basaltMat = new THREE.MeshStandardMaterial({
      color: '#1A1C1E',
      metalness: 0.08,
      roughness: 0.9,
      flatShading: true,
    });
    const silhouetteMat = new THREE.MeshStandardMaterial({
      color: '#121417',
      metalness: 0.1,
      roughness: 0.85,
    });
    const emberMat = new THREE.MeshStandardMaterial({
      color: '#42190D',
      emissive: '#D9822B',
      emissiveIntensity: 2.3,
      roughness: 0.6,
      metalness: 0.1,
    });
    const brassMat = new THREE.MeshStandardMaterial({
      color: '#C29B59',
      metalness: 0.9,
      roughness: 0.22,
      roughnessMap: metalMaps.roughnessMap,
    });
    const darkIronMat = new THREE.MeshStandardMaterial({
      color: '#2B3237',
      metalness: 0.82,
      roughness: 0.48,
    });
    const greenAccentMat = new THREE.MeshStandardMaterial({
      color: '#A6C7A9',
      emissive: '#4D7C55',
      emissiveIntensity: 0.95,
      metalness: 0.35,
      roughness: 0.28,
    });
    const opticalGlassMat = new THREE.MeshPhysicalMaterial({
      color: '#E6F0EB',
      metalness: 0.05,
      roughness: 0.08,
      transparent: true,
      opacity: isSoftwareGl ? 0.32 : 0.4,
      ior: 1.55,
      clearcoat: 1.0,
      depthWrite: false,
    });
    const woodMat = new THREE.MeshStandardMaterial({
      color: '#5A402E',
      roughness: 0.88,
      metalness: 0.03,
    });
    const holoWireMat = new THREE.MeshBasicMaterial({
      color: '#A6C7A9',
      wireframe: true,
      transparent: true,
      opacity: 0.35,
    });

    // Ambient Museum Dust
    const dustCount = 110;
    const dustMesh = new THREE.InstancedMesh(
      new THREE.OctahedronGeometry(0.016, 0),
      new THREE.MeshBasicMaterial({ color: '#BFC7CB', transparent: true, opacity: 0.38 }),
      dustCount
    );
    dustMesh.frustumCulled = false;
    const dustData = Array.from({ length: dustCount }, () => ({
      x: (Math.random() - 0.5) * 14,
      y: (Math.random() - 0.5) * 9,
      z: (Math.random() - 0.5) * 10 - 1,
      speed: 0.08 + Math.random() * 0.15,
      phase: Math.random() * Math.PI * 2,
      scale: 0.5 + Math.random() * 1.1,
    }));
    scene.add(dustMesh);

    // Discovery Burst Pool
    const burstCount = 36;
    const burstMesh = new THREE.InstancedMesh(
      new THREE.OctahedronGeometry(0.032, 0),
      new THREE.MeshBasicMaterial({ color: '#F6B26B', transparent: true, opacity: 0.95 }),
      burstCount
    );
    burstMesh.frustumCulled = false;
    burstMesh.visible = false;
    scene.add(burstMesh);
    const burstOrigin = new THREE.Vector3();
    const burstDirs = Array.from({ length: burstCount }, () => {
      const v = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.2, Math.random() - 0.5).normalize();
      return v.multiplyScalar(0.8 + Math.random() * 1.6);
    });
    let burstAge = 999;

    const triggerDiscoveryBurst = (worldPos: THREE.Vector3) => {
      burstOrigin.copy(worldPos);
      burstAge = 0;
      burstMesh.visible = true;
    };

    const dummy = new THREE.Object3D();
    const artifactLookup = new Map<string, THREE.Object3D>();
    const lostLookup = new Map<string, THREE.Object3D>();
    const secretLookup = new Map<string, THREE.Object3D>();
    let hoveredObjectId: string | null = null;

    // =========================================================================
    // 0. OPENING INTRO GROUP: 6-Scene Scroll Transformation
    // =========================================================================
    const introGroup = new THREE.Group();
    const heroShellL = new THREE.Mesh(
      new THREE.SphereGeometry(0.72, 48, 48, 0, Math.PI),
      chromeHeroMat
    );
    const heroShellR = new THREE.Mesh(
      new THREE.SphereGeometry(0.72, 48, 48, Math.PI, Math.PI),
      chromeHeroMat
    );
    const heroInnerWire = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.42, 1),
      new THREE.MeshBasicMaterial({ color: '#A6C7A9', wireframe: true, transparent: true, opacity: 0.55 })
    );
    const heroOrbit1 = new THREE.Mesh(new THREE.TorusGeometry(1.06, 0.012, 12, 96), brushedSilverMat);
    heroOrbit1.rotation.x = 0.45;
    const heroOrbit2 = new THREE.Mesh(new THREE.TorusGeometry(1.36, 0.009, 12, 96), darkTitaniumMat);
    heroOrbit2.rotation.set(Math.PI / 3, 0.4, 0);
    const heroOrbit3 = new THREE.Mesh(new THREE.TorusGeometry(1.68, 0.007, 12, 96), greenAccentMat);
    heroOrbit3.rotation.set(-0.5, Math.PI / 4, 0.2);

    // Scene 3 radial metallic network filaments emerging from sphere
    const introNetworkLines = new THREE.Group();
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      const b = ((i % 5) - 2) * 0.42;
      const p0 = new THREE.Vector3(Math.cos(a) * 0.72, b * 0.4, Math.sin(a) * 0.72);
      const p1 = new THREE.Vector3(Math.cos(a + 0.35) * 1.45, b, Math.sin(a + 0.35) * 1.45);
      const p2 = new THREE.Vector3(Math.cos(a + 0.7) * 2.1, b * 1.3, Math.sin(a + 0.7) * 2.1);
      const curve = new THREE.CatmullRomCurve3([p0, p1, p2]);
      const mesh = new THREE.Mesh(
        new THREE.TubeGeometry(curve, 12, 0.006, 5, false),
        new THREE.MeshBasicMaterial({ color: '#BFC7CB', transparent: true, opacity: 0.45 })
      );
      introNetworkLines.add(mesh);
    }

    const lightShaft = new THREE.Mesh(
      new THREE.ConeGeometry(1.4, 3.4, 32, 1, true),
      new THREE.MeshBasicMaterial({
        color: '#A6C7A9',
        transparent: true,
        opacity: 0.04,
        side: THREE.DoubleSide,
        depthWrite: false,
      })
    );
    lightShaft.position.y = -0.35;

    const heroSatCount = 14;
    const heroSats = new THREE.InstancedMesh(
      new THREE.OctahedronGeometry(0.032, 0),
      brushedSilverMat,
      heroSatCount
    );
    heroSats.frustumCulled = false;
    const heroSatSpecs = Array.from({ length: heroSatCount }, (_, i) => ({
      radius: 1.12 + (i % 3) * 0.35,
      speed: 0.28 + (i % 4) * 0.14,
      tilt: (i % 3) * 0.55 - 0.5,
      phase: (i / heroSatCount) * Math.PI * 2,
    }));

    introGroup.add(
      heroShellL,
      heroShellR,
      heroInnerWire,
      heroOrbit1,
      heroOrbit2,
      heroOrbit3,
      introNetworkLines,
      lightShaft,
      heroSats
    );
    scene.add(introGroup);

    // =========================================================================
    // 1. CHAPTER 1: Prehistoric Valley, Cave, 5 Artifacts, Silhouettes & Secret Glyph
    // =========================================================================
    const ch1Group = new THREE.Group();
    const caveFloor = new THREE.Mesh(createDisplacedTerrainGeometry(5.2, 32, 3.1), basaltMat);
    caveFloor.position.y = -2.0;
    caveFloor.receiveShadow = true;
    ch1Group.add(caveFloor);

    // Distant mountain peaks along outer ridge
    const ch1Mountains = new THREE.Group();
    for (let m = 0; m < 9; m++) {
      const a = Math.PI * 0.65 + (m / 8) * Math.PI * 0.7;
      const peak = new THREE.Mesh(
        new THREE.ConeGeometry(1.15 + (m % 3) * 0.35, 2.2 + (m % 2) * 0.9, 6),
        silhouetteMat
      );
      peak.position.set(Math.cos(a) * 5.6, -1.0, Math.sin(a) * 4.5 - 2.0);
      ch1Mountains.add(peak);
    }
    ch1Group.add(ch1Mountains);

    // Irregular rock cavern formations
    const rockSpecs: Array<[number, number, number, number, number, number]> = [
      [-2.8, -0.4, -2.1, 0.9, 3.1, 0.2],
      [-1.8, -0.7, -2.8, 0.75, 2.4, 0.8],
      [2.7, -0.3, -2.2, 0.95, 3.3, -0.3],
      [1.7, -0.8, -2.9, 0.7, 2.2, 1.1],
      [-2.3, -1.2, 1.4, 0.5, 1.1, 0.5],
      [2.3, -1.1, 1.5, 0.55, 1.2, -0.6],
    ];
    rockSpecs.forEach(([x, y, z, r, h, rot]) => {
      const col = new THREE.Group();
      const mainRock = new THREE.Mesh(new THREE.ConeGeometry(r, h, 7), basaltMat);
      const sideSpur = new THREE.Mesh(new THREE.DodecahedronGeometry(r * 0.65, 0), basaltMat);
      sideSpur.position.set(r * 0.4, -h * 0.28, r * 0.2);
      col.add(mainRock, sideSpur);
      col.position.set(x, y, z);
      col.rotation.y = rot;
      ch1Group.add(col);
    });

    // Gathering human silhouettes around hearth (Stage 3+)
    const ch1Silhouettes = new THREE.Group();
    const silAngles = [-2.2, -1.4, 1.5, 2.3];
    silAngles.forEach((a, idx) => {
      const fig = new THREE.Group();
      const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.16, 0.78, 8), silhouetteMat);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 10), silhouetteMat);
      head.position.y = 0.5;
      fig.add(torso, head);
      fig.position.set(1.45 + Math.cos(a) * 1.15, -1.22 + (idx % 2) * 0.04, 0.55 + Math.sin(a) * 1.0);
      fig.lookAt(1.45, -1.2, 0.55);
      ch1Silhouettes.add(fig);
    });
    ch1Group.add(ch1Silhouettes);

    // Artifact 1A: The Ember
    const artEmber = new THREE.Group();
    artEmber.position.set(0, 0.05, 0.1);
    const emberCore = new THREE.Mesh(new THREE.IcosahedronGeometry(0.4, 2), emberMat);
    for (let c = 0; c < 4; c++) {
      const shard = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.11, 0.72, 7), basaltMat);
      shard.rotation.z = Math.PI / 2.2;
      shard.rotation.y = (c / 4) * Math.PI * 2;
      shard.position.y = -0.22;
      artEmber.add(shard);
    }
    const emberHalo = new THREE.Mesh(new THREE.TorusGeometry(0.72, 0.012, 10, 48), emberMat);
    emberHalo.rotation.x = Math.PI / 2.2;
    artEmber.add(emberCore, emberHalo);
    tagInteractiveTree(artEmber, 'artifactId', 'art-ember');
    ch1Group.add(artEmber);
    artifactLookup.set('art-ember', artEmber);

    // Artifact 1B: The Stone Tool
    const artStoneTool = new THREE.Group();
    artStoneTool.position.set(-1.55, -0.35, 0.75);
    const bladeShape = new THREE.Shape();
    bladeShape.moveTo(0, 0.52);
    bladeShape.lineTo(0.22, 0.1);
    bladeShape.lineTo(0.13, -0.32);
    bladeShape.lineTo(-0.13, -0.32);
    bladeShape.lineTo(-0.22, 0.1);
    bladeShape.closePath();
    const bladeGeo = new THREE.ExtrudeGeometry(bladeShape, {
      depth: 0.08,
      bevelEnabled: true,
      bevelSize: 0.028,
      bevelThickness: 0.028,
    });
    bladeGeo.center();
    const bladeMesh = new THREE.Mesh(
      bladeGeo,
      new THREE.MeshStandardMaterial({ color: '#616A6E', roughness: 0.62, metalness: 0.14, flatShading: true })
    );
    bladeMesh.position.y = 0.24;
    const haftMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.055, 0.072, 0.96, 12),
      woodMat
    );
    haftMesh.position.y = -0.36;
    const sinewWrap = new THREE.Mesh(
      new THREE.TorusGeometry(0.1, 0.028, 8, 20),
      new THREE.MeshStandardMaterial({ color: '#8C7456', roughness: 0.8 })
    );
    sinewWrap.rotation.x = Math.PI / 2;
    sinewWrap.position.y = -0.02;
    artStoneTool.add(bladeMesh, haftMesh, sinewWrap);
    artStoneTool.rotation.z = -0.25;
    tagInteractiveTree(artStoneTool, 'artifactId', 'art-stone-tool');
    ch1Group.add(artStoneTool);
    artifactLookup.set('art-stone-tool', artStoneTool);

    // Artifact 1C: The Shared Flame
    const artSharedFlame = new THREE.Group();
    artSharedFlame.position.set(1.45, -1.1, 0.55);
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2;
      const stone = new THREE.Mesh(new THREE.DodecahedronGeometry(0.14, 0), basaltMat);
      stone.position.set(Math.cos(a) * 0.44, -0.14, Math.sin(a) * 0.44);
      artSharedFlame.add(stone);
    }
    const flameOuter = new THREE.Mesh(
      new THREE.ConeGeometry(0.28, 0.82, 9),
      new THREE.MeshStandardMaterial({ color: '#C95D3A', emissive: '#D9822B', emissiveIntensity: 1.9, transparent: true, opacity: 0.85 })
    );
    flameOuter.position.y = 0.24;
    const flameMid = new THREE.Mesh(
      new THREE.ConeGeometry(0.19, 0.65, 8),
      new THREE.MeshStandardMaterial({ color: '#F6B26B', emissive: '#E09145', emissiveIntensity: 2.5 })
    );
    flameMid.position.set(0.04, 0.2, 0.03);
    const flameInner = new THREE.Mesh(
      new THREE.ConeGeometry(0.1, 0.42, 7),
      new THREE.MeshBasicMaterial({ color: '#FFF6DF' })
    );
    flameInner.position.set(-0.02, 0.12, 0.02);
    artSharedFlame.add(flameOuter, flameMid, flameInner);
    tagInteractiveTree(artSharedFlame, 'artifactId', 'art-shared-flame');
    ch1Group.add(artSharedFlame);
    artifactLookup.set('art-shared-flame', artSharedFlame);

    // Artifact 1D: Ancient Carving (Limestone slab incised with mineral ochre notches)
    const artCarving = new THREE.Group();
    artCarving.position.set(-1.3, 0.88, -0.85);
    const slabMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.68, 0.82, 0.14),
      new THREE.MeshStandardMaterial({ map: glyphTex, roughness: 0.85, metalness: 0.06 })
    );
    artCarving.add(slabMesh);
    artCarving.rotation.set(-0.08, 0.28, 0.05);
    tagInteractiveTree(artCarving, 'artifactId', 'art-ancient-carving');
    ch1Group.add(artCarving);
    artifactLookup.set('art-ancient-carving', artCarving);

    // Artifact 1E: Primitive Shelter (Ribbed bone-and-timber windbreak)
    const artShelter = new THREE.Group();
    artShelter.position.set(1.68, 0.72, -0.78);
    for (let r = 0; r < 5; r++) {
      const a = (r / 4) * Math.PI - Math.PI / 2;
      const rib = new THREE.Mesh(
        new THREE.TorusGeometry(0.45, 0.032, 6, 16, Math.PI),
        new THREE.MeshStandardMaterial({ color: '#6E5B4B', roughness: 0.82 })
      );
      rib.rotation.y = a * 0.45;
      artShelter.add(rib);
    }
    const shelterHide = new THREE.Mesh(
      new THREE.ConeGeometry(0.48, 0.56, 7, 1, true, 0, Math.PI * 1.3),
      new THREE.MeshStandardMaterial({ color: '#4B3A2C', roughness: 0.9, side: THREE.DoubleSide })
    );
    shelterHide.position.y = 0.24;
    artShelter.add(shelterHide);
    tagInteractiveTree(artShelter, 'artifactId', 'art-primitive-shelter');
    ch1Group.add(artShelter);
    artifactLookup.set('art-primitive-shelter', artShelter);

    // Hidden Secret 001: Ancient Glowing Hearth Glyph etched on cavern pillar
    const secret001 = new THREE.Group();
    secret001.position.set(2.15, -0.18, -1.65);
    const secGlyphStone = new THREE.Mesh(
      new THREE.CylinderGeometry(0.24, 0.24, 0.08, 16),
      new THREE.MeshStandardMaterial({
        map: secretGlyphTex,
        emissive: '#D9822B',
        emissiveIntensity: 0.65,
        roughness: 0.7,
      })
    );
    secGlyphStone.rotation.x = Math.PI / 2;
    secGlyphStone.rotation.z = -0.2;
    secret001.add(secGlyphStone);
    tagInteractiveTree(secret001, 'secretId', 'secret-001');
    ch1Group.add(secret001);
    secretLookup.set('secret-001', secret001);

    // Hidden Lost Artifact 001: Ember Fragment
    const lost001 = new THREE.Group();
    lost001.position.set(-2.05, -1.48, -0.55);
    const lost001Core = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.13, 0),
      new THREE.MeshStandardMaterial({ color: '#F6B26B', emissive: '#D9822B', emissiveIntensity: 2.8 })
    );
    const lost001Rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.16, 0), basaltMat);
    lost001Rock.position.set(-0.08, -0.05, 0.06);
    lost001.add(lost001Core, lost001Rock);
    tagInteractiveTree(lost001, 'lostArtifactId', 'lost-001');
    ch1Group.add(lost001);
    lostLookup.set('lost-001', lost001);

    // Rising Ember Particles + Smoke
    const emberCount = 80;
    const emberPartMesh = new THREE.InstancedMesh(
      new THREE.SphereGeometry(0.022, 6, 6),
      new THREE.MeshBasicMaterial({ color: '#F0A44E' }),
      emberCount
    );
    emberPartMesh.frustumCulled = false;
    const emberParticles = Array.from({ length: emberCount }, () => ({
      x: (Math.random() - 0.5) * 3.4,
      y: Math.random() * 4 - 1.6,
      z: (Math.random() - 0.5) * 2.8,
      speed: 0.4 + Math.random() * 0.75,
      phase: Math.random() * Math.PI * 2,
    }));
    const smokeCount = 14;
    const smokeMesh = new THREE.InstancedMesh(
      new THREE.PlaneGeometry(0.95, 0.95),
      new THREE.MeshBasicMaterial({ map: smokeTex, transparent: true, opacity: 0.35, depthWrite: false }),
      smokeCount
    );
    smokeMesh.frustumCulled = false;
    const smokeData = Array.from({ length: smokeCount }, (_, i) => ({
      x: 1.45 + (Math.random() - 0.5) * 0.6,
      y: (i / smokeCount) * 3.2 - 0.8,
      z: 0.5 + (Math.random() - 0.5) * 0.5,
      speed: 0.25 + Math.random() * 0.2,
      phase: Math.random() * Math.PI * 2,
    }));
    ch1Group.add(emberPartMesh, smokeMesh);
    scene.add(ch1Group);

    // =========================================================================
    // 2. CHAPTER 2: Industrial Skyline, Machine Room, 5 Artifacts & Worker Silhouettes
    // =========================================================================
    const ch2Group = new THREE.Group();
    const foundryBase = new THREE.Mesh(new THREE.CylinderGeometry(4.8, 5.1, 0.22, 28), darkIronMat);
    foundryBase.position.y = -2.0;
    ch2Group.add(foundryBase);

    // Distant Factory Chimney Skyline
    const ch2Skyline = new THREE.Group();
    for (let s = 0; s < 8; s++) {
      const bx = -3.8 + s * 1.1;
      const stack = new THREE.Mesh(
        new THREE.CylinderGeometry(0.14, 0.24, 2.2 + (s % 3) * 0.85, 10),
        silhouetteMat
      );
      stack.position.set(bx, -0.7, -3.4 - (s % 2) * 0.5);
      ch2Skyline.add(stack);
    }
    ch2Group.add(ch2Skyline);

    // Factory Labor Silhouettes (Stage 4 Human Cost)
    const ch2Workers = new THREE.Group();
    [-1.8, -0.75, 1.8].forEach((wx) => {
      const worker = new THREE.Group();
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.13, 0.85, 8), silhouetteMat);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 10), silhouetteMat);
      head.position.y = 0.54;
      worker.add(body, head);
      worker.position.set(wx, -1.45, -1.55);
      ch2Workers.add(worker);
    });
    ch2Group.add(ch2Workers);

    // Architectural Iron Gantry Frame
    const gantryBeam = new THREE.Mesh(new THREE.BoxGeometry(5.4, 0.18, 0.28), darkIronMat);
    gantryBeam.position.set(0, 1.95, -1.2);
    const gantryPillarL = new THREE.Mesh(new THREE.BoxGeometry(0.22, 3.9, 0.26), darkIronMat);
    gantryPillarL.position.set(-2.5, 0, -1.2);
    const gantryPillarR = gantryPillarL.clone();
    gantryPillarR.position.x = 2.5;
    ch2Group.add(gantryBeam, gantryPillarL, gantryPillarR);

    // Choice 1 Consequence Citadel Tower
    const citadelTower = new THREE.Group();
    const towerBody = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.62, 4.1, 8), darkIronMat);
    towerBody.position.set(-2.2, 0.1, -2.3);
    const towerBeacon = new THREE.Mesh(
      new THREE.CylinderGeometry(0.44, 0.44, 0.14, 8),
      new THREE.MeshStandardMaterial({ color: '#C95D3A', emissive: '#C95D3A', emissiveIntensity: 1.8 })
    );
    towerBeacon.position.set(-2.2, 1.75, -2.3);
    citadelTower.add(towerBody, towerBeacon);
    ch2Group.add(citadelTower);

    // Interactive 4-Gear Machine Room Train
    const machineGears: THREE.Mesh[] = [];
    const gearSpecs = [
      { id: 1, teeth: 14, r: 0.72, x: -0.98, y: 0.55, z: -0.7, mat: brassMat },
      { id: 2, teeth: 18, r: 0.94, x: 0.44, y: 0.16, z: -0.7, mat: brushedSilverMat },
      { id: 3, teeth: 12, r: 0.58, x: 1.56, y: 0.86, z: -0.7, mat: brassMat },
      { id: 4, teeth: 16, r: 0.82, x: 1.44, y: -0.72, z: -0.7, mat: darkTitaniumMat },
    ];
    gearSpecs.forEach((spec) => {
      const geo = createProceduralGearGeometry(spec.teeth, spec.r * 0.24, spec.r, 0.1, 0.16, 5);
      const mesh = new THREE.Mesh(geo, spec.mat.clone());
      mesh.position.set(spec.x, spec.y, spec.z);
      tagInteractiveTree(mesh, 'gearStage', String(spec.id));
      ch2Group.add(mesh);
      machineGears.push(mesh);
    });

    // Artifact 2A: Steam Engine
    const artSteamEngine = new THREE.Group();
    artSteamEngine.position.set(-1.55, -0.85, 0.85);
    const boiler = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.88, 22), darkIronMat);
    boiler.rotation.z = Math.PI / 2;
    const chimney = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.11, 0.78, 16), brushedSilverMat);
    chimney.position.set(-0.22, 0.45, 0);
    const gaugeRim = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.05, 20), brassMat);
    gaugeRim.rotation.x = Math.PI / 2;
    gaugeRim.position.set(0.15, 0.22, 0.31);
    const gaugeFace = new THREE.Mesh(
      new THREE.CircleGeometry(0.11, 20),
      new THREE.MeshBasicMaterial({ map: dialTex })
    );
    gaugeFace.position.set(0.15, 0.22, 0.34);
    const flywheel = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.045, 10, 32), brassMat);
    flywheel.position.set(0.38, 0.02, 0.34);
    const pistonRod = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.55, 8), brushedSilverMat);
    pistonRod.rotation.z = Math.PI / 2;
    pistonRod.position.set(0.1, 0.02, 0.38);
    artSteamEngine.add(boiler, chimney, gaugeRim, gaugeFace, flywheel, pistonRod);
    tagInteractiveTree(artSteamEngine, 'artifactId', 'art-steam-engine');
    ch2Group.add(artSteamEngine);
    artifactLookup.set('art-steam-engine', artSteamEngine);

    // Artifact 2B: Factory Gear
    const artFactoryGear = new THREE.Group();
    artFactoryGear.position.set(0.15, -0.35, 1.05);
    const mainSpur = new THREE.Mesh(createProceduralGearGeometry(16, 0.18, 0.64, 0.095, 0.18, 6), brassMat);
    const axle = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.42, 16), brushedSilverMat);
    axle.rotation.x = Math.PI / 2;
    artFactoryGear.add(mainSpur, axle);
    tagInteractiveTree(artFactoryGear, 'artifactId', 'art-factory-gear');
    ch2Group.add(artFactoryGear);
    artifactLookup.set('art-factory-gear', artFactoryGear);

    // Artifact 2C: Clockwork Machine
    const artClockwork = new THREE.Group();
    artClockwork.position.set(1.75, -0.55, 0.85);
    const clockBase = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.46, 0.12, 24), darkTitaniumMat);
    clockBase.position.y = -0.32;
    const clockRing1 = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.024, 10, 32), brassMat);
    const clockRing2 = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.02, 10, 28), brushedSilverMat);
    clockRing2.rotation.y = Math.PI / 2;
    const clockCore = new THREE.Mesh(new THREE.OctahedronGeometry(0.11, 0), brassMat);
    artClockwork.add(clockBase, clockRing1, clockRing2, clockCore);
    tagInteractiveTree(artClockwork, 'artifactId', 'art-clockwork-machine');
    ch2Group.add(artClockwork);
    artifactLookup.set('art-clockwork-machine', artClockwork);

    // Artifact 2D: Mechanical Railway Clock
    const artMechanicalClock = new THREE.Group();
    artMechanicalClock.position.set(-1.92, 1.32, -0.45);
    const regBezel = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.12, 28), brassMat);
    regBezel.rotation.x = Math.PI / 2;
    const regDial = new THREE.Mesh(
      new THREE.CircleGeometry(0.32, 28),
      new THREE.MeshBasicMaterial({ map: clockFaceTex })
    );
    regDial.position.z = 0.065;
    const regPendulum = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.55, 8), brassMat);
    regPendulum.position.y = -0.58;
    const regBob = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.04, 18), brassMat);
    regBob.rotation.x = Math.PI / 2;
    regBob.position.y = -0.84;
    artMechanicalClock.add(regBezel, regDial, regPendulum, regBob);
    tagInteractiveTree(artMechanicalClock, 'artifactId', 'art-mechanical-clock');
    ch2Group.add(artMechanicalClock);
    artifactLookup.set('art-mechanical-clock', artMechanicalClock);

    // Artifact 2E: Industrial Blueprint (Cyanotype Drafting Plate)
    const artBlueprint = new THREE.Group();
    artBlueprint.position.set(1.98, 1.34, -0.35);
    const bpPlate = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.72, 0.04), brushedSilverMat);
    const bpFace = new THREE.Mesh(
      new THREE.PlaneGeometry(0.88, 0.65),
      new THREE.MeshBasicMaterial({ map: blueprintTex })
    );
    bpFace.position.z = 0.024;
    artBlueprint.add(bpPlate, bpFace);
    artBlueprint.rotation.set(0.12, -0.28, 0);
    tagInteractiveTree(artBlueprint, 'artifactId', 'art-industrial-blueprint');
    ch2Group.add(artBlueprint);
    artifactLookup.set('art-industrial-blueprint', artBlueprint);

    // Hidden Lost Artifact 002: Pocket Watch
    const lost002 = new THREE.Group();
    lost002.position.set(2.38, -1.28, -0.95);
    const watchCase = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.06, 24), brassMat);
    watchCase.rotation.x = Math.PI / 2.2;
    const watchFace = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.12, 0.07, 24),
      new THREE.MeshStandardMaterial({ color: '#F0ECE1', emissive: '#D9822B', emissiveIntensity: 0.45 })
    );
    watchFace.rotation.x = Math.PI / 2.2;
    const watchCrown = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.012, 8, 16), brassMat);
    watchCrown.position.y = 0.19;
    lost002.add(watchCase, watchFace, watchCrown);
    tagInteractiveTree(lost002, 'lostArtifactId', 'lost-002');
    ch2Group.add(lost002);
    lostLookup.set('lost-002', lost002);

    // Steam Vents
    const steamCount = 16;
    const steamMesh = new THREE.InstancedMesh(
      new THREE.PlaneGeometry(0.65, 0.65),
      new THREE.MeshBasicMaterial({ map: smokeTex, transparent: true, opacity: 0.36, depthWrite: false }),
      steamCount
    );
    steamMesh.frustumCulled = false;
    const steamData = Array.from({ length: steamCount }, (_, i) => ({
      y: (i / steamCount) * 2.4,
      phase: Math.random() * Math.PI * 2,
      speed: 0.45 + Math.random() * 0.25,
    }));
    ch2Group.add(steamMesh);
    scene.add(ch2Group);

    // =========================================================================
    // 3. CHAPTER 3: Computing Vault + Binary Streams + Animated CRT + Floppy
    // =========================================================================
    const ch3Group = new THREE.Group();
    const gridHelper = new THREE.GridHelper(10, 20, '#3C5440', '#162019');
    gridHelper.position.y = -1.95;
    ch3Group.add(gridHelper);

    const mainframeGroup = new THREE.Group();
    const mainframeLEDs: THREE.Mesh[] = [];
    for (let i = 0; i < 4; i++) {
      const rack = new THREE.Mesh(new THREE.BoxGeometry(0.48, 2.8, 0.48), darkTitaniumMat);
      rack.position.set(-2.4 + i * 1.6, -0.4, -2.5);
      const ledStrip = new THREE.Mesh(new THREE.BoxGeometry(0.05, 2.1, 0.5), greenAccentMat.clone());
      ledStrip.position.copy(rack.position);
      mainframeGroup.add(rack, ledStrip);
      mainframeLEDs.push(ledStrip);
    }
    ch3Group.add(mainframeGroup);

    // Stage 2 Binary Stream Pulses between racks
    const binaryCount = 24;
    const binaryMesh = new THREE.InstancedMesh(
      new THREE.BoxGeometry(0.06, 0.03, 0.03),
      greenAccentMat,
      binaryCount
    );
    binaryMesh.frustumCulled = false;
    ch3Group.add(binaryMesh);

    // Artifact 3A: Memory Chip
    const artMemoryChip = new THREE.Group();
    artMemoryChip.position.set(-1.6, 0.15, 0.75);
    const pcbPlate = new THREE.Mesh(
      new THREE.BoxGeometry(1.05, 0.05, 0.72),
      new THREE.MeshStandardMaterial({ map: pcbTex, roughness: 0.55, metalness: 0.25 })
    );
    const chipBody = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.13, 0.38), darkTitaniumMat);
    chipBody.position.y = 0.08;
    const siliconWindow = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.145, 0.18), greenAccentMat);
    siliconWindow.position.y = 0.085;
    artMemoryChip.add(pcbPlate, chipBody, siliconWindow);
    for (let p = -3; p <= 3; p++) {
      const pinL = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.14, 0.07), brassMat);
      pinL.position.set(p * 0.1, 0.03, 0.22);
      const pinR = pinL.clone();
      pinR.position.z = -0.22;
      artMemoryChip.add(pinL, pinR);
    }
    artMemoryChip.rotation.set(0.45, 0.35, 0);
    tagInteractiveTree(artMemoryChip, 'artifactId', 'art-memory-chip');
    ch3Group.add(artMemoryChip);
    artifactLookup.set('art-memory-chip', artMemoryChip);

    // Artifact 3B: Processor
    const artProcessor = new THREE.Group();
    artProcessor.position.set(1.65, 0.2, 0.65);
    const pcb = new THREE.Mesh(
      new THREE.BoxGeometry(0.86, 0.07, 0.86),
      new THREE.MeshStandardMaterial({ map: pcbTex, roughness: 0.45, metalness: 0.3 })
    );
    const heatSpreader = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.11, 0.54), brushedSilverMat);
    heatSpreader.position.y = 0.07;
    const dieGlow = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.13, 0.22), greenAccentMat);
    dieGlow.position.y = 0.08;
    artProcessor.add(pcb, heatSpreader, dieGlow);
    artProcessor.rotation.set(0.5, -0.4, 0);
    tagInteractiveTree(artProcessor, 'artifactId', 'art-processor');
    ch3Group.add(artProcessor);
    artifactLookup.set('art-processor', artProcessor);

    // Artifact 3C: Retro CRT Terminal
    const artTerminal = new THREE.Group();
    artTerminal.position.set(0.0, -0.25, 0.25);
    const monitorHousing = new THREE.Mesh(
      new THREE.BoxGeometry(1.52, 1.18, 0.92),
      new THREE.MeshStandardMaterial({ color: '#343A3E', roughness: 0.58, metalness: 0.18 })
    );
    const bezelRim = new THREE.Mesh(new THREE.BoxGeometry(1.36, 1.0, 0.08), darkTitaniumMat);
    bezelRim.position.set(0, 0.03, 0.45);
    const screenPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(1.2, 0.88),
      new THREE.MeshBasicMaterial({ map: crtRig.texture })
    );
    screenPlane.position.set(0, 0.03, 0.495);
    const rotaryKnob = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.05, 16), brushedSilverMat);
    rotaryKnob.rotation.x = Math.PI / 2;
    rotaryKnob.position.set(0.62, -0.44, 0.47);
    const keybedBase = new THREE.Mesh(new THREE.BoxGeometry(1.48, 0.14, 0.56), darkTitaniumMat);
    keybedBase.position.set(0, -0.66, 0.54);
    keybedBase.rotation.x = 0.18;

    const keycapMesh = new THREE.InstancedMesh(
      new THREE.BoxGeometry(0.075, 0.045, 0.075),
      brushedSilverMat,
      48
    );
    let kIdx = 0;
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 12; col++) {
        dummy.position.set(-0.56 + col * 0.102, -0.57 + row * 0.015, 0.38 + row * 0.095);
        dummy.rotation.set(0.18, 0, 0);
        dummy.scale.setScalar(1);
        dummy.updateMatrix();
        keycapMesh.setMatrixAt(kIdx++, dummy.matrix);
      }
    }
    keycapMesh.instanceMatrix.needsUpdate = true;

    artTerminal.add(monitorHousing, bezelRim, screenPlane, rotaryKnob, keybedBase, keycapMesh);
    tagInteractiveTree(artTerminal, 'artifactId', 'art-terminal');
    ch3Group.add(artTerminal);
    artifactLookup.set('art-terminal', artTerminal);

    // Hidden Lost Artifact 003: Floppy Disk
    const lost003 = new THREE.Group();
    lost003.position.set(-2.05, -1.42, -1.35);
    const floppyBody = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.028, 0.34), darkTitaniumMat);
    const floppyShutter = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.034, 0.12), brushedSilverMat);
    floppyShutter.position.z = -0.1;
    const floppyLabel = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.032, 0.12), greenAccentMat);
    floppyLabel.position.z = 0.07;
    lost003.add(floppyBody, floppyShutter, floppyLabel);
    lost003.rotation.y = 0.55;
    tagInteractiveTree(lost003, 'lostArtifactId', 'lost-003');
    ch3Group.add(lost003);
    lostLookup.set('lost-003', lost003);

    // Floating Phosphor Data Pixels
    const pixelCount = 60;
    const pixelMesh = new THREE.InstancedMesh(
      new THREE.BoxGeometry(0.04, 0.04, 0.04),
      greenAccentMat,
      pixelCount
    );
    pixelMesh.frustumCulled = false;
    const pixelData = Array.from({ length: pixelCount }, () => ({
      x: (Math.random() - 0.5) * 3.6,
      y: (Math.random() - 0.5) * 2.8,
      z: (Math.random() - 0.5) * 2.4,
      phase: Math.random() * Math.PI * 2,
    }));
    ch3Group.add(pixelMesh);
    scene.add(ch3Group);

    // =========================================================================
    // 4. CHAPTER 4: Recognizable 3D Globe + First Node Ignition + Mesh Arcs
    // =========================================================================
    const ch4Group = new THREE.Group();
    const globePivot = new THREE.Group();

    const globeSphere = new THREE.Mesh(
      new THREE.SphereGeometry(1.42, 64, 48),
      new THREE.MeshStandardMaterial({
        map: globeMaps.map,
        roughnessMap: globeMaps.roughnessMap,
        roughness: 0.72,
        metalness: 0.18,
      })
    );
    const globeAtmosphere = new THREE.Mesh(
      new THREE.SphereGeometry(1.5, 48, 36),
      new THREE.MeshBasicMaterial({
        color: '#A6C7A9',
        transparent: true,
        opacity: 0.08,
        side: THREE.BackSide,
      })
    );
    const shieldRing1 = new THREE.Mesh(new THREE.TorusGeometry(1.82, 0.012, 10, 72), brushedSilverMat);
    shieldRing1.rotation.x = Math.PI / 2.4;
    const shieldRing2 = new THREE.Mesh(new THREE.TorusGeometry(1.98, 0.01, 10, 72), greenAccentMat);
    shieldRing2.rotation.y = Math.PI / 3;
    globePivot.add(globeSphere, globeAtmosphere, shieldRing1, shieldRing2);

    const globeNodeMeshes = new Map<string, THREE.Mesh>();
    const nodeVecs: THREE.Vector3[] = [];
    GLOBE_NODES.forEach((node) => {
      const pos = latLonToVector3(node.lat, node.lon, 1.45);
      nodeVecs.push(pos);
      const beacon = new THREE.Mesh(
        new THREE.SphereGeometry(0.068, 16, 16),
        new THREE.MeshStandardMaterial({ color: '#F0F2F2', emissive: '#A6C7A9', emissiveIntensity: 2.0 })
      );
      beacon.position.copy(pos);
      tagInteractiveTree(beacon, 'globeNodeId', node.id);
      globePivot.add(beacon);
      globeNodeMeshes.set(node.id, beacon);
    });

    const openArcsGroup = new THREE.Group();
    const globeCurves: THREE.QuadraticBezierCurve3[] = [];
    const globeArcMeshes: THREE.Mesh[] = [];
    for (let i = 0; i < nodeVecs.length; i++) {
      const a = nodeVecs[i];
      const b = nodeVecs[(i + 1) % nodeVecs.length];
      const mid = a.clone().add(b).multiplyScalar(0.5).normalize().multiplyScalar(1.9);
      const curve = new THREE.QuadraticBezierCurve3(a, mid, b);
      globeCurves.push(curve);
      const arcMesh = new THREE.Mesh(
        new THREE.TubeGeometry(curve, 28, 0.008, 6, false),
        new THREE.MeshBasicMaterial({ color: '#A6C7A9', transparent: true, opacity: 0.5 })
      );
      openArcsGroup.add(arcMesh);
      globeArcMeshes.push(arcMesh);
    }
    const packetMesh = new THREE.InstancedMesh(
      new THREE.SphereGeometry(0.032, 8, 8),
      new THREE.MeshBasicMaterial({ color: '#F0F2F2' }),
      globeCurves.length * 2
    );
    packetMesh.frustumCulled = false;
    openArcsGroup.add(packetMesh);
    globePivot.add(openArcsGroup);
    ch4Group.add(globePivot);

    // Artifact 4A: First Web Page
    const artWebPage = new THREE.Group();
    artWebPage.position.set(-2.2, 0.72, 0.35);
    const webSlate = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.75, 0.05), brushedSilverMat);
    const webFace = new THREE.Mesh(new THREE.PlaneGeometry(0.68, 0.68), new THREE.MeshBasicMaterial({ map: webSlateTex }));
    webFace.position.z = 0.03;
    artWebPage.add(webSlate, webFace);
    tagInteractiveTree(artWebPage, 'artifactId', 'art-first-webpage');
    ch4Group.add(artWebPage);
    artifactLookup.set('art-first-webpage', artWebPage);

    // Artifact 4B: The Cloud
    const artCloud = new THREE.Group();
    artCloud.position.set(2.2, 0.68, 0.35);
    for (let s = 0; s < 3; s++) {
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.11, 0.48), darkTitaniumMat);
      blade.position.y = (s - 1) * 0.22;
      const strip = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.03, 0.5), greenAccentMat);
      strip.position.y = blade.position.y;
      artCloud.add(blade, strip);
    }
    tagInteractiveTree(artCloud, 'artifactId', 'art-cloud');
    ch4Group.add(artCloud);
    artifactLookup.set('art-cloud', artCloud);

    // Artifact 4C: Digital Identity (Optical glass + holographic lattice)
    const artIdentity = new THREE.Group();
    artIdentity.position.set(1.98, -1.08, 0.55);
    const idCrystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.32, 0), opticalGlassMat);
    const idCore = new THREE.Mesh(new THREE.OctahedronGeometry(0.16, 0), brushedSilverMat);
    const idHolo = new THREE.Mesh(new THREE.IcosahedronGeometry(0.42, 0), holoWireMat);
    const idRing = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.015, 10, 36), greenAccentMat);
    artIdentity.add(idCrystal, idCore, idHolo, idRing);
    tagInteractiveTree(artIdentity, 'artifactId', 'art-digital-identity');
    ch4Group.add(artIdentity);
    artifactLookup.set('art-digital-identity', artIdentity);

    // Hidden Secret 004: Subsea Covenant Titanium Transponder Plate
    const secret004 = new THREE.Group();
    secret004.position.set(0.28, -1.72, 1.02);
    const sec4Plate = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.06, 0.24), brushedSilverMat);
    const sec4Pulse = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.065, 0),
      new THREE.MeshStandardMaterial({ color: '#F0F2F2', emissive: '#D9822B', emissiveIntensity: 1.8 })
    );
    sec4Pulse.position.y = 0.06;
    secret004.add(sec4Plate, sec4Pulse);
    tagInteractiveTree(secret004, 'secretId', 'secret-004');
    ch4Group.add(secret004);
    secretLookup.set('secret-004', secret004);

    // Hidden Lost Artifact 004: Disconnected Network Node
    const lost004 = new THREE.Group();
    lost004.position.set(-2.45, -1.28, -1.15);
    const discNode = new THREE.Mesh(new THREE.OctahedronGeometry(0.13, 0), brushedSilverMat);
    const discRing = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.012, 8, 24, Math.PI * 1.4), emberMat);
    lost004.add(discNode, discRing);
    tagInteractiveTree(lost004, 'lostArtifactId', 'lost-004');
    ch4Group.add(lost004);
    lostLookup.set('lost-004', lost004);
    scene.add(ch4Group);

    // =========================================================================
    // 5. CHAPTER 5: 2075 City Skyline + Neural Core + Creative Engine + Human Memory
    // =========================================================================
    const ch5Group = new THREE.Group();

    // 2075 Future City Spires Ring (Stage 1 prominent)
    const ch5Skyline = new THREE.Group();
    for (let t = 0; t < 16; t++) {
      const a = (t / 16) * Math.PI * 2;
      const h = 1.6 + ((t * 7) % 5) * 0.65;
      const tower = new THREE.Mesh(
        new THREE.BoxGeometry(0.24, h, 0.24),
        darkTitaniumMat
      );
      tower.position.set(Math.cos(a) * 4.4, -2.0 + h * 0.5, Math.sin(a) * 3.6 - 1.6);
      ch5Skyline.add(tower);
    }
    ch5Group.add(ch5Skyline);

    const neuralCoreGroup = new THREE.Group();
    const neuralInnerMat = new THREE.MeshStandardMaterial({
      color: '#E8F2E9',
      emissive: '#A6C7A9',
      emissiveIntensity: 1.65,
      roughness: 0.18,
      metalness: 0.45,
    });
    const neuralInner = new THREE.Mesh(new THREE.IcosahedronGeometry(0.58, 2), neuralInnerMat);
    const neuralGlassShell = new THREE.Mesh(new THREE.IcosahedronGeometry(1.02, 2), opticalGlassMat);
    const neuralRingA = new THREE.Mesh(new THREE.TorusGeometry(1.36, 0.026, 12, 72), chromeHeroMat);
    const neuralRingB = new THREE.Mesh(new THREE.TorusGeometry(1.64, 0.02, 12, 72), brushedSilverMat);
    neuralRingB.rotation.x = Math.PI / 2.5;
    const neuralRingC = new THREE.Mesh(new THREE.TorusGeometry(1.9, 0.015, 12, 72), greenAccentMat);
    neuralRingC.rotation.y = Math.PI / 3;
    const neuralRingD = new THREE.Mesh(new THREE.TorusGeometry(2.15, 0.01, 10, 72), darkTitaniumMat);
    neuralRingD.rotation.set(0.6, 0.2, 0.4);
    neuralCoreGroup.add(neuralInner, neuralGlassShell, neuralRingA, neuralRingB, neuralRingC, neuralRingD);

    const synapticGroup = new THREE.Group();
    const axonCurves: THREE.CatmullRomCurve3[] = [];
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      const elev = ((i % 5) - 2) * 0.45;
      const p0 = new THREE.Vector3(Math.cos(a) * 0.7, elev * 0.2, Math.sin(a) * 0.7);
      const p1 = new THREE.Vector3(Math.cos(a + 0.3) * 1.6, elev * 0.7, Math.sin(a + 0.3) * 1.6);
      const p2 = new THREE.Vector3(Math.cos(a + 0.55) * 2.65, elev * 1.1, Math.sin(a + 0.55) * 2.65);
      const curve = new THREE.CatmullRomCurve3([p0, p1, p2]);
      axonCurves.push(curve);
      const tube = new THREE.Mesh(
        new THREE.TubeGeometry(curve, 18, 0.008, 6, false),
        new THREE.MeshBasicMaterial({ color: '#A6C7A9', transparent: true, opacity: 0.45 })
      );
      synapticGroup.add(tube);
    }
    const neuralPulses = new THREE.InstancedMesh(
      new THREE.SphereGeometry(0.028, 8, 8),
      new THREE.MeshBasicMaterial({ color: '#F0F2F2' }),
      axonCurves.length * 2
    );
    neuralPulses.frustumCulled = false;
    synapticGroup.add(neuralPulses);
    neuralCoreGroup.add(synapticGroup);
    tagInteractiveTree(neuralCoreGroup, 'artifactId', 'art-neural-core');
    ch5Group.add(neuralCoreGroup);
    artifactLookup.set('art-neural-core', neuralCoreGroup);

    // Artifact 5B: Creative Engine
    const artCreative = new THREE.Group();
    artCreative.position.set(-2.2, -0.52, 0.75);
    const prismKnot = new THREE.Mesh(new THREE.TorusKnotGeometry(0.28, 0.08, 64, 12), chromeHeroMat);
    const prismBase = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.018, 10, 36), brassMat);
    prismBase.rotation.x = Math.PI / 2;
    prismBase.position.y = -0.35;
    artCreative.add(prismKnot, prismBase);
    tagInteractiveTree(artCreative, 'artifactId', 'art-creative-engine');
    ch5Group.add(artCreative);
    artifactLookup.set('art-creative-engine', artCreative);

    // Artifact 5C: Human Memory
    const artHumanMemory = new THREE.Group();
    artHumanMemory.position.set(2.2, -0.55, 0.72);
    const capsuleOuter = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.75, 6), opticalGlassMat);
    const capsuleCapTop = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.09, 6), brushedSilverMat);
    capsuleCapTop.position.y = 0.4;
    const capsuleCapBot = capsuleCapTop.clone();
    capsuleCapBot.position.y = -0.4;
    const capsuleFilament = new THREE.Mesh(new THREE.OctahedronGeometry(0.14, 0), emberMat);
    artHumanMemory.add(capsuleOuter, capsuleCapTop, capsuleCapBot, capsuleFilament);
    tagInteractiveTree(artHumanMemory, 'artifactId', 'art-human-memory');
    ch5Group.add(artHumanMemory);
    artifactLookup.set('art-human-memory', artHumanMemory);

    // Hidden Lost Artifact 005: Handwritten Note
    const lost005 = new THREE.Group();
    lost005.position.set(-2.25, 1.38, -0.55);
    const noteMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(0.48, 0.3),
      new THREE.MeshBasicMaterial({ map: noteTex, side: THREE.DoubleSide })
    );
    noteMesh.rotation.set(-0.18, 0.42, 0.14);
    const notePin = new THREE.Mesh(new THREE.SphereGeometry(0.032, 10, 10), emberMat);
    notePin.position.set(0.19, 0.11, 0.02);
    lost005.add(noteMesh, notePin);
    tagInteractiveTree(lost005, 'lostArtifactId', 'lost-005');
    ch5Group.add(lost005);
    lostLookup.set('lost-005', lost005);
    scene.add(ch5Group);

    // Chapter-Completion Resonance Halos (subtle grounded aura when era decision locked)
    const chCompletionRings: Record<'ch1' | 'ch2' | 'ch3' | 'ch4' | 'ch5', THREE.Mesh> = {
      ch1: new THREE.Mesh(
        new THREE.TorusGeometry(2.75, 0.012, 10, 84),
        new THREE.MeshBasicMaterial({ color: '#D9822B', transparent: true, opacity: 0.42 })
      ),
      ch2: new THREE.Mesh(
        new THREE.TorusGeometry(2.85, 0.012, 10, 84),
        new THREE.MeshBasicMaterial({ color: '#D9822B', transparent: true, opacity: 0.42 })
      ),
      ch3: new THREE.Mesh(
        new THREE.TorusGeometry(2.75, 0.012, 10, 84),
        new THREE.MeshBasicMaterial({ color: '#A6C7A9', transparent: true, opacity: 0.45 })
      ),
      ch4: new THREE.Mesh(
        new THREE.TorusGeometry(2.85, 0.012, 10, 84),
        new THREE.MeshBasicMaterial({ color: '#A6C7A9', transparent: true, opacity: 0.45 })
      ),
      ch5: new THREE.Mesh(
        new THREE.TorusGeometry(2.9, 0.013, 10, 84),
        new THREE.MeshBasicMaterial({ color: '#F0F2F2', transparent: true, opacity: 0.48 })
      ),
    };
    const chGroupLookup: Record<'ch1' | 'ch2' | 'ch3' | 'ch4' | 'ch5', THREE.Group> = {
      ch1: ch1Group,
      ch2: ch2Group,
      ch3: ch3Group,
      ch4: ch4Group,
      ch5: ch5Group,
    };
    (Object.keys(chCompletionRings) as Array<'ch1' | 'ch2' | 'ch3' | 'ch4' | 'ch5'>).forEach((k) => {
      const ring = chCompletionRings[k];
      ring.rotation.x = Math.PI / 2;
      ring.position.y = -1.65;
      ring.visible = false;
      chGroupLookup[k].add(ring);
    });

    // =========================================================================
    // 6. ENDING GROUP: Five Visually Distinct 2075 Worlds
    // =========================================================================
    const endingGroup = new THREE.Group();
    const endPlatform = new THREE.Mesh(new THREE.CylinderGeometry(3.8, 4.2, 0.25, 36), darkTitaniumMat);
    endPlatform.position.y = -1.75;
    endingGroup.add(endPlatform);

    // 1. THE HUMAN RENAISSANCE
    const worldRenaissance = new THREE.Group();
    const renRingTerrace1 = new THREE.Mesh(new THREE.CylinderGeometry(2.8, 3.1, 0.18, 36), brushedSilverMat);
    renRingTerrace1.position.y = -1.52;
    const renRingTerrace2 = new THREE.Mesh(
      new THREE.CylinderGeometry(1.9, 2.15, 0.22, 36),
      new THREE.MeshStandardMaterial({ color: '#D6D2C9', roughness: 0.7 })
    );
    renRingTerrace2.position.y = -1.32;
    const renPavilionCore = new THREE.Mesh(new THREE.SphereGeometry(0.62, 32, 32), chromeHeroMat);
    const renSunHalo = new THREE.Mesh(new THREE.TorusGeometry(1.45, 0.022, 12, 64), brassMat);
    renSunHalo.rotation.x = Math.PI / 3;
    const renCanopy = new THREE.InstancedMesh(
      new THREE.IcosahedronGeometry(0.26, 1),
      new THREE.MeshStandardMaterial({ color: '#7AA182', roughness: 0.72, metalness: 0.05 }),
      28
    );
    renCanopy.frustumCulled = false;
    worldRenaissance.add(renRingTerrace1, renRingTerrace2, renPavilionCore, renSunHalo, renCanopy);

    // 2. THE MACHINE DEPENDENCY
    const worldMachineDependency = new THREE.Group();
    const domMonoliths = new THREE.InstancedMesh(new THREE.BoxGeometry(0.32, 1, 0.32), darkIronMat, 28);
    domMonoliths.frustumCulled = false;
    const domObelisk = new THREE.Mesh(new THREE.OctahedronGeometry(0.68, 0), darkTitaniumMat);
    domObelisk.scale.set(0.75, 2.25, 0.75);
    const domEye = new THREE.Mesh(
      new THREE.SphereGeometry(0.24, 24, 24),
      new THREE.MeshStandardMaterial({ color: '#D9822B', emissive: '#C95D3A', emissiveIntensity: 2.3 })
    );
    const domScannerRing = new THREE.Mesh(
      new THREE.TorusGeometry(1.88, 0.026, 10, 64),
      new THREE.MeshStandardMaterial({ color: '#D9822B', emissive: '#C95D3A', emissiveIntensity: 1.45 })
    );
    domScannerRing.rotation.x = Math.PI / 2.2;
    const domOuterLattice = new THREE.Mesh(
      new THREE.TorusGeometry(2.35, 0.012, 8, 72),
      darkTitaniumMat
    );
    domOuterLattice.rotation.x = Math.PI / 2;
    worldMachineDependency.add(domMonoliths, domObelisk, domEye, domScannerRing, domOuterLattice);

    // 3. THE DIVIDED NETWORK
    const worldDividedNetwork = new THREE.Group();
    const divHemiLeft = new THREE.Mesh(
      new THREE.SphereGeometry(0.66, 28, 28, 0, Math.PI),
      brassMat
    );
    divHemiLeft.position.set(-0.42, 0.05, 0);
    divHemiLeft.rotation.y = Math.PI * 0.15;
    const divHemiRight = new THREE.Mesh(
      new THREE.SphereGeometry(0.66, 28, 28, Math.PI, Math.PI),
      darkTitaniumMat
    );
    divHemiRight.position.set(0.42, -0.05, 0);
    divHemiRight.rotation.y = -Math.PI * 0.15;
    const divSplitRingA = new THREE.Mesh(
      new THREE.TorusGeometry(1.62, 0.024, 10, 48, Math.PI * 0.85),
      emberMat
    );
    divSplitRingA.rotation.set(Math.PI / 2.6, 0.25, 0.1);
    const divSplitRingB = new THREE.Mesh(
      new THREE.TorusGeometry(1.78, 0.022, 10, 48, Math.PI * 0.85),
      brushedSilverMat
    );
    divSplitRingB.rotation.set(Math.PI / 2.6, 0.25, Math.PI + 0.15);
    const divClusterShards = new THREE.InstancedMesh(
      new THREE.BoxGeometry(0.24, 0.65, 0.24),
      darkIronMat,
      20
    );
    divClusterShards.frustumCulled = false;
    worldDividedNetwork.add(divHemiLeft, divHemiRight, divSplitRingA, divSplitRingB, divClusterShards);

    // 4. THE SYMBIOTIC FUTURE
    const worldSymbiotic = new THREE.Group();
    const symTorus = new THREE.Mesh(new THREE.TorusGeometry(1.65, 0.14, 16, 64), brushedSilverMat);
    symTorus.rotation.x = Math.PI / 2.3;
    const symCore = new THREE.Mesh(new THREE.SphereGeometry(0.65, 32, 32), opticalGlassMat);
    const symInnerSeed = new THREE.Mesh(new THREE.IcosahedronGeometry(0.38, 1), greenAccentMat);
    const symOrbitRing = new THREE.Mesh(new THREE.TorusGeometry(2.15, 0.02, 12, 64), greenAccentMat);
    symOrbitRing.rotation.y = Math.PI / 3;
    const symBioNodes = new THREE.InstancedMesh(
      new THREE.IcosahedronGeometry(0.18, 1),
      new THREE.MeshStandardMaterial({ color: '#A6C7A9', roughness: 0.45, metalness: 0.25 }),
      20
    );
    symBioNodes.frustumCulled = false;
    worldSymbiotic.add(symTorus, symCore, symInnerSeed, symOrbitRing, symBioNodes);

    // 5. THE LOST CONNECTION
    const worldLostConnection = new THREE.Group();
    const lostHollowShell = new THREE.Mesh(new THREE.IcosahedronGeometry(0.72, 1), holoWireMat);
    const lostDimEmber = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.16, 0),
      new THREE.MeshStandardMaterial({ color: '#899398', emissive: '#D9822B', emissiveIntensity: 0.65, roughness: 0.6 })
    );
    const lostStaticRing = new THREE.Mesh(
      new THREE.TorusGeometry(1.75, 0.015, 10, 72),
      new THREE.MeshStandardMaterial({ color: '#5F6B72', metalness: 0.6, roughness: 0.55 })
    );
    lostStaticRing.rotation.x = Math.PI / 2.15;
    const lostDrifters = new THREE.InstancedMesh(
      new THREE.CylinderGeometry(0.08, 0.12, 0.75, 6),
      brushedSilverMat,
      16
    );
    lostDrifters.frustumCulled = false;
    worldLostConnection.add(lostHollowShell, lostDimEmber, lostStaticRing, lostDrifters);

    endingGroup.add(
      worldRenaissance,
      worldMachineDependency,
      worldDividedNetwork,
      worldSymbiotic,
      worldLostConnection
    );
    scene.add(endingGroup);

    // =========================================================================
    // 7. CREDITS GROUP: Rotating Archive Memory Core & Floating Metallic Shards
    // =========================================================================
    const creditsGroup = new THREE.Group();
    const creditsCoreSphere = new THREE.Mesh(new THREE.SphereGeometry(0.82, 48, 48), chromeHeroMat);
    const creditsWireLattice = new THREE.Mesh(new THREE.IcosahedronGeometry(1.12, 1), holoWireMat);
    const creditsOuterHalo = new THREE.Mesh(new THREE.TorusGeometry(1.62, 0.012, 12, 80), brassMat);
    creditsOuterHalo.rotation.x = Math.PI / 2.6;
    const creditsInnerHalo = new THREE.Mesh(new THREE.TorusGeometry(1.32, 0.009, 10, 72), brushedSilverMat);
    creditsInnerHalo.rotation.y = Math.PI / 3.1;

    const shardCount = 26;
    const creditsShards = new THREE.InstancedMesh(
      new THREE.OctahedronGeometry(0.052, 0),
      brushedSilverMat,
      shardCount
    );
    creditsShards.frustumCulled = false;
    const shardSpecs = Array.from({ length: shardCount }, (_, i) => ({
      radius: 1.75 + (i % 4) * 0.42,
      ySpread: ((i % 5) - 2) * 0.38,
      speed: 0.14 + (i % 3) * 0.06,
      phase: (i / shardCount) * Math.PI * 2,
    }));
    creditsGroup.add(
      creditsCoreSphere,
      creditsWireLattice,
      creditsOuterHalo,
      creditsInnerHalo,
      creditsShards
    );
    scene.add(creditsGroup);

    // Record baseline Y positions so artifacts bob gently without drifting
    const artifactBaseY = new Map<string, number>();
    artifactLookup.forEach((obj, id) => {
      artifactBaseY.set(id, obj.position.y);
    });
    let discoveryFocusAge = 999;
    const discoveryFocusPos = new THREE.Vector3();

    // =========================================================================
    // INTERACTION: HOVER LABELS, GLOBE DRAG & STRICT RAYCASTING
    // =========================================================================
    const raycaster = new THREE.Raycaster();
    let pointerX = 0;
    let pointerY = 0;
    let isDraggingGlobe = false;
    let dragStartX = 0;
    let dragStartY = 0;
    let dragMoved = false;
    let globeRotYVel = 0;
    let globeRotXVel = 0;
    let lastHoverCheck = 0;

    function getActiveGroup(ch: ChapterId): THREE.Group {
      switch (ch) {
        case 'intro':
          return introGroup;
        case 'ch1':
          return ch1Group;
        case 'ch2':
          return ch2Group;
        case 'ch3':
          return ch3Group;
        case 'ch4':
          return ch4Group;
        case 'ch5':
          return ch5Group;
        case 'ending':
          return endingGroup;
        case 'credits':
          return creditsGroup;
      }
    }

    const getCanvasCoords = (clientX: number, clientY: number) => {
      const rect = renderer.domElement.getBoundingClientRect();
      _rayMouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      _rayMouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    };

    const resolveHoverTarget = (hitObj: THREE.Object3D): HoveredSceneTarget | null => {
      const ud = hitObj.userData;
      let id: string | null = null;
      let label = '';
      let sublabel = '';
      let kind: HoveredSceneTarget['kind'] = 'artifact';
      let anchorObj: THREE.Object3D = hitObj;

      if (ud.secretId) {
        const sec = SECRET_MEMORIES.find((s) => s.id === ud.secretId);
        id = ud.secretId;
        label = sec?.title ?? 'Hidden Secret';
        sublabel = 'SECRET ARCHIVE SIGNAL';
        kind = 'secret';
        anchorObj = secretLookup.get(ud.secretId) ?? hitObj;
      } else if (ud.lostArtifactId) {
        const lost = LOST_ARTIFACTS.find((l) => l.id === ud.lostArtifactId);
        id = ud.lostArtifactId;
        label = lost ? 'Unindexed Signal' : 'Lost Memory';
        sublabel = lost ? `${lost.memoryCode} · CLICK TO RECOVER` : '';
        kind = 'lost';
        anchorObj = lostLookup.get(ud.lostArtifactId) ?? hitObj;
      } else if (ud.artifactId) {
        const art = ARTIFACTS.find((a) => a.id === ud.artifactId);
        if (!art) return null;
        id = art.id;
        label = art.name;
        sublabel = `${art.accessionCode} · ${art.era}`;
        kind = 'artifact';
        anchorObj = artifactLookup.get(art.id) ?? hitObj;
      } else if (ud.globeNodeId) {
        const node = GLOBE_NODES.find((n) => n.id === ud.globeNodeId);
        if (!node) return null;
        id = node.id;
        label = node.city;
        sublabel = `${node.year} · ${node.title}`;
        kind = 'globe';
      } else if (ud.gearStage) {
        id = `gear-${ud.gearStage}`;
        label = `Gear Stage 0${ud.gearStage}`;
        sublabel = 'CLICK TO ENGAGE DRIVE';
        kind = 'gear';
      }

      if (!id) return null;
      anchorObj.getWorldPosition(_vProj);
      _vProj.project(camera);
      const x = (_vProj.x * 0.5 + 0.5) * window.innerWidth;
      const y = (-(_vProj.y * 0.5) + 0.5) * window.innerHeight;
      return { id, label, sublabel, kind, x, y };
    };

    const onPointerDown = (e: PointerEvent) => {
      dragStartX = e.clientX;
      dragStartY = e.clientY;
      dragMoved = false;
      if (stateRef.current.activeChapter === 'ch4') {
        isDraggingGlobe = true;
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      pointerX = (e.clientX / window.innerWidth) * 2 - 1;
      pointerY = -(e.clientY / window.innerHeight) * 2 + 1;

      if (isDraggingGlobe) {
        const dx = e.clientX - dragStartX;
        const dy = e.clientY - dragStartY;
        if (Math.hypot(dx, dy) > 4) dragMoved = true;
        globeRotYVel += dx * 0.0048;
        globeRotXVel += dy * 0.0032;
        dragStartX = e.clientX;
        dragStartY = e.clientY;
        return;
      }

      const now = performance.now();
      if (now - lastHoverCheck < 50) return;
      lastHoverCheck = now;

      getCanvasCoords(e.clientX, e.clientY);
      raycaster.setFromCamera(_rayMouse, camera);
      const activeGroup = getActiveGroup(stateRef.current.activeChapter);
      const hits = raycaster.intersectObjects(activeGroup.children, true);

      let resolved: HoveredSceneTarget | null = null;
      for (const h of hits) {
        if (!isObjectEffectivelyVisible(h.object)) continue;
        const candidate = resolveHoverTarget(h.object);
        if (candidate) {
          resolved = candidate;
          break;
        }
      }

      if (resolved) {
        if (hoveredObjectId !== resolved.id) {
          hoveredObjectId = resolved.id;
          audioEngine.playEraSound('hover');
        }
        renderer.domElement.style.cursor = 'pointer';
        callbacksRef.current.onHoverTarget?.(resolved);
      } else {
        if (hoveredObjectId !== null) {
          hoveredObjectId = null;
          callbacksRef.current.onHoverTarget?.(null);
        }
        renderer.domElement.style.cursor = stateRef.current.activeChapter === 'ch4' ? 'grab' : 'default';
      }
    };

    const onPointerUp = (e: PointerEvent) => {
      const wasMoved = dragMoved;
      isDraggingGlobe = false;
      if (wasMoved) return;

      getCanvasCoords(e.clientX, e.clientY);
      raycaster.setFromCamera(_rayMouse, camera);
      const s = stateRef.current;
      const activeGroup = getActiveGroup(s.activeChapter);
      const hits = raycaster.intersectObjects(activeGroup.children, true);

      for (const hit of hits) {
        if (!isObjectEffectivelyVisible(hit.object)) continue;
        const ud = hit.object.userData;

        if (ud.secretId) {
          const secMeta = SECRET_MEMORIES.find((item) => item.id === ud.secretId);
          const expectedCh = secMeta ? `ch${secMeta.chapter}` : 'ch1';
          if (s.activeChapter === expectedCh && !s.unlockedSecrets.includes(ud.secretId)) {
            const secObj = secretLookup.get(ud.secretId);
            if (secObj) {
              secObj.getWorldPosition(_v1);
              triggerDiscoveryBurst(_v1);
              discoveryFocusPos.copy(_v1);
              discoveryFocusAge = 0;
            }
            callbacksRef.current.onDiscoverSecret(ud.secretId);
          }
          return;
        }
        if (ud.lostArtifactId) {
          const expectedChapter = `ch${ud.lostArtifactId.slice(-1)}`;
          if (s.activeChapter === expectedChapter && !s.discoveredLostArtifacts.includes(ud.lostArtifactId)) {
            const lostObj = lostLookup.get(ud.lostArtifactId);
            if (lostObj) {
              lostObj.getWorldPosition(_v1);
              triggerDiscoveryBurst(_v1);
              discoveryFocusPos.copy(_v1);
              discoveryFocusAge = 0;
            }
            callbacksRef.current.onDiscoverLostArtifact(ud.lostArtifactId);
          }
          return;
        }
        if (ud.globeNodeId) {
          callbacksRef.current.onSelectGlobeNode(ud.globeNodeId);
          return;
        }
        if (ud.artifactId) {
          callbacksRef.current.onSelectArtifact(ud.artifactId);
          return;
        }
        if (ud.gearStage) {
          callbacksRef.current.onActivateGear(Number(ud.gearStage));
          return;
        }
      }
    };

    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);

    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 1.75));
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', onResize);

    // =========================================================================
    // ANIMATION LOOP
    // =========================================================================
    const clock = new THREE.Clock();
    let frameId = 0;
    let disposed = false;

    const groupMap: Record<ChapterId, THREE.Group> = {
      intro: introGroup,
      ch1: ch1Group,
      ch2: ch2Group,
      ch3: ch3Group,
      ch4: ch4Group,
      ch5: ch5Group,
      ending: endingGroup,
      credits: creditsGroup,
    };
    let prevChapter: ChapterId = stateRef.current.activeChapter;

    function afterDraw(cb: () => void) {
      if (disposed) return;
      const gl = renderer.getContext() as WebGL2RenderingContext;
      if (typeof gl.fenceSync === 'function') {
        const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
        gl.flush();
        const poll = () => {
          if (disposed) return;
          const st = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
          if (st === gl.UNSIGNALED) {
            frameId = window.setTimeout(poll, 5);
          } else {
            if (sync) gl.deleteSync(sync);
            frameId = window.setTimeout(cb, 80);
          }
        };
        frameId = window.setTimeout(poll, 5);
      } else {
        frameId = window.setTimeout(cb, 80);
      }
    }

    const tick = () => {
      if (disposed) return;
      const delta = Math.min(clock.getDelta(), 0.1);
      const elapsed = clock.getElapsedTime();
      const s = stateRef.current;
      const isIntroFreeze = s.activeChapter === 'intro' && s.stageIndex === 5;
      const motionMul = s.reducedMotion ? 0.08 : isIntroFreeze ? 0.02 : 1.0;
      const isDesktop = window.innerWidth >= 1024;
      const targetOffsetX =
        s.activeChapter === 'credits'
          ? 0
          : s.activeChapter === 'intro'
          ? isDesktop
            ? 2.0
            : 0
          : isDesktop
          ? 1.65
          : 0;
      const targetOffsetY = s.activeChapter === 'intro' && !isDesktop ? 1.15 : 0;

      if (prevChapter !== s.activeChapter) {
        prevChapter = s.activeChapter;
        const nextGrp = groupMap[s.activeChapter];
        if (!s.reducedMotion) {
          nextGrp.scale.setScalar((isDesktop ? 1.0 : 0.74) * 0.92);
        }
      }

      (Object.keys(groupMap) as ChapterId[]).forEach((key) => {
        const grp = groupMap[key];
        const isCurrent = key === s.activeChapter;
        if (isCurrent) {
          grp.visible = true;
          grp.position.x = THREE.MathUtils.damp(grp.position.x, targetOffsetX, 5.5, delta);
          grp.position.y = THREE.MathUtils.damp(grp.position.y, targetOffsetY, 5.5, delta);
          const baseScale = isDesktop ? 1.0 : 0.74;
          const zoomAdjust = key === 'ch4' ? s.globeZoom : 1.0;
          grp.scale.setScalar(THREE.MathUtils.damp(grp.scale.x, baseScale * zoomAdjust, 6, delta));
        } else {
          grp.visible = false;
        }
      });

      // Physical hover highlight subtle scale feedback + gentle individual floating motion + hover light
      let bobIdx = 0;
      artifactLookup.forEach((obj, id) => {
        const isHovered = hoveredObjectId === id || s.focusedArtifactId === id;
        const target = isHovered ? 1.09 : 1.0;
        obj.scale.setScalar(THREE.MathUtils.damp(obj.scale.x, target, 7, delta));
        const baseY = artifactBaseY.get(id);
        if (baseY !== undefined && id !== 'art-shared-flame') {
          obj.position.y = baseY + Math.sin(elapsed * 1.15 + bobIdx * 0.9) * 0.042 * motionMul;
        }
        bobIdx++;
      });

      const hoveredObj =
        (hoveredObjectId &&
          (artifactLookup.get(hoveredObjectId) ||
            lostLookup.get(hoveredObjectId) ||
            secretLookup.get(hoveredObjectId))) ||
        null;
      if (hoveredObj && isObjectEffectivelyVisible(hoveredObj)) {
        hoveredObj.getWorldPosition(_v1);
        hoverPointLight.position.x = THREE.MathUtils.damp(hoverPointLight.position.x, _v1.x, 9, delta);
        hoverPointLight.position.y = THREE.MathUtils.damp(hoverPointLight.position.y, _v1.y + 0.35, 9, delta);
        hoverPointLight.position.z = THREE.MathUtils.damp(hoverPointLight.position.z, _v1.z + 0.85, 9, delta);
        hoverPointLight.intensity = THREE.MathUtils.damp(hoverPointLight.intensity, 1.85, 8, delta);
      } else {
        hoverPointLight.intensity = THREE.MathUtils.damp(hoverPointLight.intensity, 0, 8, delta);
      }

      // Chapter-completion resonance halos
      (['ch1', 'ch2', 'ch3', 'ch4', 'ch5'] as const).forEach((chKey) => {
        const ring = chCompletionRings[chKey];
        const completed = Boolean(s.decisions[chKey]);
        ring.visible = completed;
        if (completed) {
          const pulse = 1 + Math.sin(elapsed * 1.6) * 0.018 * motionMul;
          ring.scale.set(pulse, pulse, 1);
        }
      });

      // Era Atmosphere & What-If / Consequence Shifts + Volumetric Light Beam
      const activePreview = s.whatIfPreview;
      eraLightBeam.position.x = THREE.MathUtils.damp(
        eraLightBeam.position.x,
        s.activeChapter === 'credits' ? 0 : isDesktop ? 1.65 : 0,
        4,
        delta
      );
      eraBeamMat.opacity = isSoftwareGl ? 0.022 : s.stageIndex === 1 ? 0.032 : 0.058;

      if (s.activeChapter === 'intro') {
        eraPointLight.color.set(s.stageIndex >= 4 ? '#A6C7A9' : '#BFC7CB');
        eraBeamMat.color.set(s.stageIndex >= 4 ? '#A6C7A9' : '#BFC7CB');
        eraPointLight.intensity = s.stageIndex === 1 ? 1.0 : s.stageIndex === 5 ? 0.65 : 1.9;
        (scene.background as THREE.Color).set('#090B0D');
      } else if (s.activeChapter === 'ch1') {
        const ignitionBoost = s.stageIndex >= 2 ? 1.0 : 0.45;
        const cHex = activePreview?.option === 'restrict' ? '#C95D3A' : '#D9822B';
        eraPointLight.color.set(cHex);
        eraBeamMat.color.set(cHex);
        eraPointLight.intensity = (2.8 + Math.sin(elapsed * 5.2) * 0.35 * motionMul) * ignitionBoost;
        (scene.background as THREE.Color).set('#0B0807');
      } else if (s.activeChapter === 'ch2') {
        const restricted = (activePreview?.chapter === 1 ? activePreview.option : s.decisions.ch1) === 'restrict';
        const cHex = restricted ? '#C95D3A' : '#D99E4C';
        eraPointLight.color.set(cHex);
        eraBeamMat.color.set(cHex);
        eraPointLight.intensity = 2.3;
        citadelTower.visible = restricted;
        ch2Workers.visible = s.stageIndex >= 4;
        (scene.background as THREE.Color).set('#0A0B0D');
      } else if (s.activeChapter === 'ch3') {
        const productivity = (activePreview?.chapter === 2 ? activePreview.option : s.decisions.ch2) === 'productivity';
        const cHex = productivity ? '#7BB082' : '#A6C7A9';
        eraPointLight.color.set(cHex);
        eraBeamMat.color.set(cHex);
        eraPointLight.intensity = 2.0;
        mainframeGroup.scale.y = productivity ? 1.18 : 0.86;
        (scene.background as THREE.Color).set('#070C09');
      } else if (s.activeChapter === 'ch4') {
        const openKnow = (activePreview?.chapter === 3 ? activePreview.option : s.decisions.ch3) !== 'privacy';
        const cHex = openKnow ? '#A6C7A9' : '#BFC7CB';
        eraPointLight.color.set(cHex);
        eraBeamMat.color.set(cHex);
        eraPointLight.intensity = 2.1;
        openArcsGroup.visible = openKnow && s.stageIndex >= 2;
        shieldRing2.scale.setScalar(openKnow ? 1.0 : 0.92);
        secret004.visible = !s.unlockedSecrets.includes('secret-004');
        (scene.background as THREE.Color).set('#080B0E');
      } else if (s.activeChapter === 'ch5') {
        const totalConn = (activePreview?.chapter === 4 ? activePreview.option : s.decisions.ch4) === 'total_connection';
        const ch5PreviewOpt = activePreview?.chapter === 5 ? activePreview.option : s.decisions.ch5;

        if (ch5PreviewOpt === 'ai_leads') {
          eraPointLight.color.set('#C95D3A');
          eraBeamMat.color.set('#C95D3A');
          neuralInnerMat.emissive.set('#C95D3A');
          ch5Skyline.scale.y = THREE.MathUtils.damp(ch5Skyline.scale.y, 1.35, 5, delta);
        } else if (ch5PreviewOpt === 'humans_lead') {
          eraPointLight.color.set('#A6C7A9');
          eraBeamMat.color.set('#A6C7A9');
          neuralInnerMat.emissive.set('#7AA182');
          ch5Skyline.scale.y = THREE.MathUtils.damp(ch5Skyline.scale.y, 0.82, 5, delta);
        } else {
          eraPointLight.color.set('#BFC7CB');
          eraBeamMat.color.set('#BFC7CB');
          neuralInnerMat.emissive.set('#A6C7A9');
          ch5Skyline.scale.y = THREE.MathUtils.damp(ch5Skyline.scale.y, 1.0, 5, delta);
        }
        eraPointLight.intensity = 2.5;
        synapticGroup.visible = totalConn;
        neuralRingC.scale.setScalar(totalConn ? 1.08 : 0.96);
        (scene.background as THREE.Color).set('#090C0E');
      } else if (s.activeChapter === 'ending') {
        eraPointLight.color.set(s.endingOutcome.visualVariation.accentHex);
        eraBeamMat.color.set(s.endingOutcome.visualVariation.accentHex);
        eraPointLight.intensity = 2.6;
        (scene.background as THREE.Color).set(s.endingOutcome.visualVariation.skyHue);
      } else if (s.activeChapter === 'credits') {
        eraPointLight.color.set('#BFC7CB');
        eraBeamMat.color.set('#BFC7CB');
        eraPointLight.intensity = 1.85;
        (scene.background as THREE.Color).set('#090B0D');
      }

      const scrollRot = s.chapterProgress * Math.PI * 0.85;

      // --- INTRO 6-SCENE ANIMATION ---
      if (s.activeChapter === 'intro') {
        const st = s.stageIndex;
        const sphereOpen = st === 6 ? 0.52 + s.stageProgress * 0.5 : 0;
        const emergeScale = st === 1 ? 0.58 + s.stageProgress * 0.42 : 1.0;

        heroShellL.position.x = THREE.MathUtils.damp(heroShellL.position.x, -sphereOpen, 6, delta);
        heroShellR.position.x = THREE.MathUtils.damp(heroShellR.position.x, sphereOpen, 6, delta);
        heroShellL.scale.setScalar(emergeScale);
        heroShellR.scale.setScalar(emergeScale);

        heroShellL.rotation.y = elapsed * 0.18 * motionMul + scrollRot;
        heroShellR.rotation.y = heroShellL.rotation.y;

        introNetworkLines.visible = st >= 3;
        heroInnerWire.visible = st >= 4;
        const ringExpand = st === 6 ? 1.45 : 1.0;
        heroOrbit1.scale.setScalar(THREE.MathUtils.damp(heroOrbit1.scale.x, ringExpand, 5, delta));
        heroOrbit2.scale.setScalar(THREE.MathUtils.damp(heroOrbit2.scale.x, ringExpand, 5, delta));
        heroOrbit3.scale.setScalar(THREE.MathUtils.damp(heroOrbit3.scale.x, ringExpand, 5, delta));

        heroOrbit1.rotation.z += delta * 0.48 * motionMul;
        heroOrbit2.rotation.y += delta * 0.34 * motionMul;
        heroOrbit3.rotation.x -= delta * 0.25 * motionMul;
        heroInnerWire.rotation.y -= delta * 0.4 * motionMul;

        for (let i = 0; i < heroSatCount; i++) {
          const sp = heroSatSpecs[i];
          const a = elapsed * sp.speed * motionMul + sp.phase + scrollRot;
          dummy.position.set(
            Math.cos(a) * sp.radius,
            Math.sin(a * 0.8) * sp.tilt * 0.85,
            Math.sin(a) * sp.radius
          );
          dummy.rotation.set(a, a * 0.5, 0);
          dummy.scale.setScalar(0.85 + (i % 3) * 0.2);
          dummy.updateMatrix();
          heroSats.setMatrixAt(i, dummy.matrix);
        }
        heroSats.instanceMatrix.needsUpdate = true;
      }

      // --- CH 1 ANIMATION ---
      if (s.activeChapter === 'ch1') {
        artEmber.rotation.y = elapsed * 0.35 * motionMul + scrollRot;
        artStoneTool.rotation.y = Math.sin(elapsed * 0.5) * 0.25 * motionMul + scrollRot * 0.4;
        artCarving.rotation.y = 0.28 + Math.sin(elapsed * 0.35) * 0.12 * motionMul;
        artShelter.rotation.y = Math.cos(elapsed * 0.3) * 0.14 * motionMul;

        const fireStage = s.stageIndex >= 2 ? 1.0 : 0.25;
        flameOuter.scale.set(fireStage, fireStage * (1 + Math.sin(elapsed * 7) * 0.08 * motionMul), fireStage);
        flameMid.scale.set(fireStage, fireStage * (1 + Math.cos(elapsed * 9) * 0.1 * motionMul), fireStage);
        ch1Silhouettes.visible = s.stageIndex >= 3;

        lost001.visible = !s.discoveredLostArtifacts.includes('lost-001');
        lost001Core.rotation.y += delta * 1.4 * motionMul;

        secret001.visible = !s.unlockedSecrets.includes('secret-001');
        secret001.rotation.z = Math.sin(elapsed * 0.9) * 0.08 * motionMul;

        for (let i = 0; i < emberCount; i++) {
          const ep = emberParticles[i];
          const py = ((ep.y + elapsed * ep.speed * motionMul + 1.8) % 3.8) - 1.8;
          const px = ep.x + Math.sin(elapsed * 1.6 + ep.phase) * 0.2;
          dummy.position.set(px, py, ep.z);
          dummy.scale.setScalar((0.6 + (1.8 - py) * 0.2) * fireStage);
          dummy.updateMatrix();
          emberPartMesh.setMatrixAt(i, dummy.matrix);
        }
        emberPartMesh.instanceMatrix.needsUpdate = true;

        for (let i = 0; i < smokeCount; i++) {
          const sm = smokeData[i];
          const sy = ((sm.y + elapsed * sm.speed * motionMul + 0.8) % 3.2) - 0.8;
          dummy.position.set(sm.x + Math.sin(elapsed * 0.7 + sm.phase) * 0.25, sy, sm.z);
          dummy.scale.setScalar((0.7 + (sy + 0.8) * 0.35) * fireStage);
          dummy.rotation.set(0, 0, elapsed * 0.15 + sm.phase);
          dummy.updateMatrix();
          smokeMesh.setMatrixAt(i, dummy.matrix);
        }
        smokeMesh.instanceMatrix.needsUpdate = true;
      }

      // --- CH 2 ANIMATION ---
      if (s.activeChapter === 'ch2') {
        const awakenBoost = s.stageIndex >= 2 ? 1.25 : 0.7;
        machineGears.forEach((gear, idx) => {
          const active = idx < s.activatedGearStage;
          const dir = idx % 2 === 0 ? 1 : -1;
          const spd = active ? 1.55 * awakenBoost : 0.35;
          gear.rotation.z += delta * spd * dir * motionMul;
          const mat = gear.material as THREE.MeshStandardMaterial;
          mat.emissive.set(active ? '#D9822B' : '#000000');
          mat.emissiveIntensity = active ? 0.32 : 0;
        });
        flywheel.rotation.z += delta * 1.9 * awakenBoost * motionMul;
        pistonRod.position.x = 0.08 + Math.cos(elapsed * 2.2 * awakenBoost * motionMul) * 0.14;
        artFactoryGear.rotation.z -= delta * 0.65 * motionMul;
        artFactoryGear.rotation.y = scrollRot * 0.5;
        artClockwork.rotation.y += delta * 0.5 * motionMul;
        regPendulum.rotation.z = Math.sin(elapsed * 2.4 * motionMul) * 0.18;
        regBob.position.x = Math.sin(regPendulum.rotation.z) * 0.26;
        artBlueprint.rotation.y = -0.28 + Math.sin(elapsed * 0.4) * 0.12 * motionMul;

        lost002.visible = !s.discoveredLostArtifacts.includes('lost-002');
        lost002.position.y = -1.28 + Math.sin(elapsed * 1.8) * 0.03 * motionMul;

        for (let i = 0; i < steamCount; i++) {
          const st = steamData[i];
          const sy = ((st.y + elapsed * st.speed * motionMul) % 2.4) - 0.2;
          dummy.position.set(-1.77 + Math.sin(elapsed + st.phase) * 0.14, sy, 0.85);
          dummy.scale.setScalar(0.45 + sy * 0.35);
          dummy.rotation.set(0, 0, st.phase);
          dummy.updateMatrix();
          steamMesh.setMatrixAt(i, dummy.matrix);
        }
        steamMesh.instanceMatrix.needsUpdate = true;
      }

      // --- CH 3 ANIMATION ---
      if (s.activeChapter === 'ch3') {
        crtRig.drawFrame(elapsed, s.decisions.ch2);
        artMemoryChip.rotation.y += delta * 0.42 * motionMul;
        artProcessor.rotation.y -= delta * 0.38 * motionMul;
        artTerminal.rotation.y = -0.22 + scrollRot * 0.38;
        lost003.visible = !s.discoveredLostArtifacts.includes('lost-003');
        lost003.rotation.y += delta * 0.7 * motionMul;

        // Sequenced Mainframe Rack LEDs on Stage 1+
        mainframeLEDs.forEach((led, idx) => {
          const mat = led.material as THREE.MeshStandardMaterial;
          const lit = s.stageIndex >= 2 || idx <= Math.floor(s.stageProgress * 4);
          mat.emissiveIntensity = lit ? 0.95 + Math.sin(elapsed * 3 + idx) * 0.25 : 0.12;
        });

        // Stage 2 Binary Stream Pulses between racks
        binaryMesh.visible = s.stageIndex >= 2;
        for (let b = 0; b < binaryCount; b++) {
          const t = ((elapsed * 0.55 * motionMul + b * 0.12) % 1);
          dummy.position.set(-2.4 + t * 4.8, -0.8 + (b % 4) * 0.42, -2.18);
          dummy.rotation.set(0, 0, 0);
          dummy.scale.setScalar(1);
          dummy.updateMatrix();
          binaryMesh.setMatrixAt(b, dummy.matrix);
        }
        binaryMesh.instanceMatrix.needsUpdate = true;

        const scatter = Math.max(0, s.chapterProgress - 0.55) * 2.2;
        for (let i = 0; i < pixelCount; i++) {
          const px = pixelData[i];
          dummy.position.set(
            px.x * (1 + scatter * 0.6) + Math.sin(elapsed * 0.9 + px.phase) * 0.12,
            px.y + Math.cos(elapsed * 0.7 + px.phase) * 0.15,
            px.z + scatter * 0.5
          );
          dummy.rotation.set(elapsed * 0.5, px.phase, 0);
          dummy.scale.setScalar(0.75 + Math.sin(elapsed * 2 + px.phase) * 0.25);
          dummy.updateMatrix();
          pixelMesh.setMatrixAt(i, dummy.matrix);
        }
        pixelMesh.instanceMatrix.needsUpdate = true;
      }

      // --- CH 4 ANIMATION ---
      if (s.activeChapter === 'ch4') {
        if (!isDraggingGlobe) {
          globePivot.rotation.y += delta * 0.2 * motionMul + globeRotYVel;
          globePivot.rotation.x = THREE.MathUtils.clamp(globePivot.rotation.x + globeRotXVel, -0.6, 0.6);
        } else {
          globePivot.rotation.y += globeRotYVel;
          globePivot.rotation.x = THREE.MathUtils.clamp(globePivot.rotation.x + globeRotXVel, -0.6, 0.6);
        }
        globeRotYVel *= 0.9;
        globeRotXVel *= 0.9;

        globeNodeMeshes.forEach((mesh, id) => {
          const selected = id === s.selectedGlobeNodeId;
          const visibleByStage = s.stageIndex >= 2 || id === 'node-ucla' || id === 'node-cern';
          mesh.visible = visibleByStage;
          mesh.scale.setScalar(THREE.MathUtils.damp(mesh.scale.x, selected ? 1.65 : 1.0, 8, delta));
        });

        for (let c = 0; c < globeCurves.length; c++) {
          const t1 = (elapsed * 0.32 * motionMul + c * 0.19) % 1;
          const t2 = (elapsed * 0.32 * motionMul + c * 0.19 + 0.5) % 1;
          globeCurves[c].getPoint(t1, _v1);
          dummy.position.copy(_v1);
          dummy.scale.setScalar(1);
          dummy.updateMatrix();
          packetMesh.setMatrixAt(c * 2, dummy.matrix);

          globeCurves[c].getPoint(t2, _v1);
          dummy.position.copy(_v1);
          dummy.updateMatrix();
          packetMesh.setMatrixAt(c * 2 + 1, dummy.matrix);
        }
        packetMesh.instanceMatrix.needsUpdate = true;

        artWebPage.rotation.y = Math.sin(elapsed * 0.6) * 0.25 * motionMul;
        artCloud.rotation.y += delta * 0.35 * motionMul;
        artIdentity.rotation.y -= delta * 0.5 * motionMul;
        lost004.visible = !s.discoveredLostArtifacts.includes('lost-004');
        lost004.rotation.x += delta * 0.9 * motionMul;
        secret004.rotation.y += delta * 0.45 * motionMul;
      }

      // --- CH 5 ANIMATION ---
      if (s.activeChapter === 'ch5') {
        ch5Skyline.rotation.y = elapsed * 0.03 * motionMul;
        neuralInner.rotation.y += delta * 0.4 * motionMul;
        neuralRingA.rotation.z += delta * 0.55 * motionMul;
        neuralRingB.rotation.y -= delta * 0.42 * motionMul;
        neuralRingC.rotation.x += delta * 0.32 * motionMul;
        neuralRingD.rotation.y += delta * 0.25 * motionMul;
        artCreative.rotation.y += delta * 0.6 * motionMul;
        artHumanMemory.rotation.y -= delta * 0.45 * motionMul;
        lost005.visible = !s.discoveredLostArtifacts.includes('lost-005');
        lost005.position.y = 1.38 + Math.sin(elapsed * 1.4) * 0.05 * motionMul;

        for (let c = 0; c < axonCurves.length; c++) {
          const t1 = (elapsed * 0.45 * motionMul + c * 0.13) % 1;
          const t2 = (elapsed * 0.45 * motionMul + c * 0.13 + 0.5) % 1;
          axonCurves[c].getPoint(t1, _v1);
          dummy.position.copy(_v1);
          dummy.scale.setScalar(1);
          dummy.updateMatrix();
          neuralPulses.setMatrixAt(c * 2, dummy.matrix);

          axonCurves[c].getPoint(t2, _v1);
          dummy.position.copy(_v1);
          dummy.updateMatrix();
          neuralPulses.setMatrixAt(c * 2 + 1, dummy.matrix);
        }
        neuralPulses.instanceMatrix.needsUpdate = true;
      }

      // --- ENDING WORLDS (5 Distinct 2075 Architectures) ---
      if (s.activeChapter === 'ending') {
        const arch = s.endingOutcome.archetype;
        const vv = s.endingOutcome.visualVariation;
        worldRenaissance.visible = arch === 'renaissance';
        worldMachineDependency.visible = arch === 'machine_dependency';
        worldDividedNetwork.visible = arch === 'divided_network';
        worldSymbiotic.visible = arch === 'symbiotic';
        worldLostConnection.visible = arch === 'lost_connection';
        endingGroup.rotation.y = scrollRot * 0.35 + elapsed * 0.08 * motionMul;

        if (arch === 'renaissance') {
          renSunHalo.rotation.z += delta * 0.35 * vv.ringSpeed * motionMul;
          const visibleC = Math.max(8, Math.round(28 * vv.organicRatio));
          for (let i = 0; i < 28; i++) {
            if (i < visibleC) {
              const a = (i / visibleC) * Math.PI * 2;
              const r = 1.4 + (i % 3) * 0.55;
              dummy.position.set(Math.cos(a) * r, -1.1 + (i % 2) * 0.25, Math.sin(a) * r);
              dummy.scale.setScalar(0.85 + (i % 3) * 0.2);
            } else {
              dummy.scale.setScalar(0.0001);
            }
            dummy.updateMatrix();
            renCanopy.setMatrixAt(i, dummy.matrix);
          }
          renCanopy.instanceMatrix.needsUpdate = true;
        } else if (arch === 'machine_dependency') {
          domScannerRing.rotation.z -= delta * 0.58 * vv.ringSpeed * motionMul;
          domOuterLattice.rotation.z += delta * 0.14 * motionMul;
          const visM = Math.max(10, Math.round(28 * vv.structureDensity));
          for (let i = 0; i < 28; i++) {
            if (i < visM) {
              const a = (i / visM) * Math.PI * 2;
              const r = 2.0 + (i % 3) * 0.55;
              const h = 1.2 + ((i * 5) % 4) * 0.65 * vv.structureDensity;
              dummy.position.set(Math.cos(a) * r, -1.65 + h * 0.5, Math.sin(a) * r);
              dummy.scale.set(1, h, 1);
              dummy.rotation.set(0, -a, 0);
            } else {
              dummy.scale.setScalar(0.0001);
            }
            dummy.updateMatrix();
            domMonoliths.setMatrixAt(i, dummy.matrix);
          }
          domMonoliths.instanceMatrix.needsUpdate = true;
        } else if (arch === 'divided_network') {
          divSplitRingA.rotation.z += delta * 0.36 * vv.ringSpeed * motionMul;
          divSplitRingB.rotation.z -= delta * 0.24 * vv.ringSpeed * motionMul;
          for (let i = 0; i < 20; i++) {
            const side = i < 10 ? -1 : 1;
            const localIdx = i % 10;
            const a = (localIdx / 10) * Math.PI - Math.PI / 2;
            const r = 1.35 + (localIdx % 3) * 0.48;
            const h = 0.7 + (localIdx % 4) * 0.35;
            dummy.position.set(
              side * (0.65 + Math.abs(Math.cos(a)) * r),
              -1.45 + h * 0.45 + Math.sin(elapsed * 0.7 + i) * 0.04 * motionMul,
              Math.sin(a) * r
            );
            dummy.scale.set(1, h, 1);
            dummy.rotation.set(0, a * side, 0);
            dummy.updateMatrix();
            divClusterShards.setMatrixAt(i, dummy.matrix);
          }
          divClusterShards.instanceMatrix.needsUpdate = true;
        } else if (arch === 'symbiotic') {
          symOrbitRing.rotation.z += delta * 0.42 * vv.ringSpeed * motionMul;
          symTorus.rotation.z -= delta * 0.18 * motionMul;
          for (let i = 0; i < 20; i++) {
            const a = (i / 20) * Math.PI * 2 + elapsed * 0.15 * motionMul;
            dummy.position.set(Math.cos(a) * 1.65, Math.sin(a * 2) * 0.25, Math.sin(a) * 1.65);
            dummy.scale.setScalar(0.75 + vv.organicRatio * 0.45);
            dummy.updateMatrix();
            symBioNodes.setMatrixAt(i, dummy.matrix);
          }
          symBioNodes.instanceMatrix.needsUpdate = true;
        } else {
          // lost_connection
          lostHollowShell.rotation.y += delta * 0.12 * motionMul;
          lostDimEmber.rotation.x += delta * 0.25 * motionMul;
          lostStaticRing.rotation.z -= delta * 0.08 * motionMul;
          for (let i = 0; i < 16; i++) {
            const a = (i / 16) * Math.PI * 2 + elapsed * 0.04 * motionMul;
            const r = 2.35 + (i % 3) * 0.45;
            dummy.position.set(
              Math.cos(a) * r,
              -0.95 + ((i % 4) - 1.5) * 0.42 + Math.sin(elapsed * 0.5 + i) * 0.06 * motionMul,
              Math.sin(a) * r
            );
            dummy.scale.setScalar(0.85);
            dummy.rotation.set(0.15 * (i % 3), a, 0.12);
            dummy.updateMatrix();
            lostDrifters.setMatrixAt(i, dummy.matrix);
          }
          lostDrifters.instanceMatrix.needsUpdate = true;
        }
      }

      // --- CREDITS 3D MEMORY CORE & FLOATING SHARDS ---
      if (s.activeChapter === 'credits') {
        creditsCoreSphere.rotation.y += delta * 0.22 * motionMul;
        creditsWireLattice.rotation.y -= delta * 0.18 * motionMul;
        creditsWireLattice.rotation.x += delta * 0.1 * motionMul;
        creditsOuterHalo.rotation.z += delta * 0.16 * motionMul;
        creditsInnerHalo.rotation.x -= delta * 0.22 * motionMul;

        for (let i = 0; i < shardCount; i++) {
          const sp = shardSpecs[i];
          const a = elapsed * sp.speed * motionMul + sp.phase;
          dummy.position.set(
            Math.cos(a) * sp.radius,
            sp.ySpread + Math.sin(elapsed * 0.7 + sp.phase) * 0.16,
            Math.sin(a) * sp.radius
          );
          dummy.rotation.set(a, a * 0.6, sp.phase);
          dummy.scale.setScalar(0.7 + (i % 3) * 0.25);
          dummy.updateMatrix();
          creditsShards.setMatrixAt(i, dummy.matrix);
        }
        creditsShards.instanceMatrix.needsUpdate = true;
      }

      // Discovery Burst Update
      if (burstAge < 1.1) {
        burstAge += delta;
        const p = Math.min(1, burstAge / 1.1);
        for (let i = 0; i < burstCount; i++) {
          _v1.copy(burstOrigin).addScaledVector(burstDirs[i], p * 1.35);
          dummy.position.copy(_v1);
          dummy.scale.setScalar(Math.max(0.01, 1 - p));
          dummy.updateMatrix();
          burstMesh.setMatrixAt(i, dummy.matrix);
        }
        burstMesh.instanceMatrix.needsUpdate = true;
        if (p >= 1) burstMesh.visible = false;
      }

      // Ambient Dust
      for (let i = 0; i < dustCount; i++) {
        const d = dustData[i];
        dummy.position.set(
          d.x + Math.sin(elapsed * 0.32 + d.phase) * 0.22 * motionMul,
          d.y + Math.cos(elapsed * 0.26 + d.phase) * 0.18 * motionMul,
          d.z
        );
        dummy.scale.setScalar(d.scale);
        dummy.updateMatrix();
        dustMesh.setMatrixAt(i, dummy.matrix);
      }
      dustMesh.instanceMatrix.needsUpdate = true;

      // Scroll-Driven Camera Choreography + Artifact / Discovery Focus Dolly
      if (s.activeChapter === 'intro') {
        const zDolly = s.stageIndex === 6 ? 3.4 - s.stageProgress * 1.4 : 7.0 - s.chapterProgress * 2.5;
        _v1.set(pointerX * 0.42 * motionMul, 0.18 + pointerY * 0.24 * motionMul, zDolly);
        _v2.set(isDesktop ? 0.65 : 0, 0, 0);
      } else if (s.activeChapter === 'credits') {
        _v1.set(pointerX * 0.28 * motionMul, 0.12 + pointerY * 0.18 * motionMul, 5.8);
        _v2.set(0, 0, 0);
      } else if (s.activeChapter === 'ending') {
        const archCamZ =
          s.endingOutcome.archetype === 'lost_connection'
            ? 7.6
            : s.endingOutcome.archetype === 'machine_dependency'
            ? 6.9
            : 6.5;
        _v1.set(
          pointerX * 0.38 * motionMul,
          0.42 + pointerY * 0.24 * motionMul - s.chapterProgress * 0.25,
          archCamZ
        );
        _v2.set(isDesktop ? 0.45 : 0, 0, 0);
      } else {
        const stageZShift = (s.stageIndex - 1) * 0.16;
        _v1.set(
          pointerX * 0.35 * motionMul + (s.stageIndex % 2 === 0 ? 0.2 : -0.1),
          0.36 + pointerY * 0.22 * motionMul - s.chapterProgress * 0.34,
          7.15 - stageZShift
        );
        _v2.set(isDesktop ? 0.4 : 0, 0, 0);
      }

      if (s.focusedArtifactId && artifactLookup.has(s.focusedArtifactId)) {
        const targetObj = artifactLookup.get(s.focusedArtifactId)!;
        targetObj.getWorldPosition(_v2);
        _v1.set(_v2.x * 0.65, _v2.y + 0.28, _v2.z + 3.05);
      } else if (discoveryFocusAge < 1.35) {
        discoveryFocusAge += delta;
        _v2.copy(discoveryFocusPos);
        _v1.set(_v2.x * 0.55, _v2.y + 0.2, _v2.z + 3.4);
      }

      camera.position.x = THREE.MathUtils.damp(camera.position.x, _v1.x, 4.5, delta);
      camera.position.y = THREE.MathUtils.damp(camera.position.y, _v1.y, 4.5, delta);
      camera.position.z = THREE.MathUtils.damp(camera.position.z, _v1.z, 4.5, delta);
      camera.lookAt(_v2.x * 0.55, _v2.y * 0.5, 0);

      renderer.render(scene, camera);

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    };

    tick();

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('resize', onResize);
      renderer.domElement.removeEventListener('webglcontextlost', handleContextLost);
      renderer.domElement.removeEventListener('webglcontextrestored', handleContextRestored);

      scene.traverse((obj) => {
        if ((obj as THREE.Mesh).isMesh) {
          const mesh = obj as THREE.Mesh;
          mesh.geometry.dispose();
          if (Array.isArray(mesh.material)) {
            mesh.material.forEach((m) => m.dispose());
          } else {
            mesh.material.dispose();
          }
        }
      });
      metalMaps.roughnessMap.dispose();
      metalMaps.bumpMap.dispose();
      smokeTex.dispose();
      crtRig.texture.dispose();
      pcbTex.dispose();
      dialTex.dispose();
      clockFaceTex.dispose();
      blueprintTex.dispose();
      glyphTex.dispose();
      secretGlyphTex.dispose();
      globeMaps.map.dispose();
      globeMaps.roughnessMap.dispose();
      webSlateTex.dispose();
      noteTex.dispose();
      envTex.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  if (webglError) {
    return (
      <div
        aria-hidden="true"
        className="fixed inset-0 z-0 pointer-events-none bg-[#090B0D] flex items-center justify-end pr-16 overflow-hidden"
      >
        <div className="w-[420px] h-[420px] rounded-full border border-[#BFC7CB]/20 bg-[radial-gradient(circle_at_center,rgba(166,199,169,0.14)_0%,rgba(17,22,25,0.6)_55%,transparent_75%)] flex items-center justify-center">
          <div className="w-60 h-60 rounded-full border border-[#A6C7A9]/30 flex items-center justify-center">
            <div className="w-24 h-24 rounded-full bg-[#BFC7CB]/20 border border-[#BFC7CB]/50" />
          </div>
        </div>
      </div>
    );
  }

  return <div ref={mountRef} className="fixed inset-0 z-0" aria-label="Interactive 3D Archive Stage" />;
};

export default ArchiveCanvas;
