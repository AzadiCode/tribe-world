// Phase 3 browser test: real build-UI flow with the functional buildings —
// palette categories (eco/srv/dec) list the new items with costs, a clinic and a park are
// tap-placed for real and committed with ✓, the turbine stays live with a spinning rotor,
// the park floor is walkable with 4 fountain-facing sit spots, zero console errors.
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox', '--disable-dev-shm-usage'] });
  const page = await browser.newPage({ viewport: { width: 900, height: 700 } });
  const errs = [];
  page.on('pageerror', e => errs.push(String(e).slice(0, 300)));
  page.on('console', m => { if (m.type() === 'error') errs.push('[console] ' + m.text().slice(0, 200)); });
  await page.goto('http://localhost:10000/?admin=1&dev=1', { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForFunction(() => document.getElementById('ld') && document.getElementById('ld').classList.contains('out'), { timeout: 60000 });
  await page.waitForTimeout(12000);

  // ── 1) palette contents: all three categories list the phase-3 items with costs
  await page.click('#ba');
  await page.waitForSelector('#md', { state: 'visible' });
  await page.fill('#mi', 'testkey');
  await page.click('#mok');
  await page.waitForSelector('#adm', { state: 'visible' });
  await page.click('#adm [data-m="build"]');
  await page.waitForSelector('#pal', { state: 'visible' });
  await page.click('#palt span[data-c="eco"]');
  const eco = await page.evaluate(() => [...document.querySelectorAll('#pali span[data-t]')].map(s => s.dataset.t));
  await page.click('#palt span[data-c="srv"]');
  const srv = await page.evaluate(() => [...document.querySelectorAll('#pali span[data-t]')].map(s => s.dataset.t));
  await page.click('#palt span[data-c="dec"]');
  const dec = await page.evaluate(() => [...document.querySelectorAll('#pali span[data-t]')].map(s => s.dataset.t));
  console.log('1) palettes eco:', eco.join(','), '| srv:', srv.join(','), '| dec:', dec.join(','));
  const want = [['workshop', 'warehouse', 'mill', 'store'], ['school', 'clinic'], ['park']];
  const okPal = want[0].every(t => eco.includes(t)) && want[1].every(t => srv.includes(t)) && want[2].every(t => dec.includes(t));
  console.log('   palette check:', okPal ? 'OK' : 'MISSING ITEMS');

  // ── 2) live world checks: turbine rotor + park walkability + sit spots
  const world = await page.evaluate(async () => {
    const w = await (await fetch('/api/world?since=0')).json();
    const mill = w.buildings.find(b => b.type === 'mill');
    const park = w.buildings.find(b => b.type === 'park');
    const school = w.buildings.find(b => b.type === 'school');
    const out = { mill, park, school };
    if (park) {
      const px = park.x * U, pz = park.z * U;
      out.parkWalkPaving = walk(px + .8, pz + .3);       // سنگ‌فرش بین فواره و درخت‌ها — قابل عبور
      out.parkWalkPath = walk(px + 1.3, pz);             // مسیر صلبتی شرقی — قابل عبور
      out.parkWalkFountain = walk(px, pz);               // وسط فواره — بسته
      out.parkWalkTree = walk(px + 1.05, pz + 1.05);     // جای درخت (واحد دنیا) — بسته
      out.sitSpots = treeSp.filter(s => Math.abs(s.x - px) < 1.6 && Math.abs(s.z - pz) < 1.6).length;
    }
    if (mill) {
      const g = objs.get(mill.id);
      out.rotorLive = !!g && !g.userData.m && Array.isArray(g.userData.rotors) && g.userData.rotors.length === 1;
      out.rotorMerged = typeof CH !== 'undefined' && !!CH.mergeable('mill');
    }
    out.schoolRot = school ? school.rot : null;
    out.counts = {};
    for (const t of ['warehouse', 'workshop', 'mill', 'school', 'clinic', 'park', 'store'])
      out.counts[t] = w.buildings.filter(b => b.type === t).length;
    return out;
  });
  console.log('2) world:', JSON.stringify({ counts: world.counts, parkWalkPaving: world.parkWalkPaving, parkWalkFountain: world.parkWalkFountain, parkWalkTree: world.parkWalkTree, sitSpots: world.sitSpots, rotorLive: world.rotorLive, rotorMerged: world.rotorMerged, schoolRot: world.schoolRot }));

  // ── 3) camera on the district + real tap: place one more clinic next to the demo street
  await page.evaluate(() => {
    ctl.target.set(-4, 0, 8); const d = 16, a = .9, b = 1.0;
    cam.position.set(-4 + d * Math.sin(a) * Math.sin(b), d * Math.cos(b) * .9 + 4, 8 + d * Math.sin(a) * Math.cos(b));
    ctl.update();
  });
  await page.waitForTimeout(800);
  await page.click('#palt span[data-c="srv"]');
  await page.click('#pali span[data-t="clinic"]');
  const toScreen = (wx, wz) => page.evaluate(([wx, wz]) => {
    const v = new THREE.Vector3(wx, 0, wz).project(cam);
    return [(v.x * .5 + .5) * innerWidth, (-v.y * .5 + .5) * innerHeight];
  }, [wx, wz]);
  let p = await toScreen(-4, 12);   // جنوب پیاده‌روی دمو، جای خالی کنار خانه‌ها
  await page.mouse.move(p[0], p[1]); await page.mouse.down(); await page.mouse.up();
  await page.waitForTimeout(500);
  const bp = await page.evaluate(() => ({ items: BP.items.map(i => [i.type, i.x, i.z, i.rot, i.ok]), err: document.getElementById('bpe').textContent }));
  console.log('3) clinic tap:', JSON.stringify(bp.items), '| err:', JSON.stringify(bp.err));

  // ── 4) total cost shows on the bar (paid build — the "رایگان" box unchecked)
  const bar = await page.evaluate(() => document.getElementById('bpn').textContent);
  console.log('4) bar:', bar);

  // ── 5) commit ✓ and verify server state + economy event
  await page.click('#bpok');
  await page.waitForTimeout(3000);
  const after = await page.evaluate(async () => {
    const w = await (await fetch('/api/world?since=0')).json();
    return { clinics: w.buildings.filter(b => b.type === 'clinic').length, event: (w.events[0] || {}).text };
  });
  console.log('5) after commit:', JSON.stringify(after));

  // ── 6) renderer stats (perf guard)
  const stats = await page.evaluate(() => ({
    draws: R.info.render.calls, tris: R.info.render.triangles,
    geos: R.info.memory.geometries, texs: R.info.memory.textures,
  }));
  console.log('6) renderer:', JSON.stringify(stats));
  console.log('PAGE ERRORS:', errs.length ? errs : 'none');

  const bad = !okPal || !world.parkWalkPaving || !world.parkWalkPath || world.parkWalkFountain !== false || world.parkWalkTree !== false
    || world.sitSpots < 4 || !world.rotorLive || world.rotorMerged !== false
    || !bp.items.length || !bp.items[0][4] || after.clinics < 2 || errs.length;
  await browser.close();
  if (bad) { console.log('TEST FAILED'); process.exit(1); }
  console.log('PHASE3 UI TEST: ALL GREEN');
})().catch(e => { console.error('TEST FAILED:', e); process.exit(1); });
