// SHIP2666 — Procedural texture generation (runtime, CPU-only).
//
// Generates PBR texture maps (albedo, normal, roughness, ao) procedurally
// using canvas 2D, so no GPU, no Blender, and no external image assets are
// required. All textures are seamless/tileable where appropriate.
//
// Call generateAllTextures() once at app init; it returns a map of
// texture name -> THREE.Texture, keyed for use in materials.js.
//
// Texture naming convention:
//   <material>_<map>  e.g. hullPaint_albedo, hullPaint_normal, hullPaint_roughness

import * as THREE from 'three';

// ---- Helpers ---------------------------------------------------------------

function createCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

function noise(ctx, w, h, seed = 0) {
  // Simple value noise: fill with random grayscale, then blur via downscaling.
  const img = ctx.createImageData(w, h);
  const d = img.data;
  const rnd = () => {
    seed = (seed * 16807 + 1) % 2147483647;
    return (seed >>> 0) / 2147483647;
  };
  for (let i = 0; i < d.length; i += 4) {
    const v = Math.floor(rnd() * 256);
    d[i] = v; d[i + 1] = v; d[i + 2] = v; d[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return ctx;
}

function perlinish(ctx, w, h, octaves = 4, seed = 0) {
  // Build layered noise for more organic variation.
  for (let o = 0; o < octaves; o++) {
    const scale = Math.pow(2, o);
    const amp = 1 / scale;
    const tw = Math.max(1, Math.floor(w / scale));
    const th = Math.max(1, Math.floor(h / scale));
    const tmp = createCanvas(tw, th);
    const tctx = tmp.getContext('2d', { willReadFrequently: true });
    noise(tctx, tw, th, seed + o * 9973);
    ctx.globalAlpha = amp * 0.6;
    ctx.drawImage(tmp, 0, 0, w, h);
    ctx.globalAlpha = 1.0;
  }
  return ctx;
}

function toTexture(canvas, wrap = true, repeat = 1) {
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  if (wrap) {
    t.wrapS = THREE.RepeatWrapping;
    t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(repeat, repeat);
  }
  t.needsUpdate = true;
  return t;
}

function normalFromAlbedo(canvas, strength = 0.08) {
  // Derive a normal map from albedo luminance via Sobel-ish gradients.
  const w = canvas.width;
  const h = canvas.height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const src = ctx.getImageData(0, 0, w, h);
  const out = ctx.createImageData(w, h);
  const s = src.data;
  const d = out.data;

  const lum = (x, y) => {
    if (x < 0 || x >= w || y < 0 || y >= h) return 0;
    const i = (y * w + x) * 4;
    return 0.299 * s[i] + 0.587 * s[i + 1] + 0.114 * s[i + 2];
  };

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const lx = lum(x + 1, y) - lum(x - 1, y);
      const ly = lum(x, y + 1) - lum(x, y - 1);
      const nx = 0.5 + lx * strength * 128;
      const ny = 0.5 + ly * strength * 128;
      d[i] = nx; d[i + 1] = ny; d[i + 2] = 255; d[i + 3] = 255;
    }
  }
  ctx.putImageData(out, 0, 0);
  return canvas;
}

// ---- Texture generators ---------------------------------------------------

