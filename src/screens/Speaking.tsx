import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useApp, today, now } from '@/store/app';
import { SPEAKING, SPEAKING_BY_ID } from '@/content/dialogues';
import { GRAMMAR_BY_ID, GRAMMAR_UNITS } from '@/content/grammar';
import type { SpeakingAttempt, SpeakingSentence } from '@/domain/types';
import { compareWords, summarizeDiff, type DiffOp } from '@/domain/speech/compare';
import { ASSESSMENT_FEATURES, UnavailableAssessor } from '@/domain/speech/assessment';
import { AudioButton, Button, Card, Empty, Modal, Page, Progress, SectionTitle, Tag } from '@/components/ui';
import { PartnerBubble } from '@/components/Partner';
import { speechSupport, startSession, type MicError, type Session } from '@/lib/speech';
import { stopAudio } from '@/lib/audio';

export const assessor = new UnavailableAssessor();

export function SpeakingHub() {
  const attempts = useApp((s) => s.learning.speakingAttempts);
  const tried = new Set(attempts.map((a) => a.sentenceId));
  return (
    <Page title="말하기 학습" back="/free">
      <SupportNotice />
      <div className="grid gap-2 mt-3">
        {GRAMMAR_UNITS.map((u) => {
          const set = SPEAKING.filter((s) => s.grammarId === u.id);
          const n = set.filter((s) => tried.has(s.id)).length;
          return (
            <Link key={u.id} to={`/speaking/${u.id}`} className="rounded-2xl bg-white border border-line p-3 flex items-center gap-3 min-h-[60px]">
              <span className="w-9 h-9 rounded-xl bg-peach grid place-items-center font-bold">{u.order}</span>
              <span className="flex-1 min-w-0"><span className="block font-semibold">{u.title}</span><span className="text-xs text-ink-soft truncate block">{set.map((s) => s.en).join(' / ')}</span></span>
              <Tag tone={n === set.length ? 'ok' : 'gray'}>{n}/{set.length}</Tag>
            </Link>
          );
        })}
      </div>
      <SectionTitle>발음 평가 (확장 예정)</SectionTitle>
      <AssessmentCard />
    </Page>
  );
}

function AssessmentCard() {
  return (
    <Card>
      <div className="flex flex-wrap gap-1.5">{ASSESSMENT_FEATURES.map((f) => <Tag key={f.id}>{f.label} · 준비 중</Tag>)}</div>
      <p className="text-xs text-ink-soft mt-2">현재는 브라우저 음성 인식(STT) 결과만 보여 줘요. STT 일치 여부는 발음 정확도 점수가 아닙니다.</p>
    </Card>
  );
}

function SupportNotice() {
  const sup = speechSupport();
  if (sup.secure && sup.mic && sup.stt) return null;
  return (
    <Card className="bg-butter border-[#F2D98A]" data-testid="speech-support-notice">
      <p className="text-sm font-semibold">이 브라우저의 음성 기능 지원 상태</p>
      <ul className="text-sm mt-1 space-y-0.5">
        <li>보안 연결(HTTPS): {sup.secure ? '✅' : '❌ — 마이크는 HTTPS 에서만 사용할 수 있어요'}</li>
        <li>마이크 녹음: {sup.mic && sup.recorder ? '✅' : '❌'}</li>
        <li>음성 인식(STT): {sup.stt ? '✅' : '❌ — Chrome·Edge·Safari 최신 버전에서 지원돼요. 대신 녹음 후 스스로 비교하기로 연습할 수 있어요.'}</li>
      </ul>
    </Card>
  );
}

function DiffView({ ops }: { ops: DiffOp[] }) {
  return (
    <p className="flex flex-wrap gap-1.5 leading-8" data-testid="diff">
      {ops.map((o, i) => {
        if (o.op === 'equal') return <span key={i} className="px-1.5 rounded-lg bg-mint text-ok font-semibold">{o.expected}</span>;
        if (o.op === 'missing') return <span key={i} className="px-1.5 rounded-lg bg-accent-soft text-bad font-semibold line-through decoration-2" title="인식되지 않은 단어">{o.expected}</span>;
        if (o.op === 'extra') return <span key={i} className="px-1.5 rounded-lg bg-mist text-ink-soft italic" title="추가로 인식된 단어">+{o.heard}</span>;
        return <span key={i} className="px-1.5 rounded-lg bg-butter text-[#8a6100] font-semibold" title="다르게 인식된 단어">{o.expected}→{o.heard}</span>;
      })}
    </p>
  );
}

const MIC_MSG: Record<MicError, string> = {
  denied: '마이크 권한이 거부되었어요. 브라우저 주소창의 자물쇠(사이트 설정)에서 마이크를 허용한 뒤 다시 시도해 주세요.',
  'no-device': '사용할 수 있는 마이크를 찾지 못했어요.',
  insecure: '마이크는 HTTPS 보안 연결에서만 사용할 수 있어요.',
  unsupported: '이 브라우저는 마이크 녹음을 지원하지 않아요.',
  unknown: '녹음을 시작하지 못했어요. 잠시 후 다시 시도해 주세요.',
};

