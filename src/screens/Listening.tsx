import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useApp } from '@/store/app';
import { DIALOGUES, DIALOGUE_BY_ID } from '@/content/dialogues';
import { GRAMMAR_BY_ID } from '@/content/grammar';
import type { Dialogue } from '@/domain/types';
import { AudioButton, Button, Card, Empty, Page, SectionTitle, Tag, usePlayStatus } from '@/components/ui';
import { QuizRunner, ResultView, toAnswers, type QResult } from '@/components/Quiz';
import { PartnerBubble } from '@/components/Partner';
import { pauseAudio, playAudio, resumeAudio, setRate, stopAudio } from '@/lib/audio';
import { cx } from '@/lib/cx';

export function ListeningHub() {
  const done = useApp((s) => s.learning.listeningDone);
  return (
    <Page title="듣기 학습" back="/free">
      <div className="flex gap-1 mb-3"><Tag tone="accent">A1</Tag><Tag>실생활 대화 {DIALOGUES.length}편</Tag></div>
      <div className="grid gap-2">
        {DIALOGUES.map((d, i) => (
          <Link key={d.id} to={`/listening/${d.id}`} className="rounded-2xl bg-white border border-line p-3 flex items-center gap-3 min-h-[64px]">
            <span className="w-9 h-9 rounded-xl bg-sky grid place-items-center font-bold">{i + 1}</span>
            <span className="flex-1 min-w-0"><span className="block font-semibold">{d.title} <span className="text-ink-faint font-normal text-sm">{d.titleEn}</span></span><span className="text-xs text-ink-soft">{GRAMMAR_BY_ID[d.grammarId]?.title} · {d.situation}</span></span>
            {done[d.id] && <Tag tone="ok">완료</Tag>}
          </Link>
        ))}
      </div>
      <p className="text-xs text-ink-faint mt-4">음성은 오프라인 신경망 TTS(Piper · LibriTTS, CC BY 4.0)로 만든 합성 음성입니다. 원어민 녹음이 아닙니다.</p>
    </Page>
  );
}

const RATES = [0.75, 0.9, 1, 1.2];

