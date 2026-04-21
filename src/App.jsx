import { useEffect, lazy, Suspense } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { useAudio } from './context/AudioContext';
import SplashScreen from './screens/SplashScreen';
import AuthScreen from './screens/AuthScreen';
import LoadingSpinner from './components/ui/LoadingSpinner';
import InviteHandler from './components/shared/InviteHandler';
import ErrorBoundary from './components/shared/ErrorBoundary';
import { initSession, endSession, logEvent, EVENTS } from './firebase/analytics';

const HomeScreen = lazy(() => import('./screens/HomeScreen'));
const OnlineSetupScreen = lazy(() => import('./screens/OnlineSetupScreen'));
const BrowseRoomsScreen = lazy(() => import('./screens/BrowseRoomsScreen'));
const LobbyScreen = lazy(() => import('./screens/LobbyScreen'));
const OnlineGameScreen = lazy(() => import('./screens/OnlineGameScreen'));
const RoundResultScreen = lazy(() => import('./screens/RoundResultScreen'));
const GameOverScreen = lazy(() => import('./screens/GameOverScreen'));
const DrawGameScreen = lazy(() => import('./screens/DrawGameScreen'));
const DrawGameOverScreen = lazy(() => import('./screens/DrawGameOverScreen'));
const SurvivalGameScreen = lazy(() => import('./screens/SurvivalGameScreen'));
const SurvivalGameOverScreen = lazy(() => import('./screens/SurvivalGameOverScreen'));
const CharadesGameScreen = lazy(() => import('./screens/CharadesGameScreen'));
const CharadesGameOverScreen = lazy(() => import('./screens/CharadesGameOverScreen'));
const LeaderboardScreen = lazy(() => import('./screens/LeaderboardScreen'));
const SettingsScreen = lazy(() => import('./screens/SettingsScreen'));
const StoreScreen = lazy(() => import('./screens/StoreScreen'));
const DailyRewardsScreen = lazy(() => import('./screens/DailyRewardsScreen'));
const ProfileStatsScreen = lazy(() => import('./screens/ProfileStatsScreen'));
const BuzzerHostScreen = lazy(() => import('./screens/BuzzerHostScreen'));
const BuzzerPlayerScreen = lazy(() => import('./screens/BuzzerPlayerScreen'));
const BuzzerGameOverScreen = lazy(() => import('./screens/BuzzerGameOverScreen'));

function LazyFallback() {  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg)' }}>
      <LoadingSpinner />
    </div>
  );
}

function SessionTracker() {
  const { user } = useAuth();
  useEffect(() => {
    if (user) {
      initSession(user.uid);
      return () => endSession(user.uid);
    }
  }, [user?.uid]);
  return null;
}

function AuthGate({ children }) {
  const location = useLocation();
  const { user, loading } = useAuth();
  if (loading) return <SplashScreen />;
  if (!user) return <Navigate to="/auth" state={{ from: location }} replace />;
  return children;
}

function PublicGate({ children }) {
  const location = useLocation();
  const { user, loading } = useAuth();
  if (loading) return <SplashScreen />;
  if (user) {
    const from = location.state?.from?.pathname || '/home';
    return <Navigate to={from} replace />;
  }
  return children;
}

function GlobalAudioOrchestrator() {
  const location = useLocation();
  const { playBgm, stopBgm } = useAudio();

  useEffect(() => {
    const isGamePlay = /^\/(game|round-result|draw|survival|charades|buzzer|buzzer-play)\//.test(location.pathname);
    if (!isGamePlay) {
      playBgm();
    } else {
      stopBgm();
    }
  }, [location.pathname, playBgm, stopBgm]);

  return null;
}

export default function App() {
  useEffect(() => {
    if (localStorage.getItem('darkMode') === 'true') {
      document.documentElement.classList.add('dark');
    }
    const handleUnhandled = (event) => {
      logEvent(EVENTS.ERROR, { message: 'unhandled_promise', detail: event?.reason?.message?.slice(0, 200) || '' });
    };
    const handleGlobalError = (event) => {
      logEvent(EVENTS.ERROR, { message: 'global_error', detail: event?.message?.slice(0, 200) || '' });
    };
    window.addEventListener('unhandledrejection', handleUnhandled);
    window.addEventListener('error', handleGlobalError);
    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandled);
      window.removeEventListener('error', handleGlobalError);
    };
  }, []);

  return (
    <ErrorBoundary>
    <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', flex: 1, width: '100%', overflow: 'hidden' }}>
      <GlobalAudioOrchestrator />
      <InviteHandler />
      <SessionTracker />
      <Suspense fallback={<LazyFallback />}>
        <Routes>
          <Route path="/auth" element={<PublicGate><AuthScreen /></PublicGate>} />
          <Route path="/home" element={<AuthGate><HomeScreen /></AuthGate>} />
          <Route path="/online-setup" element={<AuthGate><OnlineSetupScreen /></AuthGate>} />
          <Route path="/browse-rooms" element={<AuthGate><BrowseRoomsScreen /></AuthGate>} />
          <Route path="/lobby/:roomCode" element={<AuthGate><LobbyScreen /></AuthGate>} />
          <Route path="/game/:roomCode" element={<AuthGate><OnlineGameScreen /></AuthGate>} />
          <Route path="/round-result/:roomCode" element={<AuthGate><RoundResultScreen /></AuthGate>} />
          <Route path="/game-over/:roomCode" element={<AuthGate><GameOverScreen /></AuthGate>} />
          <Route path="/draw/:roomCode" element={<AuthGate><DrawGameScreen /></AuthGate>} />
          <Route path="/draw-over/:roomCode" element={<AuthGate><DrawGameOverScreen /></AuthGate>} />
          <Route path="/survival/:roomCode" element={<AuthGate><SurvivalGameScreen /></AuthGate>} />
          <Route path="/survival-over/:roomCode" element={<AuthGate><SurvivalGameOverScreen /></AuthGate>} />
          <Route path="/charades/:roomCode" element={<AuthGate><CharadesGameScreen /></AuthGate>} />
          <Route path="/charades-over/:roomCode" element={<AuthGate><CharadesGameOverScreen /></AuthGate>} />
          <Route path="/buzzer/:roomCode" element={<AuthGate><BuzzerHostScreen /></AuthGate>} />
          <Route path="/buzzer-play/:roomCode" element={<AuthGate><BuzzerPlayerScreen /></AuthGate>} />
          <Route path="/buzzer-over/:roomCode" element={<AuthGate><BuzzerGameOverScreen /></AuthGate>} />
          <Route path="/leaderboard" element={<AuthGate><LeaderboardScreen /></AuthGate>} />
          <Route path="/settings" element={<AuthGate><SettingsScreen /></AuthGate>} />
          <Route path="/store" element={<AuthGate><StoreScreen /></AuthGate>} />
          <Route path="/daily-rewards" element={<AuthGate><DailyRewardsScreen /></AuthGate>} />
          <Route path="/profile" element={<AuthGate><ProfileStatsScreen /></AuthGate>} />
          <Route path="*" element={<Navigate to="/home" replace />} />
        </Routes>
      </Suspense>
    </div>
    </ErrorBoundary>
  );
}
