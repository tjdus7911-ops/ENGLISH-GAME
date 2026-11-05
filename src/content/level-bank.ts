/**
 * 적응형 레벨 테스트 문항 은행 (영역 4 × 레벨 5 × 5문항 = 100문항).
 * 형식: 영역|레벨|지시문|문장(빈칸 ___ 또는 지문)|보기1;보기2;보기3;보기4|정답번호(1~4)|해설
 * 영역: V 영단어 · G 문법 · E 실생활 표현 · R 짧은 독해
 * ※ 앱 내부 학습 추천용 문항이며 공인 CEFR 시험 문항이 아닙니다.
 */
import type { Question } from '@/domain/types';

export type TestArea = 'V' | 'G' | 'E' | 'R';
export const TEST_AREAS: TestArea[] = ['V', 'G', 'E', 'R'];
export const AREA_LABEL: Record<TestArea, string> = { V: '영단어', G: '문법', E: '실생활 표현', R: '독해' };
export const TEST_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1'] as const;
export type TestLevel = (typeof TEST_LEVELS)[number];

const RAW = String.raw`
V|A1|빈칸에 알맞은 단어를 고르세요.|I drink ___ every morning.|milk;chair;window;shoe|1|마시는 것은 milk(우유)예요.
V|A1|밑줄 친 단어의 뜻을 고르세요.|My sister is very tall.|키가 큰;배고픈;늦은;조용한|1|tall = 키가 큰
V|A1|반대말을 고르세요.|hot ↔ ___|cold;big;new;fast|1|hot(뜨거운) ↔ cold(차가운)
V|A1|빈칸에 알맞은 단어를 고르세요.|We sleep in the ___.|bedroom;kitchen;garden;street|1|잠은 bedroom(침실)에서 자요.
V|A1|'도서관'을 영어로 고르세요.|도서관|library;hospital;bakery;station|1|library = 도서관
V|A2|빈칸에 알맞은 단어를 고르세요.|I was ___ because I lost my wallet.|upset;proud;relaxed;delicious|1|지갑을 잃어버려서 upset(속상한)
V|A2|밑줄 친 단어의 뜻을 고르세요.|Please remember to bring your ticket.|기억하다;빌리다;고치다;잃다|1|remember = 기억하다
V|A2|빈칸에 알맞은 단어를 고르세요.|The museum is ___ on Mondays, so we can't go in.|closed;empty;cheap;heavy|1|월요일에 들어갈 수 없으니 closed(문 닫은)
V|A2|비슷한 뜻의 단어를 고르세요.|begin|start;finish;forget;arrive|1|begin = start
V|A2|빈칸에 알맞은 단어를 고르세요.|He usually ___ the bus to work.|takes;makes;does;plays|1|take the bus: 버스를 타다
V|B1|빈칸에 알맞은 단어를 고르세요.|The company decided to ___ the meeting until next week.|postpone;deliver;borrow;describe|1|postpone = 연기하다
V|B1|밑줄 친 단어의 뜻을 고르세요.|She was reluctant to tell the truth.|꺼리는;간절한;자랑스러운;놀란|1|reluctant = 내키지 않는, 꺼리는
V|B1|빈칸에 알맞은 단어를 고르세요.|I can't ___ the noise from the construction any longer.|stand;sit;keep;hold|1|can't stand = 참을 수 없다
V|B1|비슷한 뜻의 단어를 고르세요.|essential|necessary;optional;ancient;fragile|1|essential = necessary(필수적인)
V|B1|빈칸에 알맞은 단어를 고르세요.|Our flight was ___ because of the heavy snow.|cancelled;invited;repaired;printed|1|폭설로 항공편이 cancelled(취소된)
V|B2|빈칸에 알맞은 단어를 고르세요.|The new policy had a significant ___ on small businesses.|impact;attempt;excuse;rumor|1|have an impact on = ~에 영향을 미치다
V|B2|밑줄 친 단어의 뜻을 고르세요.|The evidence was inconclusive.|결정적이지 않은;불법인;명백한;오래된|1|inconclusive = 결론에 이르지 못하는
V|B2|빈칸에 알맞은 단어를 고르세요.|He tends to ___ the difficulties of the project.|underestimate;overhear;undertake;outgrow|1|underestimate = 과소평가하다
V|B2|비슷한 뜻의 단어를 고르세요.|reluctantly|unwillingly;eagerly;rapidly;honestly|1|reluctantly = unwillingly(마지못해)
V|B2|빈칸에 알맞은 단어를 고르세요.|The two reports ___ each other, so we don't know which is correct.|contradict;illustrate;resemble;accompany|1|contradict = 서로 모순되다
V|C1|빈칸에 알맞은 단어를 고르세요.|Her argument was so ___ that nobody could find a flaw in it.|compelling;tentative;negligible;redundant|1|compelling = 설득력 있는
V|C1|밑줄 친 단어의 뜻을 고르세요.|The minister's remarks only served to exacerbate the tension.|악화시키다;완화하다;숨기다;측정하다|1|exacerbate = 악화시키다
V|C1|빈칸에 알맞은 단어를 고르세요.|The novel is a ___ portrait of life in a small fishing village.|poignant;lucrative;meticulous;obsolete|1|poignant = 가슴 아픈, 심금을 울리는
V|C1|비슷한 뜻의 단어를 고르세요.|ubiquitous|everywhere;unique;temporary;hidden|1|ubiquitous = 어디에나 있는
V|C1|빈칸에 알맞은 단어를 고르세요.|Critics were quick to ___ the film as shallow and predictable.|dismiss;endorse;commission;postpone|1|dismiss A as B = A를 B라고 일축하다
G|A1|빈칸에 알맞은 것을 고르세요.|She ___ a student.|is;are;am;be|1|3인칭 단수 She → is
G|A1|빈칸에 알맞은 것을 고르세요.|I ___ two brothers.|have;has;am;is|1|I → have
G|A1|빈칸에 알맞은 것을 고르세요.|___ you like pizza?|Do;Does;Are;Is|1|일반동사 의문문, 주어 you → Do
G|A1|빈칸에 알맞은 것을 고르세요.|There ___ three cats under the table.|are;is;am;be|1|복수 three cats → There are
G|A1|빈칸에 알맞은 것을 고르세요.|He ___ swim very well.|can;cans;is;do|1|조동사 can 뒤에는 동사원형, can은 형태 변화 없음
G|A2|빈칸에 알맞은 것을 고르세요.|We ___ to the beach last weekend.|went;go;goes;going|1|last weekend → 과거형 went
G|A2|빈칸에 알맞은 것을 고르세요.|This box is ___ than that one.|heavier;heavy;heaviest;more heavy|1|비교급 heavy → heavier
G|A2|빈칸에 알맞은 것을 고르세요.|I'm ___ visit my grandmother tomorrow.|going to;go to;went to;goes to|1|be going to + 동사원형: ~할 예정이다
G|A2|빈칸에 알맞은 것을 고르세요.|She was cooking when the phone ___.|rang;rings;ringing;has rung|1|과거진행 중에 일어난 일 → 과거형 rang
G|A2|빈칸에 알맞은 것을 고르세요.|You ___ wear a helmet when you ride a bike.|should;shoulds;to should;are should|1|should + 동사원형: ~해야 한다
G|B1|빈칸에 알맞은 것을 고르세요.|I ___ in Seoul since 2015.|have lived;lived;am living;live|1|since + 시점 → 현재완료 have lived
G|B1|빈칸에 알맞은 것을 고르세요.|If it rains tomorrow, we ___ at home.|will stay;stayed;would stayed;stay will|1|1차 조건문: If + 현재, will + 동사원형
G|B1|빈칸에 알맞은 것을 고르세요.|The bridge ___ in 1990.|was built;built;is building;has built|1|다리는 '지어진' 것 → 수동태 was built
G|B1|빈칸에 알맞은 것을 고르세요.|This is the man ___ helped me yesterday.|who;which;whose;what|1|사람 선행사 + 주격 → who
G|B1|빈칸에 알맞은 것을 고르세요.|She asked me where I ___.|lived;do live;did I live;live I|1|간접의문문은 평서문 어순 + 시제 일치
G|B2|빈칸에 알맞은 것을 고르세요.|If I ___ more time, I would learn Japanese.|had;have;will have;would have|1|가정법 과거: If + 과거, would + 동사원형
G|B2|빈칸에 알맞은 것을 고르세요.|By the time we arrived, the movie ___.|had already started;already starts;has already started;was already start|1|도착한 시점보다 먼저 → 과거완료
G|B2|빈칸에 알맞은 것을 고르세요.|___ the rain, the match continued.|Despite;Although;Because;However|1|Despite + 명사(구): ~에도 불구하고
G|B2|빈칸에 알맞은 것을 고르세요.|I wish I ___ harder when I was at school.|had studied;studied;have studied;would study|1|과거 사실의 반대 소망 → I wish + 과거완료
G|B2|빈칸에 알맞은 것을 고르세요.|He is said ___ a famous singer in his youth.|to have been;to be;being;have been|1|be said to have p.p.: (과거에) ~였다고 한다
G|C1|빈칸에 알맞은 것을 고르세요.|___ had I closed the door than the phone rang.|No sooner;Hardly;As soon;Scarcely|1|No sooner had A than B: A하자마자 B (도치)
G|C1|빈칸에 알맞은 것을 고르세요.|___ I known about the problem, I would have helped.|Had;If;Were;Should|1|If I had known → Had I known (도치)
G|C1|빈칸에 알맞은 것을 고르세요.|Not only ___ the exam, but she also got the highest score.|did she pass;she passed;she did pass;passed she|1|Not only 문두 → 조동사 + 주어 도치
G|C1|빈칸에 알맞은 것을 고르세요.|It is essential that every student ___ the form by Friday.|submit;submits;submitted;will submit|1|essential that + (should) 동사원형 (가정법 현재)
G|C1|빈칸에 알맞은 것을 고르세요.|___ the circumstances, I think you made the right decision.|Given;Giving;To give;Gave|1|Given ~: ~을 고려하면
E|A1|알맞은 대답을 고르세요.|A: How are you? B: ___|I'm fine, thank you.;I'm ten years.;Yes, I am a student.;It's Monday.|1|안부 인사에는 I'm fine으로 답해요.
E|A1|알맞은 대답을 고르세요.|A: Thank you so much! B: ___|You're welcome.;Me too.;I'm sorry.;Good night.|1|감사 인사 → You're welcome.
E|A1|이 상황에 알맞은 말을 고르세요.|처음 만난 사람에게 하는 말|Nice to meet you.;See you later.;Excuse me, sorry.;Happy birthday.|1|첫 만남 → Nice to meet you.
E|A1|알맞은 대답을 고르세요.|A: What time is it? B: ___|It's three o'clock.;It's sunny.;It's my bag.;It's 3 dollars.|1|시간을 묻는 말에 시각으로 답해요.
E|A1|이 상황에 알맞은 말을 고르세요.|가게에서 가격을 물을 때|How much is this?;How old is this?;Where is this?;Who is this?|1|가격 → How much
E|A2|알맞은 대답을 고르세요.|A: Could you pass me the salt? B: ___|Sure, here you go.;No, I'm salt.;Yes, I could.;I pass.|1|부탁을 들어줄 때 Sure, here you go.
E|A2|이 상황에 알맞은 말을 고르세요.|식당에서 주문할 때|I'd like the chicken salad, please.;I like chicken, really.;Give chicken me.;Chicken is delicious food.|1|I'd like ~, please: 정중한 주문
E|A2|알맞은 대답을 고르세요.|A: Do you mind if I open the window? B: ___|No, not at all.;Yes, please open.;I don't open.;Sure, I mind.|1|Do you mind ~? 에 허락할 때는 No, not at all.
E|A2|이 상황에 알맞은 말을 고르세요.|길을 물을 때|How can I get to the station?;Where do you get?;What is the station?;When is the station?|1|How can I get to ~? 길 묻기
E|A2|알맞은 대답을 고르세요.|A: I failed my driving test. B: ___|Oh no, I'm sorry to hear that.;Congratulations!;That sounds fun.;Me neither, good.|1|안 좋은 소식 → I'm sorry to hear that.
E|B1|이 상황에 알맞은 말을 고르세요.|상대 말을 잘 못 들었을 때 정중하게|Sorry, could you say that again?;What? Again!;You speak bad.;I don't hear you never.|1|정중하게 다시 말해 달라고 할 때
E|B1|알맞은 대답을 고르세요.|A: Let's grab a coffee after work. B: ___|Sounds good. Where should we go?;I grab coffee every day.;Coffee is grabbed.;No coffee in work.|1|grab a coffee 제안에 동의
E|B1|밑줄 친 표현의 뜻을 고르세요.|I'm running out of time.|시간이 거의 없어요;시간이 많아요;시간을 낭비해요;시간 맞춰 뛰어요|1|run out of = ~이 다 떨어지다
E|B1|이 상황에 알맞은 말을 고르세요.|회의에서 의견에 부분적으로 동의할 때|I see your point, but I'm not sure it will work.;You are wrong totally.;Yes yes yes.;I agree you never.|1|부분 동의 표현
E|B1|밑줄 친 표현의 뜻을 고르세요.|Let's call it a day.|오늘은 여기까지 하자;하루 종일 전화하자;좋은 날이라고 부르자;내일 전화하자|1|call it a day = 그만 마무리하다
E|B2|밑줄 친 표현의 뜻을 고르세요.|We need to think outside the box.|틀에서 벗어나 생각하다;상자를 정리하다;밖에서 회의하다;빨리 결정하다|1|think outside the box = 창의적으로 생각하다
E|B2|이 상황에 알맞은 말을 고르세요.|이메일로 정중하게 마감 연장을 요청할 때|Would it be possible to extend the deadline by two days?;Give me two more days now.;Deadline is bad, change it.;I want two days, OK?|1|Would it be possible to ~? 정중한 요청
E|B2|밑줄 친 표현의 뜻을 고르세요.|The meeting was a bit of a mixed bag.|좋은 점과 나쁜 점이 섞여 있었다;선물이 많았다;아주 완벽했다;취소되었다|1|a mixed bag = 좋고 나쁜 것이 섞인 것
E|B2|알맞은 대답을 고르세요.|A: I'm on the fence about taking the job. B: ___|Why not list the pros and cons?;Get off the fence now.;Fences are dangerous.;I'm on the job too.|1|on the fence = 결정을 못 함 → 장단점 정리 제안
E|B2|밑줄 친 표현의 뜻을 고르세요.|Let's touch base next week.|다음 주에 연락하자;다음 주에 야구하자;기초부터 다시 하자;다음 주에 이사하자|1|touch base = 연락하다, 상황을 공유하다
E|C1|밑줄 친 표현의 뜻을 고르세요.|His explanation didn't hold water.|설득력이 없었다;물을 담지 못했다;너무 길었다;아주 정확했다|1|not hold water = (주장이) 타당하지 않다
E|C1|이 상황에 알맞은 말을 고르세요.|상대의 비판을 인정하면서 대화를 이어 갈 때|That's a fair point, and I take it on board.;Fair is not my point.;Board me your point.;Point taken away.|1|take something on board = 받아들여 고려하다
E|C1|밑줄 친 표현의 뜻을 고르세요.|We'll have to play it by ear.|상황을 보며 즉흥적으로 하다;음악을 듣다;귀를 기울이다;규칙대로 하다|1|play it by ear = 그때그때 상황에 맞춰 하다
E|C1|밑줄 친 표현의 뜻을 고르세요.|The proposal was met with a lukewarm response.|미지근한(시큰둥한) 반응;뜨거운 환영;강한 반대;즉각적인 승인|1|lukewarm = 미지근한, 열의 없는
E|C1|밑줄 친 표현의 뜻을 고르세요.|She has a lot on her plate right now.|할 일이 많다;음식이 많다;돈이 많다;친구가 많다|1|have a lot on one's plate = 처리할 일이 많다
R|A1|글을 읽고 질문에 답하세요.|Tom has a dog. The dog is brown. Its name is Max. Q: What color is Max?|brown;black;white;red|1|The dog is brown.
R|A1|글을 읽고 질문에 답하세요.|I get up at seven. I eat breakfast and go to school at eight. Q: When does the writer go to school?|at eight;at seven;at nine;at noon|1|go to school at eight
R|A1|글을 읽고 질문에 답하세요.|Anna likes apples. She doesn't like bananas. Q: What does Anna NOT like?|bananas;apples;milk;bread|1|She doesn't like bananas.
R|A1|글을 읽고 질문에 답하세요.|It is Sunday. Ben and his dad are at the park. They play soccer. Q: Where are Ben and his dad?|at the park;at school;at home;at the store|1|They are at the park.
R|A1|글을 읽고 질문에 답하세요.|My room is small. There is a bed, a desk, and a lamp. Q: What is NOT in the room?|a sofa;a bed;a desk;a lamp|1|sofa는 언급되지 않았어요.
R|A2|글을 읽고 질문에 답하세요.|Last summer, Mia visited her aunt in Busan. They swam at the beach every day, and Mia ate fresh fish for the first time. Q: What did Mia do for the first time?|ate fresh fish;swam at the beach;visited Busan;met her aunt|1|for the first time 이 붙은 행동
R|A2|글을 읽고 질문에 답하세요.|The library opens at 9 a.m. and closes at 6 p.m. On Saturdays, it closes two hours earlier. Q: When does it close on Saturdays?|4 p.m.;6 p.m.;8 p.m.;2 p.m.|1|6 p.m.보다 두 시간 일찍 → 4 p.m.
R|A2|글을 읽고 질문에 답하세요.|Jake wanted to buy a new bike, so he saved money from his part-time job for six months. Q: Why did Jake save money?|to buy a bike;to travel;to pay rent;to buy a phone|1|so 앞이 이유: wanted to buy a new bike
R|A2|글을 읽고 질문에 답하세요.|It was raining, so we didn't go hiking. Instead, we watched a movie at home. Q: What did they do?|watched a movie;went hiking;played in the rain;went shopping|1|Instead, we watched a movie
R|A2|글을 읽고 질문에 답하세요.|Sara is taller than her brother, but her brother is older than her. Q: Who is older?|Sara's brother;Sara;They are the same age;We don't know|1|her brother is older than her
R|B1|글을 읽고 질문에 답하세요.|Many people think cats are unfriendly, but research suggests that cats form strong bonds with their owners, much like dogs do. Q: What does the research suggest?|Cats can be as attached to owners as dogs.;Cats are unfriendly.;Dogs dislike cats.;Owners prefer dogs.|1|form strong bonds ... much like dogs do
R|B1|글을 읽고 질문에 답하세요.|Although the restaurant was expensive, we decided to go there because it had excellent reviews and a beautiful view of the river. Q: Why did they choose the restaurant?|good reviews and a nice view;low prices;it was close to home;a friend worked there|1|because 뒤의 이유
R|B1|글을 읽고 질문에 답하세요.|The train was delayed by forty minutes, which meant Leo missed the start of his job interview. Fortunately, the manager agreed to wait. Q: What happened in the end?|The manager waited for Leo.;Leo cancelled the interview.;The train arrived early.;Leo got lost.|1|Fortunately, the manager agreed to wait.
R|B1|글을 읽고 질문에 답하세요.|Since the city introduced free buses for students, the number of cars near schools has dropped by almost a third. Q: What is the result of the free buses?|Fewer cars near schools|More students drive;Buses are crowded;Schools closed|1|the number of cars ... has dropped
R|B1|글을 읽고 질문에 답하세요.|Hana used to hate vegetables, but after she started growing tomatoes and peppers in her garden, she began to enjoy eating them. Q: What changed Hana's opinion?|growing vegetables herself;a doctor's advice;a cooking class;her mother's cooking|1|after she started growing ...
R|B2|글을 읽고 질문에 답하세요.|While remote work offers flexibility, some employees report feeling isolated, which suggests that companies should find new ways to maintain team connections. Q: What does the writer recommend?|Companies should help teams stay connected.;Everyone should work from home.;Remote work should be banned.;Employees should change jobs.|1|companies should find new ways to maintain team connections
R|B2|글을 읽고 질문에 답하세요.|The author's tone throughout the review is one of cautious optimism: she praises the device's battery life but warns that its software still has bugs. Q: How does the author feel about the device?|Mostly positive but with reservations;Completely negative;Indifferent;Extremely excited|1|cautious optimism = 조심스러운 낙관
R|B2|글을 읽고 질문에 답하세요.|Contrary to popular belief, the Great Wall of China cannot be seen from space with the naked eye, as it is long but very narrow. Q: Why can't it be seen from space?|It is too narrow.;It is too short.;It is underground.;It is painted blue.|1|long but very narrow
R|B2|글을 읽고 질문에 답하세요.|Had the volunteers not arrived when they did, the flood would have destroyed far more homes. Q: What does the sentence mean?|The volunteers helped prevent more damage.;The volunteers arrived too late.;No homes were damaged.;The flood never happened.|1|가정법 과거완료 도치: 자원봉사자 덕분에 피해가 줄었어요.
R|B2|글을 읽고 질문에 답하세요.|The museum's new policy, which allows free entry on the first Sunday of each month, aims to attract visitors who might otherwise be unable to afford a ticket. Q: Who is the policy mainly for?|people who can't easily pay for tickets;tourists from abroad;museum staff;school teachers only|1|who might otherwise be unable to afford a ticket
R|C1|글을 읽고 질문에 답하세요.|Far from being a mere luxury, access to green spaces is increasingly recognized as a determinant of public health, influencing everything from stress levels to cardiovascular outcomes. Q: What is the main claim?|Green spaces are important for health, not just a luxury.;Green spaces are expensive luxuries.;Stress has no link to health.;Hospitals need more gardens.|1|Far from being a mere luxury = 단순한 사치와는 거리가 먼
R|C1|글을 읽고 질문에 답하세요.|The committee's decision, ostensibly driven by budgetary concerns, was widely seen as a pretext for sidelining dissenting members. Q: What did many people believe?|Budget was an excuse to push critics aside.;The budget was truly the only reason.;Members asked to leave.;The committee had no budget.|1|ostensibly(표면상) / pretext(구실)
R|C1|글을 읽고 질문에 답하세요.|Scarcely had the startup secured its funding when a rival unveiled a nearly identical product, eroding much of its anticipated advantage. Q: What happened right after the funding?|A competitor released a similar product.;The startup launched successfully.;Funding was cancelled.;The rival bought the startup.|1|Scarcely had A when B: A하자마자 B
R|C1|글을 읽고 질문에 답하세요.|Though lauded for its ambition, the novel ultimately buckles under the weight of its sprawling cast, leaving few characters fully realized. Q: What is the main criticism?|Too many characters, few well developed.;It is too short.;It lacks ambition.;The plot is too simple.|1|sprawling cast(너무 많은 등장인물) · few characters fully realized
R|C1|글을 읽고 질문에 답하세요.|The data, while suggestive, fall short of establishing a causal link between screen time and sleep quality. Q: What does the writer conclude?|The data do not prove screen time causes poor sleep.;Screen time definitely harms sleep.;Sleep improves screen time.;The data are fake.|1|fall short of establishing a causal link = 인과관계를 입증하지 못함
`;

