import { useState, useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import PatternBackground from './components/PatternBackground';

import SplashScreen from './screens/SplashScreen';
import OnlineSetupScreen from './screens/OnlineSetupScreen';
import AuthScreen from './screens/AuthScreen';
import HomeScreen from './screens/HomeScreen';
import LobbyScreen from './screens/LobbyScreen';
import OnlineGameScreen from './screens/OnlineGameScreen';
import RoundResultScreen from './screens/RoundResultScreen';
import GameOverScreen from './screens/GameOverScreen';

import LeaderboardScreen from './screens/LeaderboardScreen';
import SettingsScreen from './screens/SettingsScreen';
import DrawGameScreen from './screens/DrawGameScreen';
import DrawGameOverScreen from './screens/DrawGameOverScreen';
import SurvivalGameScreen from './screens/SurvivalGameScreen';
import SurvivalGameOverScreen from './screens/SurvivalGameOverScreen';

export default function App() {
  const { user, loading } = useAuth();
  const [screen, setScreen] = useState('splash');
  const [roomCode, setRoomCode] = useState(null);

  useEffect(() => {
    if (!loading) {
      setScreen(user ? 'home' : 'auth');
    }
    if (localStorage.getItem('darkMode') === 'true') {
      document.documentElement.classList.add('dark');
    }
  }, [loading, user]);

  const nav = {
    toHome: () => setScreen('home'),
    toLobby: (code) => { setRoomCode(code); setScreen('lobby'); },
    toGame: () => setScreen('onlineGame'),
    toRoundResult: () => setScreen('roundResult'),
    toGameOver: () => setScreen('gameOver'),
    toOnlineSetup: () => setScreen('onlineSetup'),

    toLeaderboard: () => setScreen('leaderboard'),
    toSettings: () => setScreen('settings'),
    toAuth: () => setScreen('auth'),
    toDrawGame: () => setScreen('drawGame'),
    toDrawGameOver: () => setScreen('drawGameOver'),
    toSurvivalGame: () => setScreen('survivalGame'),
    toSurvivalGameOver: () => setScreen('survivalGameOver'),
  };

  const content = (() => {
    if (screen === 'splash')      return <SplashScreen />;
    if (screen === 'auth')        return <AuthScreen />;
    if (screen === 'home')        return <HomeScreen nav={nav} />;
    if (screen === 'lobby')       return <LobbyScreen nav={nav} roomCode={roomCode} />;
    if (screen === 'onlineGame')  return <OnlineGameScreen nav={nav} roomCode={roomCode} />;
    if (screen === 'roundResult') return <RoundResultScreen nav={nav} roomCode={roomCode} />;
    if (screen === 'gameOver')    return <GameOverScreen nav={nav} roomCode={roomCode} />;
    if (screen === 'onlineSetup') return <OnlineSetupScreen nav={nav} />;

    if (screen === 'leaderboard')  return <LeaderboardScreen nav={nav} />;
    if (screen === 'settings')     return <SettingsScreen nav={nav} />;
    if (screen === 'drawGame')     return <DrawGameScreen nav={nav} roomCode={roomCode} />;
    if (screen === 'drawGameOver') return <DrawGameOverScreen nav={nav} roomCode={roomCode} />;
    if (screen === 'survivalGame') return <SurvivalGameScreen nav={nav} roomCode={roomCode} />;
    if (screen === 'survivalGameOver') return <SurvivalGameOverScreen nav={nav} roomCode={roomCode} />;
    return <SplashScreen />;
  })();

  return (
    <>
      {/* Pattern sits at z-index:0 (absolutely positioned inside #root) */}
      <PatternBackground />
      {/*
        Screens wrap in z-index:1 so they paint ABOVE the pattern.
        Screen root divs must use background:transparent to let the pattern show.
      */}
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', flex: 1, width: '100%', overflow: 'hidden' }}>
        {content}
      </div>
    </>
  );
}
