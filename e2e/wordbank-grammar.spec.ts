/** 영단어 사전(초·중·고급) 챕터 학습 + A2 문법 과정 공개 확인 */
import { test, expect } from '@playwright/test';
import { quickStart } from './setup';
import { dismissModals, runQuiz } from './helpers';

test.use({ timezoneId: 'Asia/Seoul', locale: 'ko-KR' });

test('영단어 사전: 초급·중급·고급 공개 · 레벨 탭 · 검색 · 챕터 학습 → 별 1회 · 나만의 단어장 자동 추가', async ({ page }) => {
  await quickStart(page);
  await page.goto('/#/words');
  await dismissModals(page);
  for (const b of ['beginner', 'intermediate', 'advanced']) await expect(page.getByTestId(`bank-count-${b}`)).toHaveText(/[1-9][\d,]*개/);
  await page.getByTestId('bank-beginner').click();
  await expect(page.getByTestId('bank-list').getByTestId('bank-row').first()).toBeVisible();
  await page.getByTestId('bank-lv-A2').click();
  await expect(page.getByTestId('bank-row').first()).toContainText('A2');
  await page.getByTestId('bank-search').fill('water');
  await expect(page.getByTestId('bank-found')).toBeVisible();
  await page.getByTestId('bank-search').fill('');
  await page.getByTestId('bank-lv-A1').click();
  await page.goto('/#/shop');
  const star0 = Number((await page.getByTestId('star-balance').innerText()).replace(/\D/g, ''));
  for (let round = 0; round < 2; round++) {
    await page.goto('/#/words/bank/beginner?lv=A1');
    await page.getByTestId('bank-ch-1').click();
    for (let i = 0; i < 9; i++) {
      await expect(page.getByTestId('word-en')).toBeVisible();
      await page.getByTestId('bank-next').click();
    }
    await page.getByTestId('bank-quiz').click();
    await runQuiz(page, true);
    await dismissModals(page);
  }
  await page.goto('/#/shop');
  expect(Number((await page.getByTestId('star-balance').innerText()).replace(/\D/g, ''))).toBe(star0 + 2);
  await page.goto('/#/words/bank/beginner?lv=A1');
  await expect(page.getByTestId('bank-ch-1')).toContainText('10/10');
  await page.goto('/#/mywords');
  await expect(page.getByTestId('mw-item')).toHaveCount(10);
  await page.reload();
  await page.goto('/#/words/bank/beginner?lv=A1');
  await expect(page.getByTestId('bank-ch-1')).toContainText('10/10');
});

test('문법: A2 8강 공개, 강의·확인 문제 진행, 레벨 표시', async ({ page }) => {
  await quickStart(page);
  await page.goto('/#/grammar');
  await expect(page.getByTestId('grammar-level-A2').locator('a')).toHaveCount(8);
  await page.getByTestId('unit-a2-u01').click();
  await expect(page.getByText('A2', { exact: true }).first()).toBeVisible();
  await page.goto('/#/grammar/a2-u01/practice');
  await dismissModals(page);
  await runQuiz(page, true);
  await expect(page.getByText(/확인 문제|결과/).first()).toBeVisible();
});
