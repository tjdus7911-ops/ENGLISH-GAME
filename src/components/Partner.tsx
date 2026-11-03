import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { CharacterAnimState } from '@/domain/types';
import { CHARACTER_BY_ID, GUIDE } from '@/content/characters';
import { DECORATION_RULES } from '@/domain/game/state';
import { useApp } from '@/store/app';
import { cx } from '@/lib/cx';
import { CharacterArt, GuideArt } from './CharacterArt';
import { Button, Modal } from './ui';

export function usePartner() {
  const partnerId = useApp((s) => s.game.partnerId);
  const uc = useApp((s) => (s.game.partnerId ? s.game.characters[s.game.partnerId] : undefined));
  return partnerId && uc ? { ch: CHARACTER_BY_ID[partnerId], uc } : null;
}

function pickLine(lines: string[] | undefined, salt: number) {
  if (!lines?.length) return '';
  return lines[salt % lines.length];
}

/**
 * 대표 파트너(없으면 숲지기 등불)의 말풍선.
 * 음성 재생·녹음을 방해하지 않도록 소리는 내지 않고, 애니메이션은 transform 만 사용한다.
 */
export function PartnerBubble({ state, text, compact = false }: { state: CharacterAnimState; text?: string; compact?: boolean }) {
  const p = usePartner();
  const [salt] = useState(() => Math.floor(Math.random() * 100));
  const line = text ?? (p ? pickLine(p.ch.lines[state] ?? p.ch.lines.studying, salt) : pickLine(GUIDE.lines[state] ?? GUIDE.lines.greeting, salt));
  if (!line) return null;
  return (
    <div className={cx('flex items-end gap-2', compact && 'opacity-95')} aria-live="polite">
      {p ? <CharacterArt id={p.ch.id} level={p.uc.level} state={state} size={compact ? 48 : 64} /> : <GuideArt size={compact ? 44 : 60} />}
      <div className="relative rounded-2xl rounded-bl-sm bg-white border border-line px-3 py-2 text-sm max-w-[80%]">
        <span className="font-semibold text-accent-dark mr-1">{p ? p.ch.name : GUIDE.name}</span>{line}
      </div>
    </div>
  );
}

/** 보상·캐릭터 획득·성장·마을 장식 알림 */
export function CelebrationLayer() {
  const cel = useApp((s) => s.celebrations);
  const dismiss = useApp((s) => s.dismissCelebration);
  const chars = useApp((s) => s.game.characters);
  const nav = useNavigate();
  const toasts = cel.filter((c) => c.kind === 'reward' || c.kind === 'decoration');
  const big = cel.find((c) => c.kind === 'character' || c.kind === 'levelup');

  useEffect(() => {
    if (!toasts.length) return;
    const t = setTimeout(() => dismiss(toasts[0].id), 2600);
    return () => clearTimeout(t);
  }, [toasts, dismiss]);

  return (
    <>
      <div className="fixed top-16 left-0 right-0 z-40 pointer-events-none flex flex-col items-center gap-2 px-4">
        {toasts.slice(0, 3).map((t) => (
          <div key={t.id} className="pointer-events-auto toast-in rounded-2xl bg-ink text-white px-4 py-2.5 text-sm shadow-lg max-w-[420px]" role="status">
            {t.kind === 'reward' ? `✨ ${t.text}` : `🌼 마을에 새 변화: ${DECORATION_RULES.find((d) => d.id === t.decoration)?.label}`}
          </div>
        ))}
      </div>
      {big && (
        <Modal open label={big.kind === 'character' ? '캐릭터 획득' : '캐릭터 성장'} onClose={() => dismiss(big.id)}>
          {(() => {
            const id = big.kind === 'character' || big.kind === 'levelup' ? big.characterId : '';
            const ch = CHARACTER_BY_ID[id];
            const lv = chars[id]?.level ?? 1;
            return (
              <div className="text-center" data-testid={big.kind === 'character' ? 'acquire-modal' : 'levelup-modal'}>
                <p className="text-sm font-semibold text-accent-dark">{big.kind === 'character' ? (ch.rarity === 'common' ? '새 친구 발견!' : ch.rarity === 'rare' ? '희귀 캐릭터 획득!' : '특별 캐릭터 획득!') : '캐릭터 성장!'}</p>
                <div className="my-3 grid place-items-center">
                  <div className={cx('rounded-full p-4', big.kind === 'levelup' ? 'bg-butter glow' : 'bg-mint')}>
                    <CharacterArt id={id} level={lv} state={big.kind === 'levelup' ? 'levelup' : 'greeting'} size={140} />
                  </div>
                </div>
                <p className="text-2xl font-extrabold">{ch.name} {big.kind === 'levelup' && <span className="text-accent">Lv.2</span>}</p>
                <p className="text-sm text-ink-soft mt-1">{ch.species} · {ch.conceptLabel}</p>
                <p className="mt-3 text-sm">{big.kind === 'levelup' ? ch.lines.levelup?.[0] : ch.lines.greeting?.[0]}</p>
                <div className="mt-5 grid gap-2">
                  <Button size="lg" onClick={() => dismiss(big.id)}>좋아요!</Button>
                  <Button variant="ghost" onClick={() => { dismiss(big.id); nav(`/collection/${id}`); }}>도감에서 보기</Button>
                </div>
              </div>
            );
          })()}
        </Modal>
      )}
    </>
  );
}
