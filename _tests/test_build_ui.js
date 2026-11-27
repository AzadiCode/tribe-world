// Real build-UI test (guide §10 trap): enter build mode from the admin bar, REAL pointer events:
// drag a wall stroke, tap-place a gate on a road, commit with ✓, verify server state.
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

  // 1) admin login via the in-game flow
  await page.click('#ba');
  await page.waitForSelector('#md', { state: 'visible' });
  await page.fill('#mi', 'testkey');
  await page.click('#mok');
  await page.waitForSelector('#adm', { state: 'visible' });
  console.log('1) admin login OK');

  // 2) enter build mode from the admin toolbar
  await page.click('#adm [data-m="build"]');
  await page.waitForSelector('#pal', { state: 'visible' });
  console.log('2) build mode + palette visible');

  // 3) switch to the defensive category and pick the wall
  await page.click('#palt span[data-c="def"]');
  await page.click('#pali span[data-t="wall"]');
  const palText = await page.evaluate(() => document.getElementById('pali').textContent);
  console.log('3) defensive palette:', palText.replace(/\s+/g, ' ').trim());

  // 4) drag a wall stroke east of the existing tower (world 1.75,12 -> 3.75,12)
  const toScreen = (wx, wz) => page.evaluate(([wx, wz]) => {
    const v = new THREE.Vector3(wx, 0, wz).project(cam);
    return [(v.x * .5 + .5) * innerWidth, (-v.y * .5 + .5) * innerHeight];
  }, [wx, wz]);
  const a = await toScreen(1.75, 12), b = await toScreen(3.75, 12);
  await page.mouse.move(a[0], a[1]);
  await page.mouse.down();
  await page.mouse.move(b[0], b[1], { steps: 12 });
  await page.mouse.up();
  await page.waitForTimeout(600);
  const bp1 = await page.evaluate(() => ({ items: BP.items.map(i => [i.type, i.x, i.z, i.ok]), bar: document.getElementById('bpn').textContent }));
  console.log('4) wall stroke queue:', JSON.stringify(bp1.items), '| bar:', bp1.bar);

  // 5) pick the gate and tap on the road tile at world (-2,4)
  await page.click('#pali span[data-t="gate"]');
  const c = await toScreen(-2, 4);
  await page.mouse.move(c[0], c[1]);
  await page.mouse.down();
  await page.mouse.up();
  await page.waitForTimeout(600);
  const bp2 = await page.evaluate(() => ({ items: BP.items.map(i => [i.type, i.x, i.z, i.rot, i.ok]), err: document.getElementById('bpe').textContent }));
  console.log('5) after gate tap:', JSON.stringify(bp2.items), '| error text:', JSON.stringify(bp2.err));

  // 6) commit with ✓
  await page.click('#bpok');
  await page.waitForTimeout(2500);
  const after = await page.evaluate(async () => {
    const w = await (await fetch('/api/world?since=0')).json();
    return { walls: w.buildings.filter(b => b.type === 'wall').length, gates: w.buildings.filter(b => b.type === 'gate').map(b => [b.x, b.z, b.rot]) };
  });
  console.log('6) after commit:', JSON.stringify(after));
  console.log('PAGE ERRORS:', errs.length ? errs : 'none');
  await browser.close();
})().catch(e => { console.error('TEST FAILED:', e); process.exit(1); });
