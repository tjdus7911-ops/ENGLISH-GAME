/**
 * 오리지널 미니 드라마 영상 렌더러.
 * - 장면 그림: 이 파일의 SVG(자체 제작)를 sharp 로 PNG 변환
 * - 음성: public/audio 의 Piper TTS 합성 음성(대사별)을 이어 붙임
 * - 출력: public/video/{id}.mp4, {id}.jpg(포스터), src/content/expressions/video-cues.json(자막 타이밍)
 * 사용: npx tsx scripts/render_dramas.tsx   (ffmpeg, ffprobe 필요)
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { DRAMAS, DRAMA_LINE_AUDIO } from '../src/content/expressions/situations-video';

const require = createRequire(import.meta.url);
let sharp: (b: Buffer) => { png(): { toFile(p: string): Promise<unknown> }; jpeg(o: object): { toFile(p: string): Promise<unknown> } };
try { sharp = require('sharp'); } catch { sharp = require(join(process.env.HOME ?? '', '.npm-global/lib/node_modules/sharp')); }

const W = 1280, H = 720;
const PEOPLE: Record<string, { skin: string; hair: string; shirt: string; long: boolean }> = {
  Jiwoo: { skin: '#F6D2B8', hair: '#2E2420', shirt: '#E9513B', long: true },
  Mark: { skin: '#EBC1A0', hair: '#8A5A33', shirt: '#3D6FB5', long: false },
  Emma: { skin: '#F3D0BE', hair: '#C9853B', shirt: '#7E6BC9', long: true },
  Hajun: { skin: '#F1CBAF', hair: '#1E1A18', shirt: '#2F8F6B', long: false },
  Baker: { skin: '#E8BE9E', hair: '#5A3B26', shirt: '#FFFFFF', long: true },
  Minho: { skin: '#F2CDB1', hair: '#231C18', shirt: '#E9A23B', long: false },
};

function person(name: string, x: number, speaking: boolean, mouthOpen: boolean, faceRight: boolean) {
  const p = PEOPLE[name];
  const y = speaking ? 300 : 316;
  const s = speaking ? 1.06 : 1;
  const eyeDx = faceRight ? 8 : -8;
  return `<g transform="translate(${x} ${y}) scale(${s})">
    <ellipse cx="0" cy="330" rx="110" ry="18" fill="#000" opacity="0.12"/>
    <path d="M-95 330 Q-100 170 0 160 Q100 170 95 330Z" fill="${p.shirt}" stroke="#1F2328" stroke-opacity="0.08" stroke-width="4"/>
    ${name === 'Baker' ? '<path d="M-60 200 L60 200 L70 330 L-70 330Z" fill="#F3E3C3"/><rect x="-50" y="-60" width="100" height="40" rx="18" fill="#fff"/>' : ''}
    <rect x="-22" y="120" width="44" height="50" rx="16" fill="${p.skin}"/>
    ${p.long ? `<path d="M-78 40 Q-90 150 -50 170 L50 170 Q90 150 78 40Z" fill="${p.hair}"/>` : ''}
    <circle cx="0" cy="40" r="80" fill="${p.skin}"/>
    <path d="M-82 30 Q-80 -50 0 -48 Q80 -50 82 30 Q60 -10 0 -6 Q-50 -10 -82 30Z" fill="${p.hair}"/>
    <ellipse cx="${-26 + eyeDx}" cy="44" rx="7" ry="9" fill="#1F2328"/><ellipse cx="${26 + eyeDx}" cy="44" rx="7" ry="9" fill="#1F2328"/>
    <circle cx="${-24 + eyeDx}" cy="40" r="2.5" fill="#fff"/><circle cx="${28 + eyeDx}" cy="40" r="2.5" fill="#fff"/>
    <ellipse cx="-46" cy="68" rx="12" ry="7" fill="#F6A7A0" opacity="0.7"/><ellipse cx="46" cy="68" rx="12" ry="7" fill="#F6A7A0" opacity="0.7"/>
    ${mouthOpen ? `<ellipse cx="${eyeDx / 2}" cy="82" rx="12" ry="9" fill="#9C3B2E"/>` : `<path d="M${-12 + eyeDx / 2} 80 Q${eyeDx / 2} 90 ${12 + eyeDx / 2} 80" stroke="#1F2328" stroke-width="5" fill="none" stroke-linecap="round"/>`}
  </g>`;
}

function background(scene: string) {
  switch (scene) {
    case 'elevator': return `<rect width="${W}" height="${H}" fill="#E7E3DA"/><rect x="340" y="40" width="600" height="600" rx="16" fill="#C9CDD3"/><rect x="360" y="60" width="275" height="580" fill="#DADEE3"/><rect x="645" y="60" width="275" height="580" fill="#D3D7DD"/><rect x="980" y="260" width="60" height="140" rx="10" fill="#9BA3AD"/><circle cx="1010" cy="300" r="12" fill="#FFD25E"/><circle cx="1010" cy="350" r="12" fill="#fff"/><rect y="640" width="${W}" height="80" fill="#B9B1A3"/>`;
    case 'office': return `<rect width="${W}" height="${H}" fill="#F4F1EA"/><rect x="80" y="80" width="360" height="240" rx="12" fill="#BFE0F5"/><path d="M80 260 L200 180 L300 240 L440 150 L440 320 L80 320Z" fill="#9BD27A"/><rect x="900" y="120" width="260" height="180" rx="10" fill="#fff" stroke="#DDD" stroke-width="6"/><rect x="930" y="150" width="200" height="16" rx="8" fill="#E9513B"/><rect x="930" y="186" width="160" height="12" rx="6" fill="#CCC"/><rect x="930" y="214" width="180" height="12" rx="6" fill="#CCC"/><rect y="600" width="${W}" height="120" fill="#D9CBB3"/><circle cx="1180" cy="560" r="40" fill="#7CC06A"/><rect x="1165" y="560" width="30" height="60" fill="#B07A4C"/>`;
    case 'busstop': return `<rect width="${W}" height="${H}" fill="#9FB3C8"/>${Array.from({ length: 60 }, (_, i) => `<line x1="${(i * 97) % W}" y1="${(i * 53) % 500}" x2="${(i * 97) % W - 10}" y2="${(i * 53) % 500 + 40}" stroke="#E6F0FA" stroke-width="3" opacity="0.7"/>`).join('')}<rect x="200" y="120" width="880" height="30" fill="#4A5A6A"/><rect x="220" y="150" width="16" height="470" fill="#4A5A6A"/><rect x="1044" y="150" width="16" height="470" fill="#4A5A6A"/><rect x="1100" y="160" width="90" height="90" rx="45" fill="#2F8F6B"/><text x="1145" y="218" font-family="Noto Sans CJK KR, sans-serif" font-size="44" font-weight="700" fill="#fff" text-anchor="middle">BUS</text><rect y="620" width="${W}" height="100" fill="#6B7785"/>`;
    case 'street': return `<rect width="${W}" height="${H}" fill="#B7C7D6"/>${Array.from({ length: 40 }, (_, i) => `<line x1="${(i * 131) % W}" y1="${(i * 37) % 400}" x2="${(i * 131) % W - 8}" y2="${(i * 37) % 400 + 30}" stroke="#EAF2FA" stroke-width="3" opacity="0.6"/>`).join('')}<rect x="60" y="160" width="300" height="460" fill="#D9C8A8"/><rect x="900" y="120" width="320" height="500" fill="#E8DCC6"/><rect x="960" y="200" width="200" height="60" rx="8" fill="#7E6BC9"/><text x="1060" y="242" font-family="sans-serif" font-size="34" font-weight="700" fill="#fff" text-anchor="middle">LIBRARY</text><rect y="620" width="${W}" height="100" fill="#8A949E"/><path d="M430 190 Q640 60 850 190Z" fill="#E9513B"/><rect x="636" y="190" width="8" height="170" fill="#5A3B26"/>`;
    case 'bakery': return `<rect width="${W}" height="${H}" fill="#FFF1DD"/>${[0, 1, 2].map((r) => `<rect x="80" y="${90 + r * 130}" width="1120" height="16" fill="#C9A27E"/>${[0, 1, 2, 3, 4, 5].map((c) => `<ellipse cx="${170 + c * 180}" cy="${70 + r * 130}" rx="55" ry="26" fill="${['#E9A23B', '#D98A4B', '#F2C55C'][((r + c) % 3)]}"/>`).join('')}`).join('')}<rect y="560" width="${W}" height="160" fill="#C9A27E"/><rect y="540" width="${W}" height="30" fill="#B07A4C"/>`;
    case 'counter': return `<rect width="${W}" height="${H}" fill="#FDE9E4"/><rect x="460" y="90" width="360" height="220" rx="20" fill="#fff"/><path d="M520 250 L760 250 L740 170 L540 170Z" fill="#FFB7C9"/><rect x="530" y="140" width="220" height="40" rx="12" fill="#fff" stroke="#FF8FA8" stroke-width="5"/>${[0, 1, 2, 3, 4].map((i) => `<circle cx="${560 + i * 40}" cy="135" r="12" fill="#E9513B"/>`).join('')}<rect y="560" width="${W}" height="160" fill="#B07A4C"/><rect y="540" width="${W}" height="30" fill="#8A6244"/>`;
  }
  return `<rect width="${W}" height="${H}" fill="#eee"/>`;
}

function frame(scene: string, a: string, b: string, speaker: 'A' | 'B' | null, mouth: boolean) {
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${background(scene)}
    ${person(a, 420, speaker === 'A', speaker === 'A' && mouth, true)}${person(b, 860, speaker === 'B', speaker === 'B' && mouth, false)}</svg>`);
}

function card(title: string, sub: string) {
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><rect width="${W}" height="${H}" fill="#1F2328"/><circle cx="640" cy="250" r="70" fill="#E9513B"/><path d="M620 215 L675 250 L620 285Z" fill="#fff"/>
    <text x="640" y="420" font-family="Noto Sans CJK KR, sans-serif" font-size="64" font-weight="700" fill="#fff" text-anchor="middle">${title}</text>
    <text x="640" y="490" font-family="Noto Sans CJK KR, sans-serif" font-size="32" fill="#C9CDD3" text-anchor="middle">${sub}</text>
    <text x="640" y="660" font-family="Noto Sans CJK KR, sans-serif" font-size="22" fill="#8C959F" text-anchor="middle">영어 마을 오리지널 미니 드라마 · 음성: 합성 음성(TTS)</text></svg>`);
}

const dur = (f: string) => Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f]).toString().trim());

async function main() {
  mkdirSync('public/video', { recursive: true });
  const cues: Record<string, { duration: number; cues: { start: number; end: number; speaker: string; en: string; ko: string }[] }> = {};
  for (const d of DRAMAS) {
    const work = join(tmpdir(), `drama-${d.id}`);
    rmSync(work, { recursive: true, force: true });
    mkdirSync(work, { recursive: true });
    const [A, B] = [d.cast.find((c) => c.id === 'A')!.name, d.cast.find((c) => c.id === 'B')!.name];
    const imgs: { file: string; d: number }[] = [];
    const audioParts: { file?: string; silence?: number }[] = [];
    let t = 0;
    const INTRO = 2.6, LEAD = 0.35, TAIL = 0.7, OUTRO = 2.2;
    await sharp(card(d.titleEn, d.title)).png().toFile(join(work, 'intro.png'));
    imgs.push({ file: 'intro.png', d: INTRO }); audioParts.push({ silence: INTRO }); t += INTRO;
    const list: (typeof cues)[string]['cues'] = [];
    for (let i = 0; i < d.script.length; i++) {
      const l = d.script[i];
      const af = join('public', DRAMA_LINE_AUDIO[d.id][i]);
      const ad = dur(af);
      const total = LEAD + ad + TAIL;
      const idle = `l${i}-idle.png`, open = `l${i}-open.png`, closed = `l${i}-closed.png`;
      await sharp(frame(l.scene, A, B, null, false)).png().toFile(join(work, idle));
      await sharp(frame(l.scene, A, B, l.speaker, true)).png().toFile(join(work, open));
      await sharp(frame(l.scene, A, B, l.speaker, false)).png().toFile(join(work, closed));
      imgs.push({ file: idle, d: LEAD });
      const flips = Math.max(1, Math.round(ad / 0.22));
      for (let k = 0; k < flips; k++) imgs.push({ file: k % 2 ? closed : open, d: ad / flips });
      imgs.push({ file: closed, d: TAIL });
      audioParts.push({ silence: LEAD }, { file: af }, { silence: TAIL });
      list.push({ start: +(t + LEAD - 0.1).toFixed(2), end: +(t + LEAD + ad + 0.3).toFixed(2), speaker: l.speaker === 'A' ? A : B, en: l.en, ko: l.ko });
      t += total;
    }
    await sharp(card('The End', d.title)).png().toFile(join(work, 'outro.png'));
    imgs.push({ file: 'outro.png', d: OUTRO }); audioParts.push({ silence: OUTRO }); t += OUTRO;

    writeFileSync(join(work, 'images.txt'), imgs.map((x) => `file '${x.file}'\nduration ${x.d.toFixed(3)}`).join('\n') + `\nfile '${imgs[imgs.length - 1].file}'\n`);
    // 오디오: 무음 + 대사 이어 붙이기
    const aFiles: string[] = [];
    audioParts.forEach((p, k) => {
      const out = join(work, `a${k}.wav`);
      if (p.silence) execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-f', 'lavfi', '-i', 'anullsrc=r=22050:cl=mono', '-t', String(p.silence), out]);
      else execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-i', p.file!, '-ar', '22050', '-ac', '1', out]);
      aFiles.push(out);
    });
    writeFileSync(join(work, 'audio.txt'), aFiles.map((f) => `file '${f}'`).join('\n'));
    execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', join(work, 'audio.txt'), join(work, 'audio.wav')]);
    const out = `public/video/${d.id}.mp4`;
    execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', join(work, 'images.txt'), '-i', join(work, 'audio.wav'),
      '-vf', 'scale=960:540,fps=24,format=yuv420p', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '28', '-c:a', 'aac', '-b:a', '64k', '-movflags', '+faststart', '-shortest', out], { cwd: work.startsWith('/') ? undefined : undefined });
    // VP9/Opus WebM 대체 소스 (H.264 미지원 브라우저용)
    execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-i', out, '-c:v', 'libvpx-vp9', '-b:v', '0', '-crf', '40', '-deadline', 'realtime', '-cpu-used', '8', '-row-mt', '1', '-c:a', 'libopus', '-b:a', '48k', out.replace('.mp4', '.webm')]);
    await sharp(frame(d.script[0].scene, A, B, null, false)).jpeg({ quality: 70 }).toFile(`public/video/${d.id}.jpg`);
    const real = dur(out);
    cues[d.id] = { duration: +real.toFixed(2), cues: list };
    console.log(d.id, real.toFixed(1), 's');
  }
  writeFileSync('src/content/expressions/video-cues.json', JSON.stringify(cues, null, 1));
}
main().catch((e) => { console.error(e); process.exit(1); });
