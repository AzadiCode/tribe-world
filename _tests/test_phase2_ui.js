// Phase 2 browser test: (1) fpBridgeSnap ≡ server bridge_snap over 11,449 grid points,
// (2) real build-UI flow: palace via palette tap + bridge tap near the river + roads to the
// bridge landings, commit with ✓, verify server state, nav/car graph, no console errors.
const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const serverTable = JSON.parse(fs.readFileSync('/tmp/snap_server.json', 'utf8'));
  const browser = await chromium.launch({ headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox', '--disable-dev-shm-usage'] });
  const page = await browser.newPage({ viewport: { width: 900, height: 700 } });
  const errs = [];
  page.on('pageerror', e => errs.push(String(e).slice(0, 300)));
  page.on('console', m => { if (m.type() === 'error') errs.push('[console] ' + m.text().slice(0, 200)); });
  await page.goto('http://localhost:10000/?admin=1&dev=1', { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForFunction(() => document.getElementById('ld') && document.getElementById('ld').classList.contains('out'), { timeout: 60000 });
  await page.waitForTimeout(12000);

  // ── 1) snap equivalence: client fpBridgeSnap vs server table
  const mism = await page.evaluate((tbl) => {
    let bad = 0, first = [];
    for (const k in tbl) {
      const [gx, gz] = k.split(',').map(Number);
      const s = fpBridgeSnap(gx, gz);
      const want = tbl[k];
      const got = s ? [s[0], s[1], s[2]] : null;
      if (JSON.stringify(got) !== JSON.stringify(want)) {
        bad++;
        if (first.length < 5) first.push({ gx, gz, got, want });
      }
    }
    return { bad, first, total: Object.keys(tbl).length };
  }, serverTable);
  console.log('1) snap equivalence:', JSON.stringify(mism));
  if (mism.bad) console.log('   MISMATCHES:', JSON.stringify(mism.first));

  // ── 2) admin login + build mode
  await page.click('#ba');
  await page.waitForSelector('#md', { state: 'visible' });
  await page.fill('#mi', 'testkey');
  await page.click('#mok');
  await page.waitForSelector('#adm', { state: 'visible' });
  await page.click('#adm [data-m="build"]');
  await page.waitForSelector('#pal', { state: 'visible' });
  console.log('2) admin login + build mode OK');

  // ── 3) palace tier 3: pick from residential palette, tap west of the demo city
  await page.click('#palt span[data-c="res"]');
  const palTxt = await page.evaluate(() => document.getElementById('pali').textContent);
  console.log('3) residential palette:', palTxt.replace(/\s+/g, ' ').trim());
  await page.click('#pali span[data-t="palace3"]');
  const toScreen = (wx, wz) => page.evaluate(([wx, wz]) => {
    const v = new THREE.Vector3(wx, 0, wz).project(cam);
    return [(v.x * .5 + .5) * innerWidth, (-v.y * .5 + .5) * innerHeight];
  }, [wx, wz]);
  await page.evaluate(() => {
    ctl.target.set(-9, 0, -2); const d = 26, a = .9, b = 1.0;
    cam.position.set(-9 + d * Math.sin(a) * Math.sin(b), d * Math.cos(b) * 0.9 + 4, -2 + d * Math.sin(a) * Math.cos(b));
    ctl.update();
  });
  await page.waitForTimeout(600);
  let p = await toScreen(-9, -2);   // غرب شهر دمو، جای خالی
  await page.mouse.move(p[0], p[1]); await page.mouse.down(); await page.mouse.up();
  await page.waitForTimeout(500);

  // ── 4) bridge: aim the camera at the river first (the tap must land on the canvas),
  //        then pick from services palette and tap near the river (world 2,24 → snap to (8,96,90))
  await page.evaluate(() => {
    ctl.target.set(2, 0, 24);
    const d = 30, a = 0.9, b = 1.05;
    cam.position.set(2 + d * Math.sin(a) * Math.sin(b), d * Math.cos(b) * 0.9 + 4, 24 + d * Math.sin(a) * Math.cos(b));
    ctl.update();
  });
  await page.waitForTimeout(800);
  await page.click('#palt span[data-c="srv"]');
  await page.click('#pali span[data-t="bridge"]');
  p = await toScreen(2, 24);
  await page.mouse.move(p[0], p[1]); await page.mouse.down(); await page.mouse.up();
  await page.waitForTimeout(500);
  const bp = await page.evaluate(() => ({ items: BP.items.map(i => [i.type, i.x, i.z, i.rot, i.ok]), err: document.getElementById('bpe').textContent }));
  console.log('4) after palace+bridge taps:', JSON.stringify(bp.items), '| err:', JSON.stringify(bp.err));

  // ── 5) roads to both bridge landings, laterally aligned with the bridge center (gx=8 → world x=2):
  //        south landing tile gz=70 (world 17.5), north landing tile gz=122 (world 30.5).
  //        seeded trees near the landings are cleared first (legit admin op) so the tiles land exactly.
  const snapB = await page.evaluate(() => BP.items.find(i => i.type === 'bridge'));
  const cleared = await page.evaluate(async ([bx, bz]) => {
    const w = await (await fetch('/api/world?since=0')).json();
    const x0 = bx - 4, x1 = bx + 3, zS = bz - 30, zN = bz + 30;
    const inZone = b => {
      const cx = b.x, cz = b.z;
      return cx >= x0 - 1 && cx <= x1 + 1 && (Math.abs(cz - zS) <= 5 || Math.abs(cz - zN) <= 5);
    };
    let n = 0;
    for (const b of w.buildings) if (b.type === 'tree' && inZone(b)) {
      await fetch('/api/admin/building/' + b.id, { method: 'DELETE', headers: { 'X-Admin-Token': T } }); n++;
    }
    return n;
  }, [snapB.x, snapB.z]);
  console.log('   cleared trees near landings:', cleared);
  await page.evaluate(() => {
    ctl.target.set(2, 0, 24); const d = 40, a = .5, b = 1.0;
    cam.position.set(2 + d * Math.sin(a) * Math.sin(b), d * Math.cos(b) * 0.9 + 4, 24 + d * Math.sin(a) * Math.cos(b));
    ctl.update();
  });
  await page.waitForTimeout(800);
  await page.click('#pali span[data-t="road"]');
  await page.waitForTimeout(400);
  for (const [wx, wz] of [[2, 17.5], [2, 30.5]]) {
    p = await toScreen(wx, wz); await page.mouse.move(p[0], p[1]); await page.mouse.down(); await page.mouse.up();
    await page.waitForTimeout(400);
    console.log('   tap', wx, wz, 'screen', p.map(v => v | 0), 'items:', JSON.stringify(await page.evaluate(() => BP.items.map(i => [i.type, i.x, i.z, i.ok]))));
  }
  await page.waitForTimeout(400);
  const bp2 = await page.evaluate(() => ({ items: BP.items.map(i => [i.type, i.x, i.z, i.rot, i.ok]), bar: document.getElementById('bpn').textContent }));
  console.log('5) queue with roads:', JSON.stringify(bp2.items));

  // ── 6) commit ✓
  await page.click('#bpok');
  await page.waitForTimeout(3000);
  const after = await page.evaluate(async () => {
    const w = await (await fetch('/api/world?since=0')).json();
    return {
      palace: w.buildings.filter(b => b.type.startsWith('palace')).map(b => [b.type, b.x, b.z, b.rot]),
      bridges: w.buildings.filter(b => b.type === 'bridge').map(b => [b.x, b.z, b.rot]),
      roadCount: w.buildings.filter(b => b.type === 'road').length,
      events: (w.events[0] || {}).text,
    };
  });
  console.log('6) after commit:', JSON.stringify(after));

  // ── 7) nav + car graph over the bridge + deck heights
  const nav = await page.evaluate(() => {
    const by = bridgeY(2, 24);           // وسط عرشه (جهان x=2 z=24، پل (8,96))
    const end = bridgeY(2, 18.6);        // سر عرشه
    const off = bridgeY(2, 34);          // بیرون پل → null
    // walkability across the deck (nav cells)
    let walkMid = null, walkPath = [];
    try { walkMid = walk(2, 24);   // روی عرشه (پل در gx=8 → جهان x=2)
      for (let z = 15; z <= 33; z += .5) walkPath.push(walk(2, z));   // پیوستگی گذر: ساحل جنوبی → عرشه → ساحل شمالی
    } catch (e) { walkMid = 'err:' + e.message }
    const nodes = (typeof carRoadGraph !== 'undefined' ? carRoadGraph : []).filter(n => Math.abs(n.z - 24) < 6 && Math.abs(n.x) < 3).map(n => [n.x, n.z, n.neighbors.length]);
    return { by, end, off, walkMid, crossing: walkPath.map(w => w ? 1 : 0).join(''), nodes };
  });
  console.log('7) bridgeY mid/end/off:', nav.by.toFixed(3), nav.end.toFixed(3), nav.off, '| walk(mid):', nav.walkMid, '| car nodes near bridge:', JSON.stringify(nav.nodes));

  const stats = await page.evaluate(() => ({
    draws: R.info.render.calls, tris: R.info.render.triangles,
    geos: R.info.memory.geometries, texs: R.info.memory.textures,
    lampPts: lampPts.length, homesN, carRoadVer,
  }));
  console.log('8) renderer:', JSON.stringify(stats));
  console.log('PAGE ERRORS:', errs.length ? errs : 'none');
  await browser.close();
  if (mism.bad || !nav.by || nav.off !== null || nav.walkMid !== true || errs.length) process.exit(1);
})().catch(e => { console.error('TEST FAILED:', e); process.exit(1); });
