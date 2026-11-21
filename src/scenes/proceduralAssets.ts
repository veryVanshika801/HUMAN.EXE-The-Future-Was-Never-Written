import * as THREE from 'three';

/**
 * Procedural texture & geometry builders for HUMAN.EXE
 * Zero external asset dependencies; every surface uses calibrated PBR maps.
 */

export function createBrushedMetalMaps(): {
  roughnessMap: THREE.CanvasTexture;
  bumpMap: THREE.CanvasTexture;
} {
  const size = 512;
  const rCanvas = document.createElement('canvas');
  rCanvas.width = size;
  rCanvas.height = size;
  const rCtx = rCanvas.getContext('2d')!;

  const bCanvas = document.createElement('canvas');
  bCanvas.width = size;
  bCanvas.height = size;
  const bCtx = bCanvas.getContext('2d')!;

  rCtx.fillStyle = '#242424';
  rCtx.fillRect(0, 0, size, size);
  bCtx.fillStyle = '#808080';
  bCtx.fillRect(0, 0, size, size);

  // Subtle lathe brushing streaks & micro-imperfections
  for (let i = 0; i < 650; i++) {
    const y = Math.random() * size;
    const w = 40 + Math.random() * 240;
    const x = Math.random() * size;
    const v = 26 + Math.floor(Math.random() * 34);
    rCtx.fillStyle = `rgba(${v},${v},${v},0.35)`;
    rCtx.fillRect(x, y, w, 1);

    const bv = 112 + Math.floor(Math.random() * 32);
    bCtx.fillStyle = `rgba(${bv},${bv},${bv},0.3)`;
    bCtx.fillRect(x, y, w, 1);
  }

  // Subtle machined seam rings
  rCtx.strokeStyle = 'rgba(75,75,75,0.45)';
  rCtx.lineWidth = 2;
  bCtx.strokeStyle = 'rgba(95,95,95,0.5)';
  bCtx.lineWidth = 2;
  for (const yPos of [128, 256, 384]) {
    rCtx.beginPath();
    rCtx.moveTo(0, yPos);
    rCtx.lineTo(size, yPos);
    rCtx.stroke();
    bCtx.beginPath();
    bCtx.moveTo(0, yPos);
    bCtx.lineTo(size, yPos);
    bCtx.stroke();
  }

  const roughnessMap = new THREE.CanvasTexture(rCanvas);
  roughnessMap.wrapS = roughnessMap.wrapT = THREE.RepeatWrapping;
  const bumpMap = new THREE.CanvasTexture(bCanvas);
  bumpMap.wrapS = bumpMap.wrapT = THREE.RepeatWrapping;

  return { roughnessMap, bumpMap };
}

export function createSoftParticleTexture(innerColor: string, midColor: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(64, 64, 2, 64, 64, 62);
  grad.addColorStop(0, innerColor);
  grad.addColorStop(0.45, midColor);
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createProceduralGearGeometry(
  teeth: number,
  innerRadius: number,
  outerRadius: number,
  toothDepth: number,
  thickness: number,
  spokes = 5
): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape();
  const step = (Math.PI * 2) / teeth;
  const baseR = outerRadius - toothDepth;

  for (let i = 0; i < teeth; i++) {
    const a0 = i * step;
    const a1 = a0 + step * 0.2;
    const a2 = a0 + step * 0.34;
    const a3 = a0 + step * 0.66;
    const a4 = a0 + step * 0.8;

    if (i === 0) {
      shape.moveTo(Math.cos(a0) * baseR, Math.sin(a0) * baseR);
    } else {
      shape.lineTo(Math.cos(a0) * baseR, Math.sin(a0) * baseR);
    }
    shape.lineTo(Math.cos(a1) * baseR, Math.sin(a1) * baseR);
    shape.lineTo(Math.cos(a2) * outerRadius, Math.sin(a2) * outerRadius);
    shape.lineTo(Math.cos(a3) * outerRadius, Math.sin(a3) * outerRadius);
    shape.lineTo(Math.cos(a4) * baseR, Math.sin(a4) * baseR);
  }
  shape.closePath();

  // Center axle bore
  const bore = new THREE.Path();
  bore.absarc(0, 0, innerRadius, 0, Math.PI * 2, true);
  shape.holes.push(bore);

  // Machined spoke cutouts for authentic industrial silhouette
  if (spokes > 0 && baseR - innerRadius > 0.26) {
    const rIn = innerRadius + 0.08;
    const rOut = baseR - 0.1;
    const span = (Math.PI * 2) / spokes;
    for (let s = 0; s < spokes; s++) {
      const aStart = s * span + 0.16;
      const aEnd = (s + 1) * span - 0.16;
      if (aEnd <= aStart) continue;
      const cutout = new THREE.Path();
      cutout.absarc(0, 0, rOut, aStart, aEnd, false);
      cutout.absarc(0, 0, rIn, aEnd, aStart, true);
      cutout.closePath();
      shape.holes.push(cutout);
    }
  }

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: thickness,
    bevelEnabled: true,
    bevelThickness: 0.024,
    bevelSize: 0.02,
    bevelSegments: 2,
  });
  geo.center();
  return geo;
}

