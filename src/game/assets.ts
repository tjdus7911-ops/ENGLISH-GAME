/**
 * GameAssetManager — 게임 화면 이미지 에셋 관리
 * - 에셋 키(예: 'buildings/library-stage1') → URL (WebP)
 * - manifest.json: 원본 크기(px)·기준점(anchor) — scripts/process_assets.py 가 생성
 * - 화면 진입 전 필요한 묶음만 미리 받기(preload) + 진행률/실패 처리
 * 실패 시 임시 도형으로 대체하지 않고 '다시 시도' 화면을 보여 준다.
 */
import { useEffect, useState } from 'react';
import MANIFEST from './manifest.json' with { type: 'json' };

export interface AssetMeta { w: number; h: number; anchor: [number, number]; sheet: string }
const items = (MANIFEST as unknown as { items: Record<string, AssetMeta> }).items;

export const assetUrl = (key: string) => `${import.meta.env.BASE_URL}assets/game/${key}.webp`;
export const assetMeta = (key: string): AssetMeta | undefined => items[key];
export const hasAsset = (key: string) => !!items[key];
/** 표시 너비(논리 단위)로부터 높이 계산 */
export const heightFor = (key: string, width: number) => { const m = items[key]; return m ? (width * m.h) / m.w : width; };
/** 기준점 비율 (0..1) */
export const anchorOf = (key: string): [number, number] => { const m = items[key]; return m ? [m.anchor[0] / m.w, m.anchor[1] / m.h] : [0.5, 1]; };

const cache = new Map<string, Promise<void>>();
function loadOne(key: string): Promise<void> {
  if (!cache.has(key)) {
    cache.set(key, new Promise<void>((res, rej) => {
      const img = new Image();
      img.decoding = 'async';
      img.onload = () => res();
      img.onerror = () => { cache.delete(key); rej(new Error(key)); };
      img.src = assetUrl(key);
    }));
  }
  return cache.get(key)!;
}

export function preload(keys: string[], onProgress?: (done: number, total: number) => void) {
  let done = 0;
  return Promise.all(keys.map((k) => loadOne(k).then(() => { done++; onProgress?.(done, keys.length); })));
}

export type AssetState = { status: 'loading'; progress: number } | { status: 'ready' } | { status: 'error'; missing: string[]; retry: () => void };

/** 화면에 필요한 에셋 묶음을 미리 받는다 */
export function useAssets(keys: string[]): AssetState {
  const sig = keys.join('|');
  const [state, setState] = useState<AssetState>({ status: 'loading', progress: 0 });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let alive = true;
    const missing = keys.filter((k) => !hasAsset(k));
    if (missing.length) { setState({ status: 'error', missing, retry: () => setAttempt((a) => a + 1) }); return; }
    setState({ status: 'loading', progress: 0 });
    preload(keys, (d, t) => alive && setState({ status: 'loading', progress: d / t }))
      .then(() => alive && setState({ status: 'ready' }))
      .catch((e: Error) => alive && setState({ status: 'error', missing: [e.message], retry: () => setAttempt((a) => a + 1) }));
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig, attempt]);
  return state;
}

export type CharacterPose = 'idle' | 'walk' | 'wave' | 'happy' | 'sleep' | 'study' | 'sit' | 'evolve';
/** 행동 → 대체 포즈 (해당 이미지가 아직 없으면 기존 3포즈로 대체) */
const POSE_FALLBACK: Record<CharacterPose, CharacterPose> = { idle: 'idle', walk: 'idle', wave: 'idle', happy: 'wave', sleep: 'idle', study: 'idle', sit: 'idle', evolve: 'wave' };
export const characterKey = (id: string, level: 1 | 2, pose: CharacterPose): string => {
  const key = `characters/${id}-lv${level}-${pose}`;
  return hasAsset(key) || pose === 'idle' ? key : characterKey(id, level, POSE_FALLBACK[pose]);
};
export const guideKey = (pose: 'idle' | 'hop' | 'wave') => `characters/guide-${pose}`;

/** 진화형은 기본형보다 조금 크게 보여 준다 (캔버스는 단계별로 정규화되어 있음) */
export const levelScale = (level: 1 | 2) => (level === 2 ? 1.18 : 1);
