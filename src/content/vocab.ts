import type { Vocabulary } from '@/domain/types';
import { VOCAB_TSV } from './vocab-data';
import IPA from './vocab-ipa.json' with { type: 'json' };
import { tts } from './audio';

const POS_CODE: Record<string, string> = { 명: 'n', 동: 'v', 형: 'adj', 부: 'adv', 대: 'pron', 전: 'prep', 접: 'conj', 조: 'aux', 감: 'int' };
const ipa = IPA as Record<string, string>;

function parse(): Vocabulary[] {
  let unit = '';
  const out: Vocabulary[] = [];
  const seen = new Set<string>();
  for (const raw of VOCAB_TSV.split('\n')) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith('#')) { unit = line.slice(1).trim(); continue; }
    const [word, pos, meaning, koPron, example, exampleKo, pattern] = line.split('|');
    let id = word.toLowerCase().replace(/\s+/g, '-');
    if (seen.has(id)) id = `${id}-${POS_CODE[pos] ?? 'x'}`;
    seen.add(id);
    out.push({
      id, word, pos, meaning, koPron, example, exampleKo, grammarId: unit, pattern,
      ipa: ipa[word] ?? '',
      audio: tts(word),
      exampleAudio: tts(example),
    });
  }
  return out;
}

export const VOCAB: Vocabulary[] = parse();
export const VOCAB_BY_ID: Record<string, Vocabulary> = Object.fromEntries(VOCAB.map((v) => [v.id, v]));
export const vocabForUnit = (unitId: string) => VOCAB.filter((v) => v.grammarId === unitId);
