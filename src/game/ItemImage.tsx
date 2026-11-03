import { FURNITURE_BY_ID } from '@/content/furniture';
import { assetUrl } from './assets';
import { itemAsset } from './layout';

/** 상점·보관함 썸네일 (게임 에셋 이미지) */
export function ItemImage({ itemId, size = 72, className }: { itemId: string; size?: number; className?: string }) {
  const f = FURNITURE_BY_ID[itemId];
  const key = f ? itemAsset(itemId, f.space) : null;
  if (!f || !key) return null;
  const tex = f.category === 'wallpaper' || f.category === 'floor';
  return <img src={assetUrl(key)} alt={f.name} draggable={false} width={size} height={size} className={`${tex ? 'rounded-xl object-cover' : 'object-contain'} ${className ?? ''}`} style={{ width: size, height: size }} />;
}
