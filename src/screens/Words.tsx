import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useApp } from '@/store/app';
import { GRAMMAR_BY_ID, GRAMMAR_UNITS } from '@/content/grammar';
import { vocabForUnit, VOCAB } from '@/content/vocab';
import { AudioButton, Button, Card, Page, Progress, Tag, Empty } from '@/components/ui';
import { QuizRunner, ResultView, toAnswers, type QResult } from '@/components/Quiz';
import { WordStudy } from '@/components/WordStudyCard';
import { nextNewWords, wordQuiz } from '@/lib/questions';
import { currentUnit } from '@/lib/curriculum';

/** 보조 메뉴: 기존 문법 단원별 단어장 (학습 기록은 단어 id 로 단어 숲과 통합) */
export function GrammarWordsHub() {
  const learned = useApp((s) => s.learning.learnedWords);
  const total = Object.keys(learned).length;
  return (
    <Page title="문법 단원별 단어장" back="/words">
      <Card>
        <p className="text-sm text-ink-soft">학습한 A1 단어</p>
        <p className="text-2xl font-extrabold">{total} <span className="text-ink-faint text-base">/ {VOCAB.length}</span></p>
        <div className="mt-2"><Progress value={total} max={VOCAB.length} /></div>
        <div className="mt-3 flex gap-2"><Link to="/review"><Button size="sm" variant="secondary">단어 복습</Button></Link></div>
      </Card>
      <div className="grid gap-2 mt-3">
        {GRAMMAR_UNITS.map((u) => {
          const words = vocabForUnit(u.id);
          const n = words.filter((w) => learned[w.id]).length;
          return (
            <Link key={u.id} to={`/words/${u.id}`} className="rounded-2xl bg-white border border-line p-3 flex items-center gap-3 min-h-[60px]">
              <span className="font-bold w-8 text-accent">{u.order}</span>
              <span className="flex-1 min-w-0"><span className="block font-semibold truncate">{u.title} 단어</span><span className="text-xs text-ink-soft">{words.slice(0, 4).map((w) => w.word).join(', ')}…</span></span>
              <Tag tone={n === words.length ? 'ok' : 'gray'}>{n}/{words.length}</Tag>
            </Link>
          );
        })}
      </div>
    </Page>
  );
}

export function WordLearn() {
  const { unitId = '' } = useParams();
  const [sp] = useSearchParams();
  const flow = sp.get('flow');
  const nav = useNavigate();
  const learned = useApp((s) => s.learning.learnedWords);
  const daily = useApp((s) => s.settings.dailyNewWords);
  const complete = useApp((s) => s.completeWords);
  const unit = GRAMMAR_BY_ID[unitId];
  const [mode, setMode] = useState<'new' | 'all'>('new');
  // 학습 시작 시점의 단어 목록 고정
  const [words] = useState(() => {
    const fresh = nextNewWords(unitId, learned, daily);
    return fresh.length ? fresh : vocabForUnit(unitId).slice(0, daily);
  });
  const isRepeat = words.every((w) => learned[w.id]);
  // 새로고침해도 보던 카드 위치를 이어서 (같은 날·같은 단원·같은 단어 묶음일 때만)
  const posKey = `words-pos:${unitId}:${new Date().toDateString()}:${words.map((w) => w.id).join(',')}`;
  const [i, setIRaw] = useState(() => { try { const v = Number(sessionStorage.getItem(posKey)); return Number.isFinite(v) && v > 0 && v < words.length ? v : 0; } catch { return 0; } });
  const setI = (n: number) => { setIRaw(n); try { sessionStorage.setItem(posKey, String(n)); } catch { /* 저장 불가 환경 무시 */ } };
  const [phase, setPhase] = useState<'cards' | 'quiz' | 'result'>('cards');
  const [results, setResults] = useState<QResult[]>([]);
  const quiz = useMemo(() => wordQuiz(words, unitId.length * 31 + words.length), [words, unitId]);
  if (!unit) return <Page title="단어"><Empty title="단원을 찾을 수 없어요" /></Page>;

  if (mode === 'all') {
    return (
      <Page title={`${unit.title} 단어 목록`} onBack={() => setMode('new')}>
        <div className="grid gap-2">{vocabForUnit(unitId).map((v) => (
          <Card key={v.id} className="!p-3 flex items-center gap-3">
            <div className="flex-1 min-w-0"><p className="font-bold">{v.word} <span className="text-ink-faint text-xs">{v.pos}</span> {learned[v.id] && <Tag tone="ok">학습</Tag>}</p><p className="text-sm text-ink-soft truncate">{v.meaning} · {v.example}</p></div>
            <AudioButton src={v.audio} text={v.word} size="sm" />
          </Card>
        ))}</div>
      </Page>
    );
  }

  return (
    <Page title={`단어 학습 · ${unit.title}`} right={<button className="text-sm text-ink-soft px-2 min-h-[44px]" onClick={() => setMode('all')}>전체 목록</button>}>
      {phase === 'cards' && (
        <>
          <div className="flex items-center gap-3 mb-3"><span className="text-sm font-semibold text-ink-soft whitespace-nowrap">{i + 1} / {words.length}</span><Progress value={i + 1} max={words.length} /></div>
          {isRepeat && <p className="text-xs text-ink-soft mb-2">이 단원의 단어를 모두 학습했어요. 다시 보기 모드입니다 (보상은 중복 지급되지 않아요).</p>}
          <WordStudy key={words[i].id} v={words[i]} index={i} total={words.length} />
          <div className="grid grid-cols-2 gap-2 mt-4">
            <Button variant="secondary" disabled={i === 0} onClick={() => setI(i - 1)}>이전 단어</Button>
            {i + 1 < words.length ? <Button onClick={() => setI(i + 1)}>다음 단어</Button> : <Button onClick={() => setPhase('quiz')} data-testid="start-word-quiz">단어 퀴즈</Button>}
          </div>
        </>
      )}
      {phase === 'quiz' && <QuizRunner questions={quiz} title="단어 퀴즈" onDone={(rs) => { setResults(rs); complete(unitId, words.map((w) => w.id), toAnswers(rs, flow ? 'lesson' : 'free')); setPhase('result'); }} />}
      {phase === 'result' && (
        <ResultView results={results} title="단어 퀴즈 결과">
          {flow ? <Button size="lg" onClick={() => nav('/today')}>다음 단계로</Button> : <Button size="lg" onClick={() => nav('/words')}>단어 숲으로</Button>}
          <Button variant="secondary" onClick={() => nav(`/grammar/${unitId}${flow ? '?flow=today' : ''}`)}>연결된 문법 배우기: {unit.title}</Button>
        </ResultView>
      )}
    </Page>
  );
}

export function useCurrentUnitId() {
  const l = useApp((s) => s.learning);
  return currentUnit(l).id;
}
