import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp, today, lecturesCompleted, type AppState } from '@/store/app';
import { Button, Card, Page, Progress, SectionTitle, Tag } from '@/components/ui';
import { QuestionCard } from '@/components/Quiz';
import { AREA_LABEL, TEST_AREAS, TEST_LEVELS, type TestArea } from '@/content/level-bank';
import { answerItem, estimate, nextItem, startAdaptive, TEST_LENGTH, type AdaptiveState } from '@/domain/learning/adaptive';
import { LEVEL_KO, recommend, REC_LEVELS, type RecLevel } from '@/lib/recommend';
import { myWordStatus } from '@/domain/learning/mywords';
import { normKey } from '@/lib/lexicon';
import { VOCAB_BY_ID } from '@/content/vocab';
import { addDays } from '@/domain/date';
import { useLeaveGuard } from '@/lib/leaveGuard';
import { cx } from '@/lib/cx';

const DISCLAIMER = '학습 추천을 위한 앱 내부 추정 레벨이에요. 공인 CEFR 인증 결과가 아니에요.';

function LevelPicker({ value, onPick }: { value: string | null; onPick: (l: RecLevel) => void }) {
  return (
    <div className="grid gap-1.5" role="radiogroup" aria-label="학습 레벨 선택">
      {REC_LEVELS.map((l) => (
        <button key={l} role="radio" aria-checked={value === l} onClick={() => onPick(l)} data-testid={`pick-${l}`}
          className={cx('rounded-2xl border px-4 min-h-[52px] flex items-center gap-3 text-left', value === l ? 'bg-accent-soft border-accent' : 'bg-white border-line')}>
          <b className="w-8">{l}</b><span>{LEVEL_KO[l]}</span>
        </button>
      ))}
    </div>
  );
}

/** 레벨 테스트 (선택 사항) — 최초 이용·재응시 공통 */
export function LevelCheck() {
  const nav = useNavigate();
  const done = useApp((s) => s.profile.levelTest.done);
  const cur = useApp((s) => s.profile.levelTest.level);
  const save = useApp((s) => s.saveLevelTest);
  const setLevel = useApp((s) => s.setStudyLevel);
  const [phase, setPhase] = useState<'intro' | 'pick' | 'test'>('intro');
  const [st, setSt] = useState<AdaptiveState>(startAdaptive);
  const [answers, setAnswers] = useState<{ questionId: string; conceptId: string; correct: boolean; given: string; source: 'level-test' }[]>([]);
  const [picked, setPicked] = useState<RecLevel | null>(null);
  const item = useMemo(() => (phase === 'test' ? nextItem(st) : null), [phase, st]);
  useLeaveGuard(phase === 'test' && st.results.length > 0, '테스트를 그만두면 지금까지 푼 문제는 저장되지 않아요.');

  if (phase === 'intro') {
    return (
      <Page title="레벨 테스트" back={done ? '/achievement' : '/onboarding/goal'}>
        <Card>
          <p className="font-bold text-lg">내 영어 수준 알아보기 (선택)</p>
          <p className="text-sm text-ink-soft mt-2 leading-relaxed">영단어 · 문법 · 실생활 표현 · 짧은 독해를 번갈아 {TEST_LENGTH}문항 풀어요. 맞히면 조금 어려운 문제, 틀리면 조금 쉬운 문제가 나오는 <b>적응형</b> 테스트예요. 약 7분.</p>
          <p className="text-xs text-ink-faint mt-3">※ {DISCLAIMER} 듣기·말하기·쓰기는 평가하지 않아요.</p>
          {done && cur && <p className="text-sm mt-3">현재 학습 레벨: <b>{cur}</b></p>}
        </Card>
        <div className="mt-4 grid gap-2">
          <Button size="lg" onClick={() => setPhase('test')} data-testid="lt-start">테스트 시작하기</Button>
          <Button variant="secondary" onClick={() => setPhase('pick')} data-testid="lt-skip">건너뛰고 직접 레벨 고르기</Button>
          {!done && <Button variant="ghost" onClick={() => { setLevel('A1', 'skip'); nav('/home', { replace: true }); }}>건너뛰고 A1부터 시작</Button>}
        </div>
      </Page>
    );
  }
  if (phase === 'pick') {
    return (
      <Page title="학습 레벨 고르기" onBack={() => setPhase('intro')}>
        <p className="text-sm text-ink-soft mb-3">언제든 ‘나의 성장’ 화면에서 바꿀 수 있어요.</p>
        <LevelPicker value={picked ?? cur} onPick={setPicked} />
        <Button size="lg" className="w-full mt-4" disabled={!picked} onClick={() => { setLevel(picked!, done ? 'manual' : 'skip'); nav(done ? '/achievement' : '/home', { replace: true }); }} data-testid="pick-confirm">이 레벨로 시작</Button>
      </Page>
    );
  }
  if (!item) return null;
  const n = st.results.length;
  return (
    <Page title="레벨 테스트" back={false}>
      <div className="flex items-center gap-2 mb-2"><Tag tone="accent">{AREA_LABEL[item.area]}</Tag><span className="text-sm text-ink-soft" data-testid="lt-progress">{n + 1} / {TEST_LENGTH}</span></div>
      <Progress value={n} max={TEST_LENGTH} label="테스트 진행" />
      <div className="mt-3" data-testid="lt-item" data-level={item.level} data-area={item.area}>
        <QuestionCard key={item.id} q={item} onNext={(given, correct) => {
          const next = answerItem(st, item, correct);
          const ans = [...answers, { questionId: item.id, conceptId: item.conceptId, correct, given, source: 'level-test' as const }];
          setAnswers(ans);
          if (!nextItem(next)) {
            const est = estimate(next.results);
            save(est.level, est.byLevel, ans, est.byArea);
            nav('/level-result', { replace: true });
            return;
          }
          setSt(next);
        }} />
      </div>
    </Page>
  );
}

