import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '@/store/app';
import { Button, Card, Page, Tag } from '@/components/ui';
import { GuideArt } from '@/components/CharacterArt';
import { QuizRunner, toAnswers, type QResult } from '@/components/Quiz';
import { LEVEL_TEST, LEVELS, estimateLevel } from '@/content/reading-leveltest';
import { cx } from '@/lib/cx';

const PURPOSES = ['일상 회화', '여행', '업무·비즈니스', '시험 대비', '자기계발', '아이와 함께'];
const MINUTES = [10, 20, 30];

export function Onboarding() {
  const nav = useNavigate();
  const [p, setP] = useState<string | null>(null);
  return (
    <Page>
      <div className="text-center pt-6">
        <div className="grid place-items-center"><GuideArt size={96} /></div>
        <h1 className="text-2xl font-extrabold mt-3">영어 마을에 오신 걸 환영해요</h1>
        <p className="text-ink-soft mt-2 text-sm leading-relaxed">영어를 공부할수록 숲 친구들이 모이고<br />나만의 영어 마을이 자라요.</p>
      </div>
      <h2 className="font-bold mt-8 mb-2">영어를 배우는 목적을 골라 주세요</h2>
      <div className="grid grid-cols-2 gap-2">
        {PURPOSES.map((x) => (
          <button key={x} onClick={() => setP(x)} aria-pressed={p === x}
            className={cx('min-h-[56px] rounded-2xl border-2 font-semibold', p === x ? 'border-accent bg-accent-soft text-accent-dark' : 'border-line bg-white')}>{x}</button>
        ))}
      </div>
      <div className="mt-6"><Button size="lg" disabled={!p} onClick={() => nav('/onboarding/goal', { state: { purpose: p } })}>다음</Button></div>
    </Page>
  );
}

const SELF = ['완전 처음이에요', '쉬운 단어·문장은 알아요', '간단한 대화를 할 수 있어요', '일상 대화는 꽤 해요'];
const AMOUNT: { label: string; words: number }[] = [{ label: '가볍게', words: 5 }, { label: '보통', words: 10 }, { label: '많이', words: 15 }];

function Choice({ on, onClick, children, testId }: { on: boolean; onClick: () => void; children: React.ReactNode; testId?: string }) {
  return <button onClick={onClick} aria-pressed={on} data-testid={testId} className={cx('min-h-[52px] rounded-2xl border-2 px-3 text-left font-semibold', on ? 'border-accent bg-accent-soft text-accent-dark' : 'border-line bg-white')}>{children}</button>;
}

export function Goal() {
  const nav = useNavigate();
  const complete = useApp((s) => s.completeOnboarding);
  const loc = useLocation();
  const purpose = (loc.state as { purpose?: string } | null)?.purpose ?? '일상 회화';
  const [self, setSelf] = useState(SELF[0]);
  const [m, setM] = useState(20);
  const [amount, setAmount] = useState(1);
  const [noti, setNoti] = useState(true);
  return (
    <Page title="학습 목표 설정" back="/onboarding">
      <h2 className="font-bold mb-2">지금 영어 수준은 어느 정도인가요?</h2>
      <div className="grid gap-2">{SELF.map((x) => <Choice key={x} on={self === x} onClick={() => setSelf(x)}>{x}</Choice>)}</div>
      <h2 className="font-bold mt-6 mb-2">하루 학습 시간</h2>
      <div className="grid grid-cols-3 gap-2">{MINUTES.map((x) => <Choice key={x} on={m === x} onClick={() => setM(x)} testId={`min-${x}`}>하루 {x}분</Choice>)}</div>
      <h2 className="font-bold mt-6 mb-2">선호 학습량 (하루 신규 단어)</h2>
      <div className="grid grid-cols-3 gap-2">{AMOUNT.map((a, i) => <Choice key={a.label} on={amount === i} onClick={() => setAmount(i)}>{a.label} · {a.words}개</Choice>)}</div>
      <h2 className="font-bold mt-6 mb-2">학습 알림</h2>
      <div className="grid grid-cols-2 gap-2"><Choice on={noti} onClick={() => setNoti(true)}>받을게요</Choice><Choice on={!noti} onClick={() => setNoti(false)}>받지 않을래요</Choice></div>
      <p className="text-xs text-ink-faint mt-2">모든 설정은 언제든 MY에서 바꿀 수 있어요.</p>
      <div className="mt-6">
        <Button size="lg" onClick={() => { complete({ purpose, selfLevel: self, minutes: m, dailyNewWords: AMOUNT[amount].words, notifications: noti }); nav('/level-test'); }}>레벨 진단 시작</Button>
      </div>
    </Page>
  );
}

