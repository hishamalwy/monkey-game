import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import { loginUser, registerUser, logoutUser, deleteAccount, changePassword } from '../firebase/auth';
import { listenToBlocklist } from '../firebase/blocklist';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [blocklist, setBlocklist] = useState([]);

  useEffect(() => {
  let unsubProfile = null;
    let unsubBlocklist = null;

    const unsubAuth = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);

      if (unsubProfile) { unsubProfile(); unsubProfile = null; }
      if (unsubBlocklist) { unsubBlocklist(); unsubBlocklist = null; }

      if (firebaseUser) {
        unsubProfile = onSnapshot(doc(db, 'users', firebaseUser.uid), (snap) => {
          if (snap.exists()) {
            const data = snap.data();
            const needsMigration = (
              data.wins_draw === undefined || data.coins === undefined ||
              data.xp === undefined || data.purchases === undefined ||
              data.monkeyPlayed === undefined || data.loginStreak === undefined
            );
            if (needsMigration) {
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
                 charadesPlayed: data.charadesPlayed ?? 0,
                 wins_survival: data.wins_survival ?? 0,
                 wins_charades: data.wins_charades ?? 0,
               });
            }
            setUserProfile(data);
          } else {
            setUserProfile(null);
          }
          setLoading(false);
        });

        unsubBlocklist = listenToBlocklist(firebaseUser.uid, setBlocklist);
      } else {
        setUserProfile(null);
        setLoading(false);
      }
    });

    return () => {
      unsubAuth();
      if (unsubProfile) unsubProfile();
      if (unsubBlocklist) unsubBlocklist();
    };
  }, []);

  const register = (username, password, avatarId) => registerUser(username, password, avatarId);
  const login = (username, password) => loginUser(username, password);
  const logout = () => logoutUser();
  const deleteMe = () => deleteAccount(user?.uid);
  const changePass = (current, next) => changePassword(current, next);

  return (
    <AuthContext.Provider value={{ user, userProfile, loading, register, login, logout, deleteMe, changePass, blocklist }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
