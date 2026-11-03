import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp, today } from '@/store/app';
import { dueItems, prioritizeDue } from '@/domain/learning/srs';
import { adviseWorkload } from '@/domain/learning/workload';
import { reviewQuestion } from '@/lib/questions';
import { questionById } from '@/lib/questionIndex';
import { conceptLabel } from '@/content/grammar';
import { Button, Card, Empty, Page, Tag } from '@/components/ui';
import { QuizRunner, ResultView, toAnswers, type QResult } from '@/components/Quiz';
import { PartnerBubble } from '@/components/Partner';
import type { Question } from '@/domain/types';
import { cx } from '@/lib/cx';

const KIND_LABEL: Record<string, string> = { word: '단어', grammar: '문법', dialogue: '듣기', speaking: '말하기', reading: '독해', expression: '표현' };

export function Review() {
  const nav = useNavigate();
  const s = useApp();
  const d = today();
  const due = useMemo(() => dueItems(s.learning.reviews, d), [s.learning.reviews, d]);
  const batches = useMemo(() => prioritizeDue(due, d, 15), [due, d]);
  const [session, setSession] = useState<{ items: { key: string; q: Question }[] } | null>(null);
  const [results, setResults] = useState<QResult[] | null>(null);
  const [custom, setCustom] = useState<number | null>(null);
  const [accepted, setAccepted] = useState(false);

  const start = () => {
    const items = batches[0].map((it) => ({ key: it.key, q: reviewQuestion(it) })).filter((x): x is { key: string; q: Question } => !!x.q);
    setSession({ items });
    setResults(null);
  };

  if (results && session) {
    const todayAns = s.learning.answers.filter((a) => a.date === d && a.source !== 'level-test');
    const advice = adviseWorkload(todayAns.filter((a) => a.correct).length, todayAns.length, s.settings.dailyNewWords);
    const remaining = due.length;
    return (
      <Page title="복습 결과" back="/home">
        <ResultView results={results} title="오늘의 복습">
          <Card data-testid="workload-advice">
            <p className="font-bold">📏 학습량 추천</p>
            <p className="text-sm mt-1">{advice.reason}</p>
            {advice.kind !== 'hold' && advice.kind !== 'keep' && !accepted && (
              <div className="mt-3 grid gap-2">
                <Button onClick={() => { s.updateSettings({ dailyNewWords: advice.suggested }); setAccepted(true); }} data-testid="accept-workload">신규 단어 {s.settings.dailyNewWords} → {advice.suggested}개로 변경</Button>
              </div>
            )}
            <div className="mt-3 flex items-center gap-2 flex-wrap">
              <label className="text-sm text-ink-soft" htmlFor="custom-amt">직접 설정</label>
              <select id="custom-amt" className="min-h-[44px] rounded-xl border border-line px-2" value={custom ?? s.settings.dailyNewWords} onChange={(e) => setCustom(Number(e.target.value))}>
                {[5, 6, 8, 10, 12, 15, 20, 25, 30].map((n) => <option key={n} value={n}>{n}개</option>)}
              </select>
              <Button size="sm" variant="secondary" disabled={custom === null} onClick={() => { if (custom) s.updateSettings({ dailyNewWords: custom }); setAccepted(true); }}>저장</Button>
            </div>
            {accepted && <p className="text-xs text-ok mt-2">하루 신규 단어 수가 {s.settings.dailyNewWords}개로 저장됐어요.</p>}
          </Card>
          {remaining > 0 ? <Button size="lg" onClick={start}>남은 복습 {remaining}개 계속</Button> : <Button size="lg" onClick={() => nav('/today')} data-testid="go-new-study">오늘의 신규 학습으로</Button>}
          <Button variant="secondary" onClick={() => nav('/home')}>홈으로</Button>
        </ResultView>
      </Page>
    );
  }

  if (session) {
    return (
      <Page title="오늘의 복습">
        <QuizRunner questions={session.items.map((x) => x.q)} title="복습" partnerContext="review" onDone={(rs) => {
          s.completeReview(rs.map((r, k) => ({ key: session.items[k].key, correct: r.correct, answer: toAnswers([r], 'review')[0] })));
          setResults(rs);
        }} />
      </Page>
    );
  }

  const byKind = due.reduce<Record<string, number>>((m, it) => ({ ...m, [it.kind]: (m[it.kind] ?? 0) + 1 }), {});
  return (
    <Page title="오늘의 복습" back="/home">
      {due.length === 0 ? (
        <Empty icon="🌿" title="오늘 복습할 항목이 없어요" desc="새로운 내용을 학습하면 복습 일정이 자동으로 만들어져요." action={<Link to="/today"><Button>오늘의 학습 하기</Button></Link>} />
      ) : (
        <>
          <Card>
            <p className="text-sm text-ink-soft">복습 예정</p>
            <p className="text-3xl font-extrabold" data-testid="review-total">{due.length}개</p>
            <div className="flex flex-wrap gap-1 mt-2">{Object.entries(byKind).map(([k, n]) => <Tag key={k}>{KIND_LABEL[k]} {n}</Tag>)}</div>
            {batches.length > 1 && <p className="text-xs text-ink-soft mt-2">많아서 {batches[0].length}개씩 나눠서 진행해요 (어려운 항목·오래 밀린 항목 먼저).</p>}
          </Card>
          <div className="mt-3"><PartnerBubble state="review" /></div>
          <div className="mt-4 grid gap-2">
            <Button size="lg" onClick={start} data-testid="start-review">복습 시작 ({batches[0].length}문제)</Button>
            <Button variant="ghost" onClick={() => { s.skipReviewToday(); nav('/today'); }} data-testid="skip-review">오늘은 건너뛰고 신규 학습</Button>
          </div>
          <p className="text-xs text-ink-faint mt-3">건너뛴 복습은 사라지지 않고 다음에도 남아 있어요.</p>
        </>
      )}
    </Page>
  );
}

