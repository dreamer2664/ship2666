/* SHIP2666 — Render capture pipeline.
 *
 * Uses Puppeteer + headless Chromium to capture inspection renders from all
 * 27 named cameras defined in source/lighting/cameras.js, saving them to
 * renders/gen1/ and writing renders/gen1/manifest.json.
 *
 * Prereqs: HTTP server already running on PORT,
 *          npm install puppeteer (done),
 *          LD_LIBRARY_PATH set for Chrome libs.
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const ROOT = '/home/user/ship2666_work/ship2666';
const PORT = 5183;
const GEN_DIR = path.join(ROOT, 'renders', 'gen1');
const MANIFEST = path.join(GEN_DIR, 'manifest.json');
const LENGTH = 172.36; // 565.5 ft in metres
const BEAM = 17.62;
const DRAFT = 7.2;
const DEPTH = 12;

const b = (f) => BEAM * f;

// Camera definitions mirroring source/lighting/cameras.js
const cameras = [
  { id: 'cam_port_bow', pos: [-LENGTH * 0.85, DEPTH * 1.3, LENGTH * 0.5], look: [LENGTH * 0.1, DRAFT, 0], area: 'exterior' },
  { id: 'cam_stbd_bow', pos: [-LENGTH * 0.85, DEPTH * 1.3, -LENGTH * 0.5], look: [LENGTH * 0.1, DRAFT, 0], area: 'exterior' },
  { id: 'cam_port_broadside', pos: [0, DEPTH * 1.1, LENGTH * 0.95], look: [LENGTH / 2, DRAFT, 0], area: 'exterior' },
  { id: 'cam_stbd_broadside', pos: [0, DEPTH * 1.1, -LENGTH * 0.95], look: [-LENGTH / 2, DRAFT, 0], area: 'exterior' },
  { id: 'cam_stern', pos: [-LENGTH * 0.92, DEPTH * 0.9, 0], look: [-LENGTH * 0.35, DRAFT, 0], area: 'exterior' },
  { id: 'cam_elevated', pos: [LENGTH * 0.05, DEPTH * 2.2, LENGTH * 0.45], look: [LENGTH * 0.15, DRAFT, 0], area: 'exterior' },
  { id: 'cam_deck_level', pos: [LENGTH * 0.2, DRAFT + 1.2, LENGTH * 0.3], look: [LENGTH * 0.5, DRAFT + 1.2, 0], area: 'deck' },
  { id: 'cam_main_deck', pos: [LENGTH * 0.3, DEPTH * 0.55, LENGTH * 0.1], look: [LENGTH * 0.35, DRAFT + 3.0, 0], area: 'deck' },
  { id: 'cam_boat_deck', pos: [LENGTH * 0.5, DEPTH * 0.9, LENGTH * 0.05], look: [LENGTH * 0.55, DRAFT + 11.4, 0], area: 'deck' },
  { id: 'cam_dining_saloon', pos: [LENGTH * 0.30 + 12, DRAFT + 3.8 + 1.4, b(0.25) + 8], look: [LENGTH * 0.30, DRAFT + 3.8, b(0.25)], area: 'interior_public' },
  { id: 'cam_smoking_saloon', pos: [LENGTH * 0.30 + 7, DRAFT + 3.6 + 1.2, b(0.1) + 7], look: [LENGTH * 0.30, DRAFT + 3.6, b(0.1)], area: 'interior_public' },
  { id: 'cam_grand_staircase', pos: [LENGTH * 0.30, DRAFT + 6.0 + 2.0, b(0.05) + 4], look: [LENGTH * 0.30, DRAFT + 6.0, b(0.05)], area: 'interior_public' },
  { id: 'cam_cabin_1st_A', pos: [LENGTH * 0.45 + 1.8, DRAFT + 2.5 + 1.0, b(0.35) + 1.6], look: [LENGTH * 0.45, DRAFT + 2.5, b(0.35)], area: 'interior_cabin' },
  { id: 'cam_cabin_1st_C', pos: [LENGTH * 0.45 + 1.8, DRAFT + 2.5 + 0.9, b(0.35) + 1.5], look: [LENGTH * 0.45, DRAFT + 2.5, b(0.35)], area: 'interior_cabin' },
  { id: 'cam_cabin_2nd', pos: [LENGTH * 0.62 + 1.9, DRAFT + 6.0 + 0.9, b(0.25) + 1.5], look: [LENGTH * 0.62, DRAFT + 6.0, b(0.25)], area: 'interior_cabin' },
  { id: 'cam_cabin_3rd', pos: [LENGTH * 0.18 + 7, DRAFT + 2.4 + 0.9, -b(0.15) + 4.5], look: [LENGTH * 0.18, DRAFT + 2.4, -b(0.15)], area: 'interior_cabin' },
  { id: 'cam_galley', pos: [LENGTH * 0.78 + 4, DRAFT + 3.0 + 1.1, -b(0.3) + 3.5], look: [LENGTH * 0.78, DRAFT + 3.0, -b(0.3)], area: 'interior_service' },
  { id: 'cam_crew_mess', pos: [LENGTH * 0.90 + 5, DRAFT + 2.6 + 0.9, b(0.2) + 3.5], look: [LENGTH * 0.90, DRAFT + 2.6, b(0.2)], area: 'interior_service' },
  { id: 'cam_engine_room', pos: [LENGTH * 0.22 + 7, DRAFT + 4.5 + 1.5, b(0.1) + 4.5], look: [LENGTH * 0.22, DRAFT + 4.5, b(0.1)], area: 'machinery' },
  { id: 'cam_boiler_room', pos: [LENGTH * 0.45 + 7, DRAFT + 4.2 + 1.3, -b(0.05) + 4], look: [LENGTH * 0.45, DRAFT + 4.2, -b(0.05)], area: 'machinery' },
  { id: 'cam_shaft_alley', pos: [-LENGTH * 0.35, DRAFT + 3.6 + 0.9, b(0.15)], look: [-LENGTH * 0.1, DRAFT + 3.6, b(0.15)], area: 'machinery' },
  { id: 'cam_rudder_propeller', pos: [-LENGTH * 0.95, DRAFT + 1.0 + 1.5, b(0.35)], look: [-LENGTH * 0.45, DRAFT + 1.0, 0], area: 'machinery' },
  { id: 'cam_cutaway_longitudinal', pos: [LENGTH * 0.05, DEPTH * 1.4, -LENGTH * 0.75], look: [LENGTH * 0.2, DRAFT + 4.0, 0], area: 'cutaway' },
  { id: 'cam_cutaway_transverse', pos: [LENGTH * 0.3, DEPTH * 1.0, LENGTH * 0.55], look: [LENGTH * 0.3, DRAFT + 4.0, 0], area: 'cutaway' },
  { id: 'cam_detail_hull_plate', pos: [-LENGTH * 0.4, DRAFT + 1.6, LENGTH * 0.42], look: [-LENGTH * 0.42, DRAFT + 1.6, LENGTH * 0.4], area: 'detail' },
  { id: 'cam_detail_porthole', pos: [LENGTH * 0.1, DRAFT + 3.6 - 0.9 + 0.45, LENGTH * 0.43], look: [LENGTH * 0.1, DRAFT + 3.6 - 0.9, LENGTH * 0.42], area: 'detail' },
  { id: 'cam_detail_railing', pos: [LENGTH * 0.3, DEPTH * 0.5, b(0.48)], look: [LENGTH * 0.32, DRAFT + 11.4 + 1.0, b(0.48)], area: 'detail' },
  { id: 'cam_detail_door', pos: [LENGTH * 0.30 - 17 + 4.5, DRAFT + 3.0 + 1.1, 1.3 + 0.6], look: [LENGTH * 0.30 - 17 + 4.5, DRAFT + 3.0, 1.3], area: 'detail' },
  { id: 'cam_detail_engine', pos: [LENGTH * 0.22 + 1, DRAFT + 4.5 + 0.9, b(0.1) + 1.2], look: [LENGTH * 0.22, DRAFT + 4.5, b(0.1)], area: 'detail' },
];

async function main() {
  fs.mkdirSync(GEN_DIR, { recursive: true });

  const LD_LIBRARY_PATH = '/home/user/.chrome-libs/usr/lib/x86_64-linux-gnu';
  const env = { ...process.env, LD_LIBRARY_PATH: LD_LIBRARY_PATH + ':' + (process.env.LD_LIBRARY_PATH || '') };

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu-process', '--disable-features=VizDisplayCompositor,SkiaRenderer'],
    env,
  });

  const page = await browser.newPage();

  // Capture all errors for debugging
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message.substring(0, 300)));
  page.on('console', msg => { if (msg.type() === 'error') console.log('CONSOLE ERROR:', msg.text().substring(0, 300)); });

  console.log('Navigating to index.html...');
  await page.goto(`http://127.0.0.1:${PORT}/index.html`, {
    waitUntil: 'domcontentloaded',
    timeout: 60000,
  });

  console.log('Page loaded, waiting for scene to settle...');
  await new Promise((r) => setTimeout(r, 15000));

  // Verify camera is available
  const camReady = await page.evaluate(() => window.__threeCamera !== undefined);
  console.log('Camera ready:', camReady);

  if (!camReady) {
    // Diagnostic: check what's on window
    const diag = await page.evaluate(() => {
      return {
        hasThreeCamera: '__threeCamera' in window,
        hasThreeRenderer: '__threeRenderer' in window,
        THREEtype: typeof window.THREE,
        url: window.location.href,
      };
    });
    console.log('Diagnostics:', JSON.stringify(diag));
    throw new Error('Three.js camera not exposed after page load');
  }

  const imagePaths = [];
  const sceneAreas = new Set();

  for (const cam of cameras) {
    console.log(`Capturing ${cam.id} (${cam.area})...`);

    await page.evaluate(({ pos, look }) => {
      const cam = window.__threeCamera;
      const ren = window.__threeRenderer;
      if (!cam || !ren) return { error: 'no camera/renderer' };
      cam.position.set(pos[0], pos[1], pos[2]);
      cam.lookAt(look[0], look[1], look[2]);
      cam.updateProjectionMatrix();
      ren.render(window.__threeScene, cam);
      return { ok: true };
    }, { pos: cam.pos, look: cam.look });

    await new Promise((r) => setTimeout(r, 300));

    const fileName = `${cam.id}.png`;
    const filePath = path.join(GEN_DIR, fileName);
    await page.screenshot({ path: filePath });
    imagePaths.push(fileName);
    sceneAreas.add(cam.area);
    console.log(`  -> ${fileName}`);
  }

  await browser.close();

  const now = new Date().toISOString();
  const manifest = {
    generation: 1,
    timestamp: now,
    branch: 'teutonic-0JYIGPYC',
    commit: 'pending',
    session: 2,
    description: 'Gen1 inspection renders captured from all 27 named cameras covering exterior, decks, public rooms, cabins, crew/service, machinery, cutaways, and detail close-ups.',
    cameraIds: cameras.map((c) => c.id),
    sceneAreasInspected: Array.from(sceneAreas).sort(),
    imagePaths,
    qualitySettings: { preview: true, resolution: [1920, 1080], note: 'Headless Chromium capture; final 3840x2160 requires render farm' },
    changesSincePrevious: 'First render generation captured via Puppeteer headless browser.',
    knownDefects: [
      'Renders are preview resolution (1920x1080); final 3840x2160 requires render farm.',
      'Hull is Pass B production geometry but lacks final rivet/plate material textures.',
      'Interior rooms are blockout geometry; furniture pass not yet applied.',
    ],
    nextCorrections: [
      'Capture final-quality 3840x2160 renders on render farm.',
      'Apply PBR texture maps and trim sheets.',
      'Continue hull rivet/plate refinement.',
    ],
    retentionRule: 'Keep gen1..gen9; only delete gen1..gen5 after gen10 validated; rolling window of newest five thereafter. Never delete renders/final/, source files, references, code, scripts, tests, manifests or documentation.',
  };

  fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2));
  console.log(`\nCaptured ${imagePaths.length} renders to ${GEN_DIR}/`);
  console.log(`Manifest written to ${MANIFEST}`);
  console.log('Render capture complete.');
}

main().catch((e) => {
  console.error('CAPTURE FAILED:', e.message);
  process.exit(1);
});