export function LevelCheckResult() {
  const nav = useNavigate();
  const lt = useApp((s) => s.profile.levelTest);
  const lv = (lt.level ?? 'A1') as RecLevel;
  return (
    <Page title="레벨 테스트 결과" back={false}>
      <Card className="text-center">
        <p className="text-sm text-ink-soft">추정 학습 레벨</p>
        <p className="text-5xl font-extrabold text-accent mt-1" data-testid="level-result">{lv}</p>
        <p className="font-semibold">{LEVEL_KO[lv]}</p>
        <p className="text-xs text-ink-faint mt-2">{DISCLAIMER}</p>
      </Card>
      {lt.byArea && (
        <Card className="mt-3">
          <p className="font-bold mb-2">영역별 정답</p>
          {TEST_AREAS.map((a) => { const b = lt.byArea![a]; return b ? <Bar key={a} label={AREA_LABEL[a]} v={b.correct} t={b.total} /> : null; })}
        </Card>
      )}
      {lt.byLevel && Object.keys(lt.byLevel).length > 0 && (
        <Card className="mt-3">
          <p className="font-bold mb-2">레벨별 정답</p>
          {TEST_LEVELS.map((l) => { const b = lt.byLevel![l]; return b ? <Bar key={l} label={l} v={b.correct} t={b.total} /> : null; })}
        </Card>
      )}
      <div className="mt-5 grid gap-2">
        <Button size="lg" onClick={() => nav('/recommend', { replace: true })} data-testid="to-recommend">맞춤 추천 보기</Button>
        <Button variant="secondary" onClick={() => nav('/home', { replace: true })}>마을로 가기</Button>
      </div>
    </Page>
  );
}

function Bar({ label, v, t }: { label: string; v: number; t: number }) {
  return (
    <div className="flex items-center gap-3 py-1.5">
      <span className="w-20 text-sm font-bold shrink-0">{label}</span>
      <div className="flex-1 h-2 bg-mist rounded-full overflow-hidden"><div className="h-full bg-accent" style={{ width: `${t ? (v / t) * 100 : 0}%` }} /></div>
      <span className="text-sm w-14 text-right">{t ? `${v}/${t}` : '-'}</span>
    </div>
  );
}

