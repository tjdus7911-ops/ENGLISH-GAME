import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { quickStart } from './setup';
import { dismissModals, runQuiz } from './helpers';
import { VOCAB } from '../src/content/vocab';
import { PRE_A1 } from '../src/content/vocab-topics';

test.use({ timezoneId: 'Asia/Seoul', locale: 'ko-KR' });

/** 기대값: 기존 DB(VOCAB) + 영단어 사전 JSON 을 직접 세어 계산 */
const bank = ['beginner', 'intermediate', 'advanced'].flatMap((b) => JSON.parse(readFileSync(`public/wordbank/${b}.json`, 'utf8')) as { lv: string }[]);
const EXPECT: Record<string, number> = {
  'pre-a1': VOCAB.filter((v) => PRE_A1.has(v.id)).length,
  a1: VOCAB.filter((v) => !PRE_A1.has(v.id)).length + bank.filter((w) => w.lv === 'A1').length,
  a2: bank.filter((w) => w.lv === 'A2').length, b1: bank.filter((w) => w.lv === 'B1').length, b2: bank.filter((w) => w.lv === 'B2').length,
  c1: bank.filter((w) => w.lv === 'C1').length, c2: bank.filter((w) => w.lv === 'C2').length,
};
const TOTAL = Object.values(EXPECT).reduce((a, b) => a + b, 0);
const fmt = (n: number) => n.toLocaleString('ko-KR');
const stars = async (page: import('@playwright/test').Page) => { await page.goto('/#/shop'); await dismissModals(page); return Number((await page.getByTestId('star-balance').innerText()).replace(/\D/g, '')); };

