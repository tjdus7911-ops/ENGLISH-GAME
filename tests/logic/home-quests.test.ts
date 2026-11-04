import { buyItem, commitPlacements, placeInDraft, computeHouseLevel, decoratedItemCount, grantItem, isItemUnlocked, spaceConditionsMet, unlockSpace, validatePlacement, SPACES } from '@/domain/game/home';
import { earnStars, initialGameState, starBalance } from '@/domain/game/state';
import { QUESTS, claimKey, questStatus, weekStartOf, type QuestContext } from '@/domain/game/quests';
import { FURNITURE, FURNITURE_BY_ID, DEFAULT_ITEMS, DEFAULT_PLACEMENTS, counts } from '@/content/furniture';
import { initialHomeState, type HomeState } from '@/domain/game/home';

const home0 = (): HomeState => ({ ...initialHomeState(DEFAULT_ITEMS), placements: { house: { ...DEFAULT_PLACEMENTS }, garden: {} } });
const rich = (n = 500) => earnStars(initialGameState(), 'gift', n, 't', 0).state;
const ctx0 = { lecturesCompleted: 0, unitTestsPassed: 0, a1ExamScore: null };

describe('카탈로그 정량 기준', () => {
  it('가구 ≥15, 벽지 3, 바닥 3, 정원 장식 ≥13, 보상 아이템 정의 일치', () => {
    const c = counts();
    expect(c.furniture).toBeGreaterThanOrEqual(15);
    expect(c.wallpaper).toBe(3);
    expect(c.floor).toBe(3);
    expect(c.garden).toBeGreaterThanOrEqual(13);
    expect(new Set(FURNITURE.map((f) => f.itemId)).size).toBe(FURNITURE.length);
    for (const q of QUESTS) for (const id of q.items ?? []) expect(FURNITURE_BY_ID[id], id).toBeDefined();
    const g = FURNITURE.filter((f) => f.space === 'garden');
    const byCat = (c: string) => g.filter((x) => x.category === c).length;
    expect([byCat('flowerbed'), byCat('tree'), byCat('bench'), byCat('fountain'), byCat('gardenlight'), byCat('path')]).toEqual([3, 3, 2, 1, 2, 2]);
  });
  it('퀘스트 수: 일일 6 · 주간 3 · 업적 ≥7 · 공간 ≥1', () => {
    const n = (t: string) => QUESTS.filter((q) => q.type === t).length;
    expect([n('daily'), n('weekly')]).toEqual([6, 3]);
    expect(n('achievement')).toBeGreaterThanOrEqual(7);
    expect(n('space')).toBeGreaterThanOrEqual(1);
  });
});

