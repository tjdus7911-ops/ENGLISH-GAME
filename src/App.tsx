import { Component, lazy, Suspense, useEffect, type ReactNode } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useApp } from '@/store/app';
import { CelebrationLayer } from '@/components/Partner';
import { Onboarding, Goal } from '@/screens/Onboarding';
import { Home } from '@/screens/Home';
import { Today } from '@/screens/Today';
import { GrammarWordsHub, WordLearn } from '@/screens/Words';
import { WordForestHome, WordLevelPage, WordTopicPage, ChapterLearn, WordSearch, SavedWords } from '@/screens/WordForest';
import { GrammarHub, Lecture, GrammarPractice, GrammarWriting, UnitTest } from '@/screens/Grammar';
import { ListeningHub, ListeningPlayer } from '@/screens/Listening';
import { SpeakingHub, SpeakingPractice } from '@/screens/Speaking';
import { Review, WrongNotes } from '@/screens/Review';
import { FreeStudy, ReadingHub, Reader, Analysis, History } from '@/screens/Study';
import { Discover, Collection, CharacterDetail, PartnerScreen, Growth } from '@/screens/Characters';
import { ExamHall, A1Exam } from '@/screens/Exam';
import { MyScreen } from '@/screens/My';
import { HouseScreen, ShopScreen, InventoryScreen, GardenScreen, SpacesScreen, QuestsScreen } from '@/screens/HomeDecor';
import { useStudyTimer } from '@/lib/studyTimer';
import { LevelCheck, LevelCheckResult, RecommendScreen, AchievementScreen } from '@/screens/LevelCheck';
import { MyWordbook, MyWordReview } from '@/screens/MyWordbook';
import { BankBand, BankChapter } from '@/screens/WordBank';
import { loadAllBands } from '@/lib/wordbank';

const LibraryHub = lazy(() => import('@/screens/Library').then((m) => ({ default: m.LibraryHub })));
const BookShelf = lazy(() => import('@/screens/Library').then((m) => ({ default: m.BookShelf })));
const BookReader = lazy(() => import('@/screens/Library').then((m) => ({ default: m.BookReader })));

const ExpressionHall = lazy(() => import('@/screens/Expressions').then((m) => ({ default: m.ExpressionHall })));
const ExpressionList = lazy(() => import('@/screens/Expressions').then((m) => ({ default: m.ExpressionList })));
const ExpressionDetail = lazy(() => import('@/screens/Expressions').then((m) => ({ default: m.ExpressionDetail })));
const SavedExpressions = lazy(() => import('@/screens/Expressions').then((m) => ({ default: m.SavedExpressions })));
const SituationPlayer = lazy(() => import('@/screens/Expressions').then((m) => ({ default: m.SituationPlayer })));
const VideoLesson = lazy(() => import('@/screens/Video').then((m) => ({ default: m.VideoLesson })));