/** 오늘의 맞춤 추천 */
export function RecommendScreen() {
  const s = useApp();
  const d = today();
  const r = useMemo(() => recommend(s as AppState, d), [s, d]);
  return (
    <Page title="오늘의 맞춤 추천" back="/home">
      <div className="flex items-center justify-between">
        <p className="text-sm">학습 레벨 <b data-testid="rec-level">{r.level}</b> · {LEVEL_KO[r.level]}</p>
        <Link to="/achievement#level" className="text-sm font-semibold text-accent-dark underline">레벨 바꾸기</Link>
      </div>
      <p className="text-[11px] text-ink-faint">내 레벨 중심으로, 다음 레벨 콘텐츠를 조금 섞었어요 (‘도전’ 표시).</p>
      {(r.review.myWords > 0 || r.review.lessons > 0) && (
        <Card className="mt-3 bg-butter border-[#F2D98A]" data-testid="rec-review">
          <p className="font-bold">복습이 필요해요</p>
          <div className="flex gap-2 mt-2 flex-wrap">
            {r.review.myWords > 0 && <Link to="/mywords/review" className="rounded-xl bg-white border border-line px-3 min-h-[44px] grid place-items-center text-sm font-semibold">내 단어 {r.review.myWords}개 복습</Link>}
            {r.review.lessons > 0 && <Link to="/review" className="rounded-xl bg-white border border-line px-3 min-h-[44px] grid place-items-center text-sm font-semibold">오늘의 복습 {r.review.lessons}개</Link>}
          </div>
        </Card>
      )}
      <SectionTitle>오늘의 추천 영단어</SectionTitle>
      <Card className="!p-2" data-testid="rec-words">
        {r.words.map(({ entry, level, stretch }) => <RecWord key={entry.key} e={entry} level={level} stretch={stretch} />)}
      </Card>
      <SectionTitle>오늘의 추천 문법</SectionTitle>
      {r.grammar ? (
        <Link to={`/grammar/${r.grammar.unit.id}`} className="block rounded-2xl bg-white border border-line p-3" data-testid="rec-grammar">
          <span className="font-bold block">{r.grammar.unit.order}강. {r.grammar.unit.title}</span>
          {r.grammar.note && <span className="text-xs text-ink-soft block mt-1">{r.grammar.note}</span>}
        </Link>
      ) : <p className="text-sm text-ink-soft">현재 제공되는 문법 강의를 모두 끝냈어요.</p>}
      <SectionTitle>오늘의 실생활 표현</SectionTitle>
      <div className="grid gap-2" data-testid="rec-expressions">{r.expressions.map(({ e, stretch }) => (
        <Link key={e.id} to={`/expressions/item/${e.id}`} className="rounded-2xl bg-white border border-line p-3 flex items-center gap-2" data-level={e.level}>
          <span className="flex-1 min-w-0"><span className="font-bold block break-words">{e.en}</span><span className="text-xs text-ink-soft">{e.ko}</span></span>
          <Tag tone={stretch ? 'lilac' : 'accent'}>{stretch ? `도전 ${e.level}` : e.level}</Tag>
        </Link>
      ))}</div>
      <SectionTitle>내 수준에 맞는 동화책</SectionTitle>
      <div className="grid gap-2" data-testid="rec-books">{r.books.map(({ b, stretch }) => (
        <Link key={b.id} to={`/library/book/${b.id}`} className="rounded-2xl bg-white border border-line p-3 flex items-center gap-3" data-level={b.level}>
          <span className="w-12 h-16 rounded-r-lg rounded-l-sm grid place-items-center text-2xl" style={{ background: b.cover.color }} aria-hidden>{b.cover.icon}</span>
          <span className="flex-1 min-w-0"><span className="font-bold block">{b.title}</span><span className="text-xs text-ink-soft">{b.titleKo}</span></span>
          <Tag tone={stretch ? 'lilac' : 'accent'}>{stretch ? `도전 ${b.level}` : b.level}</Tag>
        </Link>
      ))}</div>
      {r.notes.length > 0 && <p className="text-[11px] text-ink-faint mt-3">{r.notes.join(' ')}</p>}
    </Page>
  );
}

function RecWord({ e, level, stretch }: { e: { key: string; word: string; meaning: string; pos: string }; level: string; stretch: boolean }) {
  const save = useApp((s) => s.saveWord);
  const saved = useApp((s) => !!s.learning.myWords?.[e.key]);
  return (
    <div className="flex items-center gap-2 px-2 py-2 border-b border-line last:border-0" data-testid="rec-word" data-level={level}>
      <span className="flex-1 min-w-0"><b className="break-words">{e.word}</b> <span className="text-xs text-ink-soft">{e.pos}</span><span className="block text-sm">{e.meaning}</span></span>
      <Tag tone={stretch ? 'lilac' : 'accent'}>{stretch ? `도전 ${level}` : level}</Tag>
      <button className={cx('w-11 h-11 rounded-full grid place-items-center text-xl', saved ? 'text-accent' : 'text-ink-faint')} aria-pressed={saved} aria-label={saved ? '저장됨' : '내 단어장에 저장'}
        onClick={() => { if (!saved) save(e.word, 'words', 'recommend'); }}>{saved ? '★' : '☆'}</button>
    </div>
  );
}

