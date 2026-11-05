import { clear } from 'idb-keyval';
import { useApp, initialState, migrate } from '@/store/app';
import { starBalance } from '@/domain/game/state';
import { BOOKS, BOOK_BY_ID, bookSentences } from '@/content/library';
import { GRAMMAR_UNITS } from '@/content/grammar';
import { EXPRESSIONS } from '@/content/expressions';
import { VOCAB } from '@/content/vocab';
import { lookup, tokenize, lexiconSize } from '@/lib/lexicon';
import { saveMyWord, myWordStatus, reviewQueue, applyMyWordResults } from '@/domain/learning/mywords';
import { LEVEL_BANK, TEST_AREAS, TEST_LEVELS } from '@/content/level-bank';
import { answerItem, estimate, nextItem, startAdaptive, TEST_LENGTH } from '@/domain/learning/adaptive';
import { recommend } from '@/lib/recommend';
import { questionById } from '@/lib/questionIndex';
import { myWordQuestion } from '@/lib/libraryQuiz';
import { addDays } from '@/domain/date';

beforeEach(async () => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 10, 5, 9, 0));
  await clear();
  useApp.setState({ ...initialState(), hydrated: true });
});
afterEach(() => vi.useRealTimers());

describe('동화책 콘텐츠 검증 (실제 본문)', () => {
  it('24권 · 레벨 분포 · 모든 문장에 번역과 구조 설명 · 퀴즈 3~10문항 · 정답 유효', () => {
    const by = Object.fromEntries(TEST_LEVELS.map((l) => [l, BOOKS.filter((b) => b.level === l).length]));
    console.log('books by level', by, 'sentences', BOOKS.reduce((n, b) => n + bookSentences(b).length, 0));
    expect(BOOKS.length).toBe(24);
    expect(by).toEqual({ A1: 8, A2: 6, B1: 5, B2: 3, C1: 2 });
    expect(new Set(BOOKS.map((b) => b.id)).size).toBe(BOOKS.length);
    for (const b of BOOKS) {
      expect(b.pages.length, b.id).toBeGreaterThanOrEqual(4);
      for (const s of bookSentences(b)) { expect(s.en.length, s.id).toBeGreaterThan(3); expect(s.ko, s.id).toBeTruthy(); expect(s.note, s.id).toBeTruthy(); }
      expect(b.quiz.length).toBeGreaterThanOrEqual(3);
      expect(b.quiz.length).toBeLessThanOrEqual(10);
      for (const q of b.quiz) { expect(q.choices[q.answer], q.id).toBeTruthy(); expect(q.explain).toBeTruthy(); }
      if (b.source === 'pd') expect(b.origin).toMatch(/공유저작물/);
      expect(questionById(b.quiz[0].id)?.answers[0]).toBe(b.quiz[0].choices[b.quiz[0].answer]);
    }
  });
  it('같은 문장으로 수량을 채우지 않음: 모든 영어 문장이 서로 다름', () => {
    const all = BOOKS.flatMap((b) => bookSentences(b).map((s) => s.en.toLowerCase()));
    expect(new Set(all).size).toBe(all.length);
  });
  it('단어 터치 사전: 동화책·문법 예문·표현 대화의 모든 단어를 찾을 수 있음 (뜻을 지어내지 않음)', () => {
    const sentences = [
      ...BOOKS.flatMap((b) => bookSentences(b).map((s) => s.en)),
      ...GRAMMAR_UNITS.flatMap((u) => [...u.examples, ...u.moreExamples].map((e) => e.en)),
      ...EXPRESSIONS.flatMap((e) => [e.en, ...e.dialogue.map((d) => d.en)]),
      ...VOCAB.map((v) => v.example),
    ];
    const missing = new Set<string>();
    for (const s of sentences) for (const t of tokenize(s)) if (t.word && !lookup(t.text)) missing.add(t.text);
    console.log('lexicon size', lexiconSize(), 'missing', [...missing].slice(0, 30));
    expect([...missing]).toEqual([]);
    expect(lookup('went')?.word).toBe('go');
    expect(lookup('Mina’s')?.proper).toBe(true);
    expect(lookup('zzqx')).toBeNull();
  });
});