class ErrorBoundary extends Component<{ children: ReactNode }, { err: Error | null }> {
  state = { err: null as Error | null };
  static getDerivedStateFromError(err: Error) { return { err }; }
  render() {
    if (this.state.err) {
      return (
        <div className="min-h-[100dvh] grid place-items-center p-6 text-center">
          <div>
            <p className="text-4xl">🍂</p>
            <p className="font-bold mt-2">화면을 표시하는 중 문제가 생겼어요.</p>
            <p className="text-sm text-ink-soft mt-1">학습 기록은 기기에 안전하게 저장되어 있어요.</p>
            <button className="mt-4 rounded-2xl bg-accent text-white px-4 min-h-[44px] font-semibold" onClick={() => { this.setState({ err: null }); window.location.hash = '#/home'; }}>홈으로</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function Gate({ children }: { children: ReactNode }) {
  const onboarded = useApp((s) => s.profile.onboarded);
  const tested = useApp((s) => s.profile.levelTest.done);
  const loc = useLocation();
  const free = loc.pathname.startsWith('/onboarding') || loc.pathname.startsWith('/level');
  if (!onboarded && !free) return <Navigate to="/onboarding" replace />;
  if (onboarded && !tested && !free) return <Navigate to="/level-test" replace />;
  return <>{children}</>;
}

function ScrollTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  useStudyTimer(pathname);
  return null;
}

export default function App() {
  const hydrated = useApp((s) => s.hydrated);
  const reduce = useApp((s) => s.settings.reduceMotion);
  useEffect(() => { document.documentElement.classList.toggle('reduce-motion', reduce); }, [reduce]);
  // 단어 터치 사전에 영단어 사전(초·중·고급)을 추가: 첫 화면을 그린 뒤 여유 있을 때 불러온다
  useEffect(() => { const t = window.setTimeout(() => { void loadAllBands().catch(() => {}); }, 1500); return () => window.clearTimeout(t); }, []);
  if (!hydrated) return <div className="min-h-[100dvh] grid place-items-center text-ink-soft" role="status">불러오는 중…</div>;
  return (
    <ErrorBoundary>
      <ScrollTop />
      <CelebrationLayer />
      <Suspense fallback={<div className="p-6 text-center text-ink-soft" role="status">불러오는 중…</div>}>
        <Gate>
          <Routes>
            <Route path="/" element={<Navigate to="/home" replace />} />
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="/onboarding/goal" element={<Goal />} />
            <Route path="/level-test" element={<LevelCheck />} />
            <Route path="/level-result" element={<LevelCheckResult />} />
            <Route path="/home" element={<Home />} />
            <Route path="/today" element={<Today />} />
            <Route path="/words" element={<WordForestHome />} />
            <Route path="/words/grammar" element={<GrammarWordsHub />} />
            <Route path="/words/level/:lv" element={<WordLevelPage />} />
            <Route path="/words/topic/:topic" element={<WordTopicPage />} />
            <Route path="/words/ch/:chapterId" element={<ChapterLearn />} />
            <Route path="/words/search" element={<WordSearch />} />
            <Route path="/words/saved" element={<SavedWords />} />
            <Route path="/words/bank/:band" element={<BankBand />} />
            <Route path="/words/bank/:band/:lv/:ch" element={<BankChapter />} />
            <Route path="/mywords" element={<MyWordbook />} />
            <Route path="/mywords/review" element={<MyWordReview />} />
            <Route path="/library" element={<LibraryHub />} />
            <Route path="/library/books" element={<BookShelf />} />
            <Route path="/library/book/:id" element={<BookReader />} />
            <Route path="/recommend" element={<RecommendScreen />} />
            <Route path="/achievement" element={<AchievementScreen />} />
            <Route path="/words/:unitId" element={<WordLearn />} />
            <Route path="/grammar" element={<GrammarHub />} />
            <Route path="/grammar/:unitId" element={<Lecture />} />
            <Route path="/grammar/:unitId/practice" element={<GrammarPractice />} />
            <Route path="/grammar/:unitId/writing" element={<GrammarWriting />} />
            <Route path="/grammar/:unitId/test" element={<UnitTest />} />
            <Route path="/listening" element={<ListeningHub />} />
            <Route path="/listening/:id" element={<ListeningPlayer />} />
            <Route path="/speaking" element={<SpeakingHub />} />
            <Route path="/speaking/:setId" element={<SpeakingPractice />} />
            <Route path="/reading" element={<ReadingHub />} />
            <Route path="/reading/:id" element={<Reader />} />
            <Route path="/review" element={<Review />} />
            <Route path="/wrong-notes" element={<WrongNotes />} />
            <Route path="/free" element={<FreeStudy />} />
            <Route path="/analysis" element={<Analysis />} />
            <Route path="/history" element={<History />} />
            <Route path="/discover" element={<Discover />} />
            <Route path="/collection" element={<Collection />} />
            <Route path="/collection/:id" element={<CharacterDetail />} />
            <Route path="/partner" element={<PartnerScreen />} />
            <Route path="/growth/:id" element={<Growth />} />
            <Route path="/exam" element={<ExamHall />} />
            <Route path="/exam/a1" element={<A1Exam />} />
            <Route path="/my" element={<MyScreen />} />
            <Route path="/house" element={<HouseScreen />} />
            <Route path="/shop" element={<ShopScreen />} />
            <Route path="/inventory" element={<InventoryScreen />} />
            <Route path="/garden" element={<GardenScreen />} />
            <Route path="/spaces" element={<SpacesScreen />} />
            <Route path="/quests" element={<QuestsScreen />} />
            <Route path="/expressions" element={<ExpressionHall />} />
            <Route path="/expressions/saved" element={<SavedExpressions />} />
            <Route path="/expressions/c/:cat" element={<ExpressionList />} />
            <Route path="/expressions/item/:id" element={<ExpressionDetail />} />
            <Route path="/situations/:id" element={<SituationPlayer />} />
            <Route path="/video/:id" element={<VideoLesson />} />
            <Route path="*" element={<Navigate to="/home" replace />} />
          </Routes>
        </Gate>
      </Suspense>
    </ErrorBoundary>
  );
}