export function createPCBTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#0D2216';
  ctx.fillRect(0, 0, 512, 512);

  // Bus traces
  ctx.strokeStyle = '#3C6E4D';
  ctx.lineWidth = 3;
  for (let i = 0; i < 24; i++) {
    const y = 30 + i * 19;
    ctx.beginPath();
    ctx.moveTo(20, y);
    ctx.lineTo(180 + (i % 4) * 35, y);
    ctx.lineTo(220 + (i % 4) * 35, y + 18);
    ctx.lineTo(492, y + 18);
    ctx.stroke();
  }

  // Gold solder pads
  ctx.fillStyle = '#C9A45C';
  for (let x = 40; x < 480; x += 48) {
    for (let y = 40; y < 480; y += 64) {
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createGaugeDialTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#EAE4D7';
  ctx.beginPath();
  ctx.arc(128, 128, 122, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#1E2326';
  ctx.lineWidth = 4;
  for (let i = 0; i <= 12; i++) {
    const a = (i / 12) * Math.PI * 1.5 + Math.PI * 0.75;
    ctx.beginPath();
    ctx.moveTo(128 + Math.cos(a) * 88, 128 + Math.sin(a) * 88);
    ctx.lineTo(128 + Math.cos(a) * 108, 128 + Math.sin(a) * 108);
    ctx.stroke();
  }
  // Needle
  ctx.strokeStyle = '#B84A39';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(128, 128);
  ctx.lineTo(188, 76);
  ctx.stroke();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createAnimatedCRTCanvas(): {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  texture: THREE.CanvasTexture;
  drawFrame: (elapsed: number, mode: 'productivity' | 'purpose' | undefined) => void;
} {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 384;
  const ctx = canvas.getContext('2d')!;
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;

  const lines = [
    '> MEMORY MODULE ACTIVATED',
    '> INFORMATION STORED [64K SILICON]',
    '> DATA PROCESSING...',
    '> HUMAN KNOWLEDGE EXPANDING',
    '> ETHICAL QUESTION DETECTED',
  ];

  let lastBucket = -1;

  const drawFrame = (elapsed: number, mode: 'productivity' | 'purpose' | undefined) => {
    const bucket = Math.floor(elapsed * 3);
    if (bucket === lastBucket) return;
    lastBucket = bucket;

    ctx.fillStyle = '#051008';
    ctx.fillRect(0, 0, 512, 384);

    // Subtle phosphor scanlines
    ctx.fillStyle = 'rgba(166, 199, 169, 0.05)';
    for (let y = 0; y < 384; y += 6) {
      ctx.fillRect(0, y, 512, 2);
    }

    ctx.fillStyle = '#A6C7A9';
    ctx.font = 'bold 19px monospace';
    ctx.fillText('HUMAN.EXE // ARCHIVE_TERMINAL_03', 26, 44);

    ctx.fillStyle = '#6E9B74';
    ctx.font = '13px monospace';
    ctx.fillText(
      mode === 'productivity' ? 'MODE: BATCH_OPTIMIZATION_LEDGER' : 'MODE: HUMAN_AUGMENTATION_STUDIO',
      26,
      70
    );

    ctx.font = '15px monospace';
    const activeCount = (Math.floor(elapsed * 0.9) % 5) + 1;
    for (let i = 0; i < lines.length; i++) {
      ctx.fillStyle = i < activeCount ? '#A6C7A9' : 'rgba(166,199,169,0.28)';
      ctx.fillText(lines[i], 26, 118 + i * 32);
    }

    // Animated hex stream footer
    const hex = ((bucket * 2654435761) >>> 0).toString(16).toUpperCase().padStart(8, '0');
    ctx.fillStyle = '#899398';
    ctx.font = '13px monospace';
    ctx.fillText(`ADDR 0x${hex}  |  PARITY OK`, 26, 318);

    // Blinking cursor
    if (bucket % 2 === 0) {
      ctx.fillStyle = '#A6C7A9';
      ctx.fillRect(26, 336, 11, 18);
    }

    texture.needsUpdate = true;
  };

  drawFrame(0, undefined);
  return { canvas, ctx, texture, drawFrame };
}

/**
 * Recognizable world continents on 2048x1024 equirectangular canvas + matching roughness map
 */
export function createWorldGlobeMaps(): {
  map: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
} {
  const w = 2048;
  const h = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;

  const rCanvas = document.createElement('canvas');
  rCanvas.width = w;
  rCanvas.height = h;
  const rCtx = rCanvas.getContext('2d')!;

  // Deep ocean canvas
  ctx.fillStyle = '#0A1016';
  ctx.fillRect(0, 0, w, h);
  rCtx.fillStyle = '#3A3A3A'; // oceans slightly glossy
  rCtx.fillRect(0, 0, w, h);

  // Equirectangular helper: lon (-180..180), lat (-90..90)
  const pt = (lon: number, lat: number): [number, number] => [
    ((lon + 180) / 360) * w,
    ((90 - lat) / 180) * h,
  ];

  const continents: Array<Array<[number, number]>> = [
    // North America
    [[-168, 66], [-140, 70], [-95, 70], [-78, 62], [-64, 52], [-68, 44], [-76, 35], [-81, 25], [-90, 29], [-97, 26], [-104, 19], [-88, 14], [-82, 9], [-92, 15], [-106, 23], [-114, 32], [-124, 40], [-125, 49], [-138, 59], [-162, 56]],
    // Greenland
    [[-56, 60], [-44, 60], [-20, 72], [-22, 81], [-50, 82], [-68, 76], [-56, 68]],
    // South America
    [[-81, 9], [-72, 12], [-60, 8], [-50, 1], [-35, -6], [-39, -15], [-42, -23], [-52, -33], [-64, -42], [-68, -54], [-74, -52], [-73, -38], [-71, -20], [-81, -5]],
    // Europe
    [[-9, 37], [3, 43], [-4, 48], [2, 51], [8, 54], [12, 58], [6, 61], [16, 69], [28, 71], [42, 67], [56, 60], [50, 48], [38, 45], [29, 41], [23, 37], [16, 38], [12, 43], [5, 43], [-5, 36]],
    // Africa
    [[-17, 15], [-13, 28], [-6, 36], [10, 37], [25, 32], [33, 31], [43, 12], [51, 12], [44, 2], [40, -10], [35, -24], [26, -34], [18, -34], [14, -22], [12, -8], [8, 4], [-5, 5], [-15, 11]],
    // Asia
    [[29, 41], [44, 42], [58, 52], [68, 68], [95, 75], [135, 71], [170, 66], [162, 56], [142, 52], [132, 42], [128, 35], [120, 39], [122, 30], [114, 22], [108, 16], [104, 2], [98, 10], [92, 22], [80, 13], [77, 8], [68, 23], [58, 25], [48, 30], [36, 32]],
    // Japan
    [[130, 32], [136, 34], [141, 38], [145, 44], [140, 42], [135, 36]],
    // Australia
    [[114, -22], [128, -14], [136, -12], [142, -11], [149, -20], [153, -28], [148, -38], [138, -36], [128, -32], [116, -34]],
  ];

  // Graticule grid
  ctx.strokeStyle = 'rgba(191, 199, 203, 0.14)';
  ctx.lineWidth = 1;
  for (let lon = -180; lon <= 180; lon += 15) {
    const [x] = pt(lon, 0);
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }
  for (let lat = -75; lat <= 75; lat += 15) {
    const [, y] = pt(0, lat);
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }

  // Draw continents on albedo & roughness maps
  continents.forEach((poly) => {
    ctx.beginPath();
    rCtx.beginPath();
    poly.forEach(([lon, lat], idx) => {
      const [x, y] = pt(lon, lat);
      if (idx === 0) {
        ctx.moveTo(x, y);
        rCtx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
        rCtx.lineTo(x, y);
      }
    });
    ctx.closePath();
    rCtx.closePath();

    ctx.fillStyle = '#222F36';
    ctx.fill();
    ctx.strokeStyle = '#7AA182';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    rCtx.fillStyle = '#C8C8C8'; // land matte
    rCtx.fill();
  });

  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  const roughnessMap = new THREE.CanvasTexture(rCanvas);
  return { map, roughnessMap };
}

export function createWebSlateTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#0E1418';
  ctx.fillRect(0, 0, 512, 512);
  ctx.strokeStyle = '#A6C7A9';
  ctx.lineWidth = 3;
  ctx.strokeRect(20, 20, 472, 472);

  ctx.fillStyle = '#F0F2F2';
  ctx.font = 'bold 28px monospace';
  ctx.fillText('WorldWideWeb', 48, 88);
  ctx.fillStyle = '#A6C7A9';
  ctx.font = '18px monospace';
  ctx.fillText('<HTML> CERN // 1991', 48, 130);
  ctx.fillStyle = '#899398';
  ctx.font = '16px monospace';
  ctx.fillText('HyperText Transfer Protocol', 48, 190);
  ctx.fillText('Royalty-Free Public Commons', 48, 226);
  ctx.fillText('<a>Link Everything</a>', 48, 290);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createNoteTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 320;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#DED8CC';
  ctx.fillRect(0, 0, 512, 320);
  ctx.strokeStyle = '#A69F92';
  for (let y = 54; y < 290; y += 36) {
    ctx.beginPath();
    ctx.moveTo(24, y);
    ctx.lineTo(488, y);
    ctx.stroke();
  }
  ctx.fillStyle = '#1E2326';
  ctx.font = 'italic 22px serif';
  ctx.fillText('Progress is not measured by what', 38, 114);
  ctx.fillText('our machines can do. It is measured', 38, 152);
  ctx.fillText('by what humanity chooses to do', 38, 190);
  ctx.fillText('with them.  — 2075', 38, 228);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createDisplacedTerrainGeometry(radius: number, segments: number, seed = 1): THREE.BufferGeometry {
  const geo = new THREE.CylinderGeometry(radius, radius * 1.12, 0.45, segments, 4, false);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    if (y > 0.1) {
      const dist = Math.hypot(x, z);
      const wave =
        Math.sin(x * 1.9 + seed) * Math.cos(z * 1.7 - seed) * 0.14 +
        (dist > 2.2 ? (dist - 2.2) * 0.22 : 0);
      pos.setY(i, y + wave);
    }
  }
  geo.computeVertexNormals();
  return geo;
}

export function createGlyphTexture(glowing = false): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#1D2022';
  ctx.fillRect(0, 0, 256, 256);

  // Limestone grain speckles
  for (let i = 0; i < 400; i++) {
    const shade = 24 + Math.floor(Math.random() * 24);
    ctx.fillStyle = `rgb(${shade},${shade},${shade})`;
    ctx.fillRect(Math.random() * 256, Math.random() * 256, 2, 2);
  }

  ctx.strokeStyle = glowing ? '#F6B26B' : '#C98A5B';
  ctx.lineWidth = glowing ? 5 : 4;
  // Concentric triple hearth spiral glyph
  for (let r = 24; r <= 78; r += 26) {
    ctx.beginPath();
    ctx.arc(128, 128, r, 0, Math.PI * 1.75);
    ctx.stroke();
  }
  // Tally lunar notches
  for (let i = 0; i < 9; i++) {
    const x = 32 + i * 24;
    ctx.beginPath();
    ctx.moveTo(x, 212);
    ctx.lineTo(x, 232);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createBlueprintTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 384;
  const ctx = canvas.getContext('2d')!;

  // Prussian-blue cyanotype surface
  ctx.fillStyle = '#0B2338';
  ctx.fillRect(0, 0, 512, 384);

  // Fine white engineering grid
  ctx.strokeStyle = 'rgba(210, 230, 245, 0.14)';
  ctx.lineWidth = 1;
  for (let x = 0; x <= 512; x += 32) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 384);
    ctx.stroke();
  }
  for (let y = 0; y <= 384; y += 32) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(512, y);
    ctx.stroke();
  }

  // Border + Gear & Piston schematic
  ctx.strokeStyle = '#DCE8F2';
  ctx.lineWidth = 2.5;
  ctx.strokeRect(18, 18, 476, 348);

  ctx.beginPath();
  ctx.arc(175, 185, 82, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(175, 185, 28, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeRect(295, 130, 148, 110);
  ctx.beginPath();
  ctx.moveTo(175, 185);
  ctx.lineTo(368, 185);
  ctx.stroke();

  ctx.fillStyle = '#DCE8F2';
  ctx.font = '14px monospace';
  ctx.fillText('PLATE 1855 // INTERCHANGEABLE SPUR SPEC', 30, 46);
  ctx.fillText('TOLERANCE +/- 0.02MM', 298, 275);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createClockFaceTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#EBE4D5';
  ctx.beginPath();
  ctx.arc(128, 128, 124, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#1B2024';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(128, 128, 112, 0, Math.PI * 2);
  ctx.stroke();

  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
    ctx.beginPath();
    ctx.moveTo(128 + Math.cos(a) * 90, 128 + Math.sin(a) * 90);
    ctx.lineTo(128 + Math.cos(a) * 106, 128 + Math.sin(a) * 106);
    ctx.stroke();
  }

  // Hour and minute hands
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(128, 128);
  ctx.lineTo(128, 66);
  ctx.stroke();

  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(128, 128);
  ctx.lineTo(182, 146);
  ctx.stroke();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