describe('나만의 단어장: 중복 방지 · 상태 · SRS', () => {
  const e = { key: 'lion', word: 'lion', meaning: '사자', pos: '명사', level: 'A1' };
  it('여러 영역에서 같은 단어를 저장해도 하나로 관리 (출처만 추가)', () => {
    let m = saveMyWord({}, e, 'book', 'a1-lion-mouse', 'A big lion is sleeping.', '2026-11-05', 1).map;
    const r = saveMyWord(m, e, 'expression', 'ess-01', undefined, '2026-11-06', 2);
    m = r.map;
    expect(r.created).toBe(false);
    expect(Object.keys(m)).toEqual(['lion']);
    expect(m.lion.sources).toEqual(['book', 'expression']);
    expect(saveMyWord(m, e, 'book', 'a1-lion-mouse', undefined, 'x', 3).map).toBe(m); // 완전히 같은 저장 → 변경 없음
  });
  it('상태: 새로 저장 → 학습 중 → 복습 필요 → 암기 완료, 간격 1·3·7·14일', () => {
    let m = saveMyWord({}, e, 'book', undefined, undefined, '2026-11-05', 1).map;
    expect(myWordStatus(m.lion, '2026-11-05')).toBe('new');
    let day = '2026-11-05';
    const seen: number[] = [];
    for (let i = 0; i < 4; i++) {
      m = applyMyWordResults(m, [{ key: 'lion', correct: true }], day);
      seen.push(m.lion.srs.stage);
      const next = m.lion.srs.due;
      if (i < 3) expect(myWordStatus(m.lion, day)).toBe('learning');
      day = next;
      if (i < 3) expect(myWordStatus(m.lion, day)).toBe('review');
    }
    expect(seen).toEqual([1, 2, 3, 4]);
    expect(myWordStatus(m.lion, day)).toBe('memorized');
  });
  it('틀리면 내일 다시, 반복 오답은 복습 큐 맨 앞', () => {
    let m = saveMyWord({}, e, 'book', undefined, undefined, '2026-11-05', 1).map;
    m = saveMyWord(m, { ...e, key: 'mouse', word: 'mouse', meaning: '생쥐' }, 'book', undefined, undefined, '2026-11-05', 2).map;
    m = applyMyWordResults(m, [{ key: 'mouse', correct: false }], '2026-11-05');
    expect(m.mouse.srs.due).toBe('2026-11-06');
    m = applyMyWordResults(m, [{ key: 'mouse', correct: false }], '2026-11-06');
    expect(m.mouse.srs.difficult).toBe(true);
    expect(reviewQueue(m, '2026-11-07')[0].key).toBe('mouse');
  });
  it('뜻 고르기 문항: 보기 4개, 정답 1개 포함, 중복 보기 없음', () => {
    const q = myWordQuestion({ key: 'lion', word: 'lion', meaning: '사자', pos: '명사' });
    expect(q.choices).toHaveLength(4);
    expect(new Set(q.choices).size).toBe(4);
    expect(q.choices).toContain('사자');
    expect(questionById('mw:lion')?.answers).toEqual([lookup('lion')!.meaning]);
  });
});

