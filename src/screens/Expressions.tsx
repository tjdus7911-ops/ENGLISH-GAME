import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useApp, today, now } from '@/store/app';
import { EXPRESSIONS, EXPRESSION_BY_ID, EXPRESSION_CATEGORIES, SITUATIONS, SITUATION_BY_ID, DRAMAS, type Expression, type ExpressionCategory } from '@/content/expressions';
import { conceptLabel } from '@/content/grammar';
import type { Level, SpeakingSentence } from '@/domain/types';
import { AudioButton, Button, Card, Empty, Page, SectionTitle, Tag } from '@/components/ui';
import { QuizRunner, ResultView, toAnswers, type QResult } from '@/components/Quiz';
import { PartnerBubble } from '@/components/Partner';
import { DialogueLesson } from './Listening';
import { SentencePractice } from './Speaking';
import { cx } from '@/lib/cx';

const LEVELS: (Level | 'all')[] = ['all', 'A1', 'A2', 'B1', 'B2'];

function useFilters() {
  const [level, setLevel] = useState<Level | 'all'>('all');
  const [q, setQ] = useState('');
  return { level, setLevel, q, setQ };
}

function matches(e: Expression, level: Level | 'all', q: string) {
  if (level !== 'all' && e.level !== level) return false;
  if (!q.trim()) return true;
  const k = q.trim().toLowerCase();
  return [e.en, e.ko, e.usage, ...e.tags, ...e.keywords].some((x) => x.toLowerCase().includes(k));
}

function Filters({ f }: { f: ReturnType<typeof useFilters> }) {
  return (
    <div className="grid gap-2">
      <input value={f.q} onChange={(e) => f.setQ(e.target.value)} placeholder="상황·표현 검색 (예: 호텔, 사과, check)" aria-label="상황별 검색"
        className="w-full min-h-[48px] rounded-2xl border border-line px-4 bg-white focus:outline-none focus:ring-2 focus:ring-accent/40" />
      <div className="flex gap-1 overflow-x-auto pb-1" role="group" aria-label="레벨 필터">
        {LEVELS.map((l) => <button key={l} onClick={() => f.setLevel(l)} aria-pressed={f.level === l} className={cx('min-h-[44px] min-w-[52px] px-3 rounded-full text-sm font-semibold border shrink-0', f.level === l ? 'bg-ink text-white border-ink' : 'bg-white border-line')}>{l === 'all' ? '전체' : l}</button>)}
      </div>
    </div>
  );
}

function ExprRow({ e }: { e: Expression }) {
  const done = useApp((s) => !!s.learning.expressionsDone[e.id]);
  const saved = useApp((s) => s.learning.savedExpressions.includes(e.id));
  return (
    <Link to={`/expressions/item/${e.id}`} className="rounded-2xl bg-white border border-line p-3 flex items-center gap-3 min-h-[60px]" data-testid="expr-row">
      <span className="flex-1 min-w-0"><span className="font-semibold block truncate">{e.en}</span><span className="text-xs text-ink-soft truncate block">{e.ko}</span></span>
      <span className="flex gap-1 shrink-0"><Tag>{e.level}</Tag>{saved && <Tag tone="warn">★</Tag>}{done && <Tag tone="ok">완료</Tag>}</span>
    </Link>
  );
}

