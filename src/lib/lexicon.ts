/**
 * 문장 속 단어 터치 사전.
 * 출처 우선순위: ① 앱 영단어 DB(VOCAB, 발음·예문 포함) ② 동화책 주요 단어 ③ 기본 사전(common-lexicon).
 * 굴절형(went, apples, running, bigger …)은 원형으로 바꿔 찾는다. 찾지 못하면 null — 뜻을 지어내지 않는다.
 */
import { VOCAB } from '@/content/vocab';
import { BOOKS } from '@/content/library';
import { COMMON_LEXICON, PROPER_NOUNS } from '@/content/common-lexicon';
import { PRE_A1 } from '@/content/vocab-topics';

export interface LexEntry {
  key: string; // 소문자 원형 (단어장 중복 판단 기준)
  word: string;
  meaning: string;
  pos: string; // 한국어 품사 (명사, 동사 …)
  level: string; // Pre-A1 · A1 · A2 · B1 · B2 · C1
  vocabId?: string; // 앱 영단어 DB 단어면 id (발음 mp3·예문 사용)
  /** 이야기 속 이름 등 — 단어장 저장 대상 아님 */
  proper?: boolean;
  /** 영단어 사전(초·중·고급) 단어 id */
  bankId?: string;
}

const POS_FULL: Record<string, string> = { 명: '명사', 동: '동사', 형: '형용사', 부: '부사', 대: '대명사', 전: '전치사', 접: '접속사', 조: '조동사', 감: '감탄사', 한: '한정사', 수: '수사' };
export const posName = (p: string) => p.split(/[·,/]/).map((x) => POS_FULL[x.trim()] ?? x.trim()).join('·');

