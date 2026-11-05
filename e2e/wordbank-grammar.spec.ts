/** 문법 A1~B2 과정 공개 확인 */
import { test, expect } from '@playwright/test';
import { quickStart } from './setup';
import { dismissModals, runQuiz } from './helpers';

test.use({ timezoneId: 'Asia/Seoul', locale: 'ko-KR' });

test('문법: A1~B2 31강 공개, 강의·확인 문제 진행, 레벨 표시', async ({ page }) => {
  await quickStart(page);
  await page.goto('/#/grammar');
  for (const [lv, n] of [['A1', 10], ['A2', 8], ['B1', 7], ['B2', 6]] as const) await expect(page.getByTestId(`grammar-level-${lv}`).locator('a[data-testid^="unit-"]')).toHaveCount(n);
  await expect(page.getByText('작성 중')).toHaveCount(0);
  await page.getByTestId('unit-a2-u01').click();
  await expect(page.getByText('A2', { exact: true }).first()).toBeVisible();
  await page.goto('/#/grammar/a2-u01/practice');
  await dismissModals(page);
  await runQuiz(page, true);
  await expect(page.getByText(/확인 문제|결과/).first()).toBeVisible();
});
