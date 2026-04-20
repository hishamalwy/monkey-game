import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  deleteUser,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
} from 'firebase/auth';
import { doc, setDoc, serverTimestamp, runTransaction, deleteDoc } from 'firebase/firestore';
import { auth, db } from './config';

const toEmail = (username) => {
  const hex = Array.from(username.trim())
    .map(c => c.charCodeAt(0).toString(16).padStart(4, '0'))
    .join('');
  return `u${hex}@qird.game`;
};

export async function registerUser(username, password, avatarId) {
  const trimmed = username.trim();
  if (!trimmed || trimmed.length < 2) throw new Error('اسم المستخدم قصير جداً');
  if (trimmed.length > 20) throw new Error('اسم المستخدم طويل جداً');
  if (!password || password.length < 6) throw new Error('كلمة السر لازم تكون 6 حروف على الأقل');

  let credential;
  try {
    credential = await createUserWithEmailAndPassword(auth, toEmail(trimmed), password);
  } catch (e) {
    if (e.code === 'auth/email-already-in-use') {
      throw new Error('اسم المستخدم محجوز، جرب اسم آخر');
    }
    throw e;
  }

  const { uid } = credential.user;

  try {
    await runTransaction(db, async (txn) => {
      const nameRef = doc(db, 'usernames', trimmed.toLowerCase());
      const nameSnap = await txn.get(nameRef);

      if (nameSnap.exists()) {
        throw new Error('اسم المستخدم محجوز، جرب اسم آخر');
      }

      txn.set(doc(db, 'users', uid), {
        uid,
        username: trimmed,
        avatarId,
        wins: 0,
        wins_draw: 0,
        coins: 500,
        gamesPlayed: 0,
        xp: 0,
        purchases: [],
        loginStreak: 0,
        lastLoginDate: null,
        monkeyPlayed: 0,
        drawPlayed: 0,
        survivalPlayed: 0,
        createdAt: serverTimestamp(),
      });

      txn.set(nameRef, { uid });
    });
  } catch (e) {
    try { await credential.user.delete(); } catch {}
    if (e.message === 'اسم المستخدم محجوز، جرب اسم آخر') throw e;
    throw new Error('حدث خطأ أثناء التسجيل، حاول مرة أخرى');
  }

  return credential;
}

export async function loginUser(username, password) {
  return signInWithEmailAndPassword(auth, toEmail(username), password);
}

export async function logoutUser() {
  return signOut(auth);
}

export async function deleteAccount(uid) {
  const user = auth.currentUser;
  if (!user || user.uid !== uid) throw new Error('مستخدم غير صحيح');

  const userDoc = await (await import('firebase/firestore')).getDoc(
    (await import('firebase/firestore')).doc(db, 'users', uid)
  );
  const userData = userDoc.data();

  const batch = [];
  if (userData?.username) {
    batch.push(
      deleteDoc(doc(db, 'usernames', userData.username.toLowerCase()))
    );
  }
  batch.push(deleteDoc(doc(db, 'users', uid)));
  await Promise.all(batch);

  await deleteUser(user);
}

export async function changePassword(currentPassword, newPassword) {
  const user = auth.currentUser;
  if (!user || !user.email) throw new Error('مستخدم غير صحيح');

  const credential = EmailAuthProvider.credential(user.email, currentPassword);
  await reauthenticateWithCredential(user, credential);
  await updatePassword(user, newPassword);
}
