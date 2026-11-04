import { test, expect, type Page } from '@playwright/test';
import { quickStart } from './setup';
import { dismissModals, runQuiz } from './helpers';

const stars = async (page: Page) => Number((await page.getByTestId('star-balance').innerText()).replace(/\D/g, ''));
async function openInv(page: Page, itemId: string) {
  await page.goto('/#/inventory'); await dismissModals(page);
  await page.getByTestId(`inv-${itemId}`).click();
  await expect(page.getByTestId('inv-sheet')).toBeVisible();
}

test('보관함 → 고정 슬롯 배치: 빈 슬롯 · 호환 불가 · 교체 · 취소 · 해제 · 중복 방지 · 새로고침 유지', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', (e) => errors.push(e.message));
  await quickStart(page);
  // 준비: 단어 챕터 1개 → 업적 '첫 영어 학습'(새싹 화분 + ★10) → 작은 화분 구매(★10)
  await page.goto('/#/words/ch/food-pre-a1-1');
  for (let i = 0; i < 4; i++) await page.getByTestId('next-word').click();
  await page.getByTestId('start-chapter-quiz').click();
  await runQuiz(page);
  await page.goto('/#/quests'); await dismissModals(page);
  await page.getByTestId('qtab-achievement').click();
  await page.getByTestId('claim-a-first-study').click(); await page.getByRole('button', { name: '확인' }).click();
  await page.goto('/#/shop'); await dismissModals(page);
  await page.getByTestId('buy-plant-small').click(); await page.getByTestId('buy-confirm').click();
  await page.goto('/#/house'); await dismissModals(page);
  const s0 = await stars(page);

  // 1) 보관함에서 선택 → 빈 슬롯 배치
  await openInv(page, 'plant-small');
  await expect(page.getByTestId('inv-status')).toContainText('보관 중');
  await page.getByTestId('inv-place').click();
  await expect(page).toHaveURL(/#\/house$/); // 적용 후 주소 파라미터 제거
  await dismissModals(page);
  await expect(page.getByTestId('pick-banner')).toContainText('가능한 자리 1곳');
  await expect(page.getByTestId('slot-plant')).toHaveAttribute('data-state', 'active');
  // 2) 호환되지 않는 슬롯은 선택 불가
  for (const sl of ['bed', 'sofa', 'desk', 'wallpaper']) { await expect(page.getByTestId(`slot-${sl}`)).toBeDisabled(); await expect(page.getByTestId(`slot-${sl}`)).toHaveAttribute('data-state', 'disabled'); }
  await page.getByTestId('slot-plant').click();
  await expect(page.getByTestId('placed-plant')).toHaveAttribute('data-item', 'plant-small'); // 미리보기
  await expect(page.getByTestId('pick-banner')).toHaveCount(0);
  await page.getByTestId('decor-confirm').click();
  await expect(page.getByTestId('decor-msg')).toContainText('저장했어요');
  expect(await stars(page)).toBe(s0); // 별 차감 없음

  // 3) 다른 가구 선택 → 기존 가구 교체 (미리보기 + 안내 후 확정, 기존 가구는 보관함으로)
  await openInv(page, 'plant-sprout');
  await page.getByTestId('inv-place').click(); await dismissModals(page);
  await expect(page.getByTestId('slot-plant')).toHaveText(/⇄/); // 점유된 호환 슬롯 = 교체 표시
  await page.getByTestId('slot-plant').click();
  await expect(page.getByTestId('placed-plant')).toHaveAttribute('data-item', 'plant-sprout');
  await expect(page.getByTestId('replace-notice')).toContainText("화분 자리의 '작은 화분'");
  await page.getByTestId('decor-confirm').click();
  await openInv(page, 'plant-small');
  await expect(page.getByTestId('inv-status')).toContainText('보관 중'); // 교체된 가구는 보관함
  await page.getByRole('button', { name: '닫기' }).click();
  await expect(page.getByTestId('inv-plant-sprout')).toHaveAttribute('data-placed', 'house:plant');
  await expect(page.getByTestId('inv-plant-sprout')).toContainText('배치 중');

  // 4) 배치 중 취소 → 기존 상태 유지
  await page.getByTestId('inv-plant-small').click();
  await page.getByTestId('inv-place').click(); await dismissModals(page);
  await page.getByTestId('slot-plant').click();
  await expect(page.getByTestId('placed-plant')).toHaveAttribute('data-item', 'plant-small');
  await page.getByTestId('decor-cancel').click();
  await expect(page.getByTestId('placed-plant')).toHaveAttribute('data-item', 'plant-sprout');
  // 선택 자체 취소도 가능
  await page.goto('/#/house?pick=plant-small'); await dismissModals(page);
  await page.getByTestId('pick-cancel').click();
  await expect(page.getByTestId('slot-bed')).toBeEnabled();

  // 7) 새로고침 후 유지
  await page.goto('/#/house'); await page.reload(); await dismissModals(page);
  await expect(page.getByTestId('placed-plant')).toHaveAttribute('data-item', 'plant-sprout');

  // '이 자리로 이동' → 해당 슬롯 선택 창
  await openInv(page, 'plant-sprout');
  await expect(page.getByTestId('inv-status')).toContainText('배치 중 — 화분 자리');
  await page.getByTestId('inv-goto').click(); await dismissModals(page);
  await expect(page.getByTestId('slot-options')).toBeVisible();
  await page.getByRole('button', { name: '닫기' }).click();

  // 6) 동일 가구 중복 배치 방지: 이미 놓인 가구를 고르면 그 자리 외엔 놓을 곳이 없고, 같은 자리는 '이미 있음'
  await openInv(page, 'bed-old');
  await expect(page.getByTestId('inv-move')).toHaveCount(0); // 호환 슬롯 1개뿐 → 옮길 곳 없음
  await page.goto('/#/house?pick=bed-old'); await dismissModals(page);
  await page.getByTestId('slot-bed').click();
  await expect(page.getByTestId('decor-msg')).toContainText('이미 침대 자리에 있어요');
  await expect(page.getByTestId('decor-actions')).toHaveCount(0); // 바뀐 것 없음

  // 5) 배치 해제 → 보관함 복귀 (삭제되지 않음) → 다시 배치 가능
  await openInv(page, 'plant-sprout');
  await page.getByTestId('inv-unplace').click();
  await expect(page.getByTestId('inv-msg')).toContainText('배치 해제');
  await expect(page.getByTestId('inv-plant-sprout')).toHaveAttribute('data-placed', '');
  await expect(page.getByTestId('inv-plant-sprout')).toContainText('보관');
  await page.reload(); await dismissModals(page);
  await expect(page.getByTestId('inv-plant-sprout')).toHaveAttribute('data-placed', '');
  await page.goto('/#/house'); await dismissModals(page);
  await expect(page.getByTestId('placed-plant')).toHaveCount(0);
  await openInv(page, 'plant-sprout');
  await page.getByTestId('inv-place').click(); await dismissModals(page);
  await page.getByTestId('slot-plant').click(); await page.getByTestId('decor-confirm').click();
  await page.reload(); await dismissModals(page);
  await expect(page.getByTestId('placed-plant')).toHaveAttribute('data-item', 'plant-sprout');
  expect(await stars(page)).toBe(s0); // 모든 배치·교체·해제 동안 별 그대로
  // 직접 링크/새로고침으로 진입(저장 데이터 복원 전 렌더)해도 선택 모드가 적용됨
  await page.goto('/?cold=1#/house?pick=plant-small'); // 쿼리가 달라 전체 새로 로드
  await dismissModals(page);
  await expect(page.getByTestId('pick-banner')).toContainText('작은 화분');
  await expect(page.getByTestId('slot-plant')).toHaveAttribute('data-state', 'active');
  expect(errors).toEqual([]);
});
