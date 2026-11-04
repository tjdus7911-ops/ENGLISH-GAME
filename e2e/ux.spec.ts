import { test, expect } from '@playwright/test';
import { quickStart } from './setup';
import { answerCurrent, dismissModals, runQuiz } from './helpers';

test('UX: 이어보기 · 나가기 확인 · 결과 보상 카드 · 바로 배치 · 저장하고 끝내기 · 재접속 유지', async ({ page, context }) => {
  await quickStart(page);
  // 1) 단어 카드 위치: 새로고침 후 이어서
  await page.goto('/#/words/a1-u01');
  for (let i = 0; i < 4; i++) await page.getByRole('button', { name: '다음 단어' }).click();
  await expect(page.getByText('5 / 10', { exact: true })).toBeVisible();
  await page.reload();
  await dismissModals(page);
  await expect(page.getByText('5 / 10', { exact: true })).toBeVisible();

  // 2) 퀴즈 중 뒤로가기 → 확인 모달
  for (let i = 0; i < 5; i++) await page.getByRole('button', { name: '다음 단어' }).click();
  await page.getByTestId('start-word-quiz').click();
  await answerCurrent(page, true);
  await page.getByRole('button', { name: '뒤로 가기' }).click();
  await expect(page.getByTestId('leave-confirm')).toBeVisible();
  await page.getByTestId('leave-stay').click();
  await expect(page.getByTestId('question')).toBeVisible(); // 그대로 계속
  await page.getByRole('button', { name: '다음 문제' }).click();
  await runQuiz(page);

  // 3) 결과 화면: 이번 학습 보상 카드 (퀘스트 보상 · 새 친구 발견)
  await dismissModals(page);
  const rewards = page.getByTestId('session-rewards');
  await expect(rewards).toBeVisible();
  await expect(page.getByTestId('reward-claim-link')).toContainText('퀘스트 2개 완료 · 받을 수 있는 별 ★ 20');
  await expect(page.getByTestId('reward-discover-link')).toBeVisible();
  await page.getByTestId('reward-claim-link').click();
  await expect(page).toHaveURL(/#\/quests/);
  await dismissModals(page);
  await page.getByTestId('claim-d-words').click();
  await page.getByRole('button', { name: '확인' }).click();

  // 4) 구매 → 바로 배치하기 → 미리보기 → 저장하고 끝내기
  await page.goto('/#/shop');
  await dismissModals(page);
  await page.getByTestId('buy-plant-small').click();
  await page.getByTestId('buy-confirm').click();
  await page.getByTestId('place-now').click();
  await dismissModals(page);
  await expect(page.getByTestId('placed-plant')).toHaveAttribute('data-item', 'plant-small'); // 미리보기
  await expect(page.getByTestId('slot-plant')).toBeVisible(); // 꾸미기 모드
  // 미저장 상태로 뒤로가기 → 확인
  await page.getByRole('button', { name: '뒤로 가기' }).click();
  await expect(page.getByTestId('leave-confirm')).toContainText('저장하지 않은 배치');
  await page.getByTestId('leave-stay').click();
  await expect(page.getByTestId('decor-toggle')).toHaveText('저장하고 끝내기');
  await page.getByTestId('decor-toggle').click();
  await expect(page.getByTestId('slot-plant')).toHaveCount(0); // 감상 모드
  await page.reload();
  await dismissModals(page);
  await expect(page.getByTestId('placed-plant')).toHaveAttribute('data-item', 'plant-small');

  // 5) 새 탭으로 재접속해도 유지 (IndexedDB)
  const p2 = await context.newPage();
  await p2.goto('/#/house');
  await dismissModals(p2);
  await expect(p2.getByTestId('placed-plant')).toHaveAttribute('data-item', 'plant-small');
  await p2.goto('/#/history');
  await expect(p2.getByTestId('log-row').first()).toBeVisible();
});