describe('가구 구매·배치', () => {
  it('별로 구매, 잔액 부족·미해금·보상 전용·중복 구매 불가', () => {
    const h = home0();
    const sofa = FURNITURE_BY_ID['sofa-pink'];
    expect(buyItem(initialGameState(), h, sofa, 0)).toMatchObject({ ok: false, error: 'insufficient' });
    const r = buyItem(rich(60), h, sofa, 1);
    expect(r.ok).toBe(true);
    expect(starBalance(r.game)).toBe(10);
    expect(r.home.inventory['sofa-pink'].source).toBe('purchase');
    expect(buyItem(r.game, r.home, sofa, 2)).toMatchObject({ ok: false, error: 'owned' });
    expect(buyItem(rich(), h, FURNITURE_BY_ID['bed-flower'], 0)).toMatchObject({ ok: false, error: 'locked' }); // 집 Lv.2 필요
    expect(buyItem(rich(), h, FURNITURE_BY_ID['lamp-star'], 0)).toMatchObject({ ok: false, error: 'not-for-sale' });
    expect(buyItem(rich(), h, FURNITURE_BY_ID['g-fountain'], 0)).toMatchObject({ ok: false, error: 'locked' }); // 정원 미개방
  });
  it('미보유 아이템 배치 0건, 슬롯 종류 검증, 미리보기 확정 시에만 저장, 교체 시 보관함 유지', () => {
    let h = home0();
    expect(validatePlacement(h, FURNITURE_BY_ID, 'house', 'sofa', 'sofa-pink')).toBe('not-owned');
    h = buyItem(rich(), h, FURNITURE_BY_ID['sofa-pink'], 0).home;
    expect(validatePlacement(h, FURNITURE_BY_ID, 'house', 'bed', 'sofa-pink')).toBe('wrong-slot');
    expect(validatePlacement(h, FURNITURE_BY_ID, 'house', 'wallpaper', null)).toBe('wrong-slot');
    expect(commitPlacements(h, FURNITURE_BY_ID, 'house', { bed: 'sofa-pink' }).ok).toBe(false);
    const c = commitPlacements(h, FURNITURE_BY_ID, 'house', { sofa: 'sofa-pink' });
    expect(c).toMatchObject({ ok: true, changed: true });
    expect(c.home.decorateCount).toBe(1);
    expect(commitPlacements(c.home, FURNITURE_BY_ID, 'house', { sofa: 'sofa-pink' }).changed).toBe(false); // 변화 없으면 횟수 그대로
    const removed = commitPlacements(c.home, FURNITURE_BY_ID, 'house', { sofa: null });
    expect(removed.home.placements.house.sofa).toBeNull();
    expect(removed.home.inventory['sofa-pink']).toBeDefined(); // 제거해도 보관함 유지
  });
  it('보관함 배치: 같은 가구 중복 배치 금지, 이동 시 원래 자리 비움, 교체된 가구는 보관함 유지, 오류 시 기존 배치 유지', () => {
    let h = { ...home0(), spaces: { garden: { unlockedAt: 1 } } } as ReturnType<typeof home0>;
    for (const id of ['g-bed-daisy', 'g-bed-lavender', 'plant-small', 'plant-monstera']) h = buyItem(rich(), h, FURNITURE_BY_ID[id], 0).home;
    h = commitPlacements(h, FURNITURE_BY_ID, 'garden', { bed1: 'g-bed-daisy' }).home;
    // 같은 꽃밭을 두 자리에 → 거부, 기존 그대로
    const dup = commitPlacements(h, FURNITURE_BY_ID, 'garden', { bed2: 'g-bed-daisy' });
    expect(dup).toMatchObject({ ok: false, error: 'duplicate' });
    expect(dup.home).toBe(h);
    // placeInDraft: 다른 자리로 옮기면 원래 자리는 비워짐 → 저장 가능
    const move = placeInDraft(h.placements.garden, {}, 'bed2', 'g-bed-daisy');
    expect(move).toEqual({ bed2: 'g-bed-daisy', bed1: null });
    const moved = commitPlacements(h, FURNITURE_BY_ID, 'garden', move).home;
    expect(moved.placements.garden).toMatchObject({ bed1: null, bed2: 'g-bed-daisy' });
    // 교체: 화분 자리의 기존 가구는 보관함에 남음
    let hh = commitPlacements(h, FURNITURE_BY_ID, 'house', { plant: 'plant-small' }).home;
    hh = commitPlacements(hh, FURNITURE_BY_ID, 'house', placeInDraft(hh.placements.house, {}, 'plant', 'plant-monstera')).home;
    expect(hh.placements.house.plant).toBe('plant-monstera');
    expect(hh.inventory['plant-small']).toBeDefined();
    // 호환되지 않는 슬롯 → 거부, 기존 유지
    expect(commitPlacements(hh, FURNITURE_BY_ID, 'house', { bed: 'plant-small' })).toMatchObject({ ok: false, error: 'wrong-slot' });
  });
  it('집 Lv.2 = 새 가구 3개 배치 + 문법 2단원, 내려가지 않음', () => {
    let h = home0();
    for (const id of ['sofa-pink', 'lamp-stand', 'rug-round']) h = buyItem(rich(), h, FURNITURE_BY_ID[id], 0).home;
    h = commitPlacements(h, FURNITURE_BY_ID, 'house', { sofa: 'sofa-pink', lamp: 'lamp-stand', rug: 'rug-round' }).home;
    expect(decoratedItemCount(h)).toBe(3);
    expect(computeHouseLevel(h, { ...ctx0, lecturesCompleted: 1 })).toBe(1);
    expect(computeHouseLevel(h, { ...ctx0, lecturesCompleted: 2 })).toBe(2);
    h = { ...h, houseLevel: 2 };
    expect(isItemUnlocked(FURNITURE_BY_ID['bed-flower'], h)).toBe(true);
    const cleared = commitPlacements(h, FURNITURE_BY_ID, 'house', { sofa: null, lamp: null, rug: null }).home;
    expect(computeHouseLevel(cleared, { ...ctx0, lecturesCompleted: 2 })).toBe(2);
  });
});

