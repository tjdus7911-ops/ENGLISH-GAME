/**
 * 도서관 동화책 듣기·읽기 / 나만의 단어장 / 적응형 레벨 테스트·추천 / 보상 중복 방지 / 데이터 유지
 * 음성 합성(speechSynthesis)은 테스트 브라우저에 영어 음성이 없으므로 기록용 가짜로 대체한다.
 */
import { test, expect, type Page } from '@playwright/test';
import { quickStart } from './setup';
import { answerCurrent, dismissModals, runQuiz } from './helpers';
import { BOOK_BY_ID } from '../src/content/library';

test.use({ timezoneId: 'Asia/Seoul', locale: 'ko-KR' });

const FAKE_TTS = `
  window.__spoken = [];
  window.__ttsDelay = 120;
  class FakeUtterance { constructor(t){ this.text=t; this.rate=1; this.lang=''; this.voice=null; this.onend=null; this.onerror=null; } }
  const synth = {
    _cur: null, _timer: null,
    getVoices(){ return [{ name: 'Fake English', lang: 'en-US', default: true, localService: true, voiceURI: 'fake' }]; },
    speak(u){ this.cancel(); this._cur = u; window.__spoken.push({ text: u.text, rate: u.rate }); this._timer = setTimeout(()=>{ const c=this._cur; this._cur=null; c && c.onend && c.onend(); }, window.__ttsDelay); },
    cancel(){ clearTimeout(this._timer); this._cur = null; },
    addEventListener(){}, removeEventListener(){}, pause(){}, resume(){}, speaking:false, pending:false, paused:false,
  };
  Object.defineProperty(window, 'speechSynthesis', { value: synth, configurable: true });
  window.SpeechSynthesisUtterance = FakeUtterance;
`;
const spoken = (page: Page) => page.evaluate(() => (window as unknown as { __spoken: { text: string; rate: number }[] }).__spoken);
const stars = async (page: Page) => { await page.goto('/#/shop'); await dismissModals(page); return Number((await page.getByTestId('star-balance').innerText()).replace(/\D/g, '')); };

