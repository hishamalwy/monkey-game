import { useState, useEffect } from 'react';
import { useAuth } from './context/AuthContext';

import SplashScreen from './screens/SplashScreen';
import AuthScreen from './screens/AuthScreen';
import HomeScreen from './screens/HomeScreen';
import LobbyScreen from './screens/LobbyScreen';
import OnlineGameScreen from './screens/OnlineGameScreen';
import RoundResultScreen from './screens/RoundResultScreen';
import GameOverScreen from './screens/GameOverScreen';
import LocalGameWrapper from './screens/LocalGameWrapper';
import LeaderboardScreen from './screens/LeaderboardScreen';
import SettingsScreen from './screens/SettingsScreen';

export default function App() {
  const { user, loading } = useAuth();
  const [screen, setScreen] = useState('splash');
  const [roomCode, setRoomCode] = useState(null);

  useEffect(() => {
    if (!loading) {
      setScreen(user ? 'home' : 'auth');
    }
  }, [loading, user]);

  const nav = {
    toHome: () => setScreen('home'),
    toLobby: (code) => { setRoomCode(code); setScreen('lobby'); },
    toGame: () => setScreen('onlineGame'),
    toRoundResult: () => setScreen('roundResult'),
    toGameOver: () => setScreen('gameOver'),
    toLocalGame: () => setScreen('localGame'),
    toLeaderboard: () => setScreen('leaderboard'),
    toSettings: () => setScreen('settings'),
    toAuth: () => setScreen('auth'),
  };

  if (screen === 'splash') return <SplashScreen />;
  if (screen === 'auth') return <AuthScreen />;
  if (screen === 'home') return <HomeScreen nav={nav} />;
  if (screen === 'lobby') return <LobbyScreen nav={nav} roomCode={roomCode} />;
  if (screen === 'onlineGame') return <OnlineGameScreen nav={nav} roomCode={roomCode} />;
  if (screen === 'roundResult') return <RoundResultScreen nav={nav} roomCode={roomCode} />;
  if (screen === 'gameOver') return <GameOverScreen nav={nav} roomCode={roomCode} />;
  if (screen === 'localGame') return <LocalGameWrapper nav={nav} />;
  if (screen === 'leaderboard') return <LeaderboardScreen nav={nav} />;
  if (screen === 'settings') return <SettingsScreen nav={nav} />;

  return <SplashScreen />;
}