describe('비밀 정원 해금', () => {
  it('문법 3단원 + 꾸미기 3회 + 집 Lv.2 모두 충족해야 개방, 개방 후 다시 잠기지 않음', () => {
    let h: HomeState = { ...home0(), decorateCount: 3, houseLevel: 2 };
    expect(spaceConditionsMet('garden', h, { ...ctx0, lecturesCompleted: 2 })).toBe(false);
    expect(unlockSpace(h, 'garden', { ...ctx0, lecturesCompleted: 2 }, 0).ok).toBe(false);
    expect(unlockSpace({ ...h, decorateCount: 2 }, 'garden', { ...ctx0, lecturesCompleted: 3 }, 0).ok).toBe(false);
    const u = unlockSpace(h, 'garden', { ...ctx0, lecturesCompleted: 3 }, 5);
    expect(u.ok).toBe(true);
    h = u.home;
    expect(spaceConditionsMet('garden', { ...h, decorateCount: 0 }, ctx0)).toBe(false);
    expect(h.spaces.garden).toBeDefined(); // 조건이 바뀌어도 유지
    expect(unlockSpace(h, 'garden', ctx0, 9).ok).toBe(false); // 중복 개방 없음
    expect(unlockSpace(h, 'greenhouse', { lecturesCompleted: 10, unitTestsPassed: 10, a1ExamScore: 100 }, 0).ok).toBe(false); // 미구현 공간
    // 정원 꾸미기
    h = grantItem(h, 'g-bed-tulip', 1).home;
    const c = commitPlacements(h, FURNITURE_BY_ID, 'garden', { bed1: 'g-bed-tulip' });
    expect(c.ok).toBe(true);
    expect(validatePlacement(c.home, FURNITURE_BY_ID, 'garden', 'tree1', 'g-bed-tulip')).toBe('wrong-slot');
    expect(SPACES.filter((s) => !s.implemented).map((s) => s.id)).toEqual(['greenhouse', 'lakeside']);
  });
});

describe('퀘스트 상태·수령', () => {
  const c = (o: Partial<QuestContext['today']> = {}, totals: Partial<QuestContext['totals']> = {}): QuestContext => ({
    date: '2026-11-03', weekStart: weekStartOf('2026-11-03'),
    today: { words: 0, wordQuizDone: false, grammarLessons: 0, listening: 0, speakingSentences: 0, reviewDone: false, reviewDue: 3, expressions: 0, ...o },
    week: { studyDays: 0, grammarUnits: 0, listeningSpeaking: 0 },
    totals: { studySessions: 0, unitTestsPassed: 0, charactersOwned: 0, evolved: 0, purchases: 0, decorateCount: 0, gardenOpen: false, gardenEligible: false, ...totals },
  });
  const q = (id: string) => QUESTS.find((x) => x.id === id)!;
  it('주 시작은 월요일', () => {
    expect(weekStartOf('2026-11-03')).toBe('2026-11-02'); // 화 → 월
    expect(weekStartOf('2026-11-08')).toBe('2026-11-02'); // 일 → 월
    expect(weekStartOf('2026-11-09')).toBe('2026-11-09');
  });
  it('available → in_progress → completed → claimed, 다음 날 다시 available', () => {
    expect(questStatus(q('d-words'), c(), {})).toBe('available');
    expect(questStatus(q('d-words'), c({ words: 10 }), {})).toBe('in_progress'); // 확인 문제 전
    const done = c({ words: 10, wordQuizDone: true });
    expect(questStatus(q('d-words'), done, {})).toBe('completed');
    const claims = { [claimKey(q('d-words'), done)]: 1 };
    expect(questStatus(q('d-words'), done, claims)).toBe('claimed');
    expect(questStatus(q('d-words'), { ...done, date: '2026-11-04', today: { ...done.today, words: 0, wordQuizDone: false } }, claims)).toBe('available');
  });
  it('locked: 복습 없음 · 정원 조건 미충족', () => {
    expect(questStatus(q('d-review'), c({ reviewDue: 0 }), {})).toBe('locked');
    expect(questStatus(q('s-garden'), c(), {})).toBe('locked');
    expect(questStatus(q('s-garden'), c({}, { gardenEligible: true }), {})).toBe('completed');
  });
});
