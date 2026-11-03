import {
  acquireCharacter, applyGrowth, availablePoints, discoveryAvailability, grantReward, growthCheck, initialGameState,
  markRestudied, resolveDiscovery, setPartner, updateVillage, DISCOVERY_COST, villageStage,
} from '@/domain/game/state';

const pool = [{ id: 'c1', conceptId: 'u1' }, { id: 'c2', conceptId: 'u2' }];
const tx = (eventId: string, amount = 10) => ({ eventId, type: 'discovery-points' as const, amount, reason: 't', at: 0 });

describe('보상', () => {
  it('같은 이벤트 중복 지급 차단', () => {
    let s = initialGameState();
    s = grantReward(s, tx('vocab10:1')).state;
    const r = grantReward(s, tx('vocab10:1'));
    expect(r.granted).toBe(false);
    expect(r.state.pointsEarned).toBe(10);
  });
  it('성장 XP는 보유 캐릭터에만', () => {
    let s = acquireCharacter(initialGameState(), 'c1', 'd', 'e', 'r', 0).state;
    s = grantReward(s, { eventId: 'review:d', type: 'growth-xp', amount: 20, characterId: 'c1', reason: '', at: 0 }).state;
    expect(s.characters.c1.xp).toBe(20);
    expect(grantReward(s, { eventId: 'review:d', type: 'growth-xp', amount: 20, characterId: 'c1', reason: '', at: 0 }).granted).toBe(false);
  });
});

describe('캐릭터 획득/파트너', () => {
  it('최초 획득 시 자동 파트너, 중복 획득 없음', () => {
    let s = acquireCharacter(initialGameState(), 'c1', 'd', 'e1', 'r', 0).state;
    expect(s.partnerId).toBe('c1');
    const again = acquireCharacter(s, 'c1', 'd', 'e2', 'r', 0);
    expect(again.acquired).toBe(false);
    s = acquireCharacter(s, 'c2', 'd', 'e3', 'r', 0).state;
    expect(s.partnerId).toBe('c1');
  });
  it('미보유 캐릭터는 파트너 지정 불가, 변경해도 성장 데이터 유지', () => {
    let s = acquireCharacter(initialGameState(), 'c1', 'd', 'e1', 'r', 0).state;
    s = { ...s, characters: { ...s.characters, c1: { ...s.characters.c1, xp: 30 } } };
    expect(setPartner(s, 'zz').ok).toBe(false);
    s = acquireCharacter(s, 'c2', 'd', 'e2', 'r', 0).state;
    s = setPartner(s, 'c2').state;
    expect(s.partnerId).toBe('c2');
    expect(s.characters.c1.xp).toBe(30);
  });
});

describe('발견', () => {
  const ctx = { studiedToday: true, studiedConcepts: ['u2'], commonPool: pool };
  it('학습·포인트 조건', () => {
    const s = initialGameState();
    expect(discoveryAvailability(s, { ...ctx, studiedToday: false })).toMatchObject({ ok: false, reason: 'no-study' });
    expect(discoveryAvailability(s, ctx)).toMatchObject({ ok: false, reason: 'points', need: DISCOVERY_COST });
    const s2 = grantReward(s, tx('a', 25)).state;
    expect(discoveryAvailability(s2, ctx)).toEqual({ ok: true, characterId: 'c2' });
  });
  it('3문제 중 2개 이상 정답이면 획득, 실패 시 재학습 후 재도전', () => {
    let s = grantReward(initialGameState(), tx('a', 25)).state;
    const fail = resolveDiscovery(s, 'c2', 1, 'd', 0);
    expect(fail.success).toBe(false);
    expect(discoveryAvailability(fail.state, ctx)).toMatchObject({ ok: false, reason: 'restudy' });
    s = markRestudied(fail.state);
    expect(discoveryAvailability(s, ctx)).toEqual({ ok: true, characterId: 'c2' });
    const ok = resolveDiscovery(s, 'c2', 2, 'd', 0);
    expect(ok.success).toBe(true);
    expect(ok.state.characters.c2).toBeDefined();
    expect(availablePoints(ok.state)).toBe(5);
    expect(resolveDiscovery(ok.state, 'c2', 3, 'd', 0).success).toBe(false); // 중복 없음
  });
  it('모두 수집', () => {
    let s = acquireCharacter(initialGameState(), 'c1', 'd', 'e1', 'r', 0).state;
    s = acquireCharacter(s, 'c2', 'd', 'e2', 'r', 0).state;
    expect(discoveryAvailability(s, ctx)).toMatchObject({ ok: false, reason: 'all-collected' });
  });
});

describe('성장', () => {
  it('XP·서로 다른 복습일·정답률 모두 충족해야 Lv.2', () => {
    let s = acquireCharacter(initialGameState(), 'c1', 'd', 'e1', 'r', 0).state;
    s = { ...s, characters: { c1: { ...s.characters.c1, xp: 40 } } };
    const base = { conceptId: 'u1', attempts: 10, correct: 8, accuracy: 0.8, recentAccuracy: 0.8, distinctDays: 2 };
    expect(growthCheck(s.characters.c1, { ...base, reviewDays: 1 }).eligible).toBe(false);
    expect(growthCheck(s.characters.c1, { ...base, reviewDays: 2, recentAccuracy: 0.5 }).eligible).toBe(false);
    const ok = growthCheck(s.characters.c1, { ...base, reviewDays: 2 });
    expect(ok.eligible).toBe(true);
    const g = applyGrowth(s, 'c1', ok, 'd2');
    expect(g.state.characters.c1.level).toBe(2);
    expect(growthCheck(g.state.characters.c1, { ...base, reviewDays: 2 }).eligible).toBe(false);
  });
});

describe('마을', () => {
  it('조건에 따라 장식 해금, 단조 증가', () => {
    let s = initialGameState();
    const base = { studySessions: 0, wordsLearned: 0, lecturesCompleted: 0, unitTestsPassed: 0, charactersOwned: 0 };
    s = updateVillage(s, { ...base, studySessions: 1 }).state;
    expect(s.village.unlocked).toEqual(['flowers']);
    const r = updateVillage(s, { ...base, studySessions: 1, wordsLearned: 30, charactersOwned: 1, lecturesCompleted: 1 });
    expect(r.newlyUnlocked.sort()).toEqual(['library-banner', 'residents', 'tree']);
    s = updateVillage(r.state, base).state;
    expect(villageStage(s)).toBe(4);
  });
});
