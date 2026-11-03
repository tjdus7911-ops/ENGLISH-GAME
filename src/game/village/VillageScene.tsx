import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/store/app';
import { AssetGate, Stage } from '../Stage';
import { characterKey, guideKey, useAssets } from '../assets';
import { VILLAGE, buildingImage } from '../layout';
import { VillageBackground } from './VillageBackground';
import { VillageBuilding } from './VillageBuilding';
import { VillageCharacter } from './VillageCharacter';
import { VillageDecoration } from './VillageDecoration';
import { GuideImage } from '../CharacterImage';

export function useReducedMotion() {
  const setting = useApp((s) => s.settings.reduceMotion);
  const [pref, setPref] = useState(false);
  useEffect(() => {
    const m = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (!m) return;
    setPref(m.matches);
    const h = () => setPref(m.matches);
    m.addEventListener?.('change', h);
    return () => m.removeEventListener?.('change', h);
  }, []);
  return setting || pref;
}

/** 영어 마을 '시작의 숲' — 배경 · 장식 · 건물 · 캐릭터를 레이어로 합성 */
export function VillageScene() {
  const nav = useNavigate();
  const level = useApp((s) => s.game.village.level ?? 1);
  const unlocked = useApp((s) => s.game.village.unlocked);
  const chars = useApp((s) => s.game.characters);
  const partnerId = useApp((s) => s.game.partnerId);
  const reduce = useReducedMotion();
  const owned = useMemo(() => Object.values(chars).sort((a, b) => (a.id === partnerId ? -1 : b.id === partnerId ? 1 : a.acquiredOn.localeCompare(b.acquiredOn))), [chars, partnerId]);
  const decos = VILLAGE.decorations.filter((d) => (d.when.level ? level >= d.when.level : true) && (d.when.decoration ? unlocked.includes(d.when.decoration) : true));
  const keys = useMemo(() => [
    VILLAGE.background,
    ...VILLAGE.buildings.map((b) => buildingImage(b, level)),
    ...decos.map((d) => d.image as string),
    ...owned.flatMap((c) => (['idle', 'walk', 'wave'] as const).map((p) => characterKey(c.id, c.level, p))),
    guideKey('idle'),
  ], [level, decos, owned]);
  const state = useAssets([...new Set(keys)]);
  return (
    <AssetGate state={state} label="마을">
      <Stage size={VILLAGE.size} testId="village" style={{ background: '#CFE8C0' }} data={{ stage: level, decorations: unlocked.length }}>
        <VillageBackground />
        {decos.map((d) => <VillageDecoration key={d.id} deco={d} />)}
        {VILLAGE.buildings.map((b) => <VillageBuilding key={b.id} b={b} level={level} onEnter={(r) => nav(r)} reduce={reduce} />)}
        {owned.map((uc, i) => <VillageCharacter key={uc.id} id={uc.id} level={uc.level} partner={uc.id === partnerId} index={i} reduce={reduce} />)}
        {owned.length === 0 && (
          <div className="absolute pointer-events-none" data-testid="guide" style={{ left: `${(512 / 1024) * 100}%`, top: `${(640 / 1280) * 100}%`, width: '11%', transform: 'translate(-50%,-90%)', zIndex: 700 }}>
            <GuideImage size={200} className="w-full h-auto" />
          </div>
        )}
      </Stage>
    </AssetGate>
  );
}