test('동화책: 문장 터치 재생·강조 · 속도 · 듣기 모드 자동 넘김 · 수동 모드 · 번역 토글 · 공부 모드 · 진행 저장', async ({ page }) => {
  await page.addInitScript(FAKE_TTS);
  await quickStart(page);
  const b = BOOK_BY_ID['a1-tortoise-hare'];
  // 마을 도서관 → 도서관 메뉴 (동화책 + 문법)
  await page.goto('/#/library');
  await expect(page.getByTestId('lib-books')).toBeVisible();
  await expect(page.getByTestId('lib-grammar')).toHaveAttribute('href', '#/grammar');
  await page.getByTestId('lib-books').click();
  await page.getByTestId('shelf-lv-A1').click();
  await expect(page.getByTestId('shelf-list').locator('a')).toHaveCount(8);
  await page.getByTestId(`book-${b.id}`).click();
  await expect(page.getByTestId('book-origin')).toContainText('이솝');
  await page.getByTestId('book-start').click();
  await page.getByTestId('mode-read').click();

  // ① 직접 읽기: 문장 터치 → 해당 문장 재생 + 강조
  const s1 = page.getByTestId('sentence').nth(1);
  await s1.click();
  await expect(s1).toHaveAttribute('data-active', 'true');
  await expect.poll(async () => (await spoken(page)).at(-1)?.text).toBe(b.pages[0].sentences[1].en);
  // 속도 0.75
  await page.getByTestId('rate-0.75').click();
  await page.getByTestId('replay').click();
  await expect.poll(async () => (await spoken(page)).at(-1)?.rate).toBe(0.75);
  // 번역 토글
  await expect(page.getByTestId('sentence-ko').first()).toBeVisible();
  await page.getByTestId('ko-toggle').click();
  await expect(page.getByTestId('sentence-ko')).toHaveCount(0);
  await page.getByTestId('ko-toggle').click();

  // 페이지 전체 듣기 (넘어가지 않음)
  await page.evaluate(() => { (window as unknown as { __spoken: unknown[] }).__spoken = []; });
  await page.getByTestId('rate-1').click();
  await page.getByTestId('page-listen').click();
  await expect.poll(async () => (await spoken(page)).length, { timeout: 8000 }).toBe(b.pages[0].sentences.length);
  await expect(page.getByTestId('page-no')).toHaveText(`1 / ${b.pages.length}`);

  // ② 듣기 모드 + 자동 넘김: 1쪽 끝 → 2쪽 자동 이동, 현재 문장 강조
  await page.evaluate(() => { (window as unknown as { __spoken: unknown[] }).__spoken = []; });
  await page.getByTestId('mode-listen').click();
  await expect(page.getByTestId('auto-page')).toBeChecked();
  await page.getByTestId('listen-play').click();
  await expect(page.getByTestId('page-no')).toHaveText(`2 / ${b.pages.length}`, { timeout: 10000 });
  await expect(page.locator('[data-testid="sentence"][data-active="true"]')).toHaveCount(1);
  await page.getByTestId('listen-stop').click();
  const texts = (await spoken(page)).map((x) => x.text);
  expect(texts.slice(0, b.pages[0].sentences.length)).toEqual(b.pages[0].sentences.map((s) => s.en)); // 순서대로
  // 수동 모드: 자동 넘김 끄면 페이지 끝에서 멈춤
  await page.getByTestId('auto-page').uncheck();
  await page.evaluate(() => { (window as unknown as { __spoken: unknown[] }).__spoken = []; });
  await page.getByTestId('listen-play').click();
  await expect.poll(async () => (await spoken(page)).length, { timeout: 8000 }).toBe(b.pages[1].sentences.length);
  await page.waitForTimeout(900);
  await expect(page.getByTestId('page-no')).toHaveText(`2 / ${b.pages.length}`);
  await expect(page.getByTestId('listen-play')).toBeVisible(); // 재생 종료
  // 한 문장 반복
  await page.getByTestId('repeat-toggle').click();
  await page.evaluate(() => { (window as unknown as { __spoken: unknown[] }).__spoken = []; });
  await page.getByTestId('sentence').first().click();
  await expect.poll(async () => (await spoken(page)).length, { timeout: 5000 }).toBeGreaterThanOrEqual(3);
  expect(new Set((await spoken(page)).map((x) => x.text)).size).toBe(1);
  await page.getByTestId('listen-stop').click();
  await page.getByTestId('repeat-toggle').click();

  // ③ 영어 공부 모드: 번역 + 문장 구조 + 주요 단어
  await page.getByTestId('mode-study').click();
  await expect(page.getByTestId('study-box').first()).toContainText('문장 구조');
  await expect(page.getByTestId('key-word').first()).toBeVisible();
  // 수동 페이지 넘김 → 저장 → 새로고침 후 이어 읽기
  await page.getByTestId('page-next').click();
  await expect(page.getByTestId('page-no')).toHaveText(`3 / ${b.pages.length}`);
  await page.waitForTimeout(400);
  await page.reload();
  await expect(page.getByTestId('book-start')).toHaveText('이어 읽기 (3쪽)');
});

test('TTS 미지원 브라우저: 안내 표시, 읽기·단어 뜻은 계속 사용 가능', async ({ page }) => {
  await page.addInitScript(() => { Object.defineProperty(window, 'speechSynthesis', { value: undefined, configurable: true }); });
  await quickStart(page);
  await page.goto('/#/library/book/a1-lost-mitten');
  await page.getByTestId('book-start').click();
  await expect(page.getByTestId('tts-unsupported')).toBeVisible();
  await expect(page.getByTestId('page-listen')).toHaveCount(0);
  await page.getByTestId('mode-study').click();
  await page.locator('[data-word="mitten"]').first().click();
  await expect(page.getByTestId('popup-meaning')).toContainText('장갑');
});

