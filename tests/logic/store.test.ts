import { get as idbGet, set as idbSet, clear } from 'idb-keyval';
import { useApp, initialState, STORE_KEY, discoveryInfo, validatePersisted, migrate } from '@/store/app';
import { availablePoints } from '@/domain/game/state';
import { dueItems } from '@/domain/learning/srs';
import { GRAMMAR_BY_ID } from '@/content/grammar';
import { vocabForUnit } from '@/content/vocab';
import { reviewQuestion, discoveryQuestions } from '@/lib/questions';
import { toDateKey } from '@/domain/date';

const ans = (conceptId: string, correct: boolean, n = 1, source: 'lesson' | 'review' | 'test' = 'lesson') =>
  Array.from({ length: n }, (_, i) => ({ questionId: `${conceptId}-q${i}`, conceptId, correct, given: 'x', source }));

const flush = () => new Promise((r) => setTimeout(r, 30));

beforeEach(async () => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 10, 3, 9, 0));
  await clear();
  useApp.setState({ ...initialState(), hydrated: true });
});
afterEach(() => vi.useRealTimers());

describe('학습 이벤트 → 보상·복습·캐릭터·마을 (통합)', () => {
  it('단어 10개 학습: 복습 일정 10개 생성, +10P, 재학습해도 중복 지급·중복 일정 없음', () => {
    const words = vocabForUnit('a1-u01').slice(0, 10).map((w) => w.id);
    useApp.getState().completeWords('a1-u01', words, ans('a1-u01', true, 10));
    let s = useApp.getState();
    expect(Object.keys(s.learning.reviews)).toHaveLength(10);
    expect(availablePoints(s.game)).toBe(10);
    useApp.getState().completeWords('a1-u01', words, ans('a1-u01', true, 10));
    s = useApp.getState();
    expect(Object.keys(s.learning.reviews)).toHaveLength(10);
    expect(availablePoints(s.game)).toBe(10);
    expect(s.game.village.unlocked).toContain('flowers');
  });

  it('강의를 열지 않고 문제만 풀면 문법 완료·보상 없음, 강의+확인문제 완료 시 +15P 1회', () => {
    const u = GRAMMAR_BY_ID['a1-u01'];
    useApp.getState().completePractice(u.id, ans(u.id, true, u.practice.length));
    expect(useApp.getState().learning.steps['a1-u01:practice']).toBeUndefined();
    useApp.getState().viewLecture(u.id);
    useApp.getState().completePractice(u.id, ans(u.id, true, u.practice.length));
    useApp.getState().completePractice(u.id, ans(u.id, true, u.practice.length));
    const s = useApp.getState();
    expect(s.learning.steps['a1-u01:practice']).toBeTruthy();
    expect(s.game.ledger['grammar:a1-u01']).toBeDefined();
    expect(availablePoints(s.game)).toBe(15);
  });

  it('오답 → 오답노트 등록, 다음 날 복습에서 맞히면 해결', () => {
    useApp.getState().completeWriting('a1-u02', [{ questionId: 'a1-u02-w01', conceptId: 'a1-u02', correct: false, given: 'I is hungry', source: 'lesson' }]);
    expect(useApp.getState().learning.wrongNotes['a1-u02-w01']).toMatchObject({ wrongCount: 1, resolved: false });
    vi.setSystemTime(new Date(2026, 10, 4, 9, 0));
    useApp.getState().freePractice('오답', [{ questionId: 'a1-u02-w01', conceptId: 'a1-u02', correct: true, given: 'I am hungry', source: 'free' }]);
    expect(useApp.getState().learning.wrongNotes['a1-u02-w01'].resolved).toBe(true);
  });

  it('다음 날 복습: 대상 조회 → 결과 반영 → 다음 복습일 갱신 → 파트너 XP +20 하루 1회', () => {
    const words = vocabForUnit('a1-u01').slice(0, 10).map((w) => w.id);
    useApp.getState().completeWords('a1-u01', words, ans('a1-u01', true, 10));
    useApp.getState().completeWords('a1-u01', vocabForUnit('a1-u01').slice(10, 20).map((w) => w.id), ans('a1-u01', true, 10)); // 20P
    // 캐릭터 획득
    const d = discoveryInfo(useApp.getState());
    expect(d.ok).toBe(true);
    if (!d.ok) return;
    expect(useApp.getState().resolveDiscoveryQuiz(d.characterId, 3, []).success).toBe(true);
    expect(useApp.getState().game.partnerId).toBe(d.characterId);

    // 당일 복습 완료
    const today = toDateKey(new Date());
    const due0 = dueItems(useApp.getState().learning.reviews, today);
    expect(due0).toHaveLength(20);
    useApp.getState().completeReview(due0.map((it) => ({ key: it.key, correct: true, answer: { questionId: `rv-${it.key}`, conceptId: it.conceptId, correct: true, given: '', source: 'review' as const } })));
    expect(dueItems(useApp.getState().learning.reviews, today)).toHaveLength(0);
    expect(useApp.getState().game.characters[d.characterId].xp).toBe(20);

    // 다음 날 (날짜 변경 시뮬레이션)
    vi.setSystemTime(new Date(2026, 10, 4, 7, 30));
    const tomorrow = toDateKey(new Date());
    const due1 = dueItems(useApp.getState().learning.reviews, tomorrow);
    expect(due1).toHaveLength(20);
    for (const it of due1) expect(reviewQuestion(it)).not.toBeNull(); // 모든 복습 항목에 문제 생성
    useApp.getState().completeReview(due1.map((it, k) => ({ key: it.key, correct: k % 4 !== 0, answer: { questionId: `rv-${it.key}`, conceptId: it.conceptId, correct: k % 4 !== 0, given: '', source: 'review' as const } })));
    const s = useApp.getState();
    const wrongItem = s.learning.reviews[due1[0].key];
    const okItem = s.learning.reviews[due1[1].key];
    expect(wrongItem.due).toBe('2026-11-05');
    expect(okItem.due).toBe('2026-11-07');
    expect(s.game.characters[d.characterId].xp).toBe(40);
    // 같은 날 다시 복습해도 XP 중복 없음
    useApp.getState().completeReview([]);
    expect(useApp.getState().game.characters[d.characterId].xp).toBe(40);
  });

  it('서로 다른 2일 복습 + 정답률 + XP 40 → Lv.2 성장, 파트너 변경 후에도 성장 기록 유지', () => {
    const s0 = useApp.getState();
    useApp.setState({ game: { ...s0.game, pointsEarned: 40 } });
    useApp.getState().completeWords('a1-u01', [vocabForUnit('a1-u01')[0].id], ans('a1-u01', true, 1));
    const d = discoveryInfo(useApp.getState());
    if (!d.ok) throw new Error('no discovery');
    useApp.getState().resolveDiscoveryQuiz('mossy', 2, []);
    expect(useApp.getState().game.characters.mossy.level).toBe(1);
    const review = () => {
      const due = dueItems(useApp.getState().learning.reviews, toDateKey(new Date()));
      useApp.getState().completeReview([...due.map((it) => ({ key: it.key, correct: true, answer: { questionId: `rv-${it.key}`, conceptId: 'a1-u01', correct: true, given: '', source: 'review' as const } })),
        { key: 'none', correct: true, answer: { questionId: 'x', conceptId: 'a1-u01', correct: true, given: '', source: 'review' } }]);
    };
    review();
    vi.setSystemTime(new Date(2026, 10, 5, 9, 0));
    review();
    const s = useApp.getState();
    expect(s.game.characters.mossy.xp).toBe(40);
    expect(s.game.characters.mossy.level).toBe(2);
    expect(s.celebrations.some((c) => c.kind === 'levelup')).toBe(true);
    // 다른 캐릭터를 얻어 파트너 변경
    useApp.setState({ game: { ...s.game, pointsEarned: s.game.pointsEarned + 40 } });
    useApp.getState().completeWords('a1-u02', [vocabForUnit('a1-u02')[0].id], ans('a1-u02', true, 1));
    const d2 = discoveryInfo(useApp.getState());
    if (!d2.ok) throw new Error('no discovery 2');
    useApp.getState().resolveDiscoveryQuiz(d2.characterId, 3, []);
    expect(useApp.getState().setPartner(d2.characterId)).toBe(true);
    expect(useApp.getState().setPartner('stella')).toBe(false); // 미보유
    expect(useApp.getState().game.characters.mossy).toMatchObject({ level: 2, xp: 40 });
  });

  it('단원 평가 통과 → 희귀 캐릭터 1회, A1 평가 통과 → 특별 캐릭터', () => {
    const u = GRAMMAR_BY_ID['a1-u03'];
    expect(useApp.getState().completeUnitTest(u.id, ans(u.id, false, 8, 'test')).passed).toBe(false);
    expect(useApp.getState().game.characters.whisk).toBeUndefined();
    expect(useApp.getState().completeUnitTest(u.id, ans(u.id, true, 8, 'test')).passed).toBe(true);
    expect(useApp.getState().game.characters.whisk).toBeDefined();
    useApp.getState().completeUnitTest('a1-u04', ans('a1-u04', true, 8, 'test'));
    expect(Object.keys(useApp.getState().game.characters)).toHaveLength(1);
    expect(useApp.getState().completeA1Exam(ans('x', true, 20, 'test')).passed).toBe(true);
    expect(useApp.getState().game.characters.stella).toBeDefined();
  });

  it('말하기: STT 누락 단어가 있으면 재연습 복습 등록, 숙련도(정답) 기록에는 넣지 않음', () => {
    const before = useApp.getState().learning.answers.length;
    useApp.getState().completeSpeaking('a1-u01', [
      { sentenceId: 'spk-01', date: '2026-11-03', at: 1, recognized: 'my name mina', matchedWords: 3, totalWords: 4, missing: ['is'], extra: [], substituted: [], mode: 'stt' },
      { sentenceId: 'spk-02', date: '2026-11-03', at: 2, recognized: 'nice to meet you', matchedWords: 4, totalWords: 4, missing: [], extra: [], substituted: [], mode: 'stt' },
    ], { 'spk-01': 'a1-u01', 'spk-02': 'a1-u01' });
    const s = useApp.getState();
    expect(s.learning.reviews['speaking:spk-01']).toBeDefined();
    expect(s.learning.reviews['speaking:spk-02']).toBeUndefined();
    expect(s.learning.answers.length).toBe(before);
    expect(s.learning.speakingAttempts).toHaveLength(2);
  });

  it('표현 학습: 기록·복습·포인트·XP 연동, 중복 지급 없음', () => {
    useApp.getState().completeExpression('ess-01', 'expr-essential', "How's it going?", ans('expr-essential', true, 2));
    useApp.getState().completeExpression('ess-01', 'expr-essential', "How's it going?", ans('expr-essential', true, 2));
    const s = useApp.getState();
    expect(s.learning.expressionsDone['ess-01']).toBeTruthy();
    expect(s.learning.reviews['expression:ess-01']).toBeDefined();
    expect(availablePoints(s.game)).toBe(2);
    expect(s.learning.log.filter((l) => l.kind === 'expression')).toHaveLength(2);
  });

  it('발견 퀴즈 문제: 오늘 학습 내용으로 3문제 생성', () => {
    const qs = discoveryQuestions(['a1-u01'], vocabForUnit('a1-u01').slice(0, 3).map((v) => v.id), 1);
    expect(qs).toHaveLength(3);
  });
});

