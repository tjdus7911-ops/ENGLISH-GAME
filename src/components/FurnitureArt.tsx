import type { FurnitureItem } from '@/domain/game/home';

/**
 * 가구·정원 장식 SVG 에셋 (자체 제작). 원점(0,0) = 바닥 중앙. 각 카테고리 도형 + 아이템별 색상.
 * 특별(special)·희귀(rare) 아이템은 반짝임 장식을 더한다.
 */
export function FurnitureShape({ item }: { item: FurnitureItem }) {
  const [a, b = a, c = b, d = c] = item.colors;
  const sparkle = item.rarity === 'special' || item.rarity === 'rare';
  const shape = (() => {
    switch (item.category) {
      case 'bed': return (<g><ellipse cx="0" cy="2" rx="46" ry="9" fill="#000" opacity=".1" /><rect x="-44" y="-30" width="88" height="30" rx="6" fill={a} /><rect x="-44" y="-56" width="14" height="56" rx="5" fill={a} /><rect x="-30" y="-40" width="72" height="16" rx="6" fill={b} /><rect x="-28" y="-48" width="22" height="12" rx="5" fill="#fff" />{c !== b && <rect x="0" y="-40" width="42" height="16" rx="6" fill={c} opacity=".85" />}</g>);
      case 'desk': return (<g><ellipse cx="0" cy="2" rx="34" ry="6" fill="#000" opacity=".1" /><rect x="-32" y="-34" width="64" height="8" rx="3" fill={a} /><rect x="-28" y="-26" width="6" height="26" fill={a} /><rect x="22" y="-26" width="6" height="26" fill={a} /><rect x="4" y="-26" width="18" height="14" rx="2" fill={a} opacity=".8" />{b !== a && <><rect x="-20" y="-44" width="16" height="10" rx="2" fill={b} /><rect x="6" y="-40" width="12" height="6" rx="1" fill="#fff" /></>}</g>);
      case 'chair': return (<g><ellipse cx="0" cy="2" rx="16" ry="4" fill="#000" opacity=".1" /><rect x="-12" y="-46" width="24" height="24" rx="5" fill={b} /><rect x="-14" y="-24" width="28" height="7" rx="3" fill={a} /><rect x="-12" y="-18" width="4" height="18" fill={b} /><rect x="8" y="-18" width="4" height="18" fill={b} /></g>);
      case 'bookshelf': return (<g><ellipse cx="0" cy="2" rx="28" ry="5" fill="#000" opacity=".1" /><rect x="-26" y="-86" width="52" height="86" rx="4" fill={a} />{[0, 1, 2].map((r) => <g key={r}><rect x="-22" y={-80 + r * 27} width="44" height="22" fill="#fff" opacity=".35" />{[0, 1, 2, 3].map((k) => <rect key={k} x={-20 + k * 10} y={-78 + r * 27 + (k % 2) * 3} width="8" height={18 - (k % 2) * 3} rx="1" fill={[b, c, d, b][(k + r) % 4]} />)}</g>)}</g>);
      case 'sofa': return (<g><ellipse cx="0" cy="2" rx="44" ry="7" fill="#000" opacity=".1" /><rect x="-42" y="-40" width="84" height="22" rx="10" fill={b} /><rect x="-44" y="-22" width="88" height="18" rx="8" fill={a} /><rect x="-46" y="-34" width="14" height="30" rx="7" fill={b} /><rect x="32" y="-34" width="14" height="30" rx="7" fill={b} /><rect x="-38" y="-4" width="5" height="6" fill="#8A6244" /><rect x="33" y="-4" width="5" height="6" fill="#8A6244" /></g>);
      case 'lamp': return (<g><ellipse cx="0" cy="2" rx="12" ry="3" fill="#000" opacity=".1" /><rect x="-2" y="-60" width="4" height="60" fill={b} /><rect x="-10" y="-3" width="20" height="4" rx="2" fill={b} /><path d="M-16 -58 L16 -58 L10 -78 L-10 -78Z" fill={a} /><circle cx="0" cy="-54" r="14" fill="#FFE97A" opacity=".35" /></g>);
      case 'rug': return (<g><ellipse cx="0" cy="0" rx="52" ry="18" fill={a} /><ellipse cx="0" cy="0" rx="40" ry="12" fill="none" stroke={b} strokeWidth="4" strokeDasharray={item.itemId === 'rug-check' ? '8 4' : undefined} />{item.itemId === 'rug-paw' && [-18, 0, 18].map((x) => <circle key={x} cx={x} cy="0" r="4" fill={b} />)}</g>);
      case 'plant': return (<g><ellipse cx="0" cy="2" rx="12" ry="3" fill="#000" opacity=".1" /><path d="M-11 -18 L11 -18 L8 0 L-8 0Z" fill={b} /><path d="M0 -18 Q-18 -30 -14 -46 Q-2 -36 0 -18Z" fill={a} /><path d="M0 -18 Q18 -32 12 -50 Q2 -38 0 -18Z" fill={a} /><path d="M0 -18 Q-2 -40 4 -56 Q8 -36 0 -18Z" fill={a} opacity=".85" /></g>);
      case 'frame': return (<g><rect x="-20" y="-26" width="40" height="30" rx="2" fill={b} /><rect x="-16" y="-22" width="32" height="22" fill={a} />{item.itemId === 'sp-stella' ? [[-8, -16], [0, -10], [8, -15], [4, -5]].map(([x, y], k) => <circle key={k} cx={x} cy={y} r="1.6" fill={b} />) : <path d="M-16 0 L-4 -12 L4 -4 L10 -10 L16 0Z" fill="#fff" opacity=".6" />}</g>);
      case 'flowerbed': return (<g><ellipse cx="0" cy="0" rx="34" ry="12" fill="#8A6244" />{Array.from({ length: 9 }, (_, k) => <g key={k}><path d={`M${-24 + (k % 5) * 12} ${-2 - Math.floor(k / 5) * 7} l0 -8`} stroke="#5E9C47" strokeWidth="2" /><circle cx={-24 + (k % 5) * 12} cy={-12 - Math.floor(k / 5) * 7} r="5" fill={k % 2 ? a : b} /></g>)}</g>);
      case 'tree': return (<g><ellipse cx="0" cy="2" rx="22" ry="6" fill="#000" opacity=".1" /><rect x="-5" y="-34" width="10" height="34" rx="3" fill={item.itemId === 'g-tree-apple' ? '#9A6B45' : b} /><circle cx="0" cy="-54" r="26" fill={a} /><circle cx="-16" cy="-42" r="16" fill={a} /><circle cx="16" cy="-42" r="16" fill={a} />{item.itemId === 'g-tree-apple' && [[-10, -50], [8, -58], [14, -40], [-4, -38]].map(([x, y], k) => <circle key={k} cx={x} cy={y} r="4" fill={b} />)}</g>);
      case 'bench': return (<g><ellipse cx="0" cy="2" rx="30" ry="5" fill="#000" opacity=".1" /><rect x="-28" y="-30" width="56" height="7" rx="2" fill={a} /><rect x="-28" y="-18" width="56" height="7" rx="2" fill={a} /><rect x="-24" y="-12" width="4" height="12" fill={b} /><rect x="20" y="-12" width="4" height="12" fill={b} /></g>);
      case 'fountain': return (<g><ellipse cx="0" cy="0" rx="40" ry="14" fill={a} /><ellipse cx="0" cy="-4" rx="32" ry="10" fill={b} /><rect x="-5" y="-34" width="10" height="30" fill={a} /><ellipse cx="0" cy="-34" rx="14" ry="5" fill={a} /><path d="M0 -36 Q-10 -50 -16 -36 M0 -36 Q10 -50 16 -36 M0 -36 L0 -52" stroke={b} strokeWidth="3" fill="none" /></g>);
      case 'gardenlight': return (<g><rect x="-2" y="-56" width="4" height="56" fill={a} /><rect x="-8" y="-68" width="16" height="14" rx="3" fill={a} /><rect x="-5" y="-66" width="10" height="10" rx="2" fill={b} /><circle cx="0" cy="-61" r="14" fill={b} opacity=".3" /></g>);
      case 'path': return item.itemId === 'g-arch'
        ? (<g><path d="M-26 0 L-26 -40 Q0 -70 26 -40 L26 0" stroke={b} strokeWidth="6" fill="none" />{[-26, -18, -6, 6, 18, 26].map((x, k) => <circle key={k} cx={x} cy={[-38, -52, -60, -60, -52, -38][k]} r="5" fill={a} />)}</g>)
        : (<g>{[-24, -8, 8, 24].map((x, k) => <ellipse key={k} cx={x} cy={(k % 2) * 3} rx="9" ry="5" fill={k % 2 ? a : b} />)}</g>);
      default: return null;
    }
  })();
  return (
    <g>
      {shape}
      {sparkle && <g fill="#FFD25E"><path d="M30 -60 l2 5 l5 2 l-5 2 l-2 5 l-2 -5 l-5 -2 l5 -2Z" /><circle cx="-30" cy="-50" r="2" /></g>}
    </g>
  );
}