test('단어 숲: 7단계 난이도 전체 DB 연결 · 진도 · 학습 단위 · 학습 방법 · 검색 · 보상 · 기록 유지', async ({ page }) => {
  test.setTimeout(240_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await quickStart(page);
  const star0 = await stars(page);
  await page.goto('/#/words');
  await dismissModals(page);
  // ① 전체 진도: 전체 DB 기준 (300 고정값 없음)
  await expect(page.getByTestId('forest-total')).toHaveText(`0 / ${fmt(TOTAL)}단어`);
  await expect(page.getByTestId('forest-progress')).not.toContainText('/ 300단어');
  // 영단어 사전 카드 영역 제거
  await expect(page.getByTestId('bank-section')).toHaveCount(0);
  // ④ 7개 난이도 카드 · 실제 단어 수 · 잠금 없음
  for (const [lv, n] of Object.entries(EXPECT)) {
    await expect(page.getByTestId(`level-${lv}-count`)).toHaveText(`전체 ${fmt(n)}단어`);
    await expect(page.getByTestId(`level-${lv}`)).not.toHaveAttribute('aria-disabled', 'true');
  }
  await expect(page.getByText('준비 중')).toHaveCount(0);

  // 기초(A1): 20개 단위 학습
  await page.getByTestId('level-a1').click();
  await expect(page.getByTestId('lv-list-count')).toHaveText(`${fmt(EXPECT.a1)}개`);
  await expect(page.getByTestId('lv-list').getByTestId('word-line')).toHaveCount(40); // 한 번에 다 그리지 않음
  await page.getByTestId('size-20').click();
  await page.getByTestId('lv-start').click();
  await expect(page.getByTestId('session-pos')).toHaveText('1 / 20');
  // 기존 2단 카드: 영어 카드 고정, 해석 카드만 뒤집기
  const word1 = await page.getByTestId('word-en').innerText();
  await expect(page.getByTestId('meaning-card')).toHaveAttribute('data-open', 'false');
  await page.getByTestId('reveal-meaning').click();
  await expect(page.getByTestId('meaning-card')).toHaveAttribute('data-open', 'true');
  await page.getByTestId('save-word').click();
  await expect(page.getByTestId('save-word')).toHaveAttribute('aria-pressed', 'true');
  for (let i = 0; i < 19; i++) await page.getByTestId('next-word').click();
  await page.getByTestId('start-word-quiz').click();
  await runQuiz(page, (i) => i !== 1); // 2번째 단어는 일부러 틀림
  await dismissModals(page);
  expect(await stars(page)).toBe(star0 + 4); // 새 단어 20개 → 10개마다 ★2

  // 진도: 전체·난이도별 반영
  await page.goto('/#/words'); await dismissModals(page);
  await expect(page.getByTestId('forest-total')).toHaveText(`20 / ${fmt(TOTAL)}단어`);
  await expect(page.getByTestId('level-a1-done')).toContainText(`학습 완료 20 / ${fmt(EXPECT.a1)}`);
  await expect(page.getByTestId('level-b1-done')).toContainText('학습 완료 0 /');
  await expect(page.getByTestId('continue-words')).toContainText('이어서 학습하기');

  // 단어 목록 탭: 학습 완료 · 틀린 단어 · 즐겨찾기 · 주제 (학습 방법·주제별 학습 섹션은 없음)
  await page.getByTestId('level-a1').click();
  await expect(page.getByText('학습 방법')).toHaveCount(0);
  await expect(page.getByText('주제별 학습')).toHaveCount(0);
  await page.getByTestId('filter-learned').click();
  await expect(page.getByTestId('lv-list-count')).toHaveText('20개');
  await page.getByTestId('filter-wrong').click();
  await expect(page.getByTestId('lv-list-count')).toHaveText('1개');
  await page.getByTestId('filter-fav').click();
  await expect(page.getByTestId('lv-list').getByTestId('word-line')).toHaveCount(1);
  await expect(page.getByTestId('lv-list')).toContainText(word1);
  // 학습 완료 목록으로 다시 학습 → 별 추가 없음
  await page.getByTestId('filter-learned').click();
  await page.getByTestId('size-10').click();
  await page.getByTestId('lv-list-study').click();
  await expect(page.getByTestId('session-pos')).toHaveText('1 / 10');
  for (let i = 0; i < 9; i++) await page.getByTestId('next-word').click();
  await page.getByTestId('start-word-quiz').click();
  await runQuiz(page, true);
  expect(await stars(page)).toBe(star0 + 4);
  // 최상급(C2) 열기 · 주제 탭으로 목록 학습
  await page.goto('/#/words/level/c2');
  await expect(page.getByTestId('lv-list-count')).toHaveText(`${fmt(EXPECT.c2)}개`);
  await page.goto('/#/words/level/b2');
  await page.getByRole('button', { name: '감정과 성격', exact: true }).click();
  await expect(page.getByTestId('lv-list').getByTestId('word-line').first()).toBeVisible();
  await page.getByTestId('lv-list-study').click();
  await expect(page.getByTestId('session-pos')).toContainText('1 /');

  // 검색: 전체 DB · 레벨 표시 · 해당 난이도로 이동
  await page.goto('/#/words/search?q=volcano');
  const hit = page.getByTestId('search-results').getByTestId('word-line').first();
  await expect(hit).toBeVisible();
  const lv = await hit.getAttribute('data-level');
  expect(['B1', 'B2', 'C1', 'C2', 'A2']).toContain(lv);
  await hit.getByTestId('line-level-link').click();
  await expect(page).toHaveURL(new RegExp(`#/words/level/${lv!.toLowerCase()}`));
  await page.goto('/#/words/search?q=사과');
  await expect(page.locator('[data-testid="word-line"][data-id="apple"]')).toBeVisible();

  // 예전 영단어 사전 주소 → 난이도 학습으로
  await page.goto('/#/words/bank/advanced');
  await expect(page).toHaveURL(/#\/words\/level\/c1/);

  // 새로고침 후 유지 · 저장 단어 · 복습
  await page.reload(); await page.goto('/#/words'); await dismissModals(page);
  await expect(page.getByTestId('forest-total')).toHaveText(`20 / ${fmt(TOTAL)}단어`);
  await page.goto('/#/mywords');
  await expect(page.getByTestId('mw-list')).toContainText(word1);
  await page.goto('/#/home'); await dismissModals(page);
  await expect(page.getByTestId('due-count')).not.toHaveText('0개');
  // 기존 문법 단원 단어장(보조 메뉴)
  await page.goto('/#/words/grammar');
  await expect(page.getByText('인칭대명사 단어')).toBeVisible();
  expect(errors).toEqual([]);
});
