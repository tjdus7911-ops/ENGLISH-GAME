/**
 * 단어 숲 통합 단어 DB = 기존 영단어 DB(VOCAB 300, 발음 mp3 포함) + 영단어 사전(public/wordbank 8,355).
 * 두 데이터는 표제어가 겹치지 않도록 만들어져 있어(사전 빌드 시 VOCAB 단어 제외) 합치면 고유 단어 수가 된다.
 * 난이도: VOCAB 은 기존 분류(왕초보 Pre-A1 / 기초 A1), 사전 단어는 CEFR-J·Octanove 레벨 그대로 (A1~C2).
 */
import { useEffect, useState } from 'react';
import type { Vocabulary } from '@/domain/types';
import { VOCAB, VOCAB_BY_ID } from '@/content/vocab';
import { PRE_A1, TOPIC_WORDS, type TopicId } from '@/content/vocab-topics';
import { BANDS, bankToVocab, bankWord, loadBand, loadMeta, type Band, type BankMeta } from './wordbank';
import { normKey } from './lexicon';
import type { LearningState } from '@/store/app';

export type LvId = 'pre-a1' | 'a1' | 'a2' | 'b1' | 'b2' | 'c1' | 'c2';
export const WORD_LEVELS: { id: LvId; cefr: string; label: string; icon: string; desc: string }[] = [
  { id: 'pre-a1', cefr: 'Pre-A1', label: '왕초보', icon: '🌱', desc: '처음 시작하는 기본 단어' },
  { id: 'a1', cefr: 'A1', label: '기초', icon: '🌿', desc: '일상생활 필수 영단어' },
  { id: 'a2', cefr: 'A2', label: '초급', icon: '🍀', desc: '익숙한 상황을 말하는 단어' },
  { id: 'b1', cefr: 'B1', label: '중급', icon: '🌳', desc: '생각과 경험을 말하는 단어' },
  { id: 'b2', cefr: 'B2', label: '중상급', icon: '🏔', desc: '뉴스·업무·토론에 쓰는 단어' },
  { id: 'c1', cefr: 'C1', label: '고급', icon: '⭐', desc: '학술·전문적인 표현' },
  { id: 'c2', cefr: 'C2', label: '최상급', icon: '👑', desc: '원어민 수준의 정교한 어휘' },
];
export const LV_BY_ID = Object.fromEntries(WORD_LEVELS.map((l) => [l.id, l])) as Record<LvId, (typeof WORD_LEVELS)[number]>;
export const lvOfCefr = (c: string): LvId => (c === 'Pre-A1' ? 'pre-a1' : (c.toLowerCase() as LvId));

/** 주제 (단어 숲 공통). 기존 8개 + 학교·일, 사회·과학, 일반 어휘 */
export type WTopic = TopicId | 'school' | 'society' | 'general';
export const WORD_TOPICS: { id: WTopic; label: string; emoji: string }[] = [
  { id: 'people', label: '사람과 가족', emoji: '👨‍👩‍👧' }, { id: 'food', label: '음식과 음료', emoji: '🍎' }, { id: 'home', label: '집과 생활', emoji: '🏠' },
  { id: 'feelings', label: '감정과 성격', emoji: '😊' }, { id: 'travel', label: '여행과 교통', emoji: '🚌' }, { id: 'talk', label: '대화와 언어', emoji: '💬' },
  { id: 'shopping', label: '쇼핑·돈·옷', emoji: '🛍' }, { id: 'nature', label: '자연과 동물', emoji: '🌿' }, { id: 'school', label: '학교와 일', emoji: '🏫' },
  { id: 'society', label: '사회·과학·건강', emoji: '🏛' }, { id: 'core', label: '문장 만들기 필수', emoji: '🧩' }, { id: 'general', label: '일반 어휘', emoji: '📚' },
];
export const TOPIC_LABEL = Object.fromEntries(WORD_TOPICS.map((t) => [t.id, t])) as Record<WTopic, (typeof WORD_TOPICS)[number]>;

const VOCAB_TOPIC: Record<string, WTopic> = {};
for (const t of Object.keys(TOPIC_WORDS) as TopicId[]) for (const id of TOPIC_WORDS[t]) VOCAB_TOPIC[id] ??= t;

export type W = Vocabulary & { level: string; topic: WTopic };
export const coreLevel = (v: Vocabulary) => (PRE_A1.has(v.id) ? 'Pre-A1' : 'A1');
const CORE: W[] = VOCAB.map((v) => ({ ...v, level: coreLevel(v), topic: VOCAB_TOPIC[v.id] ?? 'general' }));
const CORE_BY_LV: Partial<Record<LvId, W[]>> = { 'pre-a1': CORE.filter((w) => w.level === 'Pre-A1'), a1: CORE.filter((w) => w.level === 'A1') };