/** 듣기 플레이어 + 문제. 문법 대화(DIALOGUES)와 표현 학습관 상황 대화(SITUATIONS)가 함께 사용 */
export function DialogueLesson({ d, kind, onFinishPath }: { d: Dialogue; kind: 'listening' | 'situation'; onFinishPath: string }) {
  const nav = useNavigate();
  const complete = useApp((s) => s.completeListening);
  const baseRate = useApp((s) => s.settings.speechRate);
  const [rate, setR] = useState(baseRate);
  const [showScript, setShowScript] = useState(false);
  const [showKo, setShowKo] = useState(false);
  const [phase, setPhase] = useState<'listen' | 'quiz' | 'dictation' | 'result'>('listen');
  const [results, setResults] = useState<QResult[]>([]);
  const [plays, setPlays] = useState(0);
  const st = usePlayStatus();
  const fullActive = st.src === d.audio;
  useEffect(() => () => stopAudio(), []);

  const playAll = () => { setPlays((p) => p + 1); void playAudio(d.audio, { rate, fallbackText: d.lines.map((l) => l.en).join(' ') }); };

  return (
    <>
      {phase === 'listen' && (
        <>
          <Card>
            <p className="text-sm text-ink-soft">{d.situation}</p>
            {/* 재생 컨트롤 — 스크립트와 분리 */}
            <div className="mt-3 flex flex-wrap items-center gap-2 [&>button]:whitespace-nowrap" data-testid="player">
              {!fullActive || st.state === 'error' ? (
                <Button onClick={playAll} data-testid="play-all" aria-label="대화 전체 재생">▶ 재생</Button>
              ) : st.state === 'paused' ? (
                <Button onClick={resumeAudio} aria-label="이어서 재생">▶ 계속</Button>
              ) : (
                <Button onClick={pauseAudio} aria-label="일시정지" data-testid="pause">❚❚ 일시정지</Button>
              )}
              <Button variant="secondary" onClick={playAll} aria-label="처음부터 다시 듣기">↻ 반복</Button>
              <div className="ml-auto flex items-center gap-1 shrink-0" role="group" aria-label="재생 속도">
                {RATES.map((r) => (
                  <button key={r} onClick={() => { setR(r); setRate(r); }} aria-pressed={rate === r}
                    className={cx('min-w-[44px] min-h-[44px] rounded-xl text-sm font-semibold', rate === r ? 'bg-ink text-white' : 'bg-mist')}>{r}x</button>
                ))}
              </div>
            </div>
            {st.state === 'error' && fullActive && <p className="text-xs text-bad mt-2">음성을 재생하지 못했어요. 기기 음성으로 대체 재생을 시도합니다.</p>}
            <p className="text-xs text-ink-faint mt-2">들은 횟수 {plays}회</p>
          </Card>

          <div className="flex gap-2 mt-3">
            <Button variant={showScript ? 'primary' : 'secondary'} size="sm" onClick={() => setShowScript(!showScript)} aria-pressed={showScript} data-testid="toggle-script">{showScript ? '스크립트 숨기기' : '스크립트 보기'}</Button>
            <Button variant={showKo ? 'primary' : 'secondary'} size="sm" onClick={() => setShowKo(!showKo)} aria-pressed={showKo}>{showKo ? '해석 숨기기' : '한국어 해석'}</Button>
          </div>
          <Card className="mt-2 !p-2" data-testid="script">
            {d.lines.map((l, i) => (
              <div key={i} className={cx('flex items-start gap-2 p-2 rounded-xl', st.src === l.audio && 'bg-accent-soft')}>
                <span className={cx('text-xs font-bold w-20 shrink-0 pt-1 break-words leading-tight', l.speaker === 'A' ? 'text-accent-dark' : 'text-[#3D6FB5]')}>{l.name}</span>
                <div className="flex-1 min-w-0">
                  {showScript ? <p className="font-medium">{l.en}</p> : <p className="text-ink-faint select-none" aria-label="스크립트 숨김">{'•'.repeat(Math.min(24, l.en.length / 2))}</p>}
                  {showKo && <p className="text-sm text-ink-soft">{l.ko}</p>}
                </div>
                <AudioButton src={l.audio} text={l.en} size="sm" label={`${i + 1}번째 대사 듣기`} rate={rate} />
              </div>
            ))}
          </Card>

          {d.keyWords.length > 0 && (
            <>
              <SectionTitle>핵심 단어</SectionTitle>
              <div className="flex flex-wrap gap-2">{d.keyWords.map((k) => <span key={k.word} className="rounded-xl bg-white border border-line px-3 py-1.5 text-sm"><b>{k.word}</b> <span className="text-ink-soft">{k.meaning}</span></span>)}</div>
            </>
          )}
          <SectionTitle>핵심 표현</SectionTitle>
          <div className="grid gap-2">{d.keyExpressions.map((k) => (
            <Card key={k.en} className="!p-3 flex items-center gap-3"><div className="flex-1"><p className="font-semibold">{k.en}</p><p className="text-sm text-ink-soft">{k.ko}</p></div>{k.audio && <AudioButton src={k.audio} text={k.en} size="sm" />}</Card>
          ))}</div>
          <div className="mt-4"><PartnerBubble state="studying" text={plays === 0 ? '먼저 스크립트 없이 들어 봐! 두 번 들으면 더 잘 들려.' : '좋아, 이제 문제로 확인해 보자.'} /></div>
          <div className="mt-4"><Button size="lg" onClick={() => { stopAudio(); setPhase('quiz'); }} data-testid="start-listening-quiz">듣기 문제 풀기</Button></div>
        </>
      )}
      {phase === 'quiz' && (
        <>
          <div className="mb-3 flex items-center gap-2"><AudioButton src={d.audio} text={d.lines.map((l) => l.en).join(' ')} label="대화 다시 듣기" rate={rate} /><span className="text-sm text-ink-soft">대화를 다시 들을 수 있어요</span></div>
          <QuizRunner questions={d.questions} title="듣기 이해도" partnerContext="hint" onDone={(rs) => { setResults(rs); setPhase('dictation'); }} />
        </>
      )}
      {phase === 'dictation' && (
        <QuizRunner questions={d.dictation} title="받아쓰기" onDone={(rs) => {
          const all = [...results, ...rs];
          setResults(all);
          complete(d.id, d.grammarId, d.title, toAnswers(all, 'listening'), kind);
          setPhase('result');
        }} />
      )}
      {phase === 'result' && (
        <ResultView results={results} title={`${d.title} 듣기 결과`}>
          {results.some((r) => !r.correct) && (
            <Card className="bg-sky border-[#BFD9F5]"><p className="text-sm">🎧 틀린 문제가 있어요. <b>스크립트를 보며 한 번 더 들어 보세요.</b> 받아쓰기 오답의 핵심 표현은 복습 목록에 등록됐어요.</p>
              <Button size="sm" className="mt-2" variant="secondary" onClick={() => { setShowScript(true); setPhase('listen'); }}>다시 듣기</Button></Card>
          )}
          <Button size="lg" onClick={() => nav(onFinishPath)}>{onFinishPath === '/today' ? '다음 단계로' : '목록으로'}</Button>
        </ResultView>
      )}
    </>
  );
}

export function ListeningPlayer() {
  const { id = '' } = useParams();
  const [sp] = useSearchParams();
  const d = DIALOGUE_BY_ID[id];
  if (!d) return <Page title="듣기"><Empty title="대화를 찾을 수 없어요" /></Page>;
  return (
    <Page title={`듣기 · ${d.title}`}>
      <DialogueLesson d={d} kind="listening" onFinishPath={sp.get('flow') ? '/today' : '/listening'} />
    </Page>
  );
}