describe('저장·복원', () => {
  it('IndexedDB 에 저장되고 재실행(재수화) 후 복원', async () => {
    useApp.getState().completeWords('a1-u01', vocabForUnit('a1-u01').slice(0, 10).map((w) => w.id), ans('a1-u01', true, 10));
    await flush();
    const raw = await idbGet<string>(STORE_KEY);
    expect(raw).toBeTruthy();
    // 앱 재실행 시뮬레이션: 메모리 상태를 비우고(이때 저장소도 덮어써지므로) 저장돼 있던 원본을 되돌린 뒤 재수화
    useApp.setState({ ...initialState() });
    expect(Object.keys(useApp.getState().learning.learnedWords)).toHaveLength(0);
    await flush();
    await idbSet(STORE_KEY, raw!);
    await useApp.persist.rehydrate();
    expect(Object.keys(useApp.getState().learning.learnedWords)).toHaveLength(10);
    expect(availablePoints(useApp.getState().game)).toBe(10);
  });
  it('손상 데이터: 앱이 죽지 않고 초기 상태로 복구 + recovered 표시', async () => {
    await idbSet(STORE_KEY, JSON.stringify({ state: { learning: { answers: 'broken' } }, version: 2 }));
    await useApp.persist.rehydrate();
    expect(useApp.getState().recovered).toBe(true);
    expect(useApp.getState().learning.answers).toEqual([]);
  });
  it('JSON 이 아닌 데이터도 비정상 종료 없음', async () => {
    await idbSet(STORE_KEY, '{not json');
    await expect(useApp.persist.rehydrate()).resolves.not.toThrow();
  });
  it('마이그레이션: 이전 버전 데이터의 누락 필드를 채우고 기존 기록 유지', () => {
    const old = { profile: { onboarded: true }, settings: {}, learning: { answers: [{ id: 'a' }], reviews: {} }, game: { characters: { mossy: { id: 'mossy', level: 1, xp: 5, acquiredOn: 'd' } }, ledger: {}, village: { unlocked: ['flowers'] } } };
    const m = migrate(old, 1);
    expect(m.learning.answers).toHaveLength(1);
    expect(m.learning.savedExpressions).toEqual([]);
    expect(m.settings.dailyNewWords).toBe(10);
    expect(m.game.characters.mossy.xp).toBe(5);
    expect(m.game.village.seen).toEqual([]);
    expect(validatePersisted(m)).not.toBeNull();
  });
});
