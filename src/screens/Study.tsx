import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useApp } from '@/store/app';
import { READINGS, READING_BY_ID } from '@/content/reading-leveltest';
import { conceptLabel, GRAMMAR_UNITS } from '@/content/grammar';
import { computeMastery, weakConcepts } from '@/domain/learning/mastery';
import { AudioButton, Button, Card, Empty, Page, SectionTitle, Tag } from '@/components/ui';
import { QuizRunner, ResultView, toAnswers, type QResult } from '@/components/Quiz';
import { diffDays } from '@/domain/date';
import { today } from '@/store/app';

const TILES = [
  { to: '/words', icon: '🌳', title: '영단어', desc: 'A1 300단어' },
  { to: '/grammar', icon: '📘', title: '문법 강의', desc: 'A1 10단원' },
  { to: '/listening', icon: '🎧', title: '듣기', desc: '실생활 대화 10편' },
  { to: '/speaking', icon: '🎙', title: '말하기', desc: '따라 말하기 30문장' },
  { to: '/reading', icon: '📖', title: '독해', desc: 'A1 읽기' },
  { to: '/expressions', icon: '💬', title: '표현 학습관', desc: '회화·여행·비즈니스·영상' },
];

export function FreeStudy() {
  return (
    <Page title="자유학습" back="/home">
      <p className="text-sm text-ink-soft">순서에 상관없이 원하는 것부터 공부하세요. 결과는 학습 기록·복습·보상에 똑같이 반영돼요.</p>
      <div className="grid grid-cols-2 gap-2 mt-3">
        {TILES.map((t) => (
          <Link key={t.to} to={t.to} className="rounded-2xl bg-white border border-line p-4 min-h-[96px]" data-testid={`free-${t.to.slice(1)}`}>
            <p className="text-2xl" aria-hidden>{t.icon}</p><p className="font-bold mt-1">{t.title}</p><p className="text-xs text-ink-soft">{t.desc}</p>
          </Link>
        ))}
      </div>
      <SectionTitle>단원별 영작 바로가기</SectionTitle>
      <div className="flex flex-wrap gap-2">{GRAMMAR_UNITS.map((u) => <Link key={u.id} to={`/grammar/${u.id}/writing`} className="rounded-xl bg-white border border-line px-3 min-h-[44px] grid place-items-center text-sm">{u.order}. {u.title}</Link>)}</div>
    </Page>
  );
}

export function ReadingHub() {
  const done = useApp((s) => s.learning.readingsDone);
  return (
    <Page title="A1 독해" back="/free">
      <div className="grid gap-2">{READINGS.map((r) => <Link key={r.id} to={`/reading/${r.id}`} className="rounded-2xl bg-white border border-line p-3 min-h-[60px] flex items-center justify-between"><span><span className="font-semibold block">{r.title}</span><span className="text-xs text-ink-soft">{conceptLabel(r.grammarId)} · 문제 {r.questions.length}개</span></span>{done[r.id] && <Tag tone="ok">완료</Tag>}</Link>)}</div>
    </Page>
  );
}

export function Reader() {
  const { id = '' } = useParams();
  const r = READING_BY_ID[id];
  const nav = useNavigate();
  const complete = useApp((s) => s.completeReading);
  const [ko, setKo] = useState(false);
  const [phase, setPhase] = useState<'read' | 'quiz' | 'result'>('read');
  const [rs, setRs] = useState<QResult[]>([]);
  if (!r) return <Page title="독해"><Empty title="글을 찾을 수 없어요" /></Page>;
  return (
    <Page title={`독해 · ${r.title}`}>
      {phase === 'read' && (
        <>
          <div className="flex justify-end mb-2"><Button size="sm" variant="secondary" onClick={() => setKo(!ko)} aria-pressed={ko}>{ko ? '해석 숨기기' : '해석 보기'}</Button></div>
          <Card className="grid gap-3">{r.paragraphs.map((p) => (
            <div key={p.en} className="flex gap-3 items-start"><div className="flex-1"><p className="leading-relaxed">{p.en}</p>{ko && <p className="text-sm text-ink-soft mt-1">{p.ko}</p>}</div>{p.audio && <AudioButton src={p.audio} text={p.en} size="sm" />}</div>
          ))}</Card>
          <div className="mt-4"><Button size="lg" onClick={() => setPhase('quiz')}>문제 풀기</Button></div>
        </>
      )}
      {phase === 'quiz' && <QuizRunner questions={r.questions} onDone={(x) => { complete(r.id, r.grammarId, r.title, toAnswers(x, 'reading')); setRs(x); setPhase('result'); }} />}
      {phase === 'result' && <ResultView results={rs} title="독해 결과"><Button size="lg" onClick={() => nav('/reading')}>목록으로</Button></ResultView>}
    </Page>
  );
}