export function hullPaintMaps(size = 1024) {
  const c = createCanvas(size, size);
  const ctx = c.getContext('2d', { willReadFrequently: true });

  // Base: dark navy-gray
  ctx.fillStyle = '#2a3a4a';
  ctx.fillRect(0, 0, size, size);

  // Subtle plate variation (darker/lighter strakes)
  perlinish(ctx, size, size, 5, 42);
  ctx.globalCompositeOperation = 'multiply';
  ctx.fillStyle = 'rgba(0, 0, 0, 0.12)';
  ctx.fillRect(0, 0, size, size);
  ctx.globalCompositeOperation = 'source-over';

  // Soot streaks near waterline (lower third)
  for (let i = 0; i < 40; i++) {
    const x = Math.random() * size;
    const y = size * 0.65 + Math.random() * size * 0.3;
    const len = 20 + Math.random() * 60;
    ctx.strokeStyle = 'rgba(10, 10, 10, 0.35)';
    ctx.lineWidth = 2 + Math.random() * 3;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(0.2) * len, y + Math.sin(0.2) * len);
    ctx.stroke();
  }

  const albedo = c.cloneNode(true); // copy
  const normalCanvas = createCanvas(size, size);
  const nctx = normalCanvas.getContext('2d', { willReadFrequently: true });
  nctx.drawImage(c, 0, 0);
  normalFromAlbedo(normalCanvas, 0.06);

  // Roughness: slightly rougher on lower areas
  const r = createCanvas(size, size);
  const rctx = r.getContext('2d', { willReadFrequently: true });
  rctx.fillStyle = '#777777';
  rctx.fillRect(0, 0, size, size);
  perlinish(rctx, size, size, 4, 777);

  // AO: darker in crevices
  const ao = createCanvas(size, size);
  const aoc = ao.getContext('2d', { willReadFrequently: true });
  aoc.fillStyle = '#aaaaaa';
  aoc.fillRect(0, 0, size, size);
  perlinish(aoc, size, size, 3, 101);

  return {
    albedo: toTexture(albedo, true, 4),
    normal: toTexture(normalCanvas, true, 4),
    roughness: toTexture(r, true, 4),
    ao: toTexture(ao, true, 4),
  };
}

export function steelMaps(size = 1024) {
  const c = createCanvas(size, size);
  const ctx = c.getContext('2d', { willReadFrequently: true });

  ctx.fillStyle = '#7a8288';
  ctx.fillRect(0, 0, size, size);

  // Forged/rolled metal grain — horizontal streaks
  for (let i = 0; i < 200; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const w2 = 40 + Math.random() * 200;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1 + Math.random();
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + w2, y + (Math.random() - 0.5) * 2);
    ctx.stroke();
  }

  perlinish(ctx, size, size, 3, 303);
  ctx.globalCompositeOperation = 'overlay';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
  ctx.fillRect(0, 0, size, size);
  ctx.globalCompositeOperation = 'source-over';

  const normalCanvas = createCanvas(size, size);
  const nctx = normalCanvas.getContext('2d', { willReadFrequently: true });
  nctx.drawImage(c, 0, 0);
  normalFromAlbedo(normalCanvas, 0.1);

  const r = createCanvas(size, size);
  const rctx = r.getContext('2d', { willReadFrequently: true });
  rctx.fillStyle = '#555555';
  rctx.fillRect(0, 0, size, size);
  perlinish(rctx, size, size, 3, 505);

  const ao = createCanvas(size, size);
  const aoc = ao.getContext('2d', { willReadFrequently: true });
  aoc.fillStyle = '#999999';
  aoc.fillRect(0, 0, size, size);
  perlinish(aoc, size, size, 2, 707);

  return {
    albedo: toTexture(c, true, 2),
    normal: toTexture(normalCanvas, true, 2),
    roughness: toTexture(r, true, 2),
    ao: toTexture(ao, true, 2),
  };
}

