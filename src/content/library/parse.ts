/**
 * 동화책 데이터 형식 (사람이 읽고 검수하기 쉬운 텍스트 DSL → 객체).
 *
 * === id | English title | 한국어 제목 | 레벨 | original 또는 pd | 원작(공유저작물일 때) | 표지 이모지 | 표지 색
 * p                                  ← 새 페이지
 * 영어 문장 | 한국어 번역 | 문장 구조 설명
 * w word=뜻(품사) ; word2=뜻(품사)   ← 주요 단어 (공부 모드·단어 터치 사전)
 * q 질문 || 보기1 | 보기2 | 보기3 || 정답 번호(1부터) || 해설
 */
export type BookLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1';
export const BOOK_LEVELS: BookLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1'];

export interface BookSentence { id: string; en: string; ko: string; note: string }
export interface BookPage { sentences: BookSentence[] }
export interface BookWord { word: string; meaning: string; pos: string }
export interface BookQuiz { id: string; q: string; choices: string[]; answer: number; explain: string }
export interface Book {
  id: string;
  title: string;
  titleKo: string;
  level: BookLevel;
  /** original: 이 앱을 위해 새로 쓴 창작 이야기 · pd: 저작권 보호기간이 끝난 공유저작물을 쉬운 영어로 새로 다시 쓴 이야기 */
  source: 'original' | 'pd';
  origin: string;
  cover: { icon: string; color: string };
  pages: BookPage[];
  words: BookWord[];
  quiz: BookQuiz[];
}

export function parseBooks(raw: string): Book[] {
  const books: Book[] = [];
  let b: Book | null = null;
  for (const line0 of raw.split('\n')) {
    const line = line0.trim();
    if (!line || line.startsWith('//')) continue;
    if (line.startsWith('===')) {
      const [id, title, titleKo, level, source, origin, icon, color] = line.slice(3).split('|').map((x) => x.trim());
      b = { id, title, titleKo, level: level as BookLevel, source: source as Book['source'], origin, cover: { icon, color }, pages: [], words: [], quiz: [] };
      books.push(b);
      continue;
    }
    if (!b) throw new Error(`book header missing: ${line}`);
    if (line === 'p') { b.pages.push({ sentences: [] }); continue; }
    if (line.startsWith('w ')) {
      for (const part of line.slice(2).split(';')) {
        const m = part.trim().match(/^(.+?)=(.+)\((.+)\)$/);
        if (!m) throw new Error(`bad word in ${b.id}: ${part}`);
        b.words.push({ word: m[1].trim(), meaning: m[2].trim(), pos: m[3].trim() });
      }
      continue;
    }
    if (line.startsWith('q ')) {
      const [q, ch, ans, explain] = line.slice(2).split('||').map((x) => x.trim());
      b.quiz.push({ id: `${b.id}-q${b.quiz.length + 1}`, q, choices: ch.split('|').map((x) => x.trim()), answer: Number(ans) - 1, explain });
      continue;
    }
    const [en, ko, note] = line.split('|').map((x) => x.trim());
    const page = b.pages.at(-1);
    if (!page) throw new Error(`page missing in ${b.id}`);
    const n = b.pages.reduce((a, p) => a + p.sentences.length, 0) + 1;
    page.sentences.push({ id: `${b.id}-s${n}`, en, ko, note: note ?? '' });
  }
  return books;
}
