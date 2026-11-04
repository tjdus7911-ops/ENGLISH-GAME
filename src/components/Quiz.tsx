import { SessionRewards } from './SessionRewards';
import { useLeaveGuard } from '@/lib/leaveGuard';
import { useMemo, useState, type ReactNode } from 'react';
import type { CharacterAnimState, Question, UserAnswer } from '@/domain/types';
import { gradeAnswer, gradeOrder, shuffle } from '@/domain/learning/grading';
import { cx } from '@/lib/cx';
import { AudioButton, Button, Card, Progress } from './ui';
import { PartnerBubble } from './Partner';

export interface QResult { q: Question; given: string; correct: boolean }

export const toAnswers = (rs: QResult[], source: UserAnswer['source']) =>
  rs.map((r) => ({ questionId: r.q.id, conceptId: r.q.conceptId, correct: r.correct, given: r.given, source }));

function OrderInput({ q, disabled, onSubmit }: { q: Question; disabled: boolean; onSubmit: (picked: string[]) => void }) {
  const bank = useMemo(() => {
    const t = (q.tokens ?? []).map((t, i) => ({ t, i }));
    let s = shuffle(t, q.id.length * 97 + 13);
    if (s.every((x, k) => x.i === k) && s.length > 1) s = [...s.slice(1), s[0]];
    return s;
  }, [q]);
  const [picked, setPicked] = useState<number[]>([]);
  return (
    <div>
      <div className="min-h-[56px] rounded-2xl border-2 border-dashed border-line bg-mist p-2 flex flex-wrap gap-2" aria-label="배열한 문장">
        {picked.length === 0 && <span className="text-ink-faint text-sm p-2">아래 단어를 순서대로 눌러 문장을 만드세요</span>}
        {picked.map((idx) => {
          const tok = bank.find((b) => b.i === idx)!;
          return (
            <button key={idx} disabled={disabled} className="px-3 min-h-[44px] rounded-xl bg-white border border-line font-medium" onClick={() => setPicked(picked.filter((p) => p !== idx))}>{tok.t}</button>
          );
        })}
      </div>
      <div className="flex flex-wrap gap-2 mt-3">
        {bank.map((b) => (
          <button key={b.i} disabled={disabled || picked.includes(b.i)} onClick={() => setPicked([...picked, b.i])}
            className={cx('px-3 min-h-[44px] rounded-xl border font-medium', picked.includes(b.i) ? 'bg-mist text-transparent border-line' : 'bg-white border-line hover:border-accent')}>
            {b.t}
          </button>
        ))}
      </div>
      <Button className="mt-4 w-full" disabled={disabled || picked.length !== bank.length} onClick={() => onSubmit(picked.map((i) => bank.find((b) => b.i === i)!.t))}>확인</Button>
    </div>
  );
}

function TextInput({ q, disabled, onSubmit }: { q: Question; disabled: boolean; onSubmit: (v: string) => void }) {
  const [v, setV] = useState('');
  const [hint, setHint] = useState(false);
  return (
    <form onSubmit={(e) => { e.preventDefault(); if (v.trim()) onSubmit(v); }}>
      <input
        aria-label="정답 입력" autoCapitalize="off" autoComplete="off" autoCorrect="off" spellCheck={false} disabled={disabled}
        value={v} onChange={(e) => setV(e.target.value)} placeholder={q.type === 'writing' ? '영어 문장을 입력하세요' : '정답 입력'}
        className="w-full min-h-[52px] rounded-2xl border border-line px-4 text-lg focus:outline-none focus:ring-2 focus:ring-accent/50 bg-white"
      />
      {q.hint && !disabled && (
        <button type="button" className="text-sm text-ink-soft mt-2 underline min-h-[44px]" onClick={() => setHint(true)}>{hint ? `힌트: ${q.hint}` : '힌트 보기'}</button>
      )}
      <Button type="submit" className="mt-3 w-full" disabled={disabled || !v.trim()}>확인</Button>
    </form>
  );
}

export function QuestionView({ q, onAnswer, answered }: { q: Question; onAnswer: (given: string, correct: boolean) => void; answered: { given: string; correct: boolean } | null }) {
  const isChoice = q.type === 'mc' || q.type === 'translate';
  return (
    <div data-qid={q.id} data-testid="question">
      <p className="text-sm font-semibold text-ink-soft">{q.prompt}</p>
      {(q.sentence || q.audio) && (
        <div className="mt-2 flex items-start gap-3">
          {q.audio && <AudioButton src={q.audio} label="문제 음성 듣기" />}
          {q.sentence && <p className={cx('text-xl font-bold leading-snug break-words', q.type === 'writing' && 'text-lg')}>{q.sentence}</p>}
        </div>
      )}
      <div className="mt-4">
        {isChoice && (
          <div className="grid gap-2">
            {q.choices!.map((c) => {
              const picked = answered?.given === c;
              const isAns = q.answers.includes(c);
              return (
                <button key={c} disabled={!!answered} onClick={() => onAnswer(c, gradeAnswer(q, c))}
                  className={cx('text-left min-h-[52px] px-4 py-3 rounded-2xl border-2 font-medium transition',
                    !answered && 'bg-white border-line hover:border-accent',
                    answered && isAns && 'bg-mint border-ok', answered && picked && !isAns && 'bg-accent-soft border-bad', answered && !picked && !isAns && 'bg-white border-line opacity-60')}>
                  {c}
                </button>
              );
            })}
          </div>
        )}
        {q.type === 'order' && <OrderInput key={q.id} q={q} disabled={!!answered} onSubmit={(p) => onAnswer(p.join(' '), gradeOrder(q, p))} />}
        {(q.type === 'blank' || q.type === 'writing' || q.type === 'dictation') && <TextInput key={q.id} q={q} disabled={!!answered} onSubmit={(v) => onAnswer(v, gradeAnswer(q, v))} />}
      </div>
    </div>
  );
}