export function brassMaps(size = 512) {
  const c = createCanvas(size, size);
  const ctx = c.getContext('2d', { willReadFrequently: true });

  ctx.fillStyle = '#c9a65c';
  ctx.fillRect(0, 0, size, size);

  // Tarnish spots
  for (let i = 0; i < 30; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const r = 4 + Math.random() * 16;
    ctx.fillStyle = 'rgba(80, 70, 40, 0.25)';
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  perlinish(ctx, size, size, 4, 808);

  const normalCanvas = createCanvas(size, size);
  const nctx = normalCanvas.getContext('2d', { willReadFrequently: true });
  nctx.drawImage(c, 0, 0);
  normalFromAlbedo(normalCanvas, 0.05);

  const r = createCanvas(size, size);
  const rctx = r.getContext('2d', { willReadFrequently: true });
  rctx.fillStyle = '#666666';
  rctx.fillRect(0, 0, size, size);
  perlinish(rctx, size, size, 3, 909);

  return {
    albedo: toTexture(c, true, 2),
    normal: toTexture(normalCanvas, true, 2),
    roughness: toTexture(r, true, 2),
  };
}

export function woodMaps(size = 512, color = '#6b4a2e') {
  const c = createCanvas(size, size);
  const ctx = c.getContext('2d', { willReadFrequently: true });

  ctx.fillStyle = color;
  ctx.fillRect(0, 0, size, size);

  // Vertical grain lines
  for (let i = 0; i < size / 6; i++) {
    const x = (Math.random() * size);
    const w2 = 1 + Math.random() * 3;
    const opacity = 0.15 + Math.random() * 0.25;
    ctx.fillStyle = `rgba(0, 0, 0, ${opacity})`;
    ctx.fillRect(x, 0, w2, size);
    ctx.fillStyle = `rgba(255, 255, 255, ${opacity * 0.5})`;
    ctx.fillRect(x + w2, 0, w2, size);
  }

  // Knots
  for (let i = 0; i < 8; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const r = 6 + Math.random() * 12;
    const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, 'rgba(0, 0, 0, 0.4)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  const normalCanvas = createCanvas(size, size);
  const nctx = normalCanvas.getContext('2d', { willReadFrequently: true });
  nctx.drawImage(c, 0, 0);
  normalFromAlbedo(normalCanvas, 0.12);

  const r = createCanvas(size, size);
  const rctx = r.getContext('2d', { willReadFrequently: true });
  rctx.fillStyle = '#888888';
  rctx.fillRect(0, 0, size, size);
  perlinish(rctx, size, size, 3, 1111);

  return {
    albedo: toTexture(c, true, 1),
    normal: toTexture(normalCanvas, true, 1),
    roughness: toTexture(r, true, 1),
  };
}

export function deckPlankingMaps(size = 1024) {
  const c = createCanvas(size, size);
  const ctx = c.getContext('2d', { willReadFrequently: true });

  ctx.fillStyle = '#3d4a3d';
  ctx.fillRect(0, 0, size, size);

  // Plank lines (horizontal)
  const plankH = 24 + Math.random() * 8;
  for (let y = 0; y < size; y += plankH) {
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, y + plankH / 2);
    ctx.lineTo(size, y + plankH / 2 + (Math.random() - 0.5) * 2);
    ctx.stroke();
    // Caulking gap
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(0, y + plankH / 2 - 1, size, 2);
  }

  // Wear and foot traffic
  for (let i = 0; i < 60; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const r = 10 + Math.random() * 40;
    const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, 'rgba(0, 0, 0, 0.15)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  const normalCanvas = createCanvas(size, size);
  const nctx = normalCanvas.getContext('2d', { willReadFrequently: true });
  nctx.drawImage(c, 0, 0);
  normalFromAlbedo(normalCanvas, 0.15);

  const r = createCanvas(size, size);
  const rctx = r.getContext('2d', { willReadFrequently: true });
  rctx.fillStyle = '#999999';
  rctx.fillRect(0, 0, size, size);
  perlinish(rctx, size, size, 3, 1313);

  return {
    albedo: toTexture(c, true, 6),
    normal: toTexture(normalCanvas, true, 6),
    roughness: toTexture(r, true, 6),
  };
}

export function funnelBuffMaps(size = 512) {
  const c = createCanvas(size, size);
  const ctx = c.getContext('2d', { willReadFrequently: true });

  ctx.fillStyle = '#d4b46a';
  ctx.fillRect(0, 0, size, size);

  // Soot streaks from funnel top
  for (let i = 0; i < 15; i++) {
    const x = size * 0.5 + (Math.random() - 0.5) * 100;
    const y = Math.random() * size * 0.4;
    const len = 30 + Math.random() * 100;
    ctx.strokeStyle = 'rgba(30, 30, 30, 0.3)';
    ctx.lineWidth = 3 + Math.random() * 4;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + (Math.random() - 0.5) * 10, y + len);
    ctx.stroke();
  }

  perlinish(ctx, size, size, 4, 1515);

  const normalCanvas = createCanvas(size, size);
  const nctx = normalCanvas.getContext('2d', { willReadFrequently: true });
  nctx.drawImage(c, 0, 0);
  normalFromAlbedo(normalCanvas, 0.05);

  const r = createCanvas(size, size);
  const rctx = r.getContext('2d', { willReadFrequently: true });
  rctx.fillStyle = '#888888';
  rctx.fillRect(0, 0, size, size);
  perlinish(rctx, size, size, 3, 1616);

  return {
    albedo: toTexture(c, true, 2),
    normal: toTexture(normalCanvas, true, 2),
    roughness: toTexture(r, true, 2),
  };
}

export function coalMaps(size = 512) {
  const c = createCanvas(size, size);
  const ctx = c.getContext('2d', { willReadFrequently: true });

  ctx.fillStyle = '#1a1a1a';
  ctx.fillRect(0, 0, size, size);

  // Coal chunks
  for (let i = 0; i < 200; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const r = 2 + Math.random() * 6;
    const v = 10 + Math.random() * 20;
    ctx.fillStyle = `rgb(${v}, ${v}, ${v})`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  const normalCanvas = createCanvas(size, size);
  const nctx = normalCanvas.getContext('2d', { willReadFrequently: true });
  nctx.drawImage(c, 0, 0);
  normalFromAlbedo(normalCanvas, 0.2);

  const r = createCanvas(size, size);
  const rctx = r.getContext('2d', { willReadFrequently: true });
  rctx.fillStyle = '#aaa';
  rctx.fillRect(0, 0, size, size);
  perlinish(rctx, size, size, 4, 1717);

  return {
    albedo: toTexture(c, true, 4),
    normal: toTexture(normalCanvas, true, 4),
    roughness: toTexture(r, true, 4),
  };
}

export function glazedTileMaps(size = 512) {
  const c = createCanvas(size, size);
  const ctx = c.getContext('2d', { willReadFrequently: true });

  ctx.fillStyle = '#e8e8e8';
  ctx.fillRect(0, 0, size, size);

  // Tile grid
  const ts = 40;
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.15)';
  ctx.lineWidth = 1;
  for (let y = 0; y <= size; y += ts) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(size, y); ctx.stroke();
  }
  for (let x = 0; x <= size; x += ts) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, size); ctx.stroke();
  }

  // Slight variation per tile
  for (let ty = 0; ty < size; ty += ts) {
    for (let tx = 0; tx < size; tx += ts) {
      const v = (Math.random() - 0.5) * 12;
      ctx.fillStyle = `rgba(${v}, ${v}, ${v}, 0.15)`;
      ctx.fillRect(tx + 1, ty + 1, ts - 2, ts - 2);
    }
  }

  const normalCanvas = createCanvas(size, size);
  const nctx = normalCanvas.getContext('2d', { willReadFrequently: true });
  nctx.drawImage(c, 0, 0);
  normalFromAlbedo(normalCanvas, 0.03);

  const r = createCanvas(size, size);
  const rctx = r.getContext('2d', { willReadFrequently: true });
  rctx.fillStyle = '#666666';
  rctx.fillRect(0, 0, size, size);

  return {
    albedo: toTexture(c, true, 10),
    normal: toTexture(normalCanvas, true, 10),
    roughness: toTexture(r, true, 10),
  };
}

