// 형식: 단어 | 품사 | 뜻 | 한글 발음 참고 | 예문 | 예문 해석 | (선택) 연결 패턴
// '# 단원id' 줄 아래 단어는 해당 문법 단원과 연결된다. 발음기호는 scripts/gen_ipa.py 로 생성(vocab-ipa.json).
export const VOCAB_TSV = `
# a1-u01
friend|명|친구|프렌드|She is my best friend.|그녀는 내 가장 친한 친구예요.
family|명|가족|패밀리|My family is small.|우리 가족은 단출해요.
mother|명|어머니|머더|Her mother is a cook.|그녀의 어머니는 요리사예요.
father|명|아버지|파더|His father is tall.|그의 아버지는 키가 커요.
brother|명|형제(형·오빠·남동생)|브라더|My brother likes games.|내 남동생은 게임을 좋아해요.
sister|명|자매(언니·누나·여동생)|시스터|I love my sister.|나는 내 여동생을 사랑해요.
baby|명|아기|베이비|The baby is sleeping.|아기가 자고 있어요.
name|명|이름|네임|What is your name?|이름이 뭐예요?
people|명|사람들|피플|These people are my neighbors.|이분들은 우리 이웃이에요.
man|명|남자|맨|That man is our teacher.|저 남자분이 우리 선생님이에요.
woman|명|여자|우먼|The woman is his aunt.|그 여자분은 그의 이모예요.
boy|명|소년|보이|The boy is my cousin.|그 소년은 내 사촌이에요.
girl|명|소녀|걸|The girl knows me.|그 소녀는 나를 알아요.
child|명|아이|차일드|Their child is five.|그들의 아이는 다섯 살이에요.
parent|명|부모(한 분)|페어런트|Each parent signs the form.|부모님 한 분씩 서류에 서명해요.
husband|명|남편|허즈번드|Her husband is kind.|그녀의 남편은 친절해요.
wife|명|아내|와이프|His wife works with me.|그의 아내는 나와 함께 일해요.
son|명|아들|선|Their son plays with us.|그들의 아들은 우리와 함께 놀아요.
daughter|명|딸|도터|Our daughter is a student.|우리 딸은 학생이에요.
grandmother|명|할머니|그랜드머더|I visit my grandmother often.|나는 할머니를 자주 찾아뵈어요.
neighbor|명|이웃|네이버|Our neighbor helps us.|우리 이웃은 우리를 도와줘요.
classmate|명|반 친구|클래스메이트|He is my classmate.|그는 내 반 친구예요.
everyone|대|모든 사람|에브리원|Hello, everyone!|여러분, 안녕하세요!
together|부|함께|투게더|We eat lunch together.|우리는 점심을 함께 먹어요.
meet|동|만나다|미트|Nice to meet you.|만나서 반가워요.
call|동|전화하다, 부르다|콜|Please call me later.|나중에 저에게 전화해 주세요.
help|동|돕다|헬프|Can you help them?|그들을 도와줄 수 있어요?
love|동|사랑하다|러브|They love their dog.|그들은 자기네 개를 사랑해요.
thank|동|감사하다|땡크|Thank you for your help.|도와주셔서 감사해요.
know|동|알다|노우|Do you know her?|그녀를 아세요?
# a1-u02
happy|형|행복한|해피|I am happy today.|저는 오늘 행복해요.
sad|형|슬픈|새드|He is sad now.|그는 지금 슬퍼요.
tired|형|피곤한|타이어드|We are tired after work.|우리는 퇴근 후에 피곤해요.
hungry|형|배고픈|헝그리|Are you hungry?|배고프세요?
thirsty|형|목마른|떨스티|I am thirsty.|목이 말라요.
busy|형|바쁜|비지|She is busy this week.|그녀는 이번 주에 바빠요.
ready|형|준비된|레디|Dinner is ready.|저녁 준비됐어요.
sick|형|아픈|씩|My son is sick today.|우리 아들이 오늘 아파요.
fine|형|괜찮은, 좋은|파인|I'm fine, thank you.|저는 괜찮아요, 고마워요.
cold|형|추운, 차가운|콜드|It is cold outside.|밖이 추워요.
hot|형|더운, 뜨거운|핫|The soup is hot.|수프가 뜨거워요.
warm|형|따뜻한|웜|The room is warm.|방이 따뜻해요.
big|형|큰|빅|Your house is big.|당신 집은 커요.
small|형|작은|스몰|My room is small.|제 방은 작아요.
tall|형|키가 큰|톨|My father is tall.|우리 아빠는 키가 커요.
short|형|짧은, 키가 작은|숏|The movie is short.|그 영화는 짧아요.
young|형|어린, 젊은|영|They are young.|그들은 어려요.
old|형|나이 든, 오래된|올드|This car is old.|이 차는 오래됐어요.
new|형|새로운|뉴|Is this phone new?|이 휴대폰 새 거예요?
kind|형|친절한|카인드|The nurse is kind.|그 간호사는 친절해요.
nice|형|좋은, 친절한|나이스|It's a nice day.|좋은 날이에요.
late|형|늦은|레이트|Sorry, I'm late.|늦어서 죄송해요.
early|형|이른|얼리|You are early!|일찍 오셨네요!
sure|형|확신하는|슈어|Are you sure?|확실해요?
afraid|형|두려워하는|어프레이드|My son is afraid of dogs.|우리 아들은 개를 무서워해요.
student|명|학생|스튜던트|I am a student.|저는 학생이에요.
teacher|명|선생님|티처|She is an English teacher.|그녀는 영어 선생님이에요.
doctor|명|의사|닥터|Her uncle is a doctor.|그녀의 삼촌은 의사예요.
nurse|명|간호사|널스|My aunt is a nurse.|우리 이모는 간호사예요.
from|전|~에서(출신)|프롬|We are from Korea.|우리는 한국에서 왔어요.
# a1-u03
eat|동|먹다|이트|I eat rice every day.|저는 매일 밥을 먹어요.
drink|동|마시다|드링크|We drink water.|우리는 물을 마셔요.
go|동|가다|고우|I go to work by subway.|저는 지하철로 출근해요.
come|동|오다|컴|They come here on Fridays.|그들은 금요일마다 여기 와요.
like|동|좋아하다|라이크|I like music.|저는 음악을 좋아해요.
want|동|원하다|원트|I want a new bag.|저는 새 가방을 갖고 싶어요.
have|동|가지다, 먹다|해브|We have a cat.|우리는 고양이가 있어요.
need|동|필요하다|니드|I need help.|도움이 필요해요.
play|동|놀다, (운동·악기)하다|플레이|We play tennis.|우리는 테니스를 쳐요.
watch|동|보다(시청)|와치|They watch TV at night.|그들은 밤에 TV를 봐요.
read|동|읽다|리드|I read the news.|저는 뉴스를 읽어요.
write|동|쓰다|라이트|I write emails at work.|저는 회사에서 이메일을 써요.
listen|동|듣다|리슨|We listen to music.|우리는 음악을 들어요.
speak|동|말하다|스피크|You speak English well.|영어를 잘하시네요.
live|동|살다|리브|I live in Seoul.|저는 서울에 살아요.
work|동|일하다|워크|They work at a bank.|그들은 은행에서 일해요.
study|동|공부하다|스터디|We study together.|우리는 함께 공부해요.
buy|동|사다|바이|I buy fruit at the market.|저는 시장에서 과일을 사요.
sell|동|팔다|셀|They sell shoes.|그들은 신발을 팔아요.
make|동|만들다|메이크|I make breakfast.|제가 아침을 만들어요.
cook|동|요리하다|쿡|We cook at home.|우리는 집에서 요리해요.
open|동|열다|오픈|I open the window.|제가 창문을 열어요.
close|동|닫다|클로즈|Please close the door.|문 좀 닫아 주세요.
walk|동|걷다|워크|I walk to school.|저는 걸어서 학교에 가요.
run|동|달리다|런|We run in the morning.|우리는 아침에 달려요.
sleep|동|자다|슬립|I sleep eight hours.|저는 여덟 시간 자요.
sing|동|노래하다|씽|They sing very well.|그들은 노래를 아주 잘해요.
dance|동|춤추다|댄스|We dance at parties.|우리는 파티에서 춤을 춰요.
learn|동|배우다|런|I learn English online.|저는 온라인으로 영어를 배워요.
teach|동|가르치다|티치|You teach math.|당신은 수학을 가르치는군요.
# a1-u04
always|부|항상|올웨이즈|I always drink tea.|저는 항상 차를 마셔요.
usually|부|보통|유주얼리|She usually walks to work.|그녀는 보통 걸어서 출근해요.
often|부|자주|오픈|He often plays games.|그는 자주 게임을 해요.
sometimes|부|가끔|썸타임즈|We sometimes eat out.|우리는 가끔 외식해요.
never|부|절대 ~않다|네버|He never drinks coffee.|그는 커피를 절대 마시지 않아요.
every|형|모든, 매~|에브리|She jogs every morning.|그녀는 매일 아침 조깅해요.
morning|명|아침|모닝|He reads in the morning.|그는 아침에 책을 읽어요.
afternoon|명|오후|애프터눈|She naps in the afternoon.|그녀는 오후에 낮잠을 자요.
evening|명|저녁|이브닝|My dad cooks in the evening.|우리 아빠는 저녁에 요리하세요.
night|명|밤|나이트|He studies at night.|그는 밤에 공부해요.
day|명|날, 하루|데이|It rains every day.|매일 비가 와요.
week|명|주|위크|She visits us every week.|그녀는 매주 우리를 방문해요.
weekend|명|주말|위켄드|He works on the weekend.|그는 주말에 일해요.
breakfast|명|아침 식사|브렉퍼스트|She has breakfast at seven.|그녀는 7시에 아침을 먹어요.
lunch|명|점심 식사|런치|He eats lunch at noon.|그는 정오에 점심을 먹어요.
dinner|명|저녁 식사|디너|My mom makes dinner.|엄마가 저녁을 만드세요.
get up|동|일어나다|겟 업|She gets up at six.|그녀는 6시에 일어나요.
wash|동|씻다|워시|He washes his face.|그는 세수를 해요.
brush|동|솔질하다, 닦다|브러시|She brushes her teeth.|그녀는 이를 닦아요.
start|동|시작하다|스타트|The class starts at nine.|수업은 9시에 시작해요.
finish|동|끝내다|피니시|He finishes work at six.|그는 6시에 일을 마쳐요.
leave|동|떠나다|리브|The train leaves at ten.|기차는 10시에 떠나요.
arrive|동|도착하다|어라이브|The bus arrives soon.|버스가 곧 도착해요.
rain|동|비가 오다|레인|It rains a lot in July.|7월에는 비가 많이 와요.
snow|동|눈이 오다|스노우|It snows in winter.|겨울에는 눈이 와요.
take|동|타다, 가져가다|테이크|She takes the bus.|그녀는 버스를 타요.
use|동|사용하다|유즈|He uses a laptop.|그는 노트북을 써요.
do|동|하다|두|She does yoga.|그녀는 요가를 해요.
visit|동|방문하다|비짓|He visits his parents.|그는 부모님을 찾아뵈어요.
clean|동|청소하다|클린|My brother cleans his room.|내 남동생은 자기 방을 청소해요.
# a1-u05
understand|동|이해하다|언더스탠드|I don't understand.|이해가 안 돼요.
remember|동|기억하다|리멤버|I don't remember his name.|그의 이름이 기억나지 않아요.
forget|동|잊다|포겟|Don't forget your umbrella.|우산 잊지 마세요.
smoke|동|담배를 피우다|스모크|He doesn't smoke.|그는 담배를 피우지 않아요.
drive|동|운전하다|드라이브|She doesn't drive.|그녀는 운전하지 않아요.
care|동|신경 쓰다|케어|I don't care.|저는 상관없어요.
matter|동|중요하다|매터|It doesn't matter.|상관없어요.
mind|동|꺼리다|마인드|I don't mind.|저는 괜찮아요.
believe|동|믿다|빌리브|I don't believe it.|믿을 수 없어요.
agree|동|동의하다|어그리|I don't agree with you.|저는 당신 말에 동의하지 않아요.
worry|동|걱정하다|워리|Don't worry.|걱정하지 마세요.
meat|명|고기|미트|We don't eat meat.|우리는 고기를 먹지 않아요.
fish|명|생선, 물고기|피시|My son doesn't like fish.|우리 아들은 생선을 좋아하지 않아요.
milk|명|우유|밀크|I don't drink milk.|저는 우유를 마시지 않아요.
sugar|명|설탕|슈거|No sugar, please.|설탕은 빼 주세요.
money|명|돈|머니|I don't have much money.|돈이 별로 없어요.
time|명|시간|타임|We don't have time.|우리는 시간이 없어요.
car|명|자동차|카|They don't have a car.|그들은 차가 없어요.
phone|명|전화기, 휴대폰|폰|My phone doesn't work.|제 휴대폰이 안 돼요.
problem|명|문제|프라블럼|It isn't a problem.|문제없어요.
answer|명|답|앤서|That isn't the right answer.|그건 정답이 아니에요.
homework|명|숙제|홈워크|We don't have homework today.|오늘은 숙제가 없어요.
class|명|수업|클래스|There isn't a class today.|오늘은 수업이 없어요.
right|형|맞는, 옳은|라이트|That isn't right.|그건 맞지 않아요.
wrong|형|틀린|롱|Don't worry. It isn't wrong.|걱정 마세요. 틀리지 않았어요.
far|형|먼|파|The station isn't far.|역은 멀지 않아요.
expensive|형|비싼|익스펜시브|This shirt isn't expensive.|이 셔츠는 비싸지 않아요.
cheap|형|싼|칩|It isn't cheap here.|여기는 싸지 않아요.
open|형|열린|오픈|The store isn't open yet.|가게가 아직 안 열었어요.
much|형|많은(셀 수 없는)|머치|He doesn't eat much.|그는 많이 먹지 않아요.
# a1-u06
what|대|무엇|왓|What do you want?|뭘 원하세요?
where|부|어디|웨어|Where is the station?|역이 어디예요?
when|부|언제|웬|When does it start?|언제 시작해요?
who|대|누구|후|Who is that girl?|저 소녀는 누구예요?
why|부|왜|와이|Why are you sad?|왜 슬퍼요?
how|부|어떻게|하우|How do you go to work?|어떻게 출근하세요?
how much|부|얼마|하우 머치|How much is this?|이거 얼마예요?
how many|부|몇 개|하우 매니|How many brothers do you have?|형제가 몇 명이에요?
which|대|어느 것|위치|Which bus goes downtown?|어느 버스가 시내에 가요?
question|명|질문|퀘스천|Do you have a question?|질문 있으세요?
price|명|가격|프라이스|What is the price?|가격이 얼마예요?
age|명|나이|에이지|What is your age?|나이가 어떻게 되세요?
job|명|직업, 일|잡|What is your job?|직업이 뭐예요?
hobby|명|취미|하비|What is your hobby?|취미가 뭐예요?
favorite|형|가장 좋아하는|페이버릿|What is your favorite food?|가장 좋아하는 음식이 뭐예요?
color|명|색깔|컬러|What color is your bag?|가방은 무슨 색이에요?
birthday|명|생일|벌스데이|When is your birthday?|생일이 언제예요?
address|명|주소|어드레스|What is your address?|주소가 어떻게 되세요?
number|명|번호, 숫자|넘버|What is your phone number?|전화번호가 뭐예요?
restroom|명|화장실|레스트룸|Where is the restroom?|화장실이 어디예요?
seat|명|자리, 좌석|시트|Is this seat taken?|이 자리 있어요?
menu|명|메뉴|메뉴|Do you have an English menu?|영어 메뉴 있어요?
ticket|명|표, 티켓|티킷|Where do I buy a ticket?|표는 어디서 사요?
free|형|한가한, 무료인|프리|Are you free tonight?|오늘 밤 시간 있어요?
okay|형|괜찮은|오케이|Is everything okay?|다 괜찮아요?
true|형|사실인|트루|Is it true?|그게 사실이에요?
spicy|형|매운|스파이시|Is this food spicy?|이 음식 매워요?
mean|동|의미하다|민|What does this word mean?|이 단어는 무슨 뜻이에요?
cost|동|(비용이) 들다|코스트|How much does it cost?|비용이 얼마나 들어요?
ask|동|묻다|애스크|Can I ask a question?|질문해도 될까요?
# a1-u07
apple|명|사과|애플|I eat an apple every day.|저는 매일 사과 하나를 먹어요.
banana|명|바나나|버내너|She wants a banana.|그녀는 바나나 하나를 원해요.
egg|명|달걀|에그|I need an egg.|달걀 하나가 필요해요.
orange|명|오렌지|오린지|He has an orange.|그는 오렌지가 하나 있어요.
umbrella|명|우산|엄브렐러|Take an umbrella.|우산 하나 챙겨 가세요.
hour|명|시간(1시간)|아워|The class is an hour long.|수업은 한 시간이에요.
idea|명|생각, 아이디어|아이디어|That's a good idea.|좋은 생각이에요.
artist|명|예술가|아티스트|She is an artist.|그녀는 예술가예요.
engineer|명|엔지니어|엔지니어|My brother is an engineer.|제 형은 엔지니어예요.
actor|명|배우|액터|He is a famous actor.|그는 유명한 배우예요.
book|명|책|북|I bought a book. The book is interesting.|책을 샀어요. 그 책은 재미있어요.
bag|명|가방|백|Is the bag yours?|그 가방 당신 거예요?
door|명|문|도어|Open the door, please.|문 좀 열어 주세요.
window|명|창문|윈도우|The window is open.|그 창문이 열려 있어요.
sun|명|해, 태양|썬|The sun is hot today.|오늘은 해가 뜨거워요.
moon|명|달|문|The moon is beautiful tonight.|오늘 밤 달이 아름다워요.
sky|명|하늘|스카이|The sky is blue.|하늘이 파래요.
key|명|열쇠|키|Where is the key?|그 열쇠 어디 있어요?
salt|명|소금|솔트|Can you pass the salt?|소금 좀 건네줄래요?
water|명|물|워터|The water is cold.|그 물은 차가워요.
coffee|명|커피|커피|I'd like a coffee, please.|커피 한 잔 주세요.
cup|명|컵|컵|Can I have a cup of tea?|차 한 잔 주실래요?
piano|명|피아노|피애노|She plays the piano.|그녀는 피아노를 쳐요.
guitar|명|기타|기타|He plays the guitar.|그는 기타를 쳐요.
world|명|세계|월드|It's a small world.|세상 참 좁네요.
university|명|대학교|유니버시티|She goes to a university in Busan.|그녀는 부산에 있는 대학교에 다녀요.
honest|형|정직한|어니스트|He is an honest man.|그는 정직한 사람이에요.
easy|형|쉬운|이지|It's an easy test.|쉬운 시험이에요.
interesting|형|흥미로운|인터레스팅|It's an interesting story.|흥미로운 이야기예요.
famous|형|유명한|페이머스|This is a famous restaurant.|여기는 유명한 식당이에요.
# a1-u08
in|전|~ 안에|인|The milk is in the fridge.|우유는 냉장고 안에 있어요.
on|전|~ 위에, (요일)에|온|The book is on the desk.|책은 책상 위에 있어요.
at|전|~에(지점, 시각)|앳|Meet me at the station.|역에서 만나요.
under|전|~ 아래에|언더|The cat is under the table.|고양이가 탁자 밑에 있어요.
next to|전|~ 옆에|넥스트 투|The bank is next to the cafe.|은행은 카페 옆에 있어요.
between|전|~ 사이에|비트윈|I sit between Jun and Mina.|저는 준과 미나 사이에 앉아요.
behind|전|~ 뒤에|비하인드|The park is behind the school.|공원은 학교 뒤에 있어요.
in front of|전|~ 앞에|인 프런트 오브|I wait in front of the gate.|저는 정문 앞에서 기다려요.
near|전|~ 가까이에|니어|I live near the subway.|저는 지하철 근처에 살아요.
home|명|집|홈|I am at home now.|저는 지금 집에 있어요.
school|명|학교|스쿨|The kids are at school.|아이들은 학교에 있어요.
office|명|사무실|오피스|Our office is on the fifth floor.|우리 사무실은 5층에 있어요.
station|명|역|스테이션|The station is near the park.|역은 공원 근처에 있어요.
bus stop|명|버스 정류장|버스 스탑|I'm at the bus stop.|저는 버스 정류장에 있어요.
park|명|공원|파크|We walk in the park.|우리는 공원에서 걸어요.
bank|명|은행|뱅크|The bank opens at nine.|은행은 9시에 열어요.
hospital|명|병원|하스피틀|My aunt works at a hospital.|우리 이모는 병원에서 일해요.
library|명|도서관|라이브러리|I study in the library.|저는 도서관에서 공부해요.
kitchen|명|부엌|키친|Mom is in the kitchen.|엄마는 부엌에 계세요.
room|명|방|룸|My bag is in my room.|제 가방은 제 방에 있어요.
table|명|탁자, 식탁|테이블|The keys are on the table.|열쇠는 탁자 위에 있어요.
wall|명|벽|월|There is a clock on the wall.|벽에 시계가 있어요.
floor|명|바닥, 층|플로어|The toilet is on the second floor.|화장실은 2층에 있어요.
street|명|거리|스트리트|There is a cafe on this street.|이 거리에 카페가 있어요.
city|명|도시|시티|I live in a big city.|저는 대도시에 살아요.
country|명|나라, 시골|컨트리|Korea is a beautiful country.|한국은 아름다운 나라예요.
noon|명|정오|눈|Let's meet at noon.|정오에 만나요.
Monday|명|월요일|먼데이|See you on Monday.|월요일에 봐요.
summer|명|여름|써머|We go to the beach in summer.|우리는 여름에 해변에 가요.
winter|명|겨울|윈터|It is cold in winter.|겨울에는 추워요.
# a1-u09
can|조|~할 수 있다|캔|I can swim.|저는 수영할 수 있어요.
swim|동|수영하다|스윔|She can't swim.|그녀는 수영을 못 해요.
ride|동|타다|라이드|Can you ride a bike?|자전거 탈 줄 알아요?
fly|동|날다|플라이|Birds can fly.|새는 날 수 있어요.
jump|동|뛰다, 점프하다|점프|He can jump high.|그는 높이 뛸 수 있어요.
draw|동|그리다|드로|My daughter can draw well.|우리 딸은 그림을 잘 그려요.
hear|동|듣다, 들리다|히어|I can't hear you.|잘 안 들려요.
see|동|보다, 보이다|씨|Can you see the sign?|그 표지판 보여요?
find|동|찾다|파인드|I can't find my key.|열쇠를 못 찾겠어요.
try|동|시도하다|트라이|Can I try this on?|이거 입어 봐도 돼요?
borrow|동|빌리다|바로우|Can I borrow your pen?|펜 좀 빌려도 될까요?
pay|동|지불하다|페이|Can I pay by card?|카드로 계산해도 돼요?
park|동|주차하다|파크|You can't park here.|여기에 주차하면 안 돼요.
stay|동|머무르다|스테이|You can stay here tonight.|오늘 밤 여기 머물러도 돼요.
wait|동|기다리다|웨이트|Can you wait a minute?|잠깐 기다려 줄래요?
repeat|동|반복하다|리피트|Can you repeat that?|다시 한번 말해 줄래요?
carry|동|나르다, 들다|캐리|Can you carry this box?|이 상자 좀 들어 줄래요?
fix|동|고치다|픽스|He can fix your bike.|그가 당신 자전거를 고칠 수 있어요.
afford|동|(돈·시간의) 여유가 있다|어포드|I can't afford to buy a new car.|새 차를 살 여유가 없어요.|can't afford to + 동사원형 (~할 여유가 없다)
bike|명|자전거|바이크|I can ride a bike.|저는 자전거를 탈 수 있어요.
card|명|카드|카드|Can I use this card?|이 카드 써도 되나요?
picture|명|사진, 그림|픽처|Can I take a picture?|사진 찍어도 돼요?
language|명|언어|랭귀지|She can speak three languages.|그녀는 3개 국어를 할 수 있어요.
Chinese|명|중국어|차이니즈|My dad can speak Chinese.|우리 아빠는 중국어를 하실 수 있어요.
Japanese|명|일본어|재퍼니즈|I can read Japanese.|저는 일본어를 읽을 수 있어요.
slowly|부|천천히|슬로울리|Can you speak slowly?|천천히 말해 주실 수 있어요?
again|부|다시|어게인|Can you say it again?|다시 말해 주실래요?
well|부|잘|웰|You can sing well.|노래 잘하시네요.
here|부|여기에|히어|Can I sit here?|여기 앉아도 돼요?
anytime|부|언제든지|애니타임|You can call me anytime.|언제든지 전화해도 돼요.
# a1-u10
because|접|왜냐하면, ~ 때문에|비코즈|I'm happy because it's Friday.|금요일이라서 기뻐요.
and|접|그리고|앤드|I have a cat and a dog.|저는 고양이와 개가 있어요.
but|접|그러나|벗|It's small but nice.|작지만 좋아요.
so|접|그래서|쏘|I was tired, so I slept.|피곤해서 잤어요.
or|접|또는|오어|Tea or coffee?|차로 하실래요, 커피로 하실래요?
there|부|거기에, (There is) ~이 있다|데어|There is a cafe near here.|이 근처에 카페가 있어요.
very|부|매우|베리|The movie is very good.|그 영화는 아주 좋아요.
beautiful|형|아름다운|뷰티풀|She has a beautiful voice.|그녀는 목소리가 아름다워요.
clean|형|깨끗한|클린|The room is small but clean.|방은 작지만 깨끗해요.
dirty|형|더러운|더티|My shoes are dirty.|제 신발이 더러워요.
fast|형|빠른|패스트|I have a fast computer.|저는 빠른 컴퓨터가 있어요.
slow|형|느린|슬로우|The bus is slow but cheap.|버스는 느리지만 싸요.
long|형|긴|롱|She has long hair.|그녀는 머리가 길어요.
heavy|형|무거운|헤비|This box is very heavy.|이 상자는 아주 무거워요.
light|형|가벼운, 밝은|라이트|The bag is light and strong.|그 가방은 가볍고 튼튼해요.
quiet|형|조용한|콰이엇|I live in a quiet town.|저는 조용한 동네에 살아요.
noisy|형|시끄러운|노이지|The street is noisy at night.|그 거리는 밤에 시끄러워요.
delicious|형|맛있는|딜리셔스|This is a delicious cake.|이건 맛있는 케이크예요.
fun|형|재미있는|펀|The party was fun.|파티는 재미있었어요.
great|형|아주 좋은, 훌륭한|그레이트|You did a great job.|정말 잘했어요.
good|형|좋은|굿|It's a good restaurant.|좋은 식당이에요.
bad|형|나쁜|배드|The weather is bad today.|오늘은 날씨가 나빠요.
important|형|중요한|임포턴트|Sleep is very important.|잠은 아주 중요해요.
red|형|빨간|레드|He has a red car.|그는 빨간 차가 있어요.
blue|형|파란|블루|She has blue eyes.|그녀는 눈이 파래요.
house|명|집|하우스|There is a big house on the hill.|언덕 위에 큰 집이 있어요.
garden|명|정원|가든|We have a small garden.|우리는 작은 정원이 있어요.
weather|명|날씨|웨더|The weather is nice, so let's go out.|날씨가 좋으니 나가요.
apartment|명|아파트|아파트먼트|There are two rooms in my apartment.|우리 아파트에는 방이 두 개 있어요.
cafe|명|카페|캐페이|We meet at a cafe on Fridays.|우리는 금요일마다 카페에서 만나요.
`;
