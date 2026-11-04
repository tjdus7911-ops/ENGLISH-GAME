/**
 * 사용자 관점 화면 점검 (탐색용). 실제 빌드(vite preview)를 모바일 폭에서 열어
 * 콘솔 오류 · 가로 넘침 · 버튼 겹침/가림 · 텍스트 잘림 · 하단 탭바 가림 · 뒤로가기 유무를 기록한다.
 * 결과: qa/audit/report.json + 화면별 스크린샷
 */
import { test } from '@playwright/test';
import fs from 'node:fs';
import { quickStart } from './setup';

const ROUTES = ['/home', '/today', '/words', '/words/a1-u01', '/grammar', '/grammar/a1-u01', '/grammar/a1-u01/practice', '/grammar/a1-u01/writing', '/grammar/a1-u01/test',
  '/listening', '/listening/dlg-02', '/speaking', '/speaking/a1-u01', '/reading', '/reading/rd-01', '/review', '/wrong-notes', '/free', '/analysis', '/history',
  '/discover', '/collection', '/collection/mossy', '/partner', '/growth/mossy', '/exam', '/exam/a1', '/my', '/house', '/shop', '/inventory', '/garden', '/spaces', '/quests',
  '/expressions', '/expressions/saved', '/expressions/c/essential', '/expressions/item/trv-01', '/situations/sit-01', '/video/drama-02'];

const OUT = 'qa/audit';

async function inspect(page: import('@playwright/test').Page) {
  return page.evaluate(() => {
    const vis = (el: Element) => { const b = el.getBoundingClientRect(); const st = getComputedStyle(el); return b.width > 1 && b.height > 1 && st.visibility !== 'hidden' && st.display !== 'none' && Number(st.opacity) > 0.05; };
    const label = (el: Element) => ((el.getAttribute('aria-label') || (el as HTMLElement).innerText || el.getAttribute('data-testid') || el.tagName) + '').replace(/\s+/g, ' ').trim().slice(0, 28);
    const clickables = [...document.querySelectorAll('button, a[href], [role="button"], input, select, textarea')].filter(vis).filter((el) => !el.closest('[aria-hidden="true"]'));
    // 1) 겹침: 서로 포함 관계가 아닌 클릭 요소끼리 사각형이 겹침
    const overlaps: string[] = [];
    for (let i = 0; i < clickables.length; i++) for (let j = i + 1; j < clickables.length; j++) {
      const a = clickables[i], b = clickables[j];
      if (a.contains(b) || b.contains(a)) continue;
      if (a.tagName === 'polygon' || b.tagName === 'polygon') continue; // 마을 터치 다각형은 의도된 겹침(bbox)
      const r1 = a.getBoundingClientRect(), r2 = b.getBoundingClientRect();
      const w = Math.min(r1.right, r2.right) - Math.max(r1.left, r2.left), h = Math.min(r1.bottom, r2.bottom) - Math.max(r1.top, r2.top);
      if (w > 4 && h > 4) overlaps.push(`${label(a)} ⟂ ${label(b)}`);
    }
    // 2) 가림: 화면 안 클릭 요소 중심점에 다른 요소가 올라와 있음
    const covered: string[] = [];
    for (const el of clickables) {
      if (el.tagName === 'polygon') continue;
      const r = el.getBoundingClientRect(); const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      if (cy < 0 || cy > innerHeight || cx < 0 || cx > innerWidth) continue;
      const top = document.elementFromPoint(cx, cy);
      if (top && top !== el && !el.contains(top) && !top.contains(el) && !(top as HTMLElement).closest('label')?.contains(el)) covered.push(`${label(el)} ← ${label(top)}`);
    }
    // 3) 텍스트 잘림
    const clipped: string[] = [];
    for (const el of document.querySelectorAll('p, span, h1, h2, h3, button, a, li, div')) {
      if (!vis(el) || !(el as HTMLElement).innerText?.trim()) continue;
      const st = getComputedStyle(el);
      const he = el as HTMLElement;
      if ((st.overflow.includes('hidden') || st.textOverflow === 'ellipsis' || st.webkitLineClamp !== 'none') && (he.scrollWidth > he.clientWidth + 2 || he.scrollHeight > he.clientHeight + 2) && el.children.length === 0) clipped.push(label(el));
    }
    const back = !!document.querySelector('a[aria-label*="뒤로"], button[aria-label*="뒤로"], [data-testid="back"]');
    return { overlaps: [...new Set(overlaps)].slice(0, 12), covered: [...new Set(covered)].slice(0, 12), clipped: [...new Set(clipped)].slice(0, 12), back, sw: document.documentElement.scrollWidth, w: innerWidth, h1: document.querySelector('h1')?.textContent ?? '' };
  });
}

for (const width of [360, 390]) {
  test.skip(!process.env.AUDIT, '탐색용 점검: AUDIT=1 일 때만 실행');
  test(`audit ${width}px`, async ({ page }) => {
    test.setTimeout(400_000);
    fs.mkdirSync(OUT, { recursive: true });
    await page.setViewportSize({ width, height: 780 });
    const errors: Record<string, string[]> = {};
    let cur = 'start';
    page.on('pageerror', (e) => (errors[cur] ||= []).push(e.message));
    page.on('console', (m) => { if (m.type() === 'error') (errors[cur] ||= []).push(m.text().slice(0, 160)); });
    await quickStart(page);
    const report: Record<string, unknown> = {};
    for (const r of ROUTES) {
      cur = r;
      await page.goto(`/#${r}`);
      await page.waitForTimeout(700);
      const top = await inspect(page);
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(250);
      const bottom = await inspect(page);
      if (width === 390) await page.screenshot({ path: `${OUT}/${r.replace(/\//g, '_')}.png`, fullPage: true });
      report[r] = { top, bottom: { covered: bottom.covered, overlaps: bottom.overlaps }, url: page.url() };
    }
    fs.writeFileSync(`${OUT}/report-${width}.json`, JSON.stringify({ report, errors }, null, 1));
  });
}
