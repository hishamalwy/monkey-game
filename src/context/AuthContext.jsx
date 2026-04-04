import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import { loginUser, registerUser, logoutUser } from '../firebase/auth';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubProfile = null;

    const unsubAuth = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);

      if (unsubProfile) { unsubProfile(); unsubProfile = null; }

      if (firebaseUser) {
        unsubProfile = onSnapshot(doc(db, 'users', firebaseUser.uid), (snap) => {
          if (snap.exists()) {
            const data = snap.data();
            // Migrate old profiles
            if (data.wins_draw === undefined || data.coins === undefined || data.xp === undefined || data.purchases === undefined) {
               updateDoc(doc(db, 'users', firebaseUser.uid), {
                 wins_draw: data.wins_draw ?? 0,
                 coins: data.coins ?? 500,
                 xp: data.xp ?? 0,
                 purchases: data.purchases ?? [],
                 loginStreak: data.loginStreak ?? 0,
                 lastLoginDate: data.lastLoginDate ?? null,
                 monkeyPlayed: data.monkeyPlayed ?? 0,
                 drawPlayed: data.drawPlayed ?? 0,
                 survivalPlayed: data.survivalPlayed ?? 0,
               });
            }
            setUserProfile(data);
          } else {
            setUserProfile(null);
          }
          setLoading(false);
        });
      } else {
        setUserProfile(null);
        setLoading(false);
      }
    });

    return () => {
      unsubAuth();
      if (unsubProfile) unsubProfile();
    };
  }, []);

  const register = (username, password, avatarId) => registerUser(username, password, avatarId);
  const login = (username, password) => loginUser(username, password);
  const logout = () => logoutUser();

  return (
    <AuthContext.Provider value={{ user, userProfile, loading, register, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