export function SentencePractice({ s, onAttempt }: { s: SpeakingSentence; onAttempt: (a: SpeakingAttempt) => void }) {
  const consent = useApp((st) => st.settings.recordingConsent);
  const update = useApp((st) => st.updateSettings);
  const [askConsent, setAskConsent] = useState(false);
  const [state, setState] = useState<'idle' | 'recording' | 'processing' | 'done'>('idle');
  const [interim, setInterim] = useState('');
  const [err, setErr] = useState<MicError | null>(null);
  const [result, setResult] = useState<{ transcript: string | null; sttError: string | null; audioUrl: string | null } | null>(null);
  const sess = useRef<Session | null>(null);
  const sup = speechSupport();
  useEffect(() => () => { sess.current?.stop(); if (result?.audioUrl) URL.revokeObjectURL(result.audioUrl); }, [result]);

  const begin = async () => {
    if (!consent) { setAskConsent(true); return; }
    stopAudio(); // 예시 음성이 녹음에 섞이지 않도록 정지
    setErr(null); setInterim(''); setResult(null);
    const r = await startSession({ useStt: sup.stt, maxMs: 9000, onInterim: setInterim });
    if (!r.ok) { setErr(r.error); return; }
    sess.current = r.session;
    setState('recording');
    const out = await r.session.result;
    sess.current = null;
    setResult(out);
    setState('done');
    const ops = out.transcript ? compareWords(s.en, out.transcript) : [];
    const sum = summarizeDiff(ops);
    onAttempt({
      sentenceId: s.id, date: today(), at: now(), recognized: out.transcript, matchedWords: sum.matched, totalWords: sum.total,
      missing: sum.missing, extra: sum.extra, substituted: sum.substituted, mode: out.transcript !== null ? 'stt' : 'self-check',
    });
  };
  const stop = () => { setState('processing'); sess.current?.stop(); };

  const ops = result?.transcript ? compareWords(s.en, result.transcript) : null;
  const sum = ops ? summarizeDiff(ops) : null;

  return (
    <Card>
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0"><p className="text-xl font-bold">{s.en}</p><p className="text-ink-soft text-sm mt-1">{s.ko}</p></div>
        <AudioButton src={s.audio} text={s.en} label="예시 음성 듣기" />
      </div>
      <p className="text-xs text-ink-soft mt-2">💡 {s.tip}</p>

      {/* 녹음 버튼 영역: 스크립트·캐릭터와 겹치지 않는 독립 영역 */}
      <div className="mt-4 flex flex-col items-center gap-2">
        {state === 'recording' ? (
          <button onClick={stop} data-testid="rec-stop" className="w-20 h-20 rounded-full bg-bad text-white text-sm font-bold grid place-items-center ring-8 ring-accent/20" aria-label="녹음 종료">■ 종료</button>
        ) : (
          <button onClick={() => void begin()} disabled={state === 'processing'} data-testid="rec-start" className="w-20 h-20 rounded-full bg-accent text-white text-sm font-bold grid place-items-center disabled:opacity-50" aria-label="녹음 시작">🎙 말하기</button>
        )}
        <p className="text-xs text-ink-soft" aria-live="polite">{state === 'recording' ? (interim ? `듣는 중: ${interim}` : '듣고 있어요… 문장을 말한 뒤 종료를 누르세요') : state === 'processing' ? '분석 중…' : sup.stt ? '버튼을 누르고 문장을 따라 말해 보세요' : '음성 인식 미지원: 녹음 후 예시 음성과 비교해 보세요'}</p>
      </div>
      {err && <p className="mt-3 text-sm text-bad bg-accent-soft rounded-xl p-3" role="alert" data-testid="mic-error">{MIC_MSG[err]}</p>}

      {result && (
        <div className="mt-4 rounded-2xl bg-mist p-3" data-testid="speak-result">
          {result.transcript !== null ? (
            <>
              <p className="text-xs text-ink-soft">음성 인식 결과 (STT)</p>
              <p className="font-semibold" data-testid="recognized">“{result.transcript || '(인식된 말 없음)'}”</p>
              {ops && <div className="mt-2"><DiffView ops={ops} /></div>}
              {sum && (
                <p className="text-sm mt-2">인식 일치 단어 <b>{sum.matched}/{sum.total}</b>
                  {sum.missing.length > 0 && <> · 누락 {sum.missing.length}</>}{sum.substituted.length > 0 && <> · 다르게 인식 {sum.substituted.length}</>}{sum.extra.length > 0 && <> · 추가 {sum.extra.length}</>}
                </p>
              )}
              <p className="text-[11px] text-ink-faint mt-1">※ 음성 인식기가 들은 결과이며 발음 정확도 점수가 아닙니다. 소음·마이크·인식기 성능에 따라 달라질 수 있어요.</p>
            </>
          ) : (
            <p className="text-sm">{result.sttError ? `음성 인식 오류(${result.sttError}) — ` : ''}스스로 확인 모드: 내 녹음과 예시 음성을 번갈아 들어 보세요.</p>
          )}
          {result.audioUrl && <audio controls src={result.audioUrl} className="w-full mt-2" aria-label="내 녹음 듣기" />}
          <div className="mt-2"><Button size="sm" variant="secondary" onClick={() => void begin()} data-testid="retry">↻ 다시 말하기</Button></div>
        </div>
      )}

      <Modal open={askConsent} onClose={() => setAskConsent(false)} label="녹음 동의">
        <p className="font-bold text-lg">마이크 사용 및 음성 처리 안내</p>
        <ul className="mt-3 text-sm space-y-2 list-disc pl-5">
          <li>녹음은 <b>말하기 버튼을 누른 동안에만</b> 진행돼요.</li>
          <li>녹음 파일은 <b>이 기기의 메모리에만</b> 잠시 보관되고, 화면을 나가면 사라져요. 앱 서버로 전송·저장하지 않아요.</li>
          <li>음성 인식(STT)은 <b>브라우저가 제공하는 기능</b>을 사용해요. 브라우저에 따라(예: Chrome) 음성이 브라우저 제공자의 서버에서 처리될 수 있어요.</li>
          <li>인식 결과 텍스트와 일치 단어 수만 학습 기록으로 저장돼요.</li>
        </ul>
        <div className="grid gap-2 mt-5">
          <Button size="lg" data-testid="consent-agree" onClick={() => { update({ recordingConsent: true }); setAskConsent(false); }}>동의하고 계속</Button>
          <Button variant="ghost" onClick={() => setAskConsent(false)}>동의하지 않음</Button>
        </div>
      </Modal>
    </Card>
  );
}

