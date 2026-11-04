import { test, expect } from '@playwright/test';
import { quickStart } from './setup';
import { dismissModals, runQuiz } from './helpers';

test('단어 숲: 난이도·주제 단어장 · 2단 카드 · 이어하기 · 저장 · 검색 · 보상 · 기록 유지', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await quickStart(page);
  await page.goto('/#/words');
  await dismissModals(page);
  // 메인: 전체 진도, 난이도(데이터 없는 단계는 비활성), 주제 9개 실제 단어 수
  await expect(page.getByTestId('forest-progress')).toContainText('0 / 300단어');
  for (const lv of ['a2', 'b1', 'b2']) { await expect(page.getByTestId(`level-${lv}`)).toHaveAttribute('data-state', 'empty'); await expect(page.getByTestId(`level-${lv}`)).toHaveAttribute('aria-disabled', 'true'); }
  await expect(page.getByTestId('level-pre-a1-count')).toHaveText('0/97단어 · 0%');
  await expect(page.getByTestId('level-a1-count')).toHaveText('0/203단어 · 0%');
  const expected: Record<string, number> = { people: 42, food: 27, home: 78, feelings: 38, travel: 40, talk: 44, shopping: 28, nature: 22, core: 49 };
  for (const [t, n] of Object.entries(expected)) await expect(page.getByTestId(`topic-${t}-count`)).toHaveText(`0/${n}단어 · 0%`);

  // 주제 → 챕터
  await page.getByTestId('topic-food').click();
  await page.getByTestId('chapter-food-pre-a1-1').click();
  await expect(page.getByTestId('study-progress')).toContainText('1 / 5');
  // 상단 영어 카드 고정, 하단 해석 카드만 뒤집기
  const top = page.getByTestId('word-card');
  const word1 = await page.getByTestId('word-en').innerText();
  await expect(top).not.toHaveClass(/flip/);
  const meaning = page.getByTestId('meaning-card');
  await expect(meaning).toHaveAttribute('data-open', 'false');
  await expect(page.getByTestId('word-meaning')).not.toBeInViewport({ ratio: 1 }).catch(() => {}); // 뒷면(숨김)
  expect(await page.getByTestId('word-meaning').evaluate((e) => getComputedStyle(e.closest('.flip-front')!).backfaceVisibility)).toBe('hidden');
  await page.getByTestId('reveal-meaning').click();
  await expect(meaning).toHaveAttribute('data-open', 'true');
  await expect(page.getByTestId('word-tip')).toContainText('더 알아보기');
  // 단어·예문 음성 요청 정상
  const [r1] = await Promise.all([page.waitForResponse((r) => r.url().includes('/audio/')), page.getByRole('button', { name: /단어 발음 듣기/ }).click()]);
  expect([200, 206]).toContain(r1.status());
  const [r2] = await Promise.all([page.waitForResponse((r) => r.url().includes('/audio/')), page.getByRole('button', { name: /예문 듣기/ }).click()]);
  expect([200, 206]).toContain(r2.status());
  await page.getByTestId('hide-meaning').click();
  await expect(meaning).toHaveAttribute('data-open', 'false'); // 다시 누르면 가림
  await page.getByTestId('reveal-meaning').click();
  await page.getByTestId('save-word').click(); // 저장
  await expect(page.getByTestId('save-word')).toHaveAttribute('aria-pressed', 'true');
  // 다음 단어 → 해석 숨김 초기화 · 영어 단어 변경 · 이전으로 와도 숨김
  await page.getByTestId('next-word').click();
  await expect(page.getByTestId('meaning-card')).toHaveAttribute('data-open', 'false');
  await expect(page.getByTestId('word-en')).not.toHaveText(word1);
  await page.getByTestId('reveal-meaning').click();
  await page.getByTestId('prev-word').click();
  await expect(page.getByTestId('word-en')).toHaveText(word1);
  await expect(page.getByTestId('meaning-card')).toHaveAttribute('data-open', 'false');
  // 모바일: 두 카드 + 이전/다음 버튼이 한 화면 안에 보임, 두 카드 너비 동일
  const tb = (await top.boundingBox())!; const mb = (await page.getByTestId('meaning-card').boundingBox())!;
  expect(Math.abs(tb.width - mb.width)).toBeLessThan(1);
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect(page.getByTestId('next-word')).toBeInViewport();

  // 중단 후 이어하기: 3번째 단어에서 나갔다가 메인 '이어서 학습하기'
  await page.getByTestId('next-word').click(); await page.getByTestId('next-word').click();
  await expect(page.getByTestId('study-progress')).toContainText('3 / 5');
  await page.goto('/#/words');
  await expect(page.getByTestId('continue-words')).toContainText('이어서 학습하기');
  await expect(page.getByTestId('continue-words')).toContainText('3/5단어');
  await page.reload(); await dismissModals(page);
  await page.getByTestId('continue-words').click();
  await expect(page.getByTestId('study-progress')).toContainText('3 / 5');
  await page.getByTestId('next-word').click(); await page.getByTestId('next-word').click();
  // 확인 퀴즈 1~2개 → 완료 보상
  await page.getByTestId('start-chapter-quiz').click();
  await runQuiz(page);
  await expect(page.getByTestId('chapter-reward')).toContainText('★ 2');
  await expect(page.getByTestId('session-stars')).toContainText('★ 2');
  await dismissModals(page);
  // 진행률: 주제·난이도·전체 반영 (have=음식+필수, hungry=음식+감정 → 다른 주제 진도도 함께 오름: 기록 통합)
  await page.goto('/#/words');
  await dismissModals(page);
  await expect(page.getByTestId('forest-progress')).toContainText('5 / 300단어');
  await expect(page.getByTestId('topic-food-count')).toHaveText('5/27단어 · 19%');
  await expect(page.getByTestId('topic-food')).toHaveAttribute('data-state', 'progress');
  await expect(page.getByTestId('topic-core-count')).toHaveText('1/49단어 · 2%');
  await expect(page.getByTestId('topic-feelings-count')).toHaveText('1/38단어 · 3%');
  await expect(page.getByTestId('level-pre-a1-count')).toHaveText('5/97단어 · 5%');
  // 같은 챕터 다시 완료해도 보상 중복 없음
  await page.goto('/#/words/ch/food-pre-a1-1');
  await expect(page.getByText('이미 학습한 챕터예요')).toBeVisible();
  // 저장한 단어 · 검색 → 챕터 진입
  await page.goto('/#/words/saved');
  await expect(page.getByTestId('saved-list')).toContainText(word1);
  await page.goto('/#/words/search?q=사과');
  await expect(page.getByTestId('word-row-apple')).toBeVisible();
  await page.getByTestId('word-row-apple').getByText('이 단어가 있는 챕터 학습하기').click();
  await expect(page.getByTestId('word-en')).toHaveText('apple');
  // 복습 등록 · 퀘스트 연동 · 새로고침 후 유지
  await page.goto('/#/quests'); await dismissModals(page);
  await expect(page.getByTestId('quest-d-words')).toContainText('5/10');
  await page.reload(); await dismissModals(page);
  await page.goto('/#/words'); await dismissModals(page);
  await expect(page.getByTestId('forest-progress')).toContainText('5 / 300단어');
  await page.goto('/#/words/saved');
  await expect(page.getByTestId('saved-list')).toContainText(word1);
  await page.goto('/#/home'); await dismissModals(page);
  await expect(page.getByTestId('due-count')).not.toHaveText('0개'); // 학습 단어가 복습 일정에 등록
  // 준비 중 난이도 직접 진입해도 학습 불가
  await page.goto('/#/words/level/b1');
  await expect(page.getByText('준비 중인 난이도예요')).toBeVisible();
  // 기존 문법 단원 단어장(보조 메뉴)
  await page.goto('/#/words/grammar');
  await expect(page.getByText('인칭대명사 단어')).toBeVisible();
  expect(errors).toEqual([]);
});