export function Analysis() {
  const l = useApp((s) => s.learning);
  const m = useMemo(() => computeMastery(l.answers.filter((a) => a.source !== 'level-test')), [l.answers]);
  const weak = weakConcepts(m);
  const list = Object.values(m).sort((a, b) => a.conceptId.localeCompare(b.conceptId));
  const listening = l.answers.filter((a) => a.source === 'listening');
  const totalSec = Object.values(l.studySeconds ?? {}).reduce((a, b) => a + b, 0);
  const todaySec = l.studySeconds?.[today()] ?? 0;
  const weakWords = Object.values(l.wrongNotes).filter((n) => !n.resolved && /^w[qbrlc]-/.test(n.questionId)).map((n) => n.questionId.slice(3));
  const areas: [string, number][] = [
    ['단어', Object.keys(l.learnedWords).length], ['문법 단원', Object.keys(l.lectureViewed).length], ['듣기', Object.keys(l.listeningDone).length],
    ['말하기 문장', new Set(l.speakingAttempts.map((a) => a.sentenceId)).size], ['독해', Object.keys(l.readingsDone).length], ['표현', Object.keys(l.expressionsDone).length],
  ];
  const speakingStt = l.speakingAttempts.filter((a) => a.mode === 'stt');
  return (
    <Page title="실력 분석" back="/home">
      {list.length === 0 ? <Empty icon="📈" title="아직 분석할 학습 기록이 없어요" desc="문제를 풀면 개념별 정답률과 취약 개념을 보여 드려요." /> : (
        <>
          <Card className="grid grid-cols-3 gap-2 text-center" data-testid="stats-summary">
            <div><p className="text-xs text-ink-soft">오늘 학습</p><p className="font-bold">{Math.round(todaySec / 60)}분</p></div>
            <div><p className="text-xs text-ink-soft">누적 학습</p><p className="font-bold">{Math.round(totalSec / 60)}분</p></div>
            <div><p className="text-xs text-ink-soft">학습 완료</p><p className="font-bold">{l.log.filter((e) => e.kind !== 'level-test').length}회</p></div>
          </Card>
          <p className="text-[11px] text-ink-faint mt-1">학습 시간은 학습 화면을 실제로 보고 있던 시간(15초 단위)으로 측정해요.</p>
          <SectionTitle>영역별 학습 현황</SectionTitle>
          <Card className="grid grid-cols-3 gap-2 text-center text-sm">{areas.map(([k, v]) => <div key={k}><p className="text-xs text-ink-soft">{k}</p><p className="font-bold">{v}</p></div>)}</Card>
          <SectionTitle>취약 어휘</SectionTitle>
          <Card className="text-sm">{weakWords.length ? weakWords.slice(0, 20).join(', ') : '틀린 단어가 없어요.'}</Card>
          <SectionTitle>취약 개념</SectionTitle>
          {weak.length === 0 ? <Card><p className="text-sm">취약 개념이 없어요. (3회 이상 풀고 최근 정답률 70% 미만인 개념을 표시해요)</p></Card> : (
            <div className="grid gap-2" data-testid="weak-concepts">{weak.map((c) => (
              <Card key={c.conceptId} className="!p-3 flex items-center gap-3"><div className="flex-1"><p className="font-semibold">{conceptLabel(c.conceptId)}</p><p className="text-xs text-ink-soft">최근 정답률 {Math.round(c.recentAccuracy * 100)}% · {c.attempts}문항</p></div>
                {c.conceptId.startsWith('a1-u') && <Link to={`/grammar/${c.conceptId}`}><Button size="sm" variant="secondary">다시 배우기</Button></Link>}</Card>
            ))}</div>
          )}
          <SectionTitle>개념별 정답률</SectionTitle>
          <Card className="grid gap-2">{list.map((c) => (
            <div key={c.conceptId}>
              <div className="flex justify-between text-sm"><span className="truncate">{conceptLabel(c.conceptId)}</span><span className="text-ink-soft">{Math.round(c.accuracy * 100)}% ({c.correct}/{c.attempts})</span></div>
              <div className="h-2 rounded-full bg-mist overflow-hidden mt-1"><div className={c.accuracy >= 0.7 ? 'h-full bg-ok' : 'h-full bg-accent'} style={{ width: `${c.accuracy * 100}%` }} /></div>
            </div>
          ))}</Card>
          <SectionTitle>듣기 · 말하기</SectionTitle>
          <Card className="grid grid-cols-2 gap-3 text-sm">
            <div><p className="text-ink-soft">듣기 문제 정답률</p><p className="font-bold text-lg">{listening.length ? Math.round((listening.filter((a) => a.correct).length / listening.length) * 100) : 0}%</p><p className="text-xs text-ink-faint">{listening.length}문항</p></div>
            <div><p className="text-ink-soft">말하기 연습</p><p className="font-bold text-lg">{l.speakingAttempts.length}회</p><p className="text-xs text-ink-faint">STT 인식 {speakingStt.length}회</p></div>
          </Card>
          <p className="text-[11px] text-ink-faint mt-2">말하기의 음성 인식 일치 결과는 발음 숙련도 점수로 계산하지 않아요.</p>
        </>
      )}
    </Page>
  );
}

