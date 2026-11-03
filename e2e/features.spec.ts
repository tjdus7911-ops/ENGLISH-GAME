import { test, expect } from '@playwright/test';
import { runQuiz, MOCK_STT, dismissModals } from './helpers';
import { quickStart } from './setup';

test.describe('말하기 예외 처리', () => {
  test('마이크 권한 거부 → 안내 메시지, 앱 정상', async ({ page }) => {
    await page.addInitScript(`navigator.mediaDevices.getUserMedia = () => Promise.reject(new DOMException('denied', 'NotAllowedError'));`);
    await quickStart(page);
    await page.goto('/#/speaking/a1-u01');
    await page.getByTestId('rec-start').click();
    await page.getByTestId('consent-agree').click();
    await page.getByTestId('rec-start').click();
    await expect(page.getByTestId('mic-error')).toContainText('마이크 권한이 거부');
  });
  test('동의 없이 녹음 시작 불가 (동의 모달)', async ({ page }) => {
    await quickStart(page);
    await page.goto('/#/speaking/a1-u02');
    await page.getByTestId('rec-start').click();
    await expect(page.getByRole('dialog', { name: '녹음 동의' })).toBeVisible();
    await page.getByRole('button', { name: '동의하지 않음' }).click();
    await expect(page.getByTestId('rec-stop')).toHaveCount(0);
  });
  test('음성 인식 미지원 → 대체 안내 + 녹음 후 스스로 비교 모드', async ({ page }) => {
    await page.addInitScript(`delete window.SpeechRecognition; delete window.webkitSpeechRecognition; Object.defineProperty(window, 'webkitSpeechRecognition', { value: undefined });`);
    await quickStart(page);
    await page.goto('/#/speaking/a1-u03');
    await expect(page.getByTestId('speech-support-notice')).toContainText('음성 인식(STT): ❌');
    await page.getByTestId('rec-start').click();
    await page.getByTestId('consent-agree').click();
    await page.getByTestId('rec-start').click();
    await page.getByTestId('rec-stop').click();
    await expect(page.getByTestId('speak-result')).toContainText('스스로 확인 모드');
    await expect(page.getByLabel('내 녹음 듣기')).toBeVisible(); // 실제 녹음 재생 (가짜 마이크)
  });
});

test('듣기: 재생·일시정지·속도·스크립트 숨김 + 실제 음성 로드', async ({ page }) => {
  await quickStart(page);
  await page.goto('/#/listening/dlg-05');
  await expect(page.getByTestId('script')).not.toContainText('latte');
  await page.getByRole('button', { name: '0.75x' }).click();
  await page.getByTestId('play-all').click();
  await expect(page.getByTestId('pause')).toBeVisible({ timeout: 8000 }); // 재생 상태
  await page.getByTestId('pause').click();
  await expect(page.getByRole('button', { name: '이어서 재생' })).toBeVisible();
  const r = await page.request.get('/audio/dialogue-dlg-05.mp3');
  expect(r.status()).toBe(200);
  expect(Number(r.headers()['content-length'] ?? (await r.body()).length)).toBeGreaterThan(10000);
  await page.getByTestId('toggle-script').click();
  await expect(page.getByTestId('script')).toContainText('A latte, please.');
});

test('표현 학습관: 검색·레벨 필터·상세·저장·학습 완료·복습 등록', async ({ page }) => {
  await page.addInitScript(MOCK_STT);
  await quickStart(page);
  await page.goto('/#/expressions');
  for (const c of ['essential', 'travel', 'business', 'phrasal', 'situation', 'video']) await expect(page.getByTestId(`cat-${c}`)).toBeVisible();
  await page.getByLabel('상황별 검색').fill('호텔');
  await expect(page.getByTestId('expr-row').first()).toBeVisible();
  await page.getByLabel('상황별 검색').fill('');
  await page.getByTestId('cat-travel').click();
  await page.getByRole('button', { name: 'B1' }).click();
  await expect(page.getByTestId('expr-row')).toHaveCount(0);
  await page.getByRole('button', { name: '전체' }).click();
  await expect(page.getByTestId('expr-row')).toHaveCount(30);
  await page.getByTestId('expr-row').first().click();
  await page.getByTestId('save-expr').click();
  await page.getByTestId('expr-quiz').click();
  await runQuiz(page);
  await expect(page.getByText('학습 결과')).toBeVisible();
  await page.goto('/#/expressions/saved');
  await expect(page.getByTestId('expr-row')).toHaveCount(1);
  await expect(page.getByTestId('expr-row')).toContainText('완료');
  await page.goto('/#/quests');
  await dismissModals(page);
  await expect(page.getByTestId('quest-d-expression')).toHaveAttribute('data-status', 'completed');
  await page.goto('/#/review');
  await expect(page.getByTestId('review-total')).toBeVisible();
});

test('영상 영어: 재생·자막 표시/숨김·구간 반복·이해도 문제·권리 기록', async ({ page }) => {
  await quickStart(page);
  await page.goto('/#/expressions/c/video');
  await expect(page.getByTestId('drama-drama-01')).toContainText('초');
  await page.getByTestId('drama-drama-01').click();
  await expect(page.getByTestId('rights')).toContainText('제3자 영상·클립 사용: 없음');
  await page.getByTestId('video-play').click();
  await page.waitForFunction(() => { const v = document.querySelector('video'); return !!v && v.currentTime > 3.2; }, null, { timeout: 15000 });
  await expect(page.getByTestId('subtitle')).toBeVisible();
  await page.getByRole('button', { name: 'EN 자막' }).click();
  await page.getByRole('button', { name: '한국어' }).click();
  await expect(page.getByTestId('subtitle')).not.toContainText('Are you new');
  await page.getByRole('button', { name: '이 구간 반복' }).first().click();
  await expect(page.getByText('구간 반복 중')).toBeVisible();
  // 영상 영역과 컨트롤 비겹침
  const vb = (await page.getByTestId('video').boundingBox())!;
  const cb = (await page.getByTestId('video-controls').boundingBox())!;
  expect(cb.y).toBeGreaterThanOrEqual(vb.y + vb.height - 1);
  await page.getByTestId('video-quiz').click();
  await runQuiz(page);
  await expect(page.getByText('drama').or(page.getByText('첫 출근 결과'))).toBeVisible();
});

test('설정: 애니메이션 최소화·데이터 초기화 확인', async ({ page }) => {
  await quickStart(page);
  await page.goto('/#/my');
  await page.getByLabel('애니메이션 최소화').check();
  await expect(page.locator('html')).toHaveClass(/reduce-motion/);
  await page.getByRole('button', { name: '모든 학습 데이터 초기화' }).click();
  await page.getByRole('button', { name: '취소' }).click();
  await expect(page).toHaveURL(/#\/my/);
});
