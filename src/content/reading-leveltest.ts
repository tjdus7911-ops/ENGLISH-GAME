import type { LevelTestQuestion, Reading } from '@/domain/types';
import { ex } from './builders';

const rq = (id: string, conceptId: string, prompt: string, choices: string[], answer: string, explanation: string) =>
  ({ id, type: 'mc' as const, prompt, choices, answers: [answer], explanation, conceptId });

export const READINGS: Reading[] = [
  {
    id: 'rd-01', level: 'A1', title: "Mina's Day", grammarId: 'a1-u04',
    paragraphs: [
      ex('Mina is a nurse. She works at a big hospital in Seoul.', '미나는 간호사예요. 그녀는 서울의 큰 병원에서 일해요.'),
      ex('She gets up at six every morning. She drinks a cup of tea and eats an apple.', '그녀는 매일 아침 6시에 일어나요. 차 한 잔을 마시고 사과 하나를 먹어요.'),
      ex('She usually takes the subway to work. She never drives.', '그녀는 보통 지하철을 타고 출근해요. 운전은 절대 하지 않아요.'),
      ex('After work, she goes to the park with her dog. Her dog is small and very cute.', '퇴근 후에 그녀는 개와 함께 공원에 가요. 그녀의 개는 작고 아주 귀여워요.'),
    ],
    questions: [
      rq('rd-01-q1', 'a1-u04', '미나의 직업은?', ['선생님', '간호사', '의사'], '간호사', '"Mina is a nurse."'),
      rq('rd-01-q2', 'a1-u04', '미나는 아침에 무엇을 먹나요?', ['달걀', '사과', '빵'], '사과', '"eats an apple"'),
      rq('rd-01-q3', 'a1-u04', '미나는 어떻게 출근하나요?', ['운전해서', '지하철로', '걸어서'], '지하철로', '"She usually takes the subway to work."'),
      rq('rd-01-q4', 'a1-u04', '글의 내용과 맞지 않는 것은?', ['미나는 운전을 하지 않는다.', '미나의 개는 크다.', '미나는 퇴근 후 공원에 간다.'], '미나의 개는 크다.', '"Her dog is small" — 개는 작아요.'),
    ],
  },
  {
    id: 'rd-02', level: 'A1', title: 'A Message from Leo', grammarId: 'a1-u09',
    paragraphs: [
      ex('Hi Sora, I am sorry, but I can\'t come to your party on Saturday.', '안녕 소라, 미안하지만 토요일 네 파티에 못 가.'),
      ex('My grandmother is sick, so I visit her in Busan this weekend.', '할머니가 편찮으셔서 이번 주말에 부산에 계신 할머니를 찾아뵈어.'),
      ex('Can we meet next Friday? There is a new cafe near the station.', '다음 주 금요일에 만날 수 있을까? 역 근처에 새 카페가 있어.'),
      ex('I can buy you a cake! Call me anytime. — Leo', '내가 케이크 사 줄게! 언제든 전화해. — 레오'),
    ],
    questions: [
      rq('rd-02-q1', 'a1-u09', '레오가 파티에 못 가는 이유는?', ['일이 바빠서', '할머니가 편찮으셔서', '부산으로 이사 가서'], '할머니가 편찮으셔서', '"My grandmother is sick"'),
      rq('rd-02-q2', 'a1-u09', '레오가 제안한 만남 날짜는?', ['이번 토요일', '다음 주 금요일', '다음 주 토요일'], '다음 주 금요일', '"Can we meet next Friday?"'),
      rq('rd-02-q3', 'a1-u09', '새 카페는 어디에 있나요?', ['역 근처', '공원 옆', '부산'], '역 근처', '"near the station"'),
    ],
  },
  {
    id: 'rd-03', level: 'A1', title: 'My Room', grammarId: 'a1-u08',
    paragraphs: [
      ex('This is my room. It is not big, but it is bright.', '여기는 제 방이에요. 크지 않지만 밝아요.'),
      ex('There is a bed next to the window. There is a desk in front of the bed.', '창문 옆에 침대가 있어요. 침대 앞에는 책상이 있어요.'),
      ex('My books are on the desk, and my bag is under the desk.', '제 책들은 책상 위에 있고, 가방은 책상 밑에 있어요.'),
      ex('I study in my room every evening. I love my room!', '저는 매일 저녁 방에서 공부해요. 제 방이 정말 좋아요!'),
    ],
    questions: [
      rq('rd-03-q1', 'a1-u08', '침대는 어디에 있나요?', ['창문 옆', '책상 밑', '문 뒤'], '창문 옆', '"a bed next to the window"'),
      rq('rd-03-q2', 'a1-u08', '가방은 어디에 있나요?', ['책상 위', '책상 밑', '침대 위'], '책상 밑', '"my bag is under the desk"'),
      rq('rd-03-q3', 'a1-u08', '방에 대한 설명으로 맞는 것은?', ['크고 어둡다', '크지 않지만 밝다', '작고 어둡다'], '크지 않지만 밝다', '"It is not big, but it is bright."'),
    ],
  },
];
export const READING_BY_ID: Record<string, Reading> = Object.fromEntries(READINGS.map((r) => [r.id, r]));

