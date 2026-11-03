import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useApp } from '@/store/app';
import { GRAMMAR_BY_ID, GRAMMAR_UNITS } from '@/content/grammar';
import { vocabForUnit, VOCAB } from '@/content/vocab';
import { AudioButton, Button, Card, Page, Progress, Tag, Empty } from '@/components/ui';
import { QuizRunner, ResultView, toAnswers, type QResult } from '@/components/Quiz';
import { PartnerBubble } from '@/components/Partner';
import { nextNewWords, wordQuiz } from '@/lib/questions';
import { currentUnit } from '@/lib/curriculum';
import type { Vocabulary } from '@/domain/types';

export function WordsHub() {
  const learned = useApp((s) => s.learning.learnedWords);
  const total = Object.keys(learned).length;
  return (
    <Page title="단어 숲" back="/home">
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

function WordCard({ v }: { v: Vocabulary }) {
  const g = GRAMMAR_BY_ID[v.grammarId];
  return (
    <Card data-testid="word-card">
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 flex-wrap"><p className="text-3xl font-extrabold break-words">{v.word}</p><Tag>{v.pos}</Tag></div>
          <p className="text-ink-soft text-sm mt-1">{v.ipa} · <span aria-label="한글 발음 참고">[{v.koPron}]</span></p>
          <p className="text-lg font-semibold mt-2">{v.meaning}</p>
        </div>
        <AudioButton src={v.audio} text={v.word} label="단어 발음 듣기" />
      </div>
      <div className="mt-4 rounded-2xl bg-mist p-3 flex items-start gap-3">
        <div className="flex-1 min-w-0"><p className="font-medium">{v.example}</p><p className="text-sm text-ink-soft mt-1">{v.exampleKo}</p></div>
        <AudioButton src={v.exampleAudio} text={v.example} label="예문 듣기" size="sm" />
      </div>
      {v.pattern && <p className="mt-3 text-sm"><Tag tone="lilac">연결 패턴</Tag> <b>{v.pattern}</b></p>}
      <p className="mt-3 text-xs text-ink-soft">관련 문법: <Link className="underline" to={`/grammar/${g.id}`}>{g.title}</Link></p>
      <p className="mt-1 text-[11px] text-ink-faint">발음기호는 CMU 사전 기반 미국식 자동 변환 · 음성은 합성 음성(TTS)입니다.</p>
    </Card>
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
  const [i, setI] = useState(0);
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
          <WordCard v={words[i]} />
          <div className="mt-3"><PartnerBubble state="studying" compact /></div>
          <div className="grid grid-cols-2 gap-2 mt-4">
            <Button variant="secondary" disabled={i === 0} onClick={() => setI(i - 1)}>이전</Button>
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