describe('스토어 통합: 저장·복습 기록·별 중복 방지·데이터 유지', () => {
  it('동화책에서 저장한 단어를 영단어 카드에서 다시 저장해도 1개 · 자유학습 단어장 목록에 보임', () => {
    const friend = VOCAB.find((v) => v.word === 'friend')!;
    const r = useApp.getState().saveWord('friends', 'book', 'a1-lost-mitten', 'Mina and the dog are friends now.');
    expect(r).toMatchObject({ ok: true, created: true, key: 'friend' });
    expect(useApp.getState().learning.savedWords).toContain(friend.id); // 영단어 DB 단어 → 기존 '저장한 단어'에도 표시
    useApp.getState().saveWord('friend', 'expression', 'ess-01');
    const m = useApp.getState().learning.myWords;
    expect(Object.keys(m)).toEqual(['friend']);
    expect(m.friend.sources).toEqual(['book', 'expression']);
    expect(useApp.getState().saveWord('Mina', 'book').ok).toBe(false); // 고유명사 저장 안 함
  });
  it('단어장 복습: SRS 기록 저장 + 별은 하루 1회(5문제 이상)만', () => {
    const words = ['lion', 'mouse', 'net', 'roar', 'bite', 'free'];
    for (const w of words) useApp.getState().saveWord(w, 'book', 'a1-lion-mouse');
    const res = words.map((key, i) => ({ key, correct: i !== 0, given: 'x' }));
    useApp.getState().completeMyWordReview(res);
    let s = useApp.getState();
    expect(s.learning.myWords.mouse.srs.history).toHaveLength(1);
    expect(s.learning.myWords.mouse.srs.due).toBe('2026-11-06');
    expect(s.learning.myWords.lion.srs.due).toBe('2026-11-06');
    expect(s.learning.myWords.lion.srs.wrong).toBe(1);
    expect(starBalance(s.game)).toBe(2);
    useApp.getState().completeMyWordReview(res); // 같은 날 재응시
    s = useApp.getState();
    expect(starBalance(s.game)).toBe(2);
    expect(s.learning.myWords.mouse.srs.stage).toBe(1); // 같은 날 반복으로 간격을 부풀리지 않음
    vi.setSystemTime(new Date(2026, 10, 6, 9, 0));
    useApp.getState().completeMyWordReview(res);
    expect(starBalance(useApp.getState().game)).toBe(4);
  });
  it('동화책 보상: 마지막 쪽까지 읽고 60% 이상일 때 1회만 (재독·재응시 불가)', () => {
    const b = BOOK_BY_ID['a1-lion-mouse'];
    const answers = (ok: number) => b.quiz.map((q, i) => ({ questionId: q.id, conceptId: 'book-A1', correct: i < ok, given: 'x', source: 'reading' as const }));
    useApp.getState().completeBook(b.id, answers(4)); // 읽지 않고 퀴즈만
    expect(starBalance(useApp.getState().game)).toBe(0);
    for (let p = 0; p < b.pages.length; p++) useApp.getState().setBookPage(b.id, p);
    expect(useApp.getState().learning.books[b.id].readOn).toBe('2026-11-05');
    useApp.getState().completeBook(b.id, answers(1)); // 25% → 미통과
    expect(starBalance(useApp.getState().game)).toBe(0);
    useApp.getState().completeBook(b.id, answers(3));
    expect(starBalance(useApp.getState().game)).toBe(3);
    useApp.getState().completeBook(b.id, answers(4));
    useApp.getState().setBookPage(b.id, 0);
    useApp.getState().completeBook(b.id, answers(4));
    const s = useApp.getState();
    expect(starBalance(s.game)).toBe(3);
    expect(s.learning.books[b.id]).toMatchObject({ page: 0, maxPage: b.pages.length - 1, quiz: { correct: 4, passed: true } });
  });
  it('v3 저장 데이터 → v4: 기존 저장 단어·집·별·기록 유지 + 단어장으로 이전', () => {
    const base = initialState();
    const v3 = { ...base, version: 3, learning: { ...base.learning, savedWords: [VOCAB[0].id, VOCAB[1].id], learnedWords: { [VOCAB[0].id]: '2026-11-01' }, myWords: undefined, books: undefined },
      game: { ...base.game, stars: { gift: { eventId: 'gift', amount: 40, reason: 't', at: 0 } } }, home: { ...base.home, houseLevel: 2 } } as unknown;
    const m = migrate(v3, 3);
    expect(m.version).toBe(4);
    expect(m.learning.savedWords).toEqual([VOCAB[0].id, VOCAB[1].id]);
    expect(Object.keys(m.learning.myWords)).toHaveLength(2);
    expect(m.learning.myWords[VOCAB[0].word.toLowerCase()].sources).toEqual(['words']);
    expect(m.learning.books).toEqual({});
    expect(m.learning.learnedWords).toEqual({ [VOCAB[0].id]: '2026-11-01' });
    expect(starBalance(m.game)).toBe(40);
    expect(m.home.houseLevel).toBe(2);
  });
});

