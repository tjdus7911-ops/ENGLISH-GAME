import { test, expect } from '@playwright/test';
import { quickStart } from './setup';

const ROUTES = ['/home', '/today', '/words/a1-u01', '/grammar', '/grammar/a1-u05', '/listening/dlg-02', '/speaking/a1-u01', '/review', '/wrong-notes', '/free',
  '/analysis', '/collection', '/collection/mossy', '/partner', '/exam', '/my', '/expressions', '/expressions/c/essential', '/expressions/item/trv-01',
  '/video/drama-02', '/house', '/shop', '/inventory', '/garden', '/spaces', '/quests', '/history', '/reading/rd-01', '/words', '/words/level/pre-a1', '/words/level/a2', '/words/topic/food', '/words/ch/food-pre-a1-1', '/words/search?q=app', '/words/saved', '/words/grammar'];

for (const width of [360, 390, 430, 768]) {
  test(`레이아웃 ${width}px: 가로 스크롤 없음 · 주요 버튼 44px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    await quickStart(page);
    const report: string[] = [];
    for (const r of ROUTES) {
      await page.goto(`/#${r}`);
      await page.waitForTimeout(250);
      const m = await page.evaluate(() => {
        const sw = document.documentElement.scrollWidth;
        const small = [...document.querySelectorAll('button, a[href], [role="button"]')]
          .filter((el) => { const b = (el as HTMLElement).getBoundingClientRect(); const st = getComputedStyle(el); return b.width > 0 && b.height > 0 && st.visibility !== 'hidden' && (b.width < 44 || b.height < 44) && !(el as HTMLElement).closest('svg') && !(el as HTMLElement).closest('p'); })
          .map((el) => (el.getAttribute('aria-label') || (el as HTMLElement).innerText || el.tagName).slice(0, 20));
        return { sw, w: window.innerWidth, small };
      });
      expect(m.sw, `${r} horizontal overflow`).toBeLessThanOrEqual(m.w);
      if (m.small.length) report.push(`${r}: ${m.small.join(' | ')}`);
    }
    test.info().annotations.push({ type: 'small-touch-targets', description: report.join('\n') || 'none' });
    expect(report, report.join('\n')).toEqual([]);
  });
}