/** 상점·보관함 썸네일 */
export function FurnitureThumb({ item, size = 72 }: { item: FurnitureItem; size?: number }) {
  if (item.category === 'wallpaper' || item.category === 'floor') {
    const [a, b] = item.colors;
    return (
      <svg viewBox="0 0 60 60" width={size} height={size} role="img" aria-label={item.name}>
        <rect width="60" height="60" rx="10" fill={a} />
        {item.category === 'wallpaper'
          ? (item.itemId === 'wall-flower' ? [10, 30, 50].flatMap((x) => [12, 32, 52].map((y) => <circle key={`${x}${y}`} cx={x} cy={y} r="4" fill={b} />)) : [8, 24, 40, 56].map((x) => <rect key={x} x={x} width="8" height="60" fill={b} />))
          : (item.itemId === 'floor-tile' ? [0, 20, 40].flatMap((x) => [0, 20, 40].map((y) => ((x + y) / 20) % 2 ? <rect key={`${x}${y}`} x={x} y={y} width="20" height="20" fill={b} /> : null)) : [10, 25, 40, 55].map((y) => <rect key={y} y={y} width="60" height="2" fill={b} />))}
      </svg>
    );
  }
  const tall = ['bookshelf', 'tree', 'lamp', 'gardenlight'].includes(item.category);
  return (
    <svg viewBox={tall ? '-50 -100 100 106' : '-55 -75 110 85'} width={size} height={size} role="img" aria-label={item.name}>
      <FurnitureShape item={item} />
    </svg>
  );
}