test('단어 저장 중복 방지 · 단어장 필터/검색/뒤집기/암기 · 복습 기록 저장 · 별 1회 · 새로고침 후 유지', async ({ page }) => {
  await page.addInitScript(FAKE_TTS);
  await quickStart(page);
  const star0 = await stars(page);
  // 동화책 공부 모드에서 단어 저장
  await page.goto('/#/library/book/a1-lion-mouse');
  await page.getByTestId('book-start').click();
  await page.getByTestId('mode-study').click();
  for (const w of ['lion', 'sleeping', 'mouse', 'nose', 'catches']) {
    await page.locator(`[data-word="${w}"]`).first().click();
    await expect(page.getByTestId('word-popup')).toBeVisible();
    await page.getByTestId('popup-save').click();
    await expect(page.getByTestId('popup-msg')).toContainText('저장');
    await page.getByRole('button', { name: '닫기', exact: true }).click();
  }
  // 같은 단어(활용형) 다시 → 이미 저장됨
  await page.locator('[data-word="catches"]').first().click();
  await expect(page.getByTestId('popup-saved')).toBeVisible();
  await page.getByRole('button', { name: '닫기', exact: true }).click();
  // 고유명사는 저장 버튼 없음 (다른 책)
  await page.goto('/#/library/book/a1-lost-mitten');
  await page.getByTestId('book-start').click();
  await page.getByTestId('mode-study').click();
  await page.locator('[data-word="Mina"]').first().click();
  await expect(page.getByTestId('popup-save')).toHaveCount(0);
  await page.getByRole('button', { name: '닫기', exact: true }).click();
  // 문법 예문에서 'sleep' 계열이 아닌 새 단어 + 이미 있는 단어 → 출처만 추가
  await page.goto('/#/grammar/a1-u01');
  await dismissModals(page);
  const exWord = page.locator('main [data-word]').first();
  const exText = (await exWord.innerText()).trim();
  await exWord.click();
  if (await page.getByTestId('popup-save').isVisible()) await page.getByTestId('popup-save').click();
  await page.getByRole('button', { name: '닫기', exact: true }).click();

  await page.goto('/#/mywords');
  const items = page.getByTestId('mw-item');
  const n = await items.count();
  expect(n).toBeGreaterThanOrEqual(5);
  expect(n).toBeLessThanOrEqual(6);
  await expect(page.locator('[data-testid="mw-item"][data-key="catch"]')).toHaveCount(1);
  // 필터·검색·정렬
  await page.getByTestId('mw-src-book').click();
  await expect(items).toHaveCount(5);
  await page.getByTestId('mw-src-grammar').click();
  await expect(items).toHaveCount(1);
  await expect(items.first()).toContainText(new RegExp(exText.replace(/[^a-z]/gi, '').slice(0, 3), 'i'));
  await page.getByTestId('mw-src-all').click();
  await page.getByTestId('mw-search').fill('사자');
  await expect(items).toHaveCount(1);
  await page.getByTestId('mw-search').fill('');
  // 카드 뒤집기 · 암기 완료 · 미암기만
  const lion = page.locator('[data-testid="mw-item"][data-key="lion"]');
  await lion.getByTestId('mw-flip').click();
  await expect(lion.getByTestId('mw-meaning')).toContainText('사자');
  await lion.getByTestId('mw-memorize').click();
  await expect(lion).toHaveAttribute('data-status', 'memorized');
  await page.getByTestId('mw-status-unmemorized').click();
  await expect(page.locator('[data-testid="mw-item"][data-key="lion"]')).toHaveCount(0);
  await page.getByTestId('mw-status-all').click();

  // 복습 퀴즈 (암기 완료 제외) → 1개 오답
  await page.getByTestId('mw-review-start').click();
  await runQuiz(page, (i) => i !== 0);
  await page.getByRole('button', { name: '단어장으로' }).click();
  await expect(page.locator('[data-testid="mw-item"][data-status="learning"]')).toHaveCount(n - 1);
  const star1 = await stars(page);
  expect(star1 - star0).toBe(2);
  // 같은 날 다시 → 별 추가 없음
  await page.goto('/#/mywords/review');
  await expect(page.getByTestId('mw-review-mode')).toContainText('추가 연습');
  await runQuiz(page, true);
  expect(await stars(page)).toBe(star1);
  // 새로고침 후 유지
  await page.reload();
  await page.goto('/#/mywords');
  await expect(page.getByTestId('mw-item')).toHaveCount(n);
  await expect(page.locator('[data-testid="mw-item"][data-key="lion"]')).toHaveAttribute('data-status', 'memorized');
});

