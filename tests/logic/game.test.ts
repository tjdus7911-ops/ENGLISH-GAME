import {
  acquireCharacter, applyGrowth, discoveryAvailability, earnStars, grantReward, growthCheck, initialGameState, LV2_XP,
  markRestudied, resolveDiscovery, setPartner, spendStars, starBalance, updateDiscoveries, updateVillage, villageStage,
} from '@/domain/game/state';

const common = ['mossy', 'plip', 'lumi', 'cobi'];
const ms = (o: Partial<{ wordsLearned: number; lecturesCompleted: number; listeningDone: number; speakingSentences: number }> = {}) =>
  ({ wordsLearned: 0, lecturesCompleted: 0, listeningDone: 0, speakingSentences: 0, ...o });

describe('별 경제', () => {
  it('지급은 eventId 당 1회, 잔액은 거래 합계', () => {
    let s = earnStars(initialGameState(), 'quest:d-words:2026-11-03', 10, 'q', 0).state;
    expect(earnStars(s, 'quest:d-words:2026-11-03', 10, 'q', 0).granted).toBe(false);
    s = earnStars(s, 'quest:d-grammar:2026-11-03', 15, 'q', 0).state;
    expect(starBalance(s)).toBe(25);
  });
  it('잔액 부족 시 소비 실패 → 잔액 음수 0건', () => {
    let s = earnStars(initialGameState(), 'e1', 20, 'q', 0).state;
    expect(spendStars(s, 'buy:x', 30, 'b', 0)).toMatchObject({ ok: false, error: 'insufficient' });
    const r = spendStars(s, 'buy:y', 20, 'b', 0);
    expect(r.ok).toBe(true);
    s = r.state;
    expect(starBalance(s)).toBe(0);
    expect(spendStars(s, 'buy:y', 1, 'b', 0).ok).toBe(false); // 중복
    expect(spendStars(s, 'buy:z', 1, 'b', 0).ok).toBe(false);
    expect(starBalance(s)).toBeGreaterThanOrEqual(0);
  });
});

describe('성장 XP', () => {
  it('보유 캐릭터에만, 같은 이벤트 중복 없음', () => {
    let s = acquireCharacter(initialGameState(), 'mossy', 'd', 'e', 'r', 0).state;
    s = grantReward(s, { eventId: 'review:d:xp', type: 'growth-xp', amount: 20, characterId: 'mossy', reason: '', at: 0 }).state;
    expect(s.characters.mossy.xp).toBe(20);
    expect(grantReward(s, { eventId: 'review:d:xp', type: 'growth-xp', amount: 20, characterId: 'mossy', reason: '', at: 0 }).granted).toBe(false);
  });
});

describe('캐릭터 획득/파트너', () => {
  it('최초 획득 시 자동 파트너, 중복 획득 없음', () => {
    let s = acquireCharacter(initialGameState(), 'mossy', 'd', 'e1', 'r', 0).state;
    expect(s.partnerId).toBe('mossy');
    expect(acquireCharacter(s, 'mossy', 'd', 'e2', 'r', 0).acquired).toBe(false);
    s = acquireCharacter(s, 'plip', 'd', 'e3', 'r', 0).state;
    expect(s.partnerId).toBe('mossy');
  });
  it('미보유 캐릭터는 파트너 지정 불가, 변경해도 성장 데이터 유지', () => {
    let s = acquireCharacter(initialGameState(), 'mossy', 'd', 'e1', 'r', 0).state;
    s = { ...s, characters: { ...s.characters, mossy: { ...s.characters.mossy, xp: 30 } } };
    expect(setPartner(s, 'zz').ok).toBe(false);
    s = acquireCharacter(s, 'plip', 'd', 'e2', 'r', 0).state;
    s = setPartner(s, 'plip').state;
    expect(s.partnerId).toBe('plip');
    expect(s.characters.mossy.xp).toBe(30);
  });
});

