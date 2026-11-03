import { FURNITURE_BY_ID } from '@/content/furniture';
import { Button, Modal } from '@/components/ui';
import { assetUrl } from './assets';
import { ItemImage } from './ItemImage';

export interface QuestReward { title: string; stars: number; items: string[] }

/** 퀘스트 보상 수령 오버레이 (별 + 보상 가구). 이미지 에셋 사용, 짧은 등장 애니메이션만 (모션 줄이기 존중은 CSS) */
export function QuestRewardOverlay({ reward, onClose }: { reward: QuestReward | null; onClose: () => void }) {
  return (
    <Modal open={!!reward} onClose={onClose} label="퀘스트 완료 보상">
      {reward && (
        <div className="text-center" data-testid="quest-reward">
          <p className="text-sm font-semibold text-accent-dark">퀘스트 완료 보상</p>
          <div className="relative mx-auto my-2 w-32 h-32">
            <img src={assetUrl('effects/sparkle')} alt="" className="absolute inset-0 w-full h-full object-contain deco-in" aria-hidden />
            <img src={assetUrl('effects/icon-star')} alt="별" className="absolute inset-4 w-24 h-24 object-contain deco-in" />
          </div>
          <p className="font-bold">{reward.title}</p>
          <p className="text-2xl font-extrabold mt-1">★ +{reward.stars}</p>
          {reward.items.length > 0 && (
            <div className="flex justify-center gap-3 mt-3" data-testid="reward-items">
              {reward.items.map((i) => (
                <div key={i} className="text-center"><ItemImage itemId={i} size={72} /><p className="text-xs mt-1">{FURNITURE_BY_ID[i].name}</p></div>
              ))}
            </div>
          )}
          <Button size="lg" className="mt-4" onClick={onClose}>확인</Button>
        </div>
      )}
    </Modal>
  );
}
