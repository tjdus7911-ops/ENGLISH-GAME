import { addDays, diffDays, toDateKey } from '@/domain/date';
import { applyReviewResult, countDueByKind, createReviewItem, dueItems, prioritizeDue, INTERVALS } from '@/domain/learning/srs';

describe('날짜 계산', () => {
  it('월/연 경계', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
    expect(diffDays('2026-11-03', '2026-12-03')).toBe(30);
  });
  it('로컬 자정 직전/직후 시각은 서로 다른 날짜 키', () => {
    expect(toDateKey(new Date(2026, 10, 3, 23, 59, 59))).toBe('2026-11-03');
    expect(toDateKey(new Date(2026, 10, 4, 0, 0, 1))).toBe('2026-11-04');
  });
});

describe('복습 일정', () => {
  const today = '2026-11-03';
  it('신규 학습 시 당일 복습 일정 생성, 중복 생성 없음', () => {
    const r1 = createReviewItem({}, 'word', 'w1', 'a1-u01', today);
    expect(r1.created).toBe(true);
    expect(r1.items['word:w1'].due).toBe(today);
    const r2 = createReviewItem(r1.items, 'word', 'w1', 'a1-u01', '2026-11-05');
    expect(r2.created).toBe(false);
    expect(Object.keys(r2.items)).toHaveLength(1);
    expect(r2.items['word:w1'].createdOn).toBe(today);
  });
  it('계속 맞히면 0→1→3→7→14→30일 간격', () => {
    let item = createReviewItem({}, 'word', 'w1', 'c', today).items['word:w1'];
    let day = today;
    const gaps: number[] = [];
    for (let k = 0; k < 6; k++) {
      item = applyReviewResult(item, 1, day);
      gaps.push(diffDays(day, item.due));
      day = item.due;
    }
    expect(gaps).toEqual([1, 3, 7, 14, 30, 30]);
    expect(INTERVALS).toEqual([0, 1, 3, 7, 14, 30]);
  });
  it('오답이면 단계 하락 + 내일 다시, 반복 오답은 어려운 항목', () => {
    let item = createReviewItem({}, 'word', 'w1', 'c', today).items['word:w1'];
    item = applyReviewResult(item, 1, today); // stage1
    item = applyReviewResult(item, 0, '2026-11-04');
    expect(item.stage).toBe(0);
    expect(item.due).toBe('2026-11-05');
    expect(item.difficult).toBe(false);
    item = applyReviewResult(item, 0.2, '2026-11-05');
    expect(item.lapses).toBe(2);
    expect(item.difficult).toBe(true);
  });
  it('보통(50~79%)이면 단계 유지', () => {
    let item = createReviewItem({}, 'word', 'w1', 'c', today).items['word:w1'];
    item = applyReviewResult(item, 1, today);
    item = applyReviewResult(item, 0.6, '2026-11-04');
    expect(item.stage).toBe(1);
    expect(item.due).toBe('2026-11-05');
  });
  it('같은 날 재응시로 단계를 두 번 올릴 수 없음', () => {
    let item = createReviewItem({}, 'word', 'w1', 'c', today).items['word:w1'];
    item = applyReviewResult(item, 1, today);
    const again = applyReviewResult(item, 1, today);
    expect(again.stage).toBe(item.stage);
  });
  it('다음 날 복습 대상 조회 (날짜 변경 시뮬레이션)', () => {
    let items = createReviewItem({}, 'word', 'w1', 'c', today).items;
    items = createReviewItem(items, 'grammar', 'a1-u01', 'a1-u01', today).items;
    // 당일 복습 완료
    for (const k of Object.keys(items)) items[k] = applyReviewResult(items[k], 1, today);
    expect(dueItems(items, today)).toHaveLength(0);
    const tomorrow = addDays(today, 1);
    expect(countDueByKind(items, tomorrow)).toMatchObject({ total: 2, word: 1, grammar: 1 });
  });
  it('장기 미접속: 밀린 항목은 삭제되지 않고 복습 대상으로 남음, 우선순위 분할', () => {
    let items = {} as ReturnType<typeof createReviewItem>['items'];
    for (let i = 0; i < 40; i++) items = createReviewItem(items, 'word', `w${i}`, 'c', today).items;
    const later = addDays(today, 90);
    const due = dueItems(items, later);
    expect(due).toHaveLength(40);
    const batches = prioritizeDue(due, later, 15);
    expect(batches.map((b) => b.length)).toEqual([15, 15, 10]);
  });
  it('어려운 항목이 먼저', () => {
    let items = createReviewItem({}, 'word', 'a', 'c', today).items;
    items = createReviewItem(items, 'word', 'b', 'c', today).items;
    items['word:b'] = { ...items['word:b'], difficult: true };
    expect(prioritizeDue(dueItems(items, today), today)[0][0].refId).toBe('b');
  });
});