describe('학습 성취 기반 발견', () => {
  it('성취 전에는 발견 없음 → 단어 10개 학습 시 모시 발견 열림', () => {
    let s = initialGameState();
    expect(discoveryAvailability(s, common)).toMatchObject({ ok: false, reason: 'none' });
    s = updateDiscoveries(s, ms({ wordsLearned: 9 })).state;
    expect(discoveryAvailability(s, common).ok).toBe(false);
    const r = updateDiscoveries(s, ms({ wordsLearned: 10, listeningDone: 1 }));
    expect(r.opened).toEqual(['mossy', 'lumi']);
    expect(discoveryAvailability(r.state, common)).toEqual({ ok: true, characterId: 'mossy' });
  });
  it('3문제 중 2개 이상 정답이면 획득, 실패 시 재학습 후 재도전, 중복 없음', () => {
    let s = updateDiscoveries(initialGameState(), ms({ wordsLearned: 10 })).state;
    const fail = resolveDiscovery(s, 'mossy', 1, 'd', 0);
    expect(fail.success).toBe(false);
    expect(discoveryAvailability(fail.state, common)).toMatchObject({ ok: false, reason: 'restudy' });
    s = markRestudied(fail.state);
    expect(discoveryAvailability(s, common)).toEqual({ ok: true, characterId: 'mossy' });
    const ok = resolveDiscovery(s, 'mossy', 2, 'd', 0);
    expect(ok.success).toBe(true);
    expect(resolveDiscovery(ok.state, 'mossy', 3, 'd', 0).success).toBe(false);
    expect(discoveryAvailability(ok.state, common)).toMatchObject({ ok: false, reason: 'none' });
    expect(updateDiscoveries(ok.state, ms({ wordsLearned: 50 })).opened).toEqual([]); // 이미 보유 → 다시 열리지 않음
  });
  it('조건이 열리지 않은 캐릭터는 퀴즈로도 획득 불가', () => {
    expect(resolveDiscovery(initialGameState(), 'cobi', 3, 'd', 0).success).toBe(false);
  });
  it('모두 수집', () => {
    let s = initialGameState();
    for (const id of common) s = acquireCharacter(s, id, 'd', id, 'r', 0).state;
    expect(discoveryAvailability(s, common)).toMatchObject({ ok: false, reason: 'all-collected' });
  });
});

describe('진화', () => {
  it('XP·서로 다른 복습일·정답률 모두 충족해야 Lv.2', () => {
    let s = acquireCharacter(initialGameState(), 'mossy', 'd', 'e1', 'r', 0).state;
    s = { ...s, characters: { mossy: { ...s.characters.mossy, xp: LV2_XP } } };
    const base = { conceptId: 'u1', attempts: 10, correct: 8, accuracy: 0.8, recentAccuracy: 0.8, distinctDays: 2 };
    expect(growthCheck(s.characters.mossy, { ...base, reviewDays: 1 }).eligible).toBe(false);
    expect(growthCheck(s.characters.mossy, { ...base, reviewDays: 2, recentAccuracy: 0.5 }).eligible).toBe(false);
    expect(growthCheck({ ...s.characters.mossy, xp: LV2_XP - 1 }, { ...base, reviewDays: 2 }).eligible).toBe(false);
    const ok = growthCheck(s.characters.mossy, { ...base, reviewDays: 2 });
    expect(ok.eligible).toBe(true);
    const g = applyGrowth(s, 'mossy', ok, 'd2');
    expect(g.state.characters.mossy.level).toBe(2);
    expect(growthCheck(g.state.characters.mossy, { ...base, reviewDays: 2 }).eligible).toBe(false);
  });
});

describe('마을 3단계', () => {
  const base = { studySessions: 0, wordsLearned: 0, lecturesCompleted: 0, unitTestsPassed: 0, charactersOwned: 0, gardenOpen: false };
  it('누적 성취로 1→2→3, 감소 없음', () => {
    let s = initialGameState();
    expect(villageStage(s)).toBe(1);
    s = updateVillage(s, { ...base, studySessions: 1 }).state;
    expect(s.village.unlocked).toEqual(['flowers']);
    const r2 = updateVillage(s, { ...base, studySessions: 3, wordsLearned: 30, lecturesCompleted: 2 });
    expect(r2.leveledTo).toBe(2);
    s = r2.state;
    const r3 = updateVillage(s, { ...base, studySessions: 3, wordsLearned: 30, lecturesCompleted: 2, gardenOpen: true });
    expect(r3.leveledTo).toBe(3);
    s = updateVillage(r3.state, base).state;
    expect(villageStage(s)).toBe(3);
  });
});
