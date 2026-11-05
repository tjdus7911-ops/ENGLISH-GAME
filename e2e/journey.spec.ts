import { test, expect } from '@playwright/test';
import { answerCurrent, dismissModals, runQuiz, MOCK_STT } from './helpers';
import { VILLAGE, pointInPolygon } from '../src/game/layout';

test.use({ timezoneId: 'Asia/Seoul', locale: 'ko-KR' });

const DAY0 = new Date('2026-11-03T09:00:00+09:00');
const DAY1 = new Date('2026-11-04T08:30:00+09:00');

async function nextStep(page: import('@playwright/test').Page) {
  await page.getByRole('button', { name: '다음 단계로' }).click();
  await expect(page).toHaveURL(/#\/today/);
}

test('시나리오 A~D: 첫 학습 → 캐릭터 획득 → 다음 날 복습·성장 → 파트너 변경 → 마을', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/favicon|Failed to load resource/.test(m.text())) errors.push(m.text()); });
  await page.addInitScript(MOCK_STT);
  await page.clock.install({ time: DAY0 });

  // ── A. 신규 사용자 첫 학습 ──
  await page.goto('/#/home');
  await dismissModals(page);
  await expect(page).toHaveURL(/onboarding/);
  await page.getByRole('button', { name: '일상 회화' }).click();
  await page.getByRole('button', { name: '다음' }).click();
  await page.getByTestId('min-20').click();
  await page.getByRole('button', { name: '레벨 진단 시작' }).click();
  await page.getByTestId('lt-start').click();
  // 적응형 테스트: A1·A2 문항만 맞히는 학습자 → A2 로 추정
  for (let i = 0; i < 24; i++) {
    const lv = await page.getByTestId('lt-item').getAttribute('data-level');
    await answerCurrent(page, lv === 'A1' || lv === 'A2');
    await page.getByTestId('lt-next').click();
  }
  await expect(page.getByTestId('level-result')).toHaveText('A2');
  await page.getByRole('button', { name: '마을로 가기' }).click();
  await expect(page.getByTestId('story-modal')).toHaveAttribute('data-story', 'first-enter');
  await page.getByTestId('story-next').click();
  await dismissModals(page); // 스토리 건너뛰기

  await expect(page.getByTestId('village')).toBeVisible();
  for (const b of ['home', 'library', 'forest', 'exam']) await expect(page.getByTestId(`bld-${b}`)).toBeVisible();
  await expect(page.getByTestId('guide')).toBeVisible(); // 파트너 없음 → 기본 안내 캐릭터
  await expect(page.getByText('숲지기 등불').first()).toBeVisible();

  await page.getByTestId('btn-continue').click();
  await expect(page).toHaveURL(/#\/today/);
  // 1) 영단어
  await page.getByTestId('step-words').click();
  await expect(page.getByTestId('word-card')).toBeVisible();
  await page.getByRole('button', { name: /단어 발음 듣기/ }).click(); // 발음 듣기
  await page.getByTestId('reveal-meaning').click(); // 하단 해석 카드 공개 후 예문 듣기
  await page.getByRole('button', { name: /예문 듣기/ }).first().click();
  for (let i = 0; i < 9; i++) await page.getByRole('button', { name: '다음 단어' }).click();
  await page.getByTestId('start-word-quiz').click();
  await runQuiz(page, (i) => i !== 3); // 1개 오답 → 오답노트
  await expect(page.getByText('오답 해설 (1)')).toBeVisible();
  await dismissModals(page);
  await nextStep(page);

  // 첫 영단어 10개 → 발견 이벤트 → 퀴즈 3문제 중 2개 정답 → 획득
  await page.goto('/#/home');
  await dismissModals(page);
  await page.getByTestId('go-discover').click();
  await page.getByTestId('start-discover').click();
  await runQuiz(page, (i) => i !== 0);
  await expect(page.getByTestId('discover-result')).toContainText('만났어요');
  await expect(page.getByTestId('acquire-modal')).toBeVisible();
  await dismissModals(page);
  await page.goto('/#/collection');
  await dismissModals(page);
  await expect(page.locator('[data-owned="true"]')).toHaveCount(1);
  const firstId = (await page.locator('[data-owned="true"]').getAttribute('data-testid'))!.replace('col-', '');
  expect(firstId).toBe('mossy');
  await page.goto('/#/home');
  await dismissModals(page);
  await expect(page.getByTestId(`walker-${firstId}`)).toContainText('파트너'); // 첫 캐릭터 자동 파트너

  // 2) 문법 강의 + 3) 확인 문제
  await page.goto('/#/today');
  await page.getByTestId('step-grammar').click();
  await page.getByRole('tab', { name: '자세히 설명하기' }).click();
  await page.getByRole('button', { name: '예문 더 보기' }).click();
  await page.getByTestId('help-btn').click();
  await expect(page.getByRole('dialog', { name: '추가 설명' })).toBeVisible();
  await page.getByRole('button', { name: '닫기' }).click();
  await page.getByTestId('lecture-done').click();
  await runQuiz(page);
  await nextStep(page);
  await expect(page.getByTestId('step-practice')).toContainText('✓');

  // 4) 대화 듣기
  await page.goto('/#/today');
  await page.getByTestId('step-listening').click();
  await page.getByTestId('play-all').click();
  await page.getByTestId('toggle-script').click();
  await expect(page.getByTestId('script')).toContainText('My name is Leo.');
  await page.getByTestId('start-listening-quiz').click();
  await runQuiz(page); // 이해도 3
  await runQuiz(page, (i) => i !== 1); // 받아쓰기 2 (1개 오답)
  await expect(page.getByRole('button', { name: '다시 듣기' })).toBeVisible(); // 재청취 추천
  await nextStep(page);
  // 5) 따라 말하기 (모의 STT + 가짜 마이크)
  await page.getByTestId('step-speaking').click();
  const transcripts = ['my name is mina', 'nice to meet', 'she is my best friend'];
  for (let k = 0; k < 3; k++) {
    await page.evaluate((t) => { (window as unknown as { __mockTranscript: string }).__mockTranscript = t; }, transcripts[k]);
    await page.getByTestId('rec-start').click();
    if (k === 0) { await page.getByTestId('consent-agree').click(); await page.getByTestId('rec-start').click(); }
    await page.getByTestId('rec-stop').click();
    await expect(page.getByTestId('speak-result')).toBeVisible();
    await expect(page.getByTestId('recognized')).toContainText(transcripts[k]);
    if (k === 1) {
      await expect(page.getByTestId('diff')).toContainText('you'); // 누락 단어 표시
      await expect(page.getByTestId('speak-result')).toContainText('누락 1');
      await expect(page.getByTestId('speak-result')).toContainText('발음 정확도 점수가 아닙니다');
      await page.getByTestId('retry').click(); // 다시 말하기
      await page.getByTestId('rec-stop').click();
      await expect(page.getByTestId('speak-result')).toBeVisible();
    }
    await page.getByTestId('speak-next').click();
  }
  await expect(page.getByText('재연습으로 등록')).toBeVisible();
  await nextStep(page);
  // 6) 영작 7) 종합 테스트
  await page.getByTestId('step-writing').click();
  await runQuiz(page);
  await nextStep(page);
  await page.getByTestId('step-test').click();
  await runQuiz(page);
  await expect(page.getByText('통과 🎉')).toBeVisible();
  await expect(page.getByTestId('acquire-modal')).toContainText('희귀 캐릭터 획득');
  await dismissModals(page);

  // 퀘스트 보상 수령 → 별
  await page.goto('/#/quests');
  await dismissModals(page);
  for (const q of ['d-words', 'd-grammar', 'd-listening']) {
    await expect(page.getByTestId(`quest-${q}`)).toHaveAttribute('data-status', 'completed');
    await page.getByTestId(`claim-${q}`).click();
    await expect(page.getByTestId('quest-reward')).toBeVisible();
    await page.getByRole('button', { name: '확인' }).click();
    await expect(page.getByTestId(`quest-${q}`)).toHaveAttribute('data-status', 'claimed');
  }
  await expect(page.getByTestId('quest-d-speaking')).toHaveAttribute('data-status', 'in_progress');
  await page.getByTestId('qtab-achievement').click();
  for (const q of ['a-first-study', 'a-first-test', 'a-first-char']) { await page.getByTestId(`claim-${q}`).click(); await page.getByRole('button', { name: '확인' }).click(); }
  await dismissModals(page);
  const stars = Number((await page.getByTestId('star-balance').innerText()).replace(/\D/g, ''));
  expect(stars).toBe(10 + 15 + 10 + 10 + 20 + 15 + 10); // 퀘스트 6개 + 단원 평가 별 10

  // 집 꾸미기: 구매 → 슬롯 배치 미리보기 → 취소 → 다시 배치 → 확정
  await page.goto('/#/house');
  await dismissModals(page);
  await expect(page.getByTestId('house-level')).toContainText('Lv.1');
  await page.getByTestId('go-shop').click();
  await page.getByTestId('buy-sofa-pink').click();
  await page.getByTestId('buy-confirm').click();
  await dismissModals(page);
  await expect(page.getByTestId('shop-sofa-pink')).toContainText('보유 중');
  await expect(page.getByTestId('star-balance')).toContainText(String(stars - 50));
  await page.goto('/#/house');
  await dismissModals(page);
  await expect(page.getByTestId('slot-sofa')).toHaveCount(0); // 감상 모드: 슬롯 숨김
  await page.getByTestId('decor-toggle').click();
  await page.getByTestId('slot-sofa').click();
  await page.getByTestId('opt-sofa-pink').click();
  await expect(page.getByTestId('placed-sofa')).toHaveAttribute('data-item', 'sofa-pink');
  await page.getByTestId('decor-cancel').click();
  await expect(page.getByTestId('placed-sofa')).toHaveCount(0);
  await page.getByTestId('slot-sofa').click();
  await page.getByTestId('opt-sofa-pink').click();
  await page.getByTestId('decor-confirm').click();
  await dismissModals(page);
  await page.getByTestId('slot-plant').click();
  await page.getByTestId('opt-plant-sprout').click(); // 업적 보상 아이템
  await page.getByTestId('decor-confirm').click();
  await dismissModals(page);
  await page.reload();
  await dismissModals(page);
  await expect(page.getByTestId('placed-sofa')).toHaveAttribute('data-item', 'sofa-pink');
  await expect(page.getByTestId('placed-plant')).toHaveAttribute('data-item', 'plant-sprout');
  await page.goto('/#/garden');
  await expect(page.getByTestId('garden-locked')).toBeVisible();
  await expect(page.getByText('집 꾸미기 3회 이상')).toBeVisible();

  // 당일 복습
  await page.goto('/#/home');
  await dismissModals(page);
  const due0 = Number((await page.getByTestId('due-count').innerText()).replace(/\D/g, ''));
  expect(due0).toBeGreaterThan(10);
  await page.getByTestId('btn-review').click();
  while (await page.getByTestId('start-review').isVisible().catch(() => false)) {
    await page.getByTestId('start-review').click();
    await runQuiz(page);
    const more = page.getByRole('button', { name: /남은 복습/ });
    if (await more.isVisible().catch(() => false)) { await more.click(); await runQuiz(page); }
    break;
  }
  await expect(page.getByTestId('go-new-study')).toBeVisible();
  await dismissModals(page);
  await page.goto('/#/home');
  await dismissModals(page);
  await expect(page.getByTestId('due-count')).toHaveText('0개');
  await page.goto('/#/quests');
  await dismissModals(page);
  await page.getByTestId('claim-d-review').click();
  await page.getByRole('button', { name: '확인' }).click();
  await page.goto('/#/home');
  await dismissModals(page);

  // 앱 재실행 후 유지
  const decoBefore = await page.getByTestId('village').getAttribute('data-decorations');
  await page.reload();
  await dismissModals(page);
  await expect(page.getByTestId('village')).toHaveAttribute('data-decorations', decoBefore!);
  expect(Number(decoBefore)).toBeGreaterThanOrEqual(3);
  await page.goto('/#/history');
  await expect(page.getByTestId('log-row').first()).toBeVisible();

  // ── B. 다음 날 복습 ──
  await page.clock.setSystemTime(DAY1);
  await page.goto('/#/home');
  await dismissModals(page);
  await page.reload();
  const due1 = Number((await page.getByTestId('due-count').innerText()).replace(/\D/g, ''));
  expect(due1).toBeGreaterThan(0);
  await expect(page.getByTestId('in-app-notice')).toContainText(`${due1}개`);
  await dismissModals(page);
  await expect(page.getByTestId('quest-d-review').or(page.getByTestId('btn-review'))).toBeVisible();
  await page.getByTestId('btn-review').click();
  await expect(page.getByTestId('review-total')).toHaveText(`${due1}개`);
  await page.getByTestId('start-review').click();
  await runQuiz(page);
  for (let g = 0; g < 3; g++) {
    const more = page.getByRole('button', { name: /남은 복습/ });
    if (!(await more.isVisible().catch(() => false))) break;
    await more.click(); await runQuiz(page);
  }
  await expect(page.getByTestId('workload-advice')).toBeVisible();
  await expect(page.getByTestId('levelup-modal')).toBeVisible(); // 서로 다른 2일 복습 + XP 60 이상 → 진화
  await dismissModals(page);
  await page.goto('/#/inventory');
  await expect(page.getByTestId('inv-sp-mossy')).toBeVisible(); // 진화 특별 가구
  await page.goto('/#/review');
  await page.getByTestId('start-review').isVisible().catch(() => false);
  await page.goto('/#/my');
  await page.getByLabel('하루 신규 단어').selectOption('12');
  await page.goto('/#/today');
  await expect(page.getByTestId('step-review')).toContainText('완료');

  // ── C. 도감 · 성장 · 파트너 변경 ──
  await page.goto('/#/collection');
  await dismissModals(page);
  await expect(page.locator('[data-owned="true"]')).toHaveCount(2);
  await expect(page.getByTestId(`col-${firstId}`)).toContainText('Lv.2');
  await expect(page.getByTestId('col-stella')).toContainText('???');
  await page.getByTestId('col-whisk').click();
  await expect(page.getByTestId('growth-panel')).toBeVisible();
  await page.getByTestId('set-partner').click();
  await page.goto('/#/home');
  await dismissModals(page);
  await expect(page.getByTestId('walker-whisk')).toContainText('파트너');
  await page.goto(`/#/collection/${firstId}`);
  await expect(page.getByText('Lv.2').first()).toBeVisible(); // 이전 파트너 성장 유지

  // ── D. 마을 ──
  await page.goto('/#/home');
  await dismissModals(page);
  const routes: [string, RegExp][] = [['library', /#\/grammar$/], ['forest', /#\/words$/], ['exam', /#\/exam$/], ['home', /#\/house$/]];
  for (const [b, re] of routes) {
    await page.getByTestId(`bld-${b}`).click();
    await expect(page).toHaveURL(re);
    await page.goto('/#/home');
    await dismissModals(page);
  await dismissModals(page);
  }
  await page.clock.runFor(6000);
  for (const id of [firstId, 'whisk']) {
    const w = page.getByTestId(`walker-${id}`);
    const x = Number(await w.getAttribute('data-x'));
    const y = Number(await w.getAttribute('data-y'));
    expect(pointInPolygon([x, y], VILLAGE.walkArea), `${id} (${x},${y}) in walk area`).toBe(true);
  }
  await page.getByTestId('walker-whisk').click();
  await expect(page.getByTestId('walker-whisk')).toContainText('궁금한');

  // 오답노트·분석
  await page.goto('/#/wrong-notes');
  await expect(page.getByTestId('wrong-note').first()).toBeVisible();
  await page.goto('/#/analysis');
  await expect(page.getByText('개념별 정답률')).toBeVisible();

  expect(errors, errors.join('\n')).toEqual([]);
});

test('예외: 첫 실행·복습 없음·미보유 파트너 화면', async ({ page }) => {
  await page.goto('/#/onboarding');
  await page.getByRole('button', { name: '여행' }).click();
  await page.getByRole('button', { name: '다음' }).click();
  await page.getByRole('button', { name: '레벨 진단 시작' }).click();
  await page.getByRole('button', { name: '건너뛰고 A1부터 시작' }).click();
  await page.goto('/#/review');
  await expect(page.getByText('오늘 복습할 항목이 없어요')).toBeVisible();
  await page.goto('/#/partner');
  await dismissModals(page);
  await expect(page.getByText('아직 함께 사는 친구가 없어요')).toBeVisible();
  await page.goto('/#/collection/stella');
  await dismissModals(page);
  await expect(page.getByRole('button', { name: '대표 파트너로 지정' })).toHaveCount(0);
  await page.goto('/#/discover');
  await expect(page.getByText('지금은 발견할 수 없어요')).toBeVisible();
  await page.goto('/#/wrong-notes');
  await expect(page.getByText('복습할 오답이 없어요')).toBeVisible();
  // 문제 풀이 중 이탈 후 복귀
  await page.goto('/#/grammar/a1-u01/practice');
  await answerCurrent(page);
  await page.goto('/#/home');
  await dismissModals(page);
  await page.reload();
  await expect(page.getByTestId('village')).toBeVisible();
});
