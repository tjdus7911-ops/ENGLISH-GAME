const { chromium } = require('playwright');
const out = process.argv[2];
const B = 'bed:bed-wood,desk:desk-study,chair:chair-wood,rug:rug-round,lamp:lamp-stand';
const C = B + ',sofa:sofa-pink,bookshelf:shelf-small,plant:plant-monstera,frame:frame-forest';
const GB = 'bed1:g-bed-tulip';
const GC = GB + ',bed2:g-bed-daisy,bed3:g-bed-lavender,bench1:g-bench-wood,path1:g-path-stone';
const GD = GC + ',fountain:g-fountain,light1:g-light-lamp,light2:g-light-lamp,tree1:g-tree-cherry,tree2:g-tree-apple,path2:g-path-stone';
const S = {
  'village-stage1': 'scene=village&w=1024&level=1&chars=mossy:1&partner=mossy',
  'village-stage2': 'scene=village&w=1024&level=2&deco=flowers,tree&chars=mossy:1,plip:1&partner=mossy',
  'village-stage3': 'scene=village&w=1024&level=3&deco=flowers,tree,garden,pond-bridge&chars=mossy:2,plip:1,lumi:1,cobi:1&partner=mossy',
  'house-A-first': 'scene=house&w=1280&p=bed:bed-old,desk:desk-small&chars=mossy:1&partner=mossy',
  'house-B-stage2': `scene=house&w=1280&p=${B}&chars=mossy:1&partner=mossy`,
  'house-C-stage3': `scene=house&w=1280&p=${C}&chars=mossy:1&partner=mossy`,
  'house-C-wall-flower-floor-warm': `scene=house&w=1280&p=${C},wallpaper:wall-flower,floor:floor-warm&chars=mossy:1&partner=mossy`,
  'house-C-wall-mint-floor-tile': `scene=house&w=1280&p=${C},wallpaper:wall-mint,floor:floor-tile&chars=mossy:1&partner=mossy`,
  'house-B-decorate': `scene=house&w=1280&p=${B}&chars=mossy:1&partner=mossy&mode=decorate&sel=sofa`,
  'garden-A-locked': 'scene=garden&w=1280&locked=1',
  'garden-B-open': `scene=garden&w=1280&p=${GB}&chars=mossy:1`,
  'garden-C-stage2': `scene=garden&w=1280&p=${GC}&chars=mossy:1,plip:1`,
  'garden-D-stage3': `scene=garden&w=1280&p=${GD}&chars=mossy:1,plip:1,lumi:1`,
  'garden-C-decorate': `scene=garden&w=1280&p=${GC}&chars=mossy:1&mode=decorate`,
};
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1300, height: 1300 }, deviceScaleFactor: 1 });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type()==='error' && errs.push(m.text()));
  for (const [name, qs] of Object.entries(S)) {
    await p.goto(`http://localhost:5199/harness.html?${qs}`);
    await p.waitForSelector('[data-testid$="scene"], [data-testid="village"]', { timeout: 15000 });
    await p.waitForFunction(() => [...document.images].every(i => i.complete && i.naturalWidth > 0));
    await p.waitForTimeout(300);
    const el = await p.$('[data-testid$="scene"], [data-testid="village"]');
    const bb = await el.boundingBox();
    await el.screenshot({ path: `${out}/mockup__${name}.png` });
    console.log(name, Math.round(bb.width), Math.round(bb.height), await p.evaluate(() => document.images.length));
  }
  console.log('errors', errs.slice(0,5));
  await b.close();
})();
