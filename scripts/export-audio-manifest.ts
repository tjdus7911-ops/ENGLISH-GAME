// 모든 콘텐츠를 불러와 음성 레지스트리를 JSON 으로 내보낸다. 사용: npx tsx scripts/export-audio-manifest.ts
import { writeFileSync } from 'node:fs';
import { audioRegistry, DIALOGUES, SITUATIONS } from '../src/content';
import { DRAMA_LINE_AUDIO } from '../src/content/expressions/situations-video';

const items = [...audioRegistry.entries()].map(([path, v]) => ({ path, ...v }));
const concat = [...DIALOGUES, ...SITUATIONS].map((d) => ({ out: d.audio, parts: d.lines.map((l) => l.audio) }));
writeFileSync('scripts/.audio-manifest.json', JSON.stringify({ items, concat, dramas: DRAMA_LINE_AUDIO }, null, 1));
console.log(`audio items: ${items.length}, dialogue concat: ${concat.length}`);
