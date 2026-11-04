import { Link } from 'react-router-dom';
import { useApp, discoveryInfo, questList } from '@/store/app';
import { growthCheck, LV2_XP, starBalance } from '@/domain/game/state';
import { computeMastery } from '@/domain/learning/mastery';
import { CHARACTER_BY_ID } from '@/content/characters';
import { CharacterImage } from '@/game/CharacterImage';

/**
 * 학습 결과 화면 공통: "이번 학습으로 생긴 것" 요약.
 * 받을 수 있는 퀘스트 보상(별) · 열린 발견 이벤트 · 대표 파트너 진화 진행도를 한곳에 모아
 * 결과 → 보상 → 성장 → 마을 복귀의 다음 행동을 분명히 한다. (상태 읽기 전용, 보상 지급 로직은 store 그대로)
 */
export function SessionRewards() {
  const s = useApp();
  const claim = questList(s).filter((x) => x.status === 'completed');
  const claimStars = claim.reduce((n, x) => n + x.q.stars, 0);
  const disc = discoveryInfo(s);
  const pid = s.game.partnerId;
  const uc = pid ? s.game.characters[pid] : undefined;
  const ch = pid ? CHARACTER_BY_ID[pid] : undefined;
  const g = uc && ch ? growthCheck(uc, computeMastery(s.learning.answers)[ch.conceptId]) : null;
  if (!claim.length && !disc.ok && !uc) return null;
  return (
    <section className="mt-4 rounded-card border border-line bg-white p-3" data-testid="session-rewards" aria-label="이번 학습 보상">
      <div className="flex items-center justify-between">
        <h2 className="font-bold">이번 학습 보상</h2>
        <span className="text-sm font-bold" data-testid="session-stars">보유 ★ {starBalance(s.game)}</span>
      </div>
      <div className="grid gap-2 mt-2">
        {claim.length > 0 && (
          <Link to="/quests" className="flex items-center gap-3 rounded-2xl bg-butter px-3 min-h-[52px]" data-testid="reward-claim-link">
            <span className="text-xl" aria-hidden>📜</span>
            <span className="flex-1 text-sm"><b>퀘스트 {claim.length}개 완료</b> · 받을 수 있는 별 ★ {claimStars}</span>
            <span className="text-sm font-bold text-accent-dark">받으러 가기 ›</span>
          </Link>
        )}
        {disc.ok && (
          <Link to="/discover" className="flex items-center gap-3 rounded-2xl bg-mint px-3 min-h-[52px]" data-testid="reward-discover-link">
            <span className="text-xl" aria-hidden>✨</span>
            <span className="flex-1 text-sm"><b>새 친구 발견!</b> 퀴즈를 맞히면 친구가 돼요</span>
            <span className="text-sm font-bold text-ok">만나러 가기 ›</span>
          </Link>
        )}
        {uc && ch && g && (
          <Link to={`/collection/${uc.id}`} className="flex items-center gap-3 rounded-2xl bg-mist px-3 py-2" data-testid="reward-growth">
            <CharacterImage id={uc.id} level={uc.level} size={44} />
            <span className="flex-1 min-w-0">
              <span className="block text-sm font-bold">{ch.name} {uc.level === 2 ? '· 진화 완료' : `· 성장 XP ${Math.min(uc.xp, LV2_XP)}/${LV2_XP}`}</span>
              {uc.level === 1 && (
                <>
                  <span className="block h-1.5 bg-white rounded-full overflow-hidden mt-1"><span className="block h-full bg-ok" style={{ width: `${Math.min(100, (uc.xp / LV2_XP) * 100)}%` }} /></span>
                  <span className="block text-[11px] text-ink-soft mt-1">진화 조건: XP {g.xpOk ? '✓' : `${uc.xp}/${LV2_XP}`} · 다른 날 복습 {g.reviewDaysOk ? '✓' : `${g.reviewDays}/2일`} · 정확도 70% {g.accuracyOk ? '✓' : g.accuracy === null ? '기록 없음' : `${Math.round(g.accuracy * 100)}%`}</span>
                </>
              )}
            </span>
          </Link>
        )}
      </div>
    </section>
  );
}
