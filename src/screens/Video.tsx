import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useApp } from '@/store/app';
import { DRAMA_BY_ID } from '@/content/expressions';
import { DRAMA_LINE_AUDIO } from '@/content/expressions/situations-video';
import { Button, Card, Empty, Page, SectionTitle, Tag } from '@/components/ui';
import { QuizRunner, ResultView, toAnswers, type QResult } from '@/components/Quiz';
import { SentencePractice } from './Speaking';
import { resolveAsset, stopAudio } from '@/lib/audio';
import { cx } from '@/lib/cx';

function Rights({ id }: { id: string }) {
  const d = DRAMA_BY_ID[id];
  const r = d.rights;
  return (
    <Card className="text-xs grid gap-1 text-ink-soft" data-testid="rights">
      <p className="font-bold text-ink text-sm">권리 확인 기록</p>
      <p>출처 유형: 직접 제작 (self-produced) · 제3자 영상·클립 사용: {r.thirdPartyMaterial ? '있음' : '없음'}</p>
      <p>대본: {r.script}</p><p>그림: {r.visuals}</p><p>음성: {r.voices}</p><p>음악: {r.music}</p><p>제작일: {r.producedOn}</p><p>비고: {r.notes}</p>
    </Card>
  );
}

export function VideoLesson() {
  const { id = '' } = useParams();
  const d = DRAMA_BY_ID[id];
  const nav = useNavigate();
  const complete = useApp((s) => s.completeDrama);
  const vref = useRef<HTMLVideoElement>(null);
  const [t, setT] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [enSub, setEnSub] = useState(true);
  const [koSub, setKoSub] = useState(false);
  const [loop, setLoop] = useState<number | null>(null);
  const [rate, setRate] = useState(1);
  const [phase, setPhase] = useState<'watch' | 'quiz' | 'result'>('watch');
  const [rs, setRs] = useState<QResult[]>([]);
  const [err, setErr] = useState(false);
  useEffect(() => { stopAudio(); }, []);
  useEffect(() => {
    const v = vref.current;
    if (!v || loop === null || !d) return;
    const c = d.cues[loop];
    const h = () => { if (v.currentTime >= c.end) { v.currentTime = c.start; void v.play(); } };
    v.addEventListener('timeupdate', h);
    return () => v.removeEventListener('timeupdate', h);
  }, [loop, d]);

  if (!d) return <Page title="영상"><Empty title="영상을 찾을 수 없어요" /></Page>;
  if (!d.video) {
    return (
      <Page title={d.title}>
        <Empty icon="🎬" title="영상 준비 중" desc="이 미니 드라마는 아직 영상 에셋이 제작되지 않았어요." />
        <Rights id={d.id} />
      </Page>
    );
  }
  const cueIdx = d.cues.findIndex((c) => t >= c.start && t < c.end);
  const cue = cueIdx >= 0 ? d.cues[cueIdx] : null;
  const jump = (i: number) => { const v = vref.current; if (!v) return; v.currentTime = d.cues[i].start + 0.01; void v.play(); };

  return (
    <Page title={`🎬 ${d.title}`}>
      {phase === 'watch' && (
        <>
          {/* 영상 재생 영역 (학습 설명 영역과 분리) */}
          <div className="rounded-3xl overflow-hidden bg-black">
            <div className="relative" style={{ aspectRatio: '16 / 9' }}>
              <video ref={vref} poster={d.poster ? resolveAsset(d.poster) : undefined} playsInline preload="metadata" className="absolute inset-0 w-full h-full" data-testid="video"
                onTimeUpdate={(e) => setT(e.currentTarget.currentTime)} onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onError={() => setErr(true)} onClick={() => { const v = vref.current; if (v) { if (v.paused) void v.play(); else v.pause(); } }}>
                <source src={resolveAsset(d.video.replace('.mp4', '.webm'))} type="video/webm" />
                <source src={resolveAsset(d.video)} type="video/mp4" />
              </video>
              {/* 자막: 영상 영역 하단 안쪽에만 표시 → 아래 컨트롤과 겹치지 않음 */}
              {(enSub || koSub) && cue && (
                <div className="absolute inset-x-2 bottom-2 text-center pointer-events-none" data-testid="subtitle">
                  {enSub && <p className="subs inline-block bg-black/55 text-white font-semibold rounded-lg px-2 py-0.5 text-[clamp(12px,3.6vw,18px)]">{cue.en}</p>}
                  {koSub && <p className="subs block mt-0.5"><span className="bg-black/55 text-[#FFE08A] rounded-lg px-2 py-0.5 text-[clamp(11px,3.2vw,16px)]">{cue.ko}</span></p>}
                </div>
              )}
            </div>
          </div>
          {err && <p className="text-sm text-bad mt-2" role="alert">영상을 재생하지 못했어요. 네트워크 상태를 확인해 주세요.</p>}
          {/* 컨트롤 바 */}
          <div className="mt-2 flex flex-wrap items-center gap-2" data-testid="video-controls">
            <Button onClick={() => { const v = vref.current; if (v) { if (v.paused) void v.play(); else v.pause(); } }} aria-label={playing ? '일시정지' : '재생'} data-testid="video-play">{playing ? '❚❚' : '▶'}</Button>
            <Button variant={enSub ? 'primary' : 'secondary'} size="sm" aria-pressed={enSub} onClick={() => setEnSub(!enSub)}>EN 자막</Button>
            <Button variant={koSub ? 'primary' : 'secondary'} size="sm" aria-pressed={koSub} onClick={() => setKoSub(!koSub)}>한국어</Button>
            <select aria-label="재생 속도" className="min-h-[44px] rounded-xl border border-line px-2 ml-auto" value={rate} onChange={(e) => { const r = Number(e.target.value); setRate(r); if (vref.current) vref.current.playbackRate = r; }}>
              {[0.75, 0.9, 1, 1.2].map((r) => <option key={r} value={r}>{r}x</option>)}
            </select>
          </div>
          <p className="text-xs text-ink-soft mt-1">{Math.floor(t)}초 / {Math.round(d.durationSec ?? 0)}초 {loop !== null && <Tag tone="accent">구간 반복 중</Tag>}</p>

          {/* 학습 설명 영역 */}
          <SectionTitle>대사 · 구간 반복</SectionTitle>
          <Card className="!p-1.5">
            {d.cues.map((c, i) => (
              <div key={i} className={cx('flex items-center gap-2 p-2 rounded-xl', i === cueIdx && 'bg-accent-soft')}>
                <button className="flex-1 text-left min-h-[44px]" onClick={() => jump(i)} aria-label={`${i + 1}번째 대사로 이동`}>
                  <span className="text-xs font-bold text-ink-soft mr-1">{c.speaker}</span><span className="font-medium">{c.en}</span>
                  <span className="block text-sm text-ink-soft">{c.ko}</span>
                </button>
                <button onClick={() => { if (loop === i) setLoop(null); else { setLoop(i); jump(i); } }} aria-pressed={loop === i} aria-label="이 구간 반복"
                  className={cx('min-w-[44px] min-h-[44px] rounded-xl text-sm font-bold', loop === i ? 'bg-accent text-white' : 'bg-mist')}>🔁</button>
              </div>
            ))}
          </Card>
          <SectionTitle>핵심 표현</SectionTitle>
          <div className="grid gap-2">{d.keyExpressions.map((k) => <Card key={k.en} className="!p-3"><p className="font-semibold">{k.en}</p><p className="text-sm">{k.ko}</p><p className="text-xs text-ink-soft mt-1">{k.note}</p></Card>)}</div>
          <SectionTitle>쉐도잉 · 말하기 연습</SectionTitle>
          <div className="grid gap-3">{d.shadowing.map((i) => (
            <SentencePractice key={i} s={{ id: `${d.id}-sh${i}`, level: d.level, en: d.script[i].en, ko: d.script[i].ko, grammarId: 'expr-video', tip: '영상 속 인물의 속도와 억양을 따라 해 보세요.', audio: DRAMA_LINE_AUDIO[d.id][i] }} onAttempt={() => {}} />
          ))}</div>
          <div className="mt-4"><Button size="lg" onClick={() => { vref.current?.pause(); setPhase('quiz'); }} data-testid="video-quiz">듣기 이해도 문제</Button></div>
          <div className="mt-4"><Rights id={d.id} /></div>
        </>
      )}
      {phase === 'quiz' && <QuizRunner questions={d.questions} title="영상 이해도" onDone={(x) => { complete(d.id, d.title, toAnswers(x, 'video')); setRs(x); setPhase('result'); }} />}
      {phase === 'result' && <ResultView results={rs} title={`${d.title} 결과`}><Button variant="secondary" onClick={() => setPhase('watch')}>다시 보기</Button><Button size="lg" onClick={() => nav('/expressions/c/video')}>목록으로</Button></ResultView>}
    </Page>
  );
}