/** 나의 성장 (학습 성취도) */
export function AchievementScreen() {
  const s = useApp();
  const setLevel = useApp((x) => x.setStudyLevel);
  const nav = useNavigate();
  const d = today();
  const l = s.learning;
  const lt = s.profile.levelTest;
  const [pick, setPick] = useState(false);
  const stats = useMemo(() => {
    const my = Object.values(l.myWords ?? {});
    const keys = new Set(my.map((w) => w.key));
    for (const id of Object.keys(l.learnedWords)) { const v = VOCAB_BY_ID[id]; if (v) keys.add(normKey(v.word)); }
    const days = Array.from({ length: 7 }, (_, i) => addDays(d, i - 6));
    const week = days.map((day) => ({ day, sessions: l.log.filter((e) => e.date === day && e.kind !== 'level-test').length, minutes: Math.round((l.studySeconds[day] ?? 0) / 60) }));
    const area = (kinds: string[]) => { const es = l.log.filter((e) => kinds.includes(e.kind) && e.total > 0); const c = es.reduce((a, e) => a + e.correct, 0), t = es.reduce((a, e) => a + e.total, 0); return { c, t }; };
    return {
      words: keys.size,
      memorized: my.filter((w) => myWordStatus(w, d) === 'memorized').length,
      grammar: lecturesCompleted(l),
      expressions: Object.keys(l.expressionsDone).length,
      books: Object.values(l.books ?? {}).filter((b) => b.readOn && b.quiz?.passed).length,
      week,
      areas: [
        { label: '영단어', ...area(['words', 'mywords']) },
        { label: '문법', ...area(['practice', 'test', 'writing', 'a1-exam']) },
        { label: '실생활 표현', ...area(['expression', 'situation', 'video']) },
        { label: '독해·동화책', ...area(['reading', 'book']) },
        { label: '듣기', ...area(['listening']) },
      ],
    };
  }, [l, d]);
  const maxMin = Math.max(1, ...stats.week.map((w) => Math.max(w.minutes, w.sessions)));
  const methodLabel = lt.method === 'test' ? `레벨 테스트 (${lt.date})` : lt.method === 'manual' ? '직접 선택' : lt.method === 'skip' ? '테스트 건너뜀 · 직접 선택' : lt.byLevel && Object.keys(lt.byLevel).length ? `레벨 진단 (${lt.date ?? ''})` : '기본값';
  return (
    <Page title="나의 성장" back="/my">
      <Card id="level" className="text-center" data-testid="ach-level">
        <p className="text-sm text-ink-soft">현재 추정 영어 레벨</p>
        <p className="text-4xl font-extrabold text-accent mt-1">{lt.level ?? 'A1'}</p>
        <p className="text-xs text-ink-soft">{LEVEL_KO[(lt.level ?? 'A1') as RecLevel] ?? ''} · {methodLabel}</p>
        <p className="text-[11px] text-ink-faint mt-1">{DISCLAIMER}</p>
        <div className="grid grid-cols-2 gap-2 mt-3">
          <Button variant="secondary" onClick={() => setPick(!pick)} data-testid="ach-change-level">레벨 직접 바꾸기</Button>
          <Button onClick={() => nav('/level-test')} data-testid="ach-retest">테스트 다시 보기</Button>
        </div>
        {pick && <div className="mt-3 text-left"><LevelPicker value={lt.level} onPick={(x) => { setLevel(x, 'manual'); setPick(false); }} /></div>}
      </Card>
      <div className="grid grid-cols-3 gap-2 mt-3" data-testid="ach-stats">
        <Stat label="누적 학습 단어" v={stats.words} />
        <Stat label="암기 완료" v={stats.memorized} />
        <Stat label="문법 레슨" v={stats.grammar} />
        <Stat label="학습한 표현" v={stats.expressions} />
        <Stat label="읽은 동화책" v={stats.books} />
        <Stat label="저장 단어" v={Object.keys(l.myWords ?? {}).length} />
      </div>
      <SectionTitle>최근 7일 학습</SectionTitle>
      <Card data-testid="ach-week">
        <div className="flex items-end gap-2 h-28">
          {stats.week.map((w) => (
            <div key={w.day} className="flex-1 flex flex-col items-center gap-1" title={`${w.day} · ${w.sessions}회 · ${w.minutes}분`}>
              <span className="text-[10px] text-ink-soft">{w.minutes ? `${w.minutes}분` : w.sessions ? `${w.sessions}회` : ''}</span>
              <div className="w-full rounded-t-md bg-accent/80" style={{ height: `${(Math.max(w.minutes, w.sessions) / maxMin) * 72}px`, minHeight: w.sessions ? 4 : 0 }} />
              <span className="text-[10px] text-ink-faint">{w.day.slice(5).replace('-', '/')}</span>
            </div>
          ))}
        </div>
      </Card>
      <SectionTitle>영역별 정답률</SectionTitle>
      <Card data-testid="ach-areas">{stats.areas.map((a) => <Bar key={a.label} label={a.label} v={a.c} t={a.t} />)}</Card>
      <div className="grid grid-cols-2 gap-2 mt-4">
        <Link to="/recommend" className="rounded-2xl bg-white border border-line min-h-[52px] grid place-items-center font-semibold">오늘의 추천</Link>
        <Link to="/mywords" className="rounded-2xl bg-white border border-line min-h-[52px] grid place-items-center font-semibold">나만의 단어장</Link>
      </div>
    </Page>
  );
}

function Stat({ label, v }: { label: string; v: number }) {
  return <div className="rounded-2xl bg-white border border-line p-3 text-center"><p className="text-2xl font-extrabold">{v}</p><p className="text-[11px] text-ink-soft">{label}</p></div>;
}

export type { TestArea };
