import * as THREE from 'three';
import {
  createAnimatedCRTCanvas,
  createBlueprintTexture,
  createBrushedMetalMaps,
  createClockFaceTexture,
  createGaugeDialTexture,
  createGlyphTexture,
  createPCBTexture,
  createProceduralGearGeometry,
  createWebSlateTexture,
} from './proceduralAssets';

export interface AutopsySpecimenRig {
  group: THREE.Group;
  disposeTextures: () => void;
}

/**
 * Builds a high-detail procedural 3D specimen mesh matching each artifact ID
 * for the interactive Artifact Autopsy modal viewport.
 */
export function buildAutopsyArtifactMesh(artifactId: string): AutopsySpecimenRig {
  const group = new THREE.Group();
  const metalMaps = createBrushedMetalMaps();
  const texturesToDispose: THREE.Texture[] = [metalMaps.roughnessMap, metalMaps.bumpMap];

  const chromeMat = new THREE.MeshPhysicalMaterial({
    color: '#DCE2E6',
    metalness: 0.96,
    roughness: 0.14,
    roughnessMap: metalMaps.roughnessMap,
    bumpMap: metalMaps.bumpMap,
    bumpScale: 0.012,
    clearcoat: 0.85,
    clearcoatRoughness: 0.08,
  });
  const silverMat = new THREE.MeshStandardMaterial({
    color: '#BFC7CB',
    metalness: 0.88,
    roughness: 0.26,
    roughnessMap: metalMaps.roughnessMap,
  });
  const darkTitaniumMat = new THREE.MeshStandardMaterial({
    color: '#20272C',
    metalness: 0.78,
    roughness: 0.42,
  });
  const brassMat = new THREE.MeshStandardMaterial({
    color: '#C29B59',
    metalness: 0.9,
    roughness: 0.22,
    roughnessMap: metalMaps.roughnessMap,
  });
  const basaltMat = new THREE.MeshStandardMaterial({
    color: '#222629',
    metalness: 0.1,
    roughness: 0.88,
    flatShading: true,
  });
  const emberMat = new THREE.MeshStandardMaterial({
    color: '#42190D',
    emissive: '#D9822B',
    emissiveIntensity: 2.1,
    roughness: 0.55,
  });
  const woodMat = new THREE.MeshStandardMaterial({
    color: '#6B4D37',
    roughness: 0.85,
    metalness: 0.04,
  });
  const greenMat = new THREE.MeshStandardMaterial({
    color: '#A6C7A9',
    emissive: '#4D7C55',
    emissiveIntensity: 0.95,
    metalness: 0.35,
    roughness: 0.28,
  });
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: '#E6F0EB',
    metalness: 0.05,
    roughness: 0.08,
    transparent: true,
    opacity: 0.38,
    ior: 1.52,
    clearcoat: 1.0,
    depthWrite: false,
  });

  switch (artifactId) {
    case 'art-ember': {
      const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.42, 2), emberMat);
      const halo = new THREE.Mesh(new THREE.TorusGeometry(0.74, 0.016, 12, 48), emberMat);
      halo.rotation.x = Math.PI / 2.2;
      group.add(core, halo);
      for (let c = 0; c < 4; c++) {
        const shard = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.11, 0.72, 7), basaltMat);
        shard.rotation.z = Math.PI / 2.2;
        shard.rotation.y = (c / 4) * Math.PI * 2;
        shard.position.y = -0.22;
        group.add(shard);
      }
      break;
    }

    case 'art-stone-tool': {
      const bladeShape = new THREE.Shape();
      bladeShape.moveTo(0, 0.54);
      bladeShape.lineTo(0.24, 0.12);
      bladeShape.lineTo(0.14, -0.32);
      bladeShape.lineTo(-0.14, -0.32);
      bladeShape.lineTo(-0.24, 0.12);
      bladeShape.closePath();
      const bladeGeo = new THREE.ExtrudeGeometry(bladeShape, {
        depth: 0.09,
        bevelEnabled: true,
        bevelSize: 0.028,
        bevelThickness: 0.028,
      });
      bladeGeo.center();
      const blade = new THREE.Mesh(
        bladeGeo,
        new THREE.MeshStandardMaterial({ color: '#6E787D', roughness: 0.58, metalness: 0.15, flatShading: true })
      );
      blade.position.y = 0.25;
      const haft = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.98, 12), woodMat);
      haft.position.y = -0.35;
      const sinew = new THREE.Mesh(
        new THREE.TorusGeometry(0.11, 0.03, 10, 24),
        new THREE.MeshStandardMaterial({ color: '#9D8160', roughness: 0.8 })
      );
      sinew.rotation.x = Math.PI / 2;
      sinew.position.y = -0.02;
      group.add(blade, haft, sinew);
      break;
    }

    case 'art-shared-flame': {
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        const st = new THREE.Mesh(new THREE.DodecahedronGeometry(0.14, 0), basaltMat);
        st.position.set(Math.cos(a) * 0.48, -0.18, Math.sin(a) * 0.48);
        group.add(st);
      }
      const outer = new THREE.Mesh(
        new THREE.ConeGeometry(0.28, 0.82, 10),
        new THREE.MeshStandardMaterial({ color: '#C95D3A', emissive: '#D9822B', emissiveIntensity: 1.7, transparent: true, opacity: 0.82 })
      );
      outer.position.y = 0.18;
      const mid = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.62, 9), emberMat);
      mid.position.set(0.04, 0.14, 0.03);
      const heart = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.4, 8), new THREE.MeshBasicMaterial({ color: '#FFF6DF' }));
      heart.position.set(-0.02, 0.08, 0.02);
      group.add(outer, mid, heart);
      break;
    }

    case 'art-ancient-carving': {
      const glyphTex = createGlyphTexture(false);
      texturesToDispose.push(glyphTex);
      const slab = new THREE.Mesh(
        new THREE.BoxGeometry(0.76, 0.92, 0.16),
        new THREE.MeshStandardMaterial({ map: glyphTex, roughness: 0.84, metalness: 0.06 })
      );
      group.add(slab);
      break;
    }

    case 'art-primitive-shelter': {
      for (let r = 0; r < 5; r++) {
        const a = (r / 4) * Math.PI - Math.PI / 2;
        const rib = new THREE.Mesh(
          new THREE.TorusGeometry(0.48, 0.035, 8, 20, Math.PI),
          new THREE.MeshStandardMaterial({ color: '#7D6756', roughness: 0.82 })
        );
        rib.rotation.y = a * 0.45;
        rib.position.y = -0.15;
        group.add(rib);
      }
      const hide = new THREE.Mesh(
        new THREE.ConeGeometry(0.52, 0.62, 8, 1, true, 0, Math.PI * 1.35),
        new THREE.MeshStandardMaterial({ color: '#4E3B2D', roughness: 0.88, side: THREE.DoubleSide })
      );
      hide.position.y = 0.15;
      group.add(hide);
      break;
    }

    case 'art-steam-engine': {
      const dialTex = createGaugeDialTexture();
      texturesToDispose.push(dialTex);
      const boiler = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.9, 24), darkTitaniumMat);
      boiler.rotation.z = Math.PI / 2;
      const chimney = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.11, 0.75, 16), silverMat);
      chimney.position.set(-0.22, 0.44, 0);
      const gaugeRim = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.05, 20), brassMat);
      gaugeRim.rotation.x = Math.PI / 2;
      gaugeRim.position.set(0.15, 0.22, 0.31);
      const gaugeFace = new THREE.Mesh(new THREE.CircleGeometry(0.11, 20), new THREE.MeshBasicMaterial({ map: dialTex }));
      gaugeFace.position.set(0.15, 0.22, 0.34);
      const flywheel = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.045, 12, 36), brassMat);
      flywheel.position.set(0.38, 0.02, 0.34);
      const piston = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.55, 8), silverMat);
      piston.rotation.z = Math.PI / 2;
      piston.position.set(0.08, 0.02, 0.38);
      group.add(boiler, chimney, gaugeRim, gaugeFace, flywheel, piston);
      break;
    }

    case 'art-factory-gear': {
      const gear = new THREE.Mesh(createProceduralGearGeometry(16, 0.18, 0.66, 0.1, 0.18, 6), brassMat);
      const axle = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.42, 18), silverMat);
      axle.rotation.x = Math.PI / 2;
      group.add(gear, axle);
      break;
    }

    case 'art-clockwork-machine': {
      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.48, 0.12, 24), darkTitaniumMat);
      base.position.y = -0.34;
      const r1 = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.026, 12, 36), brassMat);
      const r2 = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.022, 12, 32), silverMat);
      r2.rotation.y = Math.PI / 2;
      const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.12, 0), brassMat);
      group.add(base, r1, r2, core);
      break;
    }

    case 'art-mechanical-clock': {
      const clockTex = createClockFaceTexture();
      texturesToDispose.push(clockTex);
      const bezel = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.12, 32), brassMat);
      bezel.rotation.x = Math.PI / 2;
      bezel.position.y = 0.22;
      const dial = new THREE.Mesh(new THREE.CircleGeometry(0.34, 32), new THREE.MeshBasicMaterial({ map: clockTex }));
      dial.position.set(0, 0.22, 0.07);
      const pend = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.56, 8), brassMat);
      pend.position.y = -0.25;
      const bob = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.045, 20), brassMat);
      bob.rotation.x = Math.PI / 2;
      bob.position.y = -0.52;
      group.add(bezel, dial, pend, bob);
      break;
    }

    case 'art-industrial-blueprint': {
      const bpTex = createBlueprintTexture();
      texturesToDispose.push(bpTex);
      const plate = new THREE.Mesh(new THREE.BoxGeometry(0.98, 0.74, 0.05), silverMat);
      const face = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.66), new THREE.MeshBasicMaterial({ map: bpTex }));
      face.position.z = 0.028;
      group.add(plate, face);
      break;
    }

    case 'art-memory-chip': {
      const pcbTex = createPCBTexture();
      texturesToDispose.push(pcbTex);
      const pcbPlate = new THREE.Mesh(
        new THREE.BoxGeometry(1.06, 0.06, 0.72),
        new THREE.MeshStandardMaterial({ map: pcbTex, roughness: 0.5, metalness: 0.25 })
      );
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.14, 0.38), darkTitaniumMat);
      body.position.y = 0.09;
      const dieWin = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.16, 0.18), greenMat);
      dieWin.position.y = 0.095;
      group.add(pcbPlate, body, dieWin);
      for (let p = -3; p <= 3; p++) {
        const pinL = new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.14, 0.07), brassMat);
        pinL.position.set(p * 0.1, 0.03, 0.22);
        const pinR = pinL.clone();
        pinR.position.z = -0.22;
        group.add(pinL, pinR);
      }
      group.rotation.x = 0.42;
      break;
    }

    case 'art-processor': {
      const pcbTex = createPCBTexture();
      texturesToDispose.push(pcbTex);
      const pcb = new THREE.Mesh(
        new THREE.BoxGeometry(0.9, 0.07, 0.9),
        new THREE.MeshStandardMaterial({ map: pcbTex, roughness: 0.45, metalness: 0.3 })
      );
      const spreader = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.12, 0.56), silverMat);
      spreader.position.y = 0.08;
      const die = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.14, 0.24), greenMat);
      die.position.y = 0.09;
      group.add(pcb, spreader, die);
      group.rotation.x = 0.45;
      break;
    }

    case 'art-terminal': {
      const crt = createAnimatedCRTCanvas();
      crt.drawFrame(2.5, 'purpose');
      texturesToDispose.push(crt.texture);
      const housing = new THREE.Mesh(
        new THREE.BoxGeometry(1.18, 0.92, 0.72),
        new THREE.MeshStandardMaterial({ color: '#394045', roughness: 0.55, metalness: 0.2 })
      );
      housing.position.y = 0.12;
      const bezel = new THREE.Mesh(new THREE.BoxGeometry(1.06, 0.78, 0.07), darkTitaniumMat);
      bezel.position.set(0, 0.14, 0.36);
      const screen = new THREE.Mesh(
        new THREE.PlaneGeometry(0.92, 0.68),
        new THREE.MeshBasicMaterial({ map: crt.texture })
      );
      screen.position.set(0, 0.14, 0.4);
      const keybed = new THREE.Mesh(new THREE.BoxGeometry(1.16, 0.12, 0.44), darkTitaniumMat);
      keybed.position.set(0, -0.44, 0.42);
      keybed.rotation.x = 0.2;
      const knob = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.036, 0.04, 16), silverMat);
      knob.rotation.x = Math.PI / 2;
      knob.position.set(0.46, -0.32, 0.39);
      group.add(housing, bezel, screen, keybed, knob);
      break;
    }

    case 'art-first-webpage': {
      const webTex = createWebSlateTexture();
      texturesToDispose.push(webTex);
      const slate = new THREE.Mesh(new THREE.BoxGeometry(0.84, 0.84, 0.06), silverMat);
      const face = new THREE.Mesh(new THREE.PlaneGeometry(0.76, 0.76), new THREE.MeshBasicMaterial({ map: webTex }));
      face.position.z = 0.035;
      group.add(slate, face);
      break;
    }

    case 'art-cloud': {
      for (let s = 0; s < 3; s++) {
        const blade = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.12, 0.54), darkTitaniumMat);
        blade.position.y = (s - 1) * 0.24;
        const strip = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.035, 0.56), greenMat);
        strip.position.y = blade.position.y;
        group.add(blade, strip);
      }
      break;
    }

    case 'art-digital-identity': {
      const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.4, 0), glassMat);
      const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.2, 0), silverMat);
      const holo = new THREE.Mesh(
        new THREE.IcosahedronGeometry(0.52, 0),
        new THREE.MeshBasicMaterial({ color: '#A6C7A9', wireframe: true, transparent: true, opacity: 0.42 })
      );
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.56, 0.018, 12, 40), greenMat);
      group.add(crystal, core, holo, ring);
      break;
    }

    case 'art-neural-core': {
      const inner = new THREE.Mesh(
        new THREE.IcosahedronGeometry(0.38, 2),
        new THREE.MeshStandardMaterial({ color: '#E8F2E9', emissive: '#A6C7A9', emissiveIntensity: 1.5, roughness: 0.18 })
      );
      const shell = new THREE.Mesh(new THREE.IcosahedronGeometry(0.62, 1), glassMat);
      const rA = new THREE.Mesh(new THREE.TorusGeometry(0.8, 0.02, 12, 48), chromeMat);
      const rB = new THREE.Mesh(new THREE.TorusGeometry(0.95, 0.016, 12, 48), greenMat);
      rB.rotation.x = Math.PI / 2.4;
      group.add(inner, shell, rA, rB);
      break;
    }

    case 'art-creative-engine': {
      const knot = new THREE.Mesh(new THREE.TorusKnotGeometry(0.32, 0.09, 64, 14), chromeMat);
      const plinth = new THREE.Mesh(new THREE.TorusGeometry(0.52, 0.022, 12, 40), brassMat);
      plinth.rotation.x = Math.PI / 2;
      plinth.position.y = -0.38;
      group.add(knot, plinth);
      break;
    }

    case 'art-human-memory':
    default: {
      const capGlass = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.82, 6), glassMat);
      const capTop = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.1, 6), silverMat);
      capTop.position.y = 0.44;
      const capBot = capTop.clone();
      capBot.position.y = -0.44;
      const filament = new THREE.Mesh(new THREE.OctahedronGeometry(0.16, 0), emberMat);
      group.add(capGlass, capTop, capBot, filament);
      break;
    }
  }

  const disposeTextures = () => {
    texturesToDispose.forEach((t) => t.dispose());
  };

  return { group, disposeTextures };
}