export function ExpressionHall() {
  const f = useFilters();
  const done = useApp((s) => s.learning.expressionsDone);
  const saved = useApp((s) => s.learning.savedExpressions);
  const listen = useApp((s) => s.learning.listeningDone);
  const dramas = useApp((s) => s.learning.dramasDone);
  const searching = f.q.trim() || f.level !== 'all';
  const results = useMemo(() => (searching ? EXPRESSIONS.filter((e) => matches(e, f.level, f.q)) : []), [searching, f.level, f.q]);
  const count = (c: ExpressionCategory) => {
    if (c === 'situation') return { total: SITUATIONS.length, done: SITUATIONS.filter((s) => listen[s.id]).length };
    if (c === 'video') return { total: DRAMAS.length, done: DRAMAS.filter((d) => dramas[d.id]).length };
    const list = EXPRESSIONS.filter((e) => e.category === c);
    return { total: list.length, done: list.filter((e) => done[e.id]).length };
  };
  return (
    <Page title="표현 학습관" back="/free">
      <Filters f={f} />
      {searching ? (
        <div className="mt-3">
          <p className="text-sm text-ink-soft mb-2">검색 결과 {results.length}개</p>
          {results.length === 0 ? <Empty icon="🔎" title="맞는 표현이 없어요" /> : <div className="grid gap-2">{results.slice(0, 60).map((e) => <ExprRow key={e.id} e={e} />)}</div>}
        </div>
      ) : (
        <>
          <Link to="/expressions/saved" className="mt-3 rounded-2xl bg-white border border-line p-3 min-h-[52px] flex items-center justify-between"><span className="font-semibold">⭐ 저장한 표현</span><Tag tone="warn">{saved.length}</Tag></Link>
          <div className="grid grid-cols-2 gap-2 mt-3">
            {EXPRESSION_CATEGORIES.map((c) => {
              const n = count(c.id);
              return (
                <Link key={c.id} to={`/expressions/c/${c.id}`} className={cx('rounded-2xl p-4 min-h-[120px] border border-line', c.tint)} data-testid={`cat-${c.id}`}>
                  <p className="text-2xl" aria-hidden>{c.emoji}</p>
                  <p className="font-bold mt-1 leading-tight">{c.title}</p>
                  <p className="text-xs text-ink-soft mt-0.5">{c.desc}</p>
                  <p className="text-xs font-semibold mt-2">{n.done}/{n.total} 완료</p>
                </Link>
              );
            })}
          </div>
          <p className="text-[11px] text-ink-faint mt-3">모든 표현은 자동 검증만 완료된 상태이며 교육 전문가 검수가 필요합니다.</p>
        </>
      )}
    </Page>
  );
}

export function ExpressionList() {
  const { cat = '' } = useParams();
  const f = useFilters();
  const meta = EXPRESSION_CATEGORIES.find((c) => c.id === cat);
  const listen = useApp((s) => s.learning.listeningDone);
  const dramaDone = useApp((s) => s.learning.dramasDone);
  if (!meta) return <Page title="표현"><Empty title="카테고리를 찾을 수 없어요" /></Page>;
  if (cat === 'situation') {
    return (
      <Page title={meta.title} back="/expressions">
        <div className="grid gap-2">{SITUATIONS.map((s, i) => (
          <Link key={s.id} to={`/situations/${s.id}`} className="rounded-2xl bg-white border border-line p-3 flex items-center gap-3 min-h-[60px]">
            <span className="w-9 h-9 rounded-xl bg-butter grid place-items-center font-bold">{i + 1}</span>
            <span className="flex-1 min-w-0"><span className="font-semibold block">{s.title} <span className="text-sm font-normal text-ink-faint">{s.titleEn}</span></span><span className="text-xs text-ink-soft">{s.situation}</span></span>
            <span className="flex gap-1"><Tag>{s.level}</Tag>{listen[s.id] && <Tag tone="ok">완료</Tag>}</span>
          </Link>
        ))}</div>
      </Page>
    );
  }
  if (cat === 'video') {
    return (
      <Page title={meta.title} back="/expressions">
        <Card className="mb-3 text-xs text-ink-soft leading-relaxed">영화·드라마 클립을 사용하지 않아요. 모든 영상은 앱에서 직접 제작한 오리지널 미니 드라마이며, 각 영상의 권리 확인 기록을 함께 보여 드려요.</Card>
        <div className="grid gap-2">{DRAMAS.map((d) => (
          <Link key={d.id} to={`/video/${d.id}`} className="rounded-2xl bg-white border border-line p-3 flex items-center gap-3 min-h-[72px]" data-testid={`drama-${d.id}`}>
            <span className="w-16 h-12 rounded-xl bg-ink/90 text-white grid place-items-center text-lg shrink-0">🎬</span>
            <span className="flex-1 min-w-0"><span className="font-semibold block">{d.title} <span className="text-sm text-ink-faint font-normal">{d.titleEn}</span></span><span className="text-xs text-ink-soft line-clamp-2">{d.synopsis}</span></span>
            <span className="flex flex-col gap-1 items-end">{d.video ? <Tag tone="ok">{d.durationSec ? `${Math.round(d.durationSec)}초` : '영상'}</Tag> : <Tag>준비 중</Tag>}{dramaDone[d.id] && <Tag tone="ok">완료</Tag>}</span>
          </Link>
        ))}</div>
      </Page>
    );
  }
  const list = EXPRESSIONS.filter((e) => e.category === cat && matches(e, f.level, f.q));
  return (
    <Page title={meta.title} back="/expressions">
      <Filters f={f} />
      <div className="grid gap-2 mt-3">{list.length ? list.map((e) => <ExprRow key={e.id} e={e} />) : <Empty title="조건에 맞는 표현이 없어요" />}</div>
    </Page>
  );
}