export function SpeakingPractice() {
  const { setId = '' } = useParams();
  const [sp] = useSearchParams();
  const flow = !!sp.get('flow');
  const nav = useNavigate();
  const complete = useApp((st) => st.completeSpeaking);
  const unit = GRAMMAR_BY_ID[setId];
  const set = unit ? SPEAKING.filter((s) => s.grammarId === setId) : SPEAKING_BY_ID[setId] ? [SPEAKING_BY_ID[setId]] : [];
  const [i, setI] = useState(0);
  const [attempts, setAttempts] = useState<SpeakingAttempt[]>([]);
  const [done, setDone] = useState(false);
  if (!set.length) return <Page title="말하기"><Empty title="문장을 찾을 수 없어요" /></Page>;
  const s = set[i];
  const triedCurrent = attempts.some((a) => a.sentenceId === s.id);
  const finish = () => {
    complete(unit ? unit.id : null, attempts, Object.fromEntries(set.map((x) => [x.id, x.grammarId])));
    setDone(true);
  };
  if (done) {
    const last = set.map((x) => attempts.filter((a) => a.sentenceId === x.id).at(-1));
    return (
      <Page title="말하기 결과">
        <Card>
          <p className="font-bold">따라 말하기 완료</p>
          <ul className="mt-2 grid gap-2">
            {set.map((x, k) => (
              <li key={x.id} className="text-sm">
                <b>{x.en}</b>
                <p className="text-ink-soft">{last[k] ? (last[k]!.mode === 'stt' ? `인식 일치 ${last[k]!.matchedWords}/${last[k]!.totalWords} 단어${last[k]!.missing.length ? ` · 누락: ${last[k]!.missing.join(', ')}` : ''}` : '스스로 확인 모드') : '건너뜀'}</p>
              </li>
            ))}
          </ul>
          {last.some((a) => a && a.mode === 'stt' && (a.missing.length || a.substituted.length)) && <p className="text-sm mt-3 bg-sky rounded-xl p-2">🔁 누락되거나 다르게 인식된 단어가 있는 문장은 복습 목록에 재연습으로 등록했어요.</p>}
        </Card>
        <div className="mt-3"><PartnerBubble state="completed" /></div>
        <div className="mt-4"><Button size="lg" onClick={() => nav(flow ? '/today' : '/speaking')}>{flow ? '다음 단계로' : '목록으로'}</Button></div>
      </Page>
    );
  }
  return (
    <Page title={`따라 말하기${unit ? ` · ${unit.title}` : ''}`}>
      <div className="flex items-center gap-3 mb-3"><span className="text-sm font-semibold text-ink-soft whitespace-nowrap">{i + 1} / {set.length}</span><Progress value={i + 1} max={set.length} /></div>
      <SupportNotice />
      <div className="mt-3"><SentencePractice key={s.id} s={s} onAttempt={(a) => setAttempts((x) => [...x, a])} /></div>
      <div className="mt-3"><PartnerBubble state={triedCurrent ? 'correct' : 'studying'} compact text={triedCurrent ? '잘했어! 한 번 더 해 봐도 좋아.' : '예시 음성을 듣고 천천히 따라 해 봐.'} /></div>
      <div className="grid grid-cols-2 gap-2 mt-4">
        <Button variant="secondary" onClick={() => (i + 1 < set.length ? setI(i + 1) : finish())}>건너뛰기</Button>
        <Button disabled={!triedCurrent} onClick={() => (i + 1 < set.length ? setI(i + 1) : finish())} data-testid="speak-next">{i + 1 < set.length ? '다음 문장' : '완료'}</Button>
      </div>
      <div className="mt-6"><AssessmentCard /></div>
    </Page>
  );
}