export function Feedback({ q, answered }: { q: Question; answered: { given: string; correct: boolean } }) {
  return (
    <div role="status" className={cx('mt-4 rounded-2xl p-4 pop-in', answered.correct ? 'bg-mint' : 'bg-accent-soft')}>
      <p className={cx('font-bold', answered.correct ? 'text-ok' : 'text-bad')}>{answered.correct ? '정답이에요!' : '아쉬워요, 오답이에요.'}</p>
      {!answered.correct && <p className="mt-1 text-sm"><span className="text-ink-soft">정답:</span> <b>{q.answers[0]}</b>{q.answers.length > 1 && <span className="text-ink-soft"> (다른 정답 {q.answers.length - 1}개 인정)</span>}</p>}
      {!answered.correct && answered.given && <p className="text-sm text-ink-soft">내 답: {answered.given}</p>}
      <p className="mt-2 text-sm leading-relaxed">{q.explanation}</p>
    </div>
  );
}

/** 문제 세트 실행기. 결과는 마지막 문제를 마치면 한 번에 전달 (중간 이탈 시 기록하지 않음). */
export function QuizRunner({ questions, onDone, title, partnerContext = 'studying', footer }: {
  questions: Question[]; onDone: (r: QResult[]) => void; title?: string; partnerContext?: CharacterAnimState; footer?: ReactNode;
}) {
  const [i, setI] = useState(0);
  const [results, setResults] = useState<QResult[]>([]);
  const [answered, setAnswered] = useState<{ given: string; correct: boolean } | null>(null);
  // 한 문제라도 풀었으면 뒤로가기 전에 확인 (결과 화면으로 넘어가면 QuizRunner 가 사라지며 해제)
  useLeaveGuard(results.length > 0 || !!answered, '지금 나가면 이번에 푼 문제는 저장되지 않아요.');
  const q = questions[i];
  if (!q) return null;
  const mood: CharacterAnimState = answered ? (answered.correct ? 'correct' : 'incorrect') : partnerContext;
  return (
    <div>
      <div className="flex items-center gap-3 mb-3">
        <span className="text-sm font-semibold text-ink-soft whitespace-nowrap">{i + 1} / {questions.length}</span>
        <Progress value={i + (answered ? 1 : 0)} max={questions.length} label={title ?? '문제 진행도'} />
      </div>
      <Card>
        <QuestionView key={q.id + i} q={q} answered={answered} onAnswer={(given, correct) => { setAnswered({ given, correct }); setResults((r) => [...r, { q, given, correct }]); }} />
        {answered && <Feedback q={q} answered={answered} />}
      </Card>
      <div className="mt-3"><PartnerBubble state={mood} compact /></div>
      {answered && (
        <div className="sticky bottom-0 pt-3 pb-[max(env(safe-area-inset-bottom),12px)] bg-gradient-to-t from-mist via-mist">
          <Button size="lg" onClick={() => {
            if (i + 1 >= questions.length) onDone(results);
            else { setI(i + 1); setAnswered(null); }
          }}>{i + 1 >= questions.length ? '결과 보기' : '다음 문제'}</Button>
        </div>
      )}
      {footer}
    </div>
  );
}

export function ResultView({ results, title, children, passLabel }: { results: QResult[]; title: string; children?: ReactNode; passLabel?: string }) {
  const correct = results.filter((r) => r.correct).length;
  const wrong = results.filter((r) => !r.correct);
  return (
    <div>
      <Card className="text-center">
        <p className="text-sm text-ink-soft">{title}</p>
        <p className="text-4xl font-extrabold mt-1">{correct}<span className="text-ink-faint text-2xl"> / {results.length}</span></p>
        <p className="text-sm mt-1">정답률 {results.length ? Math.round((correct / results.length) * 100) : 0}%{passLabel ? ` · ${passLabel}` : ''}</p>
      </Card>
      <div className="mt-3"><PartnerBubble state="completed" /></div>
      <SessionRewards />
      {wrong.length > 0 && (
        <div className="mt-4">
          <h2 className="font-bold mb-2">오답 해설 ({wrong.length})</h2>
          <div className="grid gap-2">
            {wrong.map((r, k) => (
              <Card key={k} className="!p-3">
                <p className="text-sm text-ink-soft">{r.q.prompt}</p>
                {r.q.sentence && <p className="font-semibold">{r.q.sentence}</p>}
                <p className="text-sm mt-1"><span className="text-bad">내 답: {r.given || '(없음)'}</span> · <span className="text-ok">정답: {r.q.answers[0]}</span></p>
                <p className="text-sm mt-1 text-ink-soft">{r.q.explanation}</p>
              </Card>
            ))}
          </div>
          <p className="text-xs text-ink-faint mt-2">틀린 문제는 오답노트에 저장되고 복습 일정에 반영돼요.</p>
        </div>
      )}
      {children && <div className="mt-5 grid gap-2">{children}</div>}
    </div>
  );
}