test('동화책 완독 퀴즈: 별은 1회만, 재독·재응시로 추가 지급 없음', async ({ page }) => {
  await page.addInitScript(FAKE_TTS);
  await quickStart(page);
  const b = BOOK_BY_ID['a1-rainy-day'];
  const star0 = await stars(page);
  for (let round = 0; round < 2; round++) {
    await page.goto('/#/library/books?lv=A1');
    await page.getByTestId(`book-${b.id}`).click();
    await page.getByRole('button', { name: /읽기 시작|처음부터 읽기/ }).last().click();
    for (let p = 0; p < b.pages.length - 1; p++) await page.getByTestId('page-next').click();
    await page.getByTestId('book-finish').click();
    await runQuiz(page, true);
    await dismissModals(page);
    await expect(page.getByText('완독 성공!')).toBeVisible();
  }
  expect(await stars(page)).toBe(star0 + 3);
  await page.goto('/#/library/books?lv=A1');
  await expect(page.getByTestId(`book-${b.id}`)).toContainText('완독');
});

test('적응형 레벨 테스트 → 결과·영역별 정답 → 추천(레벨 중심 + 다음 레벨) → 레벨 변경·재응시 · 성취도', async ({ page }) => {
  await quickStart(page);
  await page.goto('/#/level-test');
  await page.getByTestId('lt-start').click();
  const levels: string[] = [];
  for (let i = 0; i < 24; i++) {
    await expect(page.getByTestId('lt-progress')).toHaveText(`${i + 1} / 24`);
    const lv = (await page.getByTestId('lt-item').getAttribute('data-level'))!;
    levels.push(lv);
    await answerCurrent(page, ['A1', 'A2', 'B1'].includes(lv));
    await page.getByTestId('lt-next').click();
  }
  expect(levels[0]).toBe('A2');
  expect(levels).toContain('B2'); // 난이도가 올라갔다가
  await expect(page.getByTestId('level-result')).toHaveText('B1');
  await expect(page.getByText('공인 CEFR 인증 결과가 아니에요')).toBeVisible();
  await page.getByTestId('to-recommend').click();
  await expect(page.getByTestId('rec-level')).toHaveText('B1');
  const wl = await page.getByTestId('rec-word').evaluateAll((els) => els.map((e) => e.getAttribute('data-level')));
  expect(wl.slice(0, 4).every((x) => x === 'B1')).toBe(true);
  expect(wl.at(-1)).toBe('B2');
  const bl = await page.locator('[data-testid="rec-books"] a').evaluateAll((els) => els.map((e) => e.getAttribute('data-level')));
  expect(bl).toEqual(['B1', 'B1', 'B2']);
  // 레벨 직접 변경
  await page.goto('/#/achievement');
  await page.getByTestId('ach-change-level').click();
  await page.getByTestId('pick-A2').click();
  await expect(page.getByTestId('ach-level')).toContainText('A2');
  await expect(page.getByTestId('ach-level')).toContainText('직접 선택');
  await page.goto('/#/recommend');
  await expect(page.getByTestId('rec-level')).toHaveText('A2');
  const bl2 = await page.locator('[data-testid="rec-books"] a').evaluateAll((els) => els.map((e) => e.getAttribute('data-level')));
  expect(bl2).toEqual(['A2', 'A2', 'B1']);
  // 성취도 화면 구성
  await page.goto('/#/achievement');
  await expect(page.getByTestId('ach-stats')).toContainText('읽은 동화책');
  await expect(page.getByTestId('ach-week').locator('div.flex-1')).toHaveCount(7);
  await expect(page.getByTestId('ach-areas')).toContainText('영단어');
  // 재응시 가능
  await page.getByTestId('ach-retest').click();
  await expect(page.getByTestId('lt-start')).toBeVisible();
});
