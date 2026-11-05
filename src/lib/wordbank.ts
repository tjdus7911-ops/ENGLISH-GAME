/**
 * 영단어 사전 (초급·중급·고급) — public/wordbank/*.json 을 필요할 때 불러온다 (첫 화면 용량을 늘리지 않도록).
 * 단어 목록·CEFR 레벨: CEFR-J Wordlist 1.5 · Octanove Vocabulary Profile C1/C2 (출처 표기, C1/C2 는 CC BY-SA 4.0).
 * 뜻·예문·번역: 앱에서 작성(전문가 검수 필요). 발음기호: CMU 사전 자동 변환. 한글 발음: 참고용 자동 근사.
 */
import { useEffect, useState } from 'react';
import type { Vocabulary } from '@/domain/types';
import { registerLexicon } from './lexicon';

export type Band = 'beginner' | 'intermediate' | 'advanced';
export const BANDS: { id: Band; label: string; levels: string[]; desc: string; tint: string }[] = [
  { id: 'beginner', label: '초급', levels: ['A1', 'A2'], desc: 'A1~A2 · 일상 기본 단어', tint: 'bg-mint' },
  { id: 'intermediate', label: '중급', levels: ['B1', 'B2'], desc: 'B1~B2 · 회화·뉴스·업무', tint: 'bg-sky' },
  { id: 'advanced', label: '고급', levels: ['C1', 'C2'], desc: 'C1~C2 · 학술·고급 표현', tint: 'bg-lilac' },
];
export const BAND_BY_ID = Object.fromEntries(BANDS.map((b) => [b.id, b])) as Record<Band, (typeof BANDS)[number]>;

export interface BankWord { id: string; w: string; pos: string[]; lv: string; m: string; ipa: string; ko: string; ex: string; exKo: string }
export interface BankMeta { byLevel: Record<string, number>; byBand: Record<Band, number>; total: number; listTotal: Record<string, number>; source: string }

const base = () => `${import.meta.env.BASE_URL}wordbank/`;
const cache: Partial<Record<Band, Promise<BankWord[]>>> = {};
let metaP: Promise<BankMeta> | null = null;
const byId = new Map<string, BankWord>();

export function loadBand(b: Band): Promise<BankWord[]> {
  cache[b] ??= fetch(`${base()}${b}.json`).then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.json() as Promise<BankWord[]>; })
    .then((rows) => { for (const w of rows) byId.set(w.id, w); registerLexicon(rows.map(toLex)); return rows; })
    .catch((e) => { delete cache[b]; throw e; });
  return cache[b]!;
}
export const loadAllBands = () => Promise.all(BANDS.map((b) => loadBand(b.id)));
export function loadMeta(): Promise<BankMeta> {
  metaP ??= fetch(`${base()}meta.json`).then((r) => r.json() as Promise<BankMeta>).catch((e) => { metaP = null; throw e; });
  return metaP;
}
export const bankWord = (id: string) => byId.get(id);
export const bandOfLevel = (lv: string): Band => (lv.startsWith('A') ? 'beginner' : lv.startsWith('B') ? 'intermediate' : 'advanced');

const POS1: Record<string, string> = { 명: '명', 동: '동', 형: '형', 부: '부', 대: '대', 전: '전', 한: '한', 접: '접', 수: '수', 조: '조', 감: '감' };
function toLex(w: BankWord) {
  return { key: w.w.toLowerCase(), word: w.w, meaning: w.m, pos: w.pos.map((p) => POS1[p] ?? p).join('·'), level: w.lv, bankId: w.id };
}

/** 영단어 카드(WordStudy)에서 쓰는 형식으로 변환. 음성 파일이 없어 기기 음성(TTS)으로 읽는다. */
export function bankToVocab(w: BankWord): Vocabulary {
  return { id: w.id, word: w.w, pos: w.pos[0] ?? '명', meaning: w.m, ipa: w.ipa, koPron: w.ko, example: w.ex, exampleKo: w.exKo, grammarId: '', audio: `wordbank/tts/${w.id}.mp3`, exampleAudio: `wordbank/tts/${w.id}-ex.mp3`, level: w.lv };
}

export function useBand(b: Band | null) {
  const [st, setSt] = useState<{ rows: BankWord[] | null; error: boolean }>({ rows: null, error: false });
  useEffect(() => {
    if (!b) return;
    let on = true;
    setSt({ rows: null, error: false });
    loadBand(b).then((rows) => on && setSt({ rows, error: false }), () => on && setSt({ rows: null, error: true }));
    return () => { on = false; };
  }, [b]);
  return st;
}
export function useMeta() {
  const [m, setM] = useState<BankMeta | null>(null);
  useEffect(() => { let on = true; loadMeta().then((x) => on && setM(x), () => {}); return () => { on = false; }; }, []);
  return m;
}