export function glassMaps(size = 256) {
  const c = createCanvas(size, size);
  const ctx = c.getContext('2d', { willReadFrequently: true });

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, size, size);

  // Subtle reflection streaks
  for (let i = 0; i < 8; i++) {
    const y = Math.random() * size;
    const grad = ctx.createLinearGradient(0, y, 0, y + 40);
    grad.addColorStop(0, 'rgba(255, 255, 255, 0.05)');
    grad.addColorStop(0.5, 'rgba(255, 255, 255, 0.15)');
    grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, y - 20, size, 40);
  }

  const r = createCanvas(size, size);
  const rctx = r.getContext('2d', { willReadFrequently: true });
  rctx.fillStyle = '#333333';
  rctx.fillRect(0, 0, size, size);

  return {
    albedo: toTexture(c, true, 1),
    roughness: toTexture(r, true, 1),
  };
}

export function sootMaps(size = 512) {
  const c = createCanvas(size, size);
  const ctx = c.getContext('2d', { willReadFrequently: true });

  ctx.fillStyle = '#0f0f0f';
  ctx.fillRect(0, 0, size, size);

  // Ash/smoke mottling
  perlinish(ctx, size, size, 5, 1818);
  ctx.globalCompositeOperation = 'multiply';
  ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
  ctx.fillRect(0, 0, size, size);
  ctx.globalCompositeOperation = 'source-over';

  const normalCanvas = createCanvas(size, size);
  const nctx = normalCanvas.getContext('2d', { willReadFrequently: true });
  nctx.drawImage(c, 0, 0);
  normalFromAlbedo(normalCanvas, 0.15);

  const r = createCanvas(size, size);
  const rctx = r.getContext('2d', { willReadFrequently: true });
  rctx.fillStyle = '#bbb';
  rctx.fillRect(0, 0, size, size);
  perlinish(rctx, size, size, 4, 1919);

  return {
    albedo: toTexture(c, true, 4),
    normal: toTexture(normalCanvas, true, 4),
    roughness: toTexture(r, true, 4),
  };
}