const KIND: Record<string, string> = { words: '단어', grammar: '강의', practice: '확인 문제', listening: '듣기', speaking: '말하기', writing: '영작', test: '단원 평가', review: '복습', reading: '독해', 'level-test': '레벨 진단', free: '자유학습', 'a1-exam': '레벨 평가', expression: '표현', situation: '상황 듣기', video: '영상' };

export function History() {
  const log = useApp((s) => s.learning.log);
  const byDate = log.slice().reverse().reduce<Record<string, typeof log>>((m, e) => ({ ...m, [e.date]: [...(m[e.date] ?? []), e] }), {});
  const dates = Object.keys(byDate).sort().reverse();
  let streak = 0;
  for (let k = 0, d = today(); ; k++) {
    const target = dates.find((x) => diffDays(x, d) === k);
    if (!target) break;
    streak++;
  }
  return (
    <Page title="학습 기록" back="/home">
      <Card className="grid grid-cols-3 text-center">
        <div><p className="text-xs text-ink-soft">연속 학습</p><p className="font-extrabold text-xl" data-testid="streak">{streak}일</p></div>
        <div><p className="text-xs text-ink-soft">학습일</p><p className="font-extrabold text-xl">{dates.length}일</p></div>
        <div><p className="text-xs text-ink-soft">활동</p><p className="font-extrabold text-xl">{log.length}회</p></div>
      </Card>
      {dates.length === 0 ? <Empty title="아직 학습 기록이 없어요" /> : dates.map((d) => (
        <div key={d}>
          <SectionTitle>{d}</SectionTitle>
          <Card className="!p-2 divide-y divide-line">{byDate[d].map((e) => (
            <div key={e.id} className="flex items-center gap-2 p-2 text-sm" data-testid="log-row"><Tag>{KIND[e.kind] ?? e.kind}</Tag><span className="flex-1 truncate">{e.title}</span>{e.total > 0 && <span className="text-ink-soft">{e.correct}/{e.total}</span>}</div>
          ))}</Card>
        </div>
      ))}
    </Page>
  );
}