export function LevelTestScreen() {
  const nav = useNavigate();
  const save = useApp((s) => s.saveLevelTest);
  const done = useApp((s) => s.profile.levelTest.done);
  const [started, setStarted] = useState(false);
  if (!started) {
    return (
      <Page title="레벨 진단" back={done ? '/my' : '/onboarding/goal'}>
        <Card>
          <p className="font-bold text-lg">A1~B2 기초 레벨 진단</p>
          <p className="text-sm text-ink-soft mt-2 leading-relaxed">총 {LEVEL_TEST.length}문항 · 약 5분. 쉬운 문제부터 점점 어려워져요. 모르면 가장 그럴듯한 답을 고르세요.</p>
          <p className="text-xs text-ink-soft mt-3"><b>평가 범위:</b> 문법·어휘(읽기 기반 객관식). <b>듣기·말하기·쓰기 능력은 평가하지 않아요.</b></p>
          <p className="text-xs text-ink-faint mt-1">※ 앱 내부 추정 기준이며 공인 CEFR 인증이 아닙니다.</p>
        </Card>
        <div className="mt-4 grid gap-2">
          <Button size="lg" onClick={() => setStarted(true)}>시작하기</Button>
          {!done && <Button variant="ghost" onClick={() => { save('A1', {}, []); nav('/home'); }}>건너뛰고 A1부터 시작</Button>}
        </div>
      </Page>
    );
  }
  return (
    <Page title="레벨 진단" back={false}>
      <QuizRunner questions={LEVEL_TEST} title="레벨 진단" onDone={(rs: QResult[]) => {
        const map = Object.fromEntries(rs.map((r) => [r.q.id, r.correct]));
        const { level, byLevel } = estimateLevel(map);
        save(level, byLevel, toAnswers(rs, 'level-test'));
        nav('/level-result', { replace: true });
      }} />
    </Page>
  );
}

export function LevelResult() {
  const nav = useNavigate();
  const lt = useApp((s) => s.profile.levelTest);
  return (
    <Page title="레벨 진단 결과" back={false}>
      <Card className="text-center">
        <p className="text-sm text-ink-soft">추천 학습 레벨</p>
        <p className="text-5xl font-extrabold text-accent mt-1" data-testid="level-result">{lt.level}</p>
        <p className="text-xs text-ink-faint mt-2">문법·어휘 기준 내부 추정 · 듣기·말하기 미평가 · 공인 인증 아님</p>
      </Card>
      {lt.byLevel && Object.keys(lt.byLevel).length > 0 && (
        <Card className="mt-3">
          <p className="font-bold mb-2">레벨별 정답</p>
          {LEVELS.map((l) => {
            const b = lt.byLevel![l];
            return b ? (
              <div key={l} className="flex items-center gap-3 py-1.5">
                <span className="w-8 font-bold">{l}</span>
                <div className="flex-1 h-2 bg-mist rounded-full overflow-hidden"><div className="h-full bg-accent" style={{ width: `${(b.correct / b.total) * 100}%` }} /></div>
                <span className="text-sm w-12 text-right">{b.correct}/{b.total}</span>
              </div>
            ) : null;
          })}
        </Card>
      )}
      {lt.level !== 'A1' && (
        <Card className="mt-3 bg-butter border-[#F2D98A]">
          <p className="text-sm"><Tag tone="warn">안내</Tag> 현재 정규 학습 콘텐츠는 <b>A1</b>만 제공돼요. {lt.level} 과정은 준비 중이라, A1 복습과 표현 학습관·듣기·말하기부터 시작하길 추천해요.</p>
        </Card>
      )}
      <div className="mt-5"><Button size="lg" onClick={() => nav('/home', { replace: true })}>시작의 숲으로 입장</Button></div>
    </Page>
  );
}