export const AREA: Record<string, string> = { all: '전체', word: '단어', grammar: '문법', listening: '듣기', speaking: '말하기', reading: '읽기', writing: '쓰기', expression: '표현' };
export function areaOf(qid: string, source: string): string {
  if (/^w[qbrlc]-/.test(qid)) return 'word';
  if (/^rv-spk/.test(qid)) return 'speaking';
  if (/^dlg|^sit|^drama/.test(qid) || source === 'listening' || source === 'video') return 'listening';
  if (/^rd-/.test(qid)) return 'reading';
  if (/^(ess|trv|biz|phr)-/.test(qid)) return 'expression';
  if (/-w\d+$/.test(qid)) return 'writing';
  return 'grammar';
}

export function WrongNotes() {
  const s = useApp();
  const [filter, setFilter] = useState<'open' | 'all'>('open');
  const [area, setArea] = useState('all');
  const [practice, setPractice] = useState<Question[] | null>(null);
  const [res, setRes] = useState<QResult[] | null>(null);
  const notes = Object.values(s.learning.wrongNotes).filter((n) => filter === 'all' || !n.resolved).filter((n) => area === 'all' || areaOf(n.questionId, n.source) === area).sort((a, b) => b.lastWrongOn.localeCompare(a.lastWrongOn) || b.wrongCount - a.wrongCount);
  const groups = notes.reduce<Record<string, typeof notes>>((m, n) => ({ ...m, [n.conceptId]: [...(m[n.conceptId] ?? []), n] }), {});
  if (practice) {
    return (
      <Page title="오답 다시 풀기" onBack={() => { setPractice(null); setRes(null); }}>
        {!res ? <QuizRunner questions={practice} onDone={(rs) => { s.freePractice('오답 다시 풀기', toAnswers(rs, 'free')); setRes(rs); }} />
          : <ResultView results={res} title="오답 다시 풀기 결과"><Button size="lg" onClick={() => { setPractice(null); setRes(null); }}>오답노트로</Button></ResultView>}
      </Page>
    );
  }
  return (
    <Page title="오답노트" back="/home">
      <div className="flex gap-1 p-1 bg-white border border-line rounded-2xl mb-3" role="tablist">
        {(['open', 'all'] as const).map((f) => <button key={f} role="tab" aria-selected={filter === f} onClick={() => setFilter(f)} className={cx('flex-1 min-h-[44px] rounded-xl font-semibold text-sm', filter === f ? 'bg-ink text-white' : 'text-ink-soft')}>{f === 'open' ? '복습 필요' : '전체 기록'}</button>)}
      </div>
      <div className="flex gap-1 overflow-x-auto pb-2" role="group" aria-label="영역 필터">
        {Object.entries(AREA).map(([k, l]) => <button key={k} onClick={() => setArea(k)} aria-pressed={area === k} data-testid={`area-${k}`} className={cx('min-h-[44px] px-3 rounded-full text-sm font-semibold border shrink-0', area === k ? 'bg-accent text-white border-accent' : 'bg-white border-line')}>{l}</button>)}
      </div>
      {notes.length === 0 ? <Empty icon="✨" title={filter === 'open' ? '복습할 오답이 없어요' : '아직 오답 기록이 없어요'} /> : (
        <>
          <Button className="w-full mb-3" onClick={() => setPractice(notes.slice(0, 10).map((n) => questionById(n.questionId)).filter((q): q is Question => !!q))} data-testid="retry-wrong">오답 {Math.min(10, notes.length)}개 다시 풀기</Button>
          {Object.entries(groups).map(([c, list]) => (
            <div key={c} className="mb-4">
              <p className="font-bold text-sm mb-1">{conceptLabel(c)} <span className="text-ink-faint">({list.length})</span></p>
              <div className="grid gap-2">
                {list.map((n) => {
                  const q = questionById(n.questionId);
                  return (
                    <Card key={n.questionId} className="!p-3" data-testid="wrong-note">
                      <div className="flex items-center gap-1 mb-1 flex-wrap">{n.resolved ? <Tag tone="ok">해결</Tag> : <Tag tone="accent">오답 {n.wrongCount}회</Tag>}<Tag>{AREA[areaOf(n.questionId, n.source)]}</Tag>{s.learning.reviews && Object.values(s.learning.reviews).find((r) => r.conceptId === n.conceptId) && <Tag tone="lilac">복습 {Object.values(s.learning.reviews).filter((r) => r.conceptId === n.conceptId).map((r) => r.due).sort()[0]}</Tag>}{['listening', 'video'].includes(n.source) && <Tag>🎧 재청취 추천</Tag>}<span className="text-[11px] text-ink-faint ml-auto">{n.lastWrongOn}</span></div>
                      {q ? (<><p className="text-sm text-ink-soft">{q.prompt}</p>{q.sentence && <p className="font-semibold">{q.sentence}</p>}<p className="text-sm mt-1"><span className="text-bad">내 답: {n.lastGiven || '-'}</span> · <span className="text-ok">정답: {q.answers[0]}</span></p><p className="text-xs text-ink-soft mt-1">{q.explanation}</p></>) : <p className="text-sm text-ink-soft">문항 {n.questionId}</p>}
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}
        </>
      )}
    </Page>
  );
}