export function SavedExpressions() {
  const saved = useApp((s) => s.learning.savedExpressions);
  return (
    <Page title="저장한 표현" back="/expressions">
      {saved.length === 0 ? <Empty icon="⭐" title="저장한 표현이 없어요" desc="표현 상세에서 ☆를 눌러 저장하면 복습 목록에도 등록돼요." /> : <div className="grid gap-2">{saved.map((id) => EXPRESSION_BY_ID[id]).filter(Boolean).map((e) => <ExprRow key={e.id} e={e} />)}</div>}
    </Page>
  );
}

export function ExpressionDetail() {
  const { id = '' } = useParams();
  const e = EXPRESSION_BY_ID[id];
  const nav = useNavigate();
  const saved = useApp((s) => s.learning.savedExpressions.includes(id));
  const toggle = useApp((s) => s.toggleSaveExpression);
  const complete = useApp((s) => s.completeExpression);
  const done = useApp((s) => s.learning.expressionsDone[id]);
  const [ko, setKo] = useState(true);
  const [phase, setPhase] = useState<'learn' | 'quiz' | 'result'>('learn');
  const [rs, setRs] = useState<QResult[]>([]);
  const [spoken, setSpoken] = useState(0);
  if (!e) return <Page title="표현"><Empty title="표현을 찾을 수 없어요" /></Page>;
  const shadow: SpeakingSentence = { id: `${e.id}-sp`, level: e.level, en: e.dialogue[1].en, ko: e.dialogue[1].ko, grammarId: e.conceptId, tip: '대화의 두 번째 문장을 그대로 따라 말해 보세요.', audio: e.dialogue[1].audio };
  const meta = EXPRESSION_CATEGORIES.find((c) => c.id === e.category)!;
  return (
    <Page title={meta.title} right={<button aria-pressed={saved} aria-label={saved ? '저장 취소' : '표현 저장'} onClick={() => toggle(id)} className="w-11 h-11 grid place-items-center text-xl" data-testid="save-expr">{saved ? '⭐' : '☆'}</button>}>
      {phase === 'learn' && (
        <>
          <Card>
            <div className="flex items-start gap-3">
              <div className="flex-1 min-w-0"><p className="text-2xl font-extrabold break-words">{e.en}</p><p className="text-lg mt-1">{e.ko}</p></div>
              <AudioButton src={e.audio} text={e.en} />
            </div>
            <div className="flex flex-wrap gap-1 mt-3"><Tag tone="accent">{e.level}</Tag>{e.tags.map((t) => <Tag key={t}>#{t}</Tag>)}{e.grammarId && <Tag tone="lilac">{conceptLabel(e.grammarId)}</Tag>}{done && <Tag tone="ok">학습 완료</Tag>}</div>
            <p className="text-xs text-ink-soft mt-2">핵심 어휘: {e.keywords.join(', ')}</p>
          </Card>
          <SectionTitle>언제 쓰나요?</SectionTitle>
          <Card className="text-sm">{e.usage}</Card>
          <SectionTitle>비슷한 표현과 차이</SectionTitle>
          <Card className="text-sm">{e.similar}</Card>
          <SectionTitle>주의할 뉘앙스</SectionTitle>
          <Card className="text-sm bg-butter border-[#F2D98A]">⚠️ {e.nuance}</Card>
          <SectionTitle right={<button className="text-sm text-accent font-semibold min-h-[44px]" onClick={() => setKo(!ko)}>{ko ? '해석 숨기기' : '해석 보기'}</button>}>대화 예문</SectionTitle>
          <Card className="!p-2">{e.dialogue.map((l, i) => (
            <div key={i} className="flex items-start gap-2 p-2">
              <span className={cx('text-xs font-bold w-5 pt-1', l.speaker === 'A' ? 'text-accent-dark' : 'text-[#3D6FB5]')}>{l.speaker}</span>
              <div className="flex-1"><p className="font-medium">{l.en}</p>{ko && <p className="text-sm text-ink-soft">{l.ko}</p>}</div>
              <AudioButton src={l.audio} text={l.en} size="sm" />
            </div>
          ))}</Card>
          <SectionTitle>따라 말하기</SectionTitle>
          <SentencePractice s={shadow} onAttempt={() => setSpoken((n) => n + 1)} />
          <div className="mt-4"><PartnerBubble state="studying" compact text={spoken ? '좋아! 이제 듣기 문제와 응용 영작으로 마무리하자.' : '대화를 듣고 따라 말해 본 뒤 문제를 풀어 보자.'} /></div>
          <div className="mt-4"><Button size="lg" onClick={() => setPhase('quiz')} data-testid="expr-quiz">듣기 문제 · 응용 영작</Button></div>
        </>
      )}
      {phase === 'quiz' && <QuizRunner questions={[e.listening, e.writing]} title="표현 확인" onDone={(x) => { complete(e.id, e.conceptId, e.en, toAnswers(x, 'expression')); setRs(x); setPhase('result'); }} />}
      {phase === 'result' && (
        <ResultView results={rs} title={`"${e.en}" 학습 결과`}>
          {!saved && <Button variant="secondary" onClick={() => toggle(id)}>⭐ 복습 목록에 저장</Button>}
          <Button size="lg" onClick={() => {
            const list = EXPRESSIONS.filter((x) => x.category === e.category);
            const next = list[list.findIndex((x) => x.id === e.id) + 1];
            nav(next ? `/expressions/item/${next.id}` : `/expressions/c/${e.category}`);
            setPhase('learn');
          }}>다음 표현</Button>
        </ResultView>
      )}
    </Page>
  );
}

export function SituationPlayer() {
  const { id = '' } = useParams();
  const d = SITUATION_BY_ID[id];
  const [shadow, setShadow] = useState(false);
  void today; void now;
  if (!d) return <Page title="상황 대화"><Empty title="대화를 찾을 수 없어요" /></Page>;
  return (
    <Page title={`상황 · ${d.title}`}>
      <DialogueLesson d={d} kind="situation" onFinishPath="/expressions/c/situation" />
      <SectionTitle right={<button className="text-sm text-accent font-semibold min-h-[44px]" onClick={() => setShadow(!shadow)}>{shadow ? '접기' : '열기'}</button>}>핵심 표현 따라 말하기</SectionTitle>
      {shadow && <div className="grid gap-3">{d.keyExpressions.map((k, i) => (
        <SentencePractice key={i} s={{ id: `${d.id}-k${i}`, level: d.level, en: k.en, ko: k.ko, grammarId: 'expr-situation', tip: '들은 그대로 리듬을 살려 말해 보세요.', audio: k.audio! }} onAttempt={() => {}} />
      ))}</div>}
    </Page>
  );
}