// ---- Trim sheet -----------------------------------------------------------

export function trimSheet(size = 2048) {
  // A single trim sheet with commonly needed detail strips:
  //  - rivet rows
  //  - plate edge lines
  //  - deck seam caulking
  //  - porthole rings
  //  - railing base
  //  - hatch coaming
  const c = createCanvas(size, size);
  const ctx = c.getContext('2d', { willReadFrequently: true });

  ctx.fillStyle = '#2a2a2a';
  ctx.fillRect(0, 0, size, size);

  const stripH = 40;
  const yStep = stripH + 20;

  // Row 1: rivet plate (rivets along a seam)
  let y = 20;
  ctx.fillStyle = '#4a4a4a';
  for (let x = 10; x < size; x += 28) {
    ctx.beginPath();
    ctx.arc(x, y + stripH / 2, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath();
    ctx.arc(x + 1, y + stripH / 2 - 1, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#4a4a4a';
  }
  ctx.strokeStyle = '#3a3a3a';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(0, y + stripH / 2); ctx.lineTo(size, y + stripH / 2); ctx.stroke();
  y += yStep;

  // Row 2: plate edge line (single seam)
  ctx.strokeStyle = '#4a4a4a';
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(0, y + stripH / 2); ctx.lineTo(size, y + stripH / 2); ctx.stroke();
  ctx.strokeStyle = '#1a1a1a';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(0, y + stripH / 2 - 2); ctx.lineTo(size, y + stripH / 2 - 2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0, y + stripH / 2 + 2); ctx.lineTo(size, y + stripH / 2 + 2); ctx.stroke();
  y += yStep;

  // Row 3: caulking gap (dark gap between planks)
  ctx.fillStyle = '#0a0a0a';
  ctx.fillRect(0, y + stripH / 2 - 3, size, 6);
  ctx.fillStyle = '#1a1a1a';
  ctx.fillRect(0, y + stripH / 2 - 1, size, 2);
  y += yStep;

  // Row 4: porthole ring
  ctx.strokeStyle = '#6a6a6a';
  ctx.lineWidth = 3;
  for (let x = 30; x < size; x += 120) {
    ctx.beginPath();
    ctx.arc(x, y + stripH / 2, 14, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#0f0f0f';
    ctx.beginPath();
    ctx.arc(x, y + stripH / 2, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#2a2a2a';
  }
  y += yStep;

  // Row 5: railing base + stanchion
  ctx.fillStyle = '#4a4a4a';
  ctx.fillRect(0, y + stripH / 2 - 2, size, 4);
  for (let x = 20; x < size; x += 60) {
    ctx.fillRect(x - 2, y + 5, 4, stripH - 10);
  }
  y += yStep;

  // Row 6: hatch coaming (raised edge)
  ctx.fillStyle = '#3a3a3a';
  ctx.fillRect(0, y + stripH / 2 - 6, size, 12);
  ctx.fillStyle = '#1a1a1a';
  ctx.fillRect(2, y + stripH / 2 - 4, size - 4, 8);

  return toTexture(c, false, 1);
}

// ---- Master generator -----------------------------------------------------

export function generateAllTextures() {
  const textures = {};

  // Hull
  Object.assign(textures, {
    hullPaint_albedo: hullPaintMaps(1024).albedo,
    hullPaint_normal: hullPaintMaps(1024).normal,
    hullPaint_roughness: hullPaintMaps(1024).roughness,
    hullPaint_ao: hullPaintMaps(1024).ao,

    hullWhite_albedo: (() => {
      const c = createCanvas(1024, 1024);
      const ctx = c.getContext('2d', { willReadFrequently: true });
      ctx.fillStyle = '#e8e8e8';
      ctx.fillRect(0, 0, 1024, 1024);
      perlinish(ctx, 1024, 1024, 4, 2020);
      ctx.globalCompositeOperation = 'multiply';
      ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
      ctx.fillRect(0, 0, 1024, 1024);
      ctx.globalCompositeOperation = 'source-over';
      const n = createCanvas(1024, 1024);
      const nc = n.getContext('2d', { willReadFrequently: true });
      nc.drawImage(c, 0, 0);
      normalFromAlbedo(n, 0.04);
      const rr = createCanvas(1024, 1024);
      const rc = rr.getContext('2d', { willReadFrequently: true });
      rc.fillStyle = '#555';
      rc.fillRect(0, 0, 1024, 1024);
      perlinish(rc, 1024, 1024, 3, 2121);
      return {
        albedo: toTexture(c, true, 4),
        normal: toTexture(n, true, 4),
        roughness: toTexture(rr, true, 4),
      };
    })(),

    // Steel
    steelMachined_albedo: steelMaps(1024).albedo,
    steelMachined_normal: steelMaps(1024).normal,
    steelMachined_roughness: steelMaps(1024).roughness,
    steelMachined_ao: steelMaps(1024).ao,

    // Brass
    brass_albedo: brassMaps(512).albedo,
    brass_normal: brassMaps(512).normal,
    brass_roughness: brassMaps(512).roughness,

    // Wood
    woodHardwood_albedo: woodMaps(512, '#6b4a2e').albedo,
    woodHardwood_normal: woodMaps(512, '#6b4a2e').normal,
    woodHardwood_roughness: woodMaps(512, '#6b4a2e').roughness,
    woodTeak_albedo: woodMaps(512, '#5a3a1a').albedo,
    woodTeak_normal: woodMaps(512, '#5a3a1a').normal,
    woodTeak_roughness: woodMaps(512, '#5a3a1a').roughness,

    // Deck
    deckPlanking_albedo: deckPlankingMaps(1024).albedo,
    deckPlanking_normal: deckPlankingMaps(1024).normal,
    deckPlanking_roughness: deckPlankingMaps(1024).roughness,

    // Funnel
    funnelBuff_albedo: funnelBuffMaps(512).albedo,
    funnelBuff_normal: funnelBuffMaps(512).normal,
    funnelBuff_roughness: funnelBuffMaps(512).roughness,

    // Coal / soot
    coal_albedo: coalMaps(512).albedo,
    coal_normal: coalMaps(512).normal,
    coal_roughness: coalMaps(512).roughness,
    soot_albedo: sootMaps(512).albedo,
    soot_normal: sootMaps(512).normal,
    soot_roughness: sootMaps(512).roughness,

    // Glazed tile
    glazedTile_albedo: glazedTileMaps(512).albedo,
    glazedTile_normal: glazedTileMaps(512).normal,
    glazedTile_roughness: glazedTileMaps(512).roughness,

    // Glass
    glass_albedo: glassMaps(256).albedo,
    glass_roughness: glassMaps(256).roughness,

    // Trim sheet
    trimSheet: trimSheet(2048),
  });

  return textures;
}