const BAND_OF: Record<LvId, Band | null> = { 'pre-a1': null, a1: 'beginner', a2: 'beginner', b1: 'intermediate', b2: 'intermediate', c1: 'advanced', c2: 'advanced' };

export async function loadLevel(lv: LvId): Promise<W[]> {
  const core = CORE_BY_LV[lv] ?? [];
  const band = BAND_OF[lv];
  if (!band) return core;
  const cefr = LV_BY_ID[lv].cefr;
  const rows = await loadBand(band);
  return [...core, ...rows.filter((r) => r.lv === cefr).map((r) => ({ ...bankToVocab(r), level: r.lv, topic: (r.tp ?? 'general') as WTopic }))];
}
export async function loadAll(): Promise<W[]> {
  const parts = await Promise.all(WORD_LEVELS.map((l) => loadLevel(l.id)));
  return parts.flat();
}

/** 단어 id → 단어 (기존 DB 는 즉시, 사전 단어는 불러온 뒤) */
export function wordById(id: string): W | null {
  const v = VOCAB_BY_ID[id];
  if (v) return { ...v, level: coreLevel(v), topic: VOCAB_TOPIC[v.id] ?? 'general' };
  const b = bankWord(id);
  return b ? { ...bankToVocab(b), level: b.lv, topic: (b.tp ?? 'general') as WTopic } : null;
}
export const levelOfId = (id: string): LvId | null => { const w = wordById(id); return w ? lvOfCefr(w.level) : null; };

export interface LevelCounts { total: Record<LvId, number>; all: number }
export function levelTotals(meta: BankMeta | null): LevelCounts | null {
  if (!meta) return null;
  const total = Object.fromEntries(WORD_LEVELS.map((l) => [l.id, (CORE_BY_LV[l.id]?.length ?? 0) + (meta.byLevel[l.cefr] ?? 0)])) as Record<LvId, number>;
  return { total, all: Object.values(total).reduce((a, b) => a + b, 0) };
}

/** 학습 완료 단어 수 (레벨별). 사전 단어의 레벨은 불러온 뒤 확정되므로 loaded 가 false 면 기존 DB 만 */
export function learnedByLevel(learned: Record<string, string>): { by: Record<LvId, number>; all: number; pending: number } {
  const by = Object.fromEntries(WORD_LEVELS.map((l) => [l.id, 0])) as Record<LvId, number>;
  let all = 0, pending = 0;
  for (const id of Object.keys(learned)) {
    const lv = levelOfId(id);
    if (lv) { by[lv]++; all++; } else if (id.startsWith('wb-')) { pending++; all++; }
  }
  return { by, all, pending };
}

/** 즐겨찾기: 기존 '저장한 단어' 또는 나만의 단어장에 있는 단어 */
export const isFavorite = (l: LearningState, w: Vocabulary) => (l.savedWords ?? []).includes(w.id) || (!!l.myWords?.[normKey(w.word)] && l.myWords[normKey(w.word)].pinned !== false);

/** 틀린 단어: 아직 해결되지 않은 오답이 있는 단어 (영단어 문항 id → 단어 id) */
export function wrongWordIds(l: LearningState): Set<string> {
  const s = new Set<string>();
  for (const n of Object.values(l.wrongNotes)) {
    if (n.resolved) continue;
    const q = n.questionId;
    if (q.startsWith('wbq:')) s.add(q.slice(4));
    else { const m = q.match(/^w[qrblc]-(.+)$/); if (m && VOCAB_BY_ID[m[1]]) s.add(m[1]); }
  }
  for (const w of Object.values(l.myWords ?? {})) if (w.srs.difficult || (w.srs.lapses > 0 && w.srs.history.at(-1)?.accuracy !== 1)) { const id = w.refs.find((r) => r.startsWith('wb-')) ?? w.vocabId; if (id) s.add(id); }
  return s;
}

export function useLevel(lv: LvId | null) {
  const [st, setSt] = useState<{ rows: W[] | null; error: boolean }>({ rows: lv && !BAND_OF[lv] ? CORE_BY_LV[lv] ?? [] : null, error: false });
  useEffect(() => {
    if (!lv) return;
    let on = true;
    loadLevel(lv).then((rows) => on && setSt({ rows, error: false }), () => on && setSt({ rows: null, error: true }));
    return () => { on = false; };
  }, [lv]);
  return st;
}
export function useAllWords() {
  const [rows, setRows] = useState<W[] | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => { let on = true; loadAll().then((r) => on && setRows(r), () => on && setError(true)); return () => { on = false; }; }, []);
  return { rows, error };
}
/** 사전을 불러왔는지 (진도 계산 갱신용) */
export function useBanksReady() {
  const [ready, setReady] = useState(false);
  useEffect(() => { let on = true; Promise.all(BANDS.map((b) => loadBand(b.id))).then(() => on && setReady(true), () => {}); return () => { on = false; }; }, []);
  return ready;
}
export { loadMeta };