// ─────────────────────────── A1~B2 기초 레벨 진단 (내부 추정용) ───────────────────────────
const lq = (id: string, level: LevelTestQuestion['level'], sentence: string, choices: string[], answer: string, explanation: string, conceptId = 'level'): LevelTestQuestion =>
  ({ id, level, type: 'mc', prompt: '빈칸에 가장 알맞은 것을 고르세요.', sentence, choices, answers: [answer], explanation, conceptId });

export const LEVEL_TEST: LevelTestQuestion[] = [
  lq('lt-a1-1', 'A1', 'My brother ___ a student.', ['am', 'is', 'are', 'be'], 'is', 'My brother(단수) → is.', 'a1-u02'),
  lq('lt-a1-2', 'A1', 'She ___ coffee every morning.', ['drink', 'drinks', 'drinking', 'is drink'], 'drinks', '3인칭 단수 현재 → drinks.', 'a1-u04'),
  lq('lt-a1-3', 'A1', "I ___ like spicy food.", ["don't", "doesn't", "isn't", "not"], "don't", "I + don't + 동사원형.", 'a1-u05'),
  lq('lt-a1-4', 'A1', '___ you speak English?', ['Are', 'Do', 'Does', 'Is'], 'Do', 'you + 일반동사 의문 → Do.', 'a1-u06'),
  lq('lt-a1-5', 'A1', 'The meeting is ___ Monday.', ['in', 'at', 'on', 'by'], 'on', '요일 → on.', 'a1-u08'),
  lq('lt-a1-6', 'A1', 'I have ___ old bike.', ['a', 'an', 'the', '(없음)'], 'an', 'old 는 모음 소리 → an.', 'a1-u07'),
  lq('lt-a2-1', 'A2', 'We ___ to Jeju last summer.', ['go', 'went', 'gone', 'have go'], 'went', 'last summer(과거) → went.'),
  lq('lt-a2-2', 'A2', 'This bag is ___ than that one.', ['cheap', 'cheaper', 'cheapest', 'more cheap'], 'cheaper', '비교급 cheaper than.'),
  lq('lt-a2-3', 'A2', "I'm going ___ visit my aunt tomorrow.", ['to', 'for', 'at', '(없음)'], 'to', 'be going to + 동사원형.'),
  lq('lt-a2-4', 'A2', 'He enjoys ___ in the morning.', ['run', 'to run', 'running', 'ran'], 'running', 'enjoy + 동명사.'),
  lq('lt-a2-5', 'A2', 'You ___ wear a helmet. It is the law.', ['must', 'may', 'would', 'could'], 'must', '의무 → must.'),
  lq('lt-b1-1', 'B1', 'I ___ in this city since 2019.', ['live', 'lived', 'have lived', 'am living'], 'have lived', 'since + 과거 시점 → 현재완료.'),
  lq('lt-b1-2', 'B1', 'The bridge ___ in 1990.', ['built', 'was built', 'has built', 'is building'], 'was built', '수동태 과거 was built.'),
  lq('lt-b1-3', 'B1', 'The woman ___ lives next door is a pilot.', ['who', 'which', 'what', 'whose'], 'who', '사람 선행사 + 주격 관계대명사 who.'),
  lq('lt-b1-4', 'B1', 'If it rains tomorrow, we ___ at home.', ['stay', 'will stay', 'stayed', 'would stay'], 'will stay', '1형 조건문: If + 현재, will + 동사원형.'),
  lq('lt-b1-5', 'B1', "I'd rather ___ home tonight.", ['stay', 'to stay', 'staying', 'stayed'], 'stay', "would rather + 동사원형."),
  lq('lt-b2-1', 'B2', 'If I ___ more time, I would have finished the report.', ['had', 'have had', 'had had', 'would have'], 'had had', '3형 가정법: If + had p.p., would have p.p.'),
  lq('lt-b2-2', 'B2', '___ by the noise, the baby started crying.', ['Waking', 'Woken', 'Wake', 'To wake'], 'Woken', '수동 의미 분사구문 → 과거분사 Woken.'),
  lq('lt-b2-3', 'B2', 'Hardly ___ the station when the train left.', ['I had reached', 'had I reached', 'I reached', 'did I reached'], 'had I reached', '부정어 도치: Hardly had I reached ~ when.'),
  lq('lt-b2-4', 'B2', 'The proposal was rejected, ___ surprised everyone.', ['that', 'what', 'which', 'it'], 'which', '앞 절 전체를 받는 계속적 용법 which.'),
];

export const LEVELS = ['A1', 'A2', 'B1', 'B2'] as const;

/** 진단 결과 → 추천 레벨 (내부 추정 기준, 공인 인증 아님). A1부터 정답률 60% 이상인 레벨을 연속으로 통과하면 다음 레벨로. */
export function estimateLevel(results: Record<string, boolean>): { level: (typeof LEVELS)[number]; byLevel: Record<string, { correct: number; total: number }> } {
  const byLevel: Record<string, { correct: number; total: number }> = {};
  for (const q of LEVEL_TEST) {
    const b = (byLevel[q.level] ??= { correct: 0, total: 0 });
    b.total++;
    if (results[q.id]) b.correct++;
  }
  let level: (typeof LEVELS)[number] = 'A1';
  for (let i = 0; i < LEVELS.length; i++) {
    const b = byLevel[LEVELS[i]];
    if (b && b.correct / b.total >= 0.6) level = LEVELS[Math.min(i + 1, LEVELS.length - 1)];
    else { level = LEVELS[i]; break; }
  }
  return { level, byLevel };
}
