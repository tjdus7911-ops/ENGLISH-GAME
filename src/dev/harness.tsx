/**
 * 개발 전용 장면 렌더 하네스 (프로덕션 빌드에 포함되지 않음: vite build 입력은 index.html 뿐).
 * 실제 VillageScene / HouseScene / GardenScene 컴포넌트를 쿼리 파라미터 상태로 렌더해
 * Playwright 로 시안 이미지를 뽑는 데 사용한다 → Figma 시안 = 실제 게임 배치.
 * 예) harness.html?scene=house&w=1280&p=bed:bed-wood,desk:desk-study&chars=mossy:1&partner=mossy
 */
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import '@/index.css';
import { useApp } from '@/store/app';
import { VillageScene } from '@/game/village/VillageScene';
import { HouseScene } from '@/game/house/HouseScene';
import { GardenScene } from '@/game/garden/GardenScene';
import { EvolutionSequence } from '@/game/EvolutionSequence';

const q = new URLSearchParams(location.search);
const scene = q.get('scene') ?? 'village';
const width = Number(q.get('w') ?? 1024);
const placements = Object.fromEntries((q.get('p') ?? '').split(',').filter(Boolean).map((kv) => kv.split(':')));
const chars = Object.fromEntries((q.get('chars') ?? '').split(',').filter(Boolean).map((kv) => {
  const [id, lv] = kv.split(':');
  return [id, { id, level: Number(lv) as 1 | 2, xp: 0, acquiredOn: id }];
}));

function inject() {
  useApp.setState((s) => ({
  settings: { ...s.settings, reduceMotion: q.get('motion') !== '1' },
  game: {
    ...s.game,
    characters: chars as typeof s.game.characters,
    partnerId: q.get('partner') ?? null,
    village: { ...s.game.village, level: Number(q.get('level') ?? 1) as 1 | 2 | 3, unlocked: (q.get('deco') ?? '').split(',').filter(Boolean) as never },
  },
  }));
}

function App() {
  return (
    <MemoryRouter>
      <div id="shot" style={{ width }}>
        {scene === 'village' && <VillageScene />}
        {scene === 'house' && <HouseScene placements={placements} mode={(q.get('mode') as 'view' | 'decorate') ?? 'view'} selected={q.get('sel')} onSelect={() => {}} />}
        {scene === 'evolve' && <EvolutionSequence id={q.get('id') ?? 'mossy'} size={140} />}
        {scene === 'garden' && <GardenScene placements={placements} locked={q.get('locked') === '1'} mode={(q.get('mode') as 'view' | 'decorate') ?? 'view'} onSelect={() => {}} />}
      </div>
    </MemoryRouter>
  );
}
// persist(IndexedDB) 복원이 끝난 뒤에 상태를 주입해야 덮어쓰이지 않는다
const start = () => { inject(); createRoot(document.getElementById('root')!).render(<App />); };
if (useApp.persist.hasHydrated()) start(); else useApp.persist.onFinishHydration(start);
