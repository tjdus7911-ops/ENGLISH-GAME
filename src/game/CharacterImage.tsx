import type { CharacterAnimState } from '@/domain/types';
import { CHARACTER_BY_ID } from '@/content/characters';
import { assetUrl, characterKey, guideKey } from './assets';

/** 학습 UI·도감·모달용 캐릭터 이미지 (게임 에셋). 상태 모션은 transform 애니메이션 */
export function CharacterImage({ id, level = 1, state = 'idle', size = 96, silhouette = false, className, title }: {
  id: string; level?: 1 | 2; state?: CharacterAnimState; size?: number; silhouette?: boolean; className?: string; title?: string;
}) {
  const ch = CHARACTER_BY_ID[id];
  if (!ch) return null;
  const pose = state === 'correct' || state === 'completed' ? 'happy' : state === 'levelup' ? 'evolve' : state === 'greeting' ? 'wave' : state === 'walking' ? 'walk' : 'idle';
  return (
    <img src={assetUrl(characterKey(id, level, pose))} width={size} height={size} draggable={false} alt={title ?? (silhouette ? '미발견 캐릭터' : `${ch.name} Lv.${level}`)}
      className={`char char-${state} object-contain ${className ?? ''}`} style={{ width: size, height: size, filter: silhouette ? 'brightness(0) opacity(.18)' : undefined }} />
  );
}

export function GuideImage({ size = 80, className, pose = 'idle' }: { size?: number; className?: string; pose?: 'idle' | 'hop' | 'wave' }) {
  return <img src={assetUrl(guideKey(pose))} alt="숲지기 등불" width={size} height={size} draggable={false} className={`char char-idle object-contain ${className ?? ''}`} style={{ width: size, height: size }} />;
}