export interface BankItem extends Question { area: TestArea; level: TestLevel }

/** 보기 순서를 문항 id 기반으로 섞는다 (정답이 늘 1번이 되지 않도록, 결정적) */
function shuffleDet<T>(a: T[], seed: string): T[] {
  let h = 2166136261;
  for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  const r = a.slice();
  for (let i = r.length - 1; i > 0; i--) { h = Math.imul(h ^ (h >>> 13), 1274126177); const j = Math.abs(h) % (i + 1); [r[i], r[j]] = [r[j], r[i]]; }
  return r;
}

export const LEVEL_BANK: BankItem[] = RAW.split('\n').map((l) => l.trim()).filter(Boolean).map((line, i) => {
  const f = line.split('|');
  if (f.length < 7) throw new Error(`level bank line ${i}: ${line}`);
  // R 영역 문장에 '|' 가 없도록 작성 — 보기 구분자는 ';' (몇몇 보기는 '|' 로 잘못 들어가면 오류)
  const [area, level, prompt, sentence, choicesRaw, ans, explanation] = [f[0], f[1], f[2], f[3], f.slice(4, f.length - 2).join('|'), f[f.length - 2], f[f.length - 1]];
  const choices = choicesRaw.split(/[;|]/).map((c) => c.trim());
  const answer = choices[Number(ans) - 1];
  const id = `lt-${area}-${level}-${i}`;
  return { id, type: 'mc', prompt, sentence, choices: shuffleDet(choices, id), answers: [answer], explanation, conceptId: `level-${area}`, area: area as TestArea, level: level as TestLevel };
});