describe('적응형 레벨 테스트 채점', () => {
  it('문항 은행: 영역 4 × 레벨 5 × 5문항, 정답이 보기에 있음', () => {
    expect(LEVEL_BANK).toHaveLength(100);
    for (const a of TEST_AREAS) for (const l of TEST_LEVELS) expect(LEVEL_BANK.filter((b) => b.area === a && b.level === l), `${a}${l}`).toHaveLength(5);
    for (const b of LEVEL_BANK) { expect(b.choices!).toHaveLength(4); expect(b.choices!).toContain(b.answers[0]); }
    expect(new Set(LEVEL_BANK.map((b) => b.choices!.indexOf(b.answers[0]))).size).toBeGreaterThan(2); // 정답 위치가 고정되지 않음
  });
  it.each([[-1, 'A1'], [0, 'A1'], [1, 'A2'], [2, 'B1'], [3, 'B2'], [4, 'C1']])('실력 %i 학습자 → %s', (ability, expected) => {
    let st = startAdaptive();
    let it;
    const areas = new Set<string>();
    while ((it = nextItem(st))) { areas.add(it.area); st = answerItem(st, it, TEST_LEVELS.indexOf(it.level) <= ability); }
    expect(st.results).toHaveLength(TEST_LENGTH);
    expect(new Set(st.asked).size).toBe(TEST_LENGTH);
    expect(areas.size).toBe(4);
    expect(estimate(st.results).level).toBe(expected);
  });
  it('estimate: 레벨·영역별 집계가 응답과 일치', () => {
    const r = [
      { id: '1', area: 'V' as const, level: 'A2' as const, correct: true }, { id: '2', area: 'G' as const, level: 'A2' as const, correct: true },
      { id: '3', area: 'E' as const, level: 'B1' as const, correct: false }, { id: '4', area: 'R' as const, level: 'B1' as const, correct: true },
    ];
    const e = estimate(r);
    expect(e.byLevel).toEqual({ A2: { correct: 2, total: 2 }, B1: { correct: 1, total: 2 } });
    expect(e.byArea.E).toEqual({ correct: 0, total: 1 });
    expect(e.level).toBe('A2');
  });
});

describe('난이도별 추천', () => {
  it('A2 사용자: 단어·표현·책 모두 A2 중심 + B1 도전 1개, 날짜별로 고정', () => {
    useApp.getState().setStudyLevel('A2');
    const s = useApp.getState();
    const r = recommend(s, '2026-11-05');
    expect(r.level).toBe('A2');
    expect(r.words.filter((w) => !w.stretch).every((w) => w.level === 'A2')).toBe(true);
    expect(r.words.filter((w) => w.stretch).map((w) => w.level)).toEqual(['B1']);
    expect(r.books.filter((b) => !b.stretch).every((b) => b.b.level === 'A2')).toBe(true);
    expect(r.books.filter((b) => b.stretch).map((b) => b.b.level)).toEqual(['B1']);
    expect(r.expressions.filter((e) => !e.stretch).every((e) => e.e.level === 'A2')).toBe(true);
    expect(r.expressions.some((e) => e.stretch && e.e.level === 'B1')).toBe(true);
    expect(recommend(s, '2026-11-05').words.map((w) => w.entry.key)).toEqual(r.words.map((w) => w.entry.key));
  });
  it('C1 사용자: C1 표현이 없으면 B2로 대체하고 그 사실을 안내', () => {
    useApp.getState().setStudyLevel('C1');
    const r = recommend(useApp.getState(), '2026-11-05');
    expect(r.books.every((b) => b.b.level === 'C1')).toBe(true);
    expect(r.notes.join(' ')).toMatch(/표현/);
  });
  it('저장한 단어는 추천에서 제외, 복습 필요 수 집계', () => {
    useApp.getState().setStudyLevel('A1');
    const r1 = recommend(useApp.getState(), '2026-11-05');
    const k = r1.words[0].entry.word;
    useApp.getState().saveWord(k, 'words');
    useApp.getState().completeMyWordReview([{ key: r1.words[0].entry.key, correct: false, given: 'x' }]);
    const r2 = recommend(useApp.getState(), addDays('2026-11-05', 1));
    expect(r2.words.map((w) => w.entry.key)).not.toContain(r1.words[0].entry.key);
    expect(r2.review.myWords).toBe(1);
  });
  it('레벨 직접 변경·재응시 기록 유지', () => {
    useApp.getState().setStudyLevel('B1', 'manual');
    useApp.getState().saveLevelTest('A2', { A2: { correct: 3, total: 4 } }, [{ questionId: 'x', conceptId: 'level-V', correct: true, given: 'a', source: 'level-test' }], { V: { correct: 1, total: 1 } });
    const lt = useApp.getState().profile.levelTest;
    expect(lt.level).toBe('A2');
    expect(lt.method).toBe('test');
    expect(lt.history!.map((h) => `${h.level}:${h.method}`)).toEqual(['B1:manual', 'A2:test']);
  });
});