export const normKey = (w: string) => w.toLowerCase().replace(/[’']/g, "'").replace(/^[^a-z]+|[^a-z']+$/g, '').replace(/'s$/, '').trim();

/** 불규칙 변화형 → 원형 */
const IRREGULAR: Record<string, string> = {
  am: 'be', is: 'be', are: 'be', was: 'be', were: 'be', been: 'be', being: 'be', "isn't": 'be', "aren't": 'be', "wasn't": 'be', "weren't": 'be', "i'm": 'be', "it's": 'it', "that's": 'that',
  has: 'have', had: 'have', "hadn't": 'have', "haven't": 'have', does: 'do', did: 'do', done: 'do', "doesn't": 'do', "don't": 'do', "didn't": 'do',
  went: 'go', gone: 'go', goes: 'go', saw: 'see', seen: 'see', came: 'come', ate: 'eat', eaten: 'eat', took: 'take', taken: 'take', gave: 'give', given: 'give',
  made: 'make', said: 'say', says: 'say', told: 'tell', knew: 'know', known: 'know', thought: 'think', found: 'find', got: 'get', ran: 'run', sat: 'sit', stood: 'stand',
  felt: 'feel', kept: 'keep', left: 'leave', lost: 'lose', bought: 'buy', brought: 'bring', built: 'build', began: 'begin', begun: 'begin', caught: 'catch', heard: 'hear',
  held: 'hold', hid: 'hide', hidden: 'hide', flew: 'fly', drew: 'draw', drawn: 'draw', dug: 'dig', blew: 'blow', shone: 'shine', swam: 'swim', woke: 'wake', laid: 'lay',
  lit: 'light', hung: 'hang', spread: 'spread', paid: 'pay', sold: 'sell', wrote: 'write', written: 'write', became: 'become', froze: 'freeze', broke: 'break', forgot: 'forget', grew: 'grow', drove: 'drive', chose: 'choose', fell: 'fall', meant: 'mean', rode: 'ride', sang: 'sing', spoke: 'speak', threw: 'throw', wore: 'wear', met: 'meet', put: 'put',
  cut: 'cut', read: 'read', let: 'let', set: 'set', hit: 'hit', torn: 'tear', taught: 'teach', slept: 'sleep', spent: 'spend', understood: 'understand', won: 'win',
  could: 'can', "can't": 'can', cannot: 'can', "couldn't": 'can', would: 'will', "won't": 'will', "wouldn't": 'will', "i'll": 'will', should: 'should', "shouldn't": 'should',
  children: 'child', men: 'man', women: 'woman', people: 'person', feet: 'foot', teeth: 'tooth', mice: 'mouse', geese: 'goose', elves: 'elf', sheep: 'sheep', wolves: 'wolf', leaves: 'leaf', knives: 'knife', lives: 'life',
  better: 'good', best: 'good', worse: 'bad', worst: 'bad', more: 'more', most: 'most', less: 'less', further: 'far', farther: 'far',
  me: 'i', my: 'i', mine: 'i', him: 'he', his: 'he', her: 'she', hers: 'she', us: 'we', our: 'we', them: 'they', their: 'they', its: 'it', your: 'you', yours: 'you',
};

let INDEX: Map<string, LexEntry> | null = null;
function index(): Map<string, LexEntry> {
  if (INDEX) return INDEX;
  const m = new Map<string, LexEntry>();
  const put = (e: LexEntry) => { if (!m.has(e.key)) m.set(e.key, e); };
  for (const v of VOCAB) {
    const key = normKey(v.word);
    put({ key, word: v.word, meaning: v.meaning, pos: posName(v.pos), level: PRE_A1.has(v.id) ? 'Pre-A1' : 'A1', vocabId: v.id });
  }
  for (const b of BOOKS) for (const w of b.words) put({ key: normKey(w.word), word: w.word, meaning: w.meaning, pos: posName(w.pos), level: b.level });
  for (const [word, meaning, pos, level] of COMMON_LEXICON) put({ key: normKey(word), word, meaning, pos: posName(pos), level });
  INDEX = m;
  return m;
}

/** 원형 후보 (규칙 변화) */
export function lemmaCandidates(raw: string): string[] {
  const w = normKey(raw);
  if (!w) return [];
  const c = [w];
  if (IRREGULAR[w]) c.push(IRREGULAR[w]);
  const add = (x: string) => { if (x.length >= 2 || x === 'i' || x === 'a') c.push(x); };
  if (w.endsWith("n't")) add(w.slice(0, -3));
  if (/'(ll|re|ve|d|m)$/.test(w)) add(w.replace(/'(ll|re|ve|d|m)$/, ''));
  if (w.endsWith('ies')) add(`${w.slice(0, -3)}y`);
  if (w.endsWith('es')) add(w.slice(0, -2));
  if (w.endsWith('s')) add(w.slice(0, -1));
  if (w.endsWith('ied')) add(`${w.slice(0, -3)}y`);
  if (w.endsWith('ed')) { add(w.slice(0, -2)); add(w.slice(0, -1)); if (/(.)\1ed$/.test(w)) add(w.slice(0, -3)); }
  if (w.endsWith('ing')) { add(w.slice(0, -3)); add(`${w.slice(0, -3)}e`); if (/(.)\1ing$/.test(w)) add(w.slice(0, -4)); if (w.endsWith('ying')) add(`${w.slice(0, -4)}ie`); }
  if (w.endsWith('ier') || w.endsWith('iest')) add(`${w.replace(/iest?$|ier$/, '')}y`);
  if (w.endsWith('est')) { add(w.slice(0, -3)); add(w.slice(0, -2)); if (/(.)\1est$/.test(w)) add(w.slice(0, -4)); }
  if (w.endsWith('er')) { add(w.slice(0, -2)); add(w.slice(0, -1)); if (/(.)\1er$/.test(w)) add(w.slice(0, -3)); }
  if (w.endsWith('ly')) add(w.slice(0, -2));
  return [...new Set(c)];
}

export function lookup(raw: string): LexEntry | null {
  const idx = index();
  for (const k of lemmaCandidates(raw)) { const e = idx.get(k); if (e) return e; }
  const k = normKey(raw);
  if (PROPER_NOUNS[k]) return { key: k, word: raw.replace(/['’]s$/, ''), meaning: PROPER_NOUNS[k], pos: '고유명사', level: '-', proper: true };
  if (k.includes('-')) { const parts = k.split('-').map((x) => lookup(x)); if (parts.every(Boolean)) return { key: k, word: k, meaning: parts.map((x) => x!.meaning.split(/[,;]/)[0]).join(' + '), pos: parts.at(-1)!.pos, level: parts.at(-1)!.level }; }
  return null;
}

/** 두 단어 이상 구(phrasal verb 등) 우선 탐색: "give up", "at once" */
export function lookupPhrase(words: string[], i: number): { entry: LexEntry; span: number } | null {
  const idx = index();
  for (const span of [3, 2]) {
    if (i + span > words.length) continue;
    const firsts = lemmaCandidates(words[i]);
    const rest = words.slice(i + 1, i + span).map(normKey).join(' ');
    for (const f of firsts) { const e = idx.get(`${f} ${rest}`); if (e) return { entry: e, span }; }
  }
  return null;
}

export const lexiconSize = () => index().size;

/** 영단어 사전을 불러온 뒤 터치 사전에 추가 (기존 항목은 덮어쓰지 않음) */
export function registerLexicon(entries: { key: string; word: string; meaning: string; pos: string; level: string; bankId: string }[]) {
  const m = index();
  for (const e of entries) {
    const k = normKey(e.key);
    const cur = m.get(k);
    if (!cur) m.set(k, { ...e, key: k, pos: posName(e.pos) });
    else if (!cur.bankId) cur.bankId = e.bankId;
  }
}

/** 문장 → [토큰(단어 또는 공백·구두점)] */
export function tokenize(sentence: string): { text: string; word: boolean }[] {
  return sentence.split(/([A-Za-z][A-Za-z'’-]*)/).filter((t) => t !== '').map((t) => ({ text: t, word: /^[A-Za-z]/.test(t) }));
}
