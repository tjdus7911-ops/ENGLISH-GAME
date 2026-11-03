import { Link } from 'react-router-dom';
import { useApp, today, claimableCount } from '@/store/app';
import { Card, Page, Progress, Tag, Button } from '@/components/ui';
import { PartnerBubble } from '@/components/Partner';
import { currentUnit, STEPS, stepPath } from '@/lib/curriculum';
import { countDueByKind } from '@/domain/learning/srs';
import { cx } from '@/lib/cx';

export function Today() {
  const l = useApp((s) => s.learning);
  const unit = currentUnit(l);
  const doneCount = STEPS.filter((s) => l.steps[`${unit.id}:${s.kind}`]).length;
  const due = countDueByKind(l.reviews, today()).total;
  const firstOpen = STEPS.find((s) => !l.steps[`${unit.id}:${s.kind}`]);
  return (
    <Page title="오늘의 학습" back="/home">
      {due > 0 && l.reviewSkippedOn !== today() && (
        <Card className="mb-3 bg-butter border-[#F2D98A]">
          <p className="text-sm">복습 {due}개가 기다리고 있어요. 신규 학습 전에 복습을 먼저 하면 기억이 오래가요.</p>
          <Link to="/review" className="inline-block mt-2"><Button size="sm">복습 먼저 하기</Button></Link>
        </Card>
      )}
      <Card>
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0"><p className="text-xs text-ink-soft">A1 · {unit.order}단원</p><p className="font-extrabold text-lg truncate">{unit.title}</p></div>
          <Tag tone="accent">{doneCount}/{STEPS.length}</Tag>
        </div>
        <div className="mt-3"><Progress value={doneCount} max={STEPS.length} label="단원 진행도" /></div>
      </Card>
      <Link to="/review" data-testid="step-review" className="mt-3 flex items-center gap-3 rounded-2xl border border-line p-3 min-h-[56px] bg-white">
        <span className={cx('w-9 h-9 rounded-full grid place-items-center font-bold shrink-0', due === 0 ? 'bg-ok text-white' : 'bg-butter')}>{due === 0 ? '✓' : '↻'}</span>
        <span className="flex-1"><span className="font-bold block">예정된 복습</span><span className="text-xs text-ink-soft">{due === 0 ? '오늘 복습 완료 또는 대상 없음' : `${due}개 남음`}</span></span>
      </Link>
      <ol className="mt-2 grid gap-2">
        {STEPS.map((s, i) => {
          const done = !!l.steps[`${unit.id}:${s.kind}`];
          const isNext = firstOpen?.kind === s.kind;
          return (
            <li key={s.kind}>
              <Link to={stepPath(unit.id, s.kind)} data-testid={`step-${s.kind}`}
                className={cx('flex items-center gap-3 rounded-2xl border p-3 min-h-[64px] bg-white', isNext ? 'border-accent ring-2 ring-accent/20' : 'border-line')}>
                <span className={cx('w-9 h-9 rounded-full grid place-items-center font-bold shrink-0', done ? 'bg-ok text-white' : isNext ? 'bg-accent text-white' : 'bg-mist text-ink-soft')}>{done ? '✓' : i + 1}</span>
                <span className="flex-1 min-w-0"><span className="font-bold block">{s.label}</span><span className="text-xs text-ink-soft">{s.desc}</span></span>
                {isNext && <Tag tone="accent">다음</Tag>}
              </Link>
            </li>
          );
        })}
      </ol>
      <QuestRow />
      <div className="mt-4"><PartnerBubble state="studying" /></div>
    </Page>
  );
}

function QuestRow() {
  const n = useApp((s) => claimableCount(s));
  return (
    <Link to="/quests" data-testid="step-quests" className="mt-2 flex items-center gap-3 rounded-2xl border border-line p-3 min-h-[56px] bg-white">
      <span className="w-9 h-9 rounded-full grid place-items-center font-bold shrink-0 bg-butter">★</span>
      <span className="flex-1"><span className="font-bold block">퀘스트 보상 받기</span><span className="text-xs text-ink-soft">{n ? `받을 수 있는 보상 ${n}개` : '학습을 하면 퀘스트가 진행돼요'}</span></span>
      {n > 0 && <Tag tone="accent">{n}</Tag>}
    </Link>
  );
}
