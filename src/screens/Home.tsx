import { Link, useNavigate } from 'react-router-dom';
import { useMemo } from 'react';
import { useApp, today, discoveryInfo, claimableCount } from '@/store/app';
import { starBalance, VILLAGE_LEVELS, DISCOVERY_MILESTONES } from '@/domain/game/state';
import { CHARACTER_BY_ID } from '@/content/characters';
import { countDueByKind } from '@/domain/learning/srs';
import { VillageScene } from '@/game/village/VillageScene';
import { PartnerBubble } from '@/components/Partner';
import { Button, Card, Tag } from '@/components/ui';
import { currentUnit, nextStep, STEPS, stepsDoneOn } from '@/lib/curriculum';
import { addDays } from '@/domain/date';

export function Home() {
  const nav = useNavigate();
  const s = useApp();
  const d = today();
  const due = useMemo(() => countDueByKind(s.learning.reviews, d), [s.learning.reviews, d]);
  const tomorrowDue = useMemo(() => countDueByKind(s.learning.reviews, addDays(d, 1)).total - due.total, [s.learning.reviews, d, due.total]);
  const unit = currentUnit(s.learning);
  const step = nextStep(s.learning, unit.id);
  const doneToday = stepsDoneOn(s.learning, d);
  const pts = starBalance(s.game);
  const claimable = claimableCount(s);
  const vLevel = VILLAGE_LEVELS.find((v) => v.level === s.game.village.level) ?? VILLAGE_LEVELS[0];
  const disc = discoveryInfo(s);
  const skipped = s.learning.reviewSkippedOn === d;
  const reviewFirst = due.total > 0 && !skipped;
  const hour = new Date().getHours();
  const [nh] = s.settings.notifyTime.split(':').map(Number);
  const studiedToday = s.learning.log.some((e) => e.date === d && e.kind !== 'level-test');
  const showStudyReminder = s.settings.notificationsOn && !studiedToday && hour >= nh;

  return (
    <div className="min-h-[100dvh] bg-mist pb-36">
      {/* 상단: 레벨 · 오늘 진도 · 복습 · 포인트 */}
      <header className="bg-white border-b border-line">
        <div className="mx-auto max-w-[560px] px-4 pt-3 pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <span className="font-extrabold text-lg">시작의 숲</span>
              <span className="text-xs text-ink-soft" data-testid="village-level">마을 {vLevel.level}단계</span>
              <Tag tone="accent">{s.profile.levelTest.level ?? 'A1'}</Tag>
            </div>
            <Link to="/my" className="min-h-[44px] min-w-[44px] grid place-items-center rounded-full hover:bg-mist" aria-label="MY 및 설정">⚙️</Link>
          </div>
          <div className="grid grid-cols-3 gap-2 mt-2" data-testid="home-stats">
            <div className="rounded-2xl bg-mist px-3 py-2"><p className="text-[11px] text-ink-soft">오늘 진도</p><p className="font-bold" data-testid="today-progress">{doneToday}단계</p></div>
            <div className="rounded-2xl bg-mist px-3 py-2"><p className="text-[11px] text-ink-soft">복습 예정</p><p className="font-bold" data-testid="due-count">{due.total}개</p></div>
            <div className="rounded-2xl bg-mist px-3 py-2"><p className="text-[11px] text-ink-soft">별</p><p className="font-bold" data-testid="points">★ {pts}</p></div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[560px] px-4">
        {/* 앱 내부 알림 */}
        {(reviewFirst || showStudyReminder) && (
          <div className="mt-3 rounded-2xl bg-white border border-line px-3 py-2.5 text-sm flex items-start gap-2" role="status" data-testid="in-app-notice">
            <span aria-hidden>🔔</span>
            <span>{reviewFirst ? <>오늘 복습할 항목이 <b>{due.total}개</b> 있어요 (단어 {due.word} · 문법 {due.grammar} · 듣기 {due.listening} · 말하기 {due.speaking}{due.reading ? ` · 독해 ${due.reading}` : ''}).</> : `${s.settings.notifyTime} 학습 알림: 아직 오늘 공부를 시작하지 않았어요.`}</span>
          </div>
        )}

        <div className="mt-3 rounded-[28px] overflow-hidden border border-line bg-white">
          <VillageScene />
        </div>
        <div className="mt-3"><PartnerBubble state={reviewFirst ? 'review' : studiedToday ? 'completed' : 'greeting'} /></div>

        {disc.ok && (
          <Card className="mt-3 bg-butter border-[#F2D98A]">
            <p className="font-bold">✨ 숲에서 무언가 반짝여요!</p>
            <p className="text-sm text-ink-soft mt-1">{CHARACTER_BY_ID[disc.characterId].conceptLabel} 학습 성취로 발견 이벤트가 열렸어요. 퀴즈 3문제 중 2개 이상 맞히면 친구가 돼요.</p>
            <Button className="mt-3 w-full" onClick={() => nav('/discover')} data-testid="go-discover">발견하러 가기</Button>
          </Card>
        )}
        {!disc.ok && disc.reason === 'restudy' && (
          <Card className="mt-3"><p className="text-sm">🔍 발견 퀴즈에 아쉽게 실패했어요. <b>학습을 하나 더 완료</b>하면 다시 도전할 수 있어요.</p></Card>
        )}
        {!disc.ok && disc.reason === 'none' && (() => {
          const nextM = DISCOVERY_MILESTONES.find((m) => !s.game.characters[m.characterId]);
          return nextM ? <p className="mt-3 text-xs text-ink-soft text-center">다음 숲 친구 발견 조건: {nextM.label}</p> : null;
        })()}

        {tomorrowDue > 0 && <p className="mt-3 text-xs text-ink-soft text-center">내일 복습 예정: {tomorrowDue}개 더</p>}

        <div className="grid grid-cols-3 gap-2 mt-4">
          <Link to="/quests" className="relative rounded-2xl bg-white border border-line p-3 min-h-[64px]" data-testid="go-quests"><p className="font-bold">📜 퀘스트</p><p className="text-xs text-ink-soft">별 받기</p>{claimable > 0 && <span className="absolute top-2 right-2 bg-bad text-white text-[11px] rounded-full min-w-5 h-5 px-1 grid place-items-center" data-testid="claimable">{claimable}</span>}</Link>
          <Link to="/house" className="rounded-2xl bg-white border border-line p-3 min-h-[64px]"><p className="font-bold">🏡 나의 집</p><p className="text-xs text-ink-soft">Lv.{s.home.houseLevel}</p></Link>
          <Link to="/spaces" className="rounded-2xl bg-white border border-line p-3 min-h-[64px]"><p className="font-bold">🗺 공간</p><p className="text-xs text-ink-soft">{s.home.spaces.garden ? '정원 개방' : '정원 잠김'}</p></Link>
        </div>
        <div className="grid grid-cols-2 gap-2 mt-2">
          <Link to="/free" className="rounded-2xl bg-white border border-line p-3 min-h-[64px]"><p className="font-bold">📚 자유학습</p><p className="text-xs text-ink-soft">원하는 것부터</p></Link>
          <Link to="/expressions" className="rounded-2xl bg-white border border-line p-3 min-h-[64px]"><p className="font-bold">💬 표현 학습관</p><p className="text-xs text-ink-soft">회화·여행·영상</p></Link>
          <Link to="/wrong-notes" className="rounded-2xl bg-white border border-line p-3 min-h-[64px]"><p className="font-bold">📝 오답노트</p><p className="text-xs text-ink-soft">{Object.values(s.learning.wrongNotes).filter((w) => !w.resolved).length}개</p></Link>
          <Link to="/analysis" className="rounded-2xl bg-white border border-line p-3 min-h-[64px]"><p className="font-bold">📈 실력 분석</p><p className="text-xs text-ink-soft">취약 개념</p></Link>
        </div>
      </main>

      {/* 하단: 복습 · 이어하기 · 도감 · 기록 — 항상 접근 가능 */}
      <nav className="fixed bottom-0 inset-x-0 z-30 bg-white/95 backdrop-blur border-t border-line pb-[env(safe-area-inset-bottom)]" aria-label="주요 학습">
        <div className="mx-auto max-w-[560px] px-3 pt-2 pb-2">
          <div className="grid grid-cols-2 gap-2">
            <Button variant={reviewFirst ? 'primary' : 'secondary'} onClick={() => nav('/review')} data-testid="btn-review">
              오늘의 복습{due.total ? ` ${due.total}` : ''}
            </Button>
            <Button variant={reviewFirst ? 'secondary' : 'primary'} onClick={() => nav('/today')} data-testid="btn-continue">
              {step ? `이어서: ${STEPS.find((x) => x.kind === step.kind)!.label}` : '오늘의 학습'}
            </Button>
          </div>
          <div className="grid grid-cols-3 gap-1 mt-1 text-sm">
            <Link to="/collection" className="min-h-[44px] grid place-items-center rounded-xl hover:bg-mist font-medium">🐾 도감</Link>
            <Link to="/history" className="min-h-[44px] grid place-items-center rounded-xl hover:bg-mist font-medium">🗓 학습 기록</Link>
            <Link to="/my" className="min-h-[44px] grid place-items-center rounded-xl hover:bg-mist font-medium">👤 MY</Link>
          </div>
        </div>
      </nav>
    </div>
  );
}
