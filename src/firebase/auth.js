import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './config';

// Firebase Auth requires a valid email — encode username as hex to handle Arabic/any chars
const toEmail = (username) => {
  const hex = Array.from(username.trim())
    .map(c => c.charCodeAt(0).toString(16).padStart(4, '0'))
    .join('');
  return `u${hex}@qird.game`;
};

export async function registerUser(username, password, avatarId) {
  // Create the auth account first (this is what requires Auth to be enabled)
  let credential;
  try {
    credential = await createUserWithEmailAndPassword(auth, toEmail(username), password);
  } catch (e) {
    if (e.code === 'auth/email-already-in-use') {
      throw new Error('اسم المستخدم محجوز، جرب اسم آخر');
    }
    throw e;
  }

  const { uid } = credential.user;

  // Save profile to Firestore (now the user IS authenticated)
  await setDoc(doc(db, 'users', uid), {
    uid,
    username,
    avatarId,
    wins: 0,
    wins_draw: 0,
    coins: 500,
    gamesPlayed: 0,
    createdAt: serverTimestamp(),
  });

  // Reserve the username
  await setDoc(doc(db, 'usernames', username.toLowerCase()), { uid });

  return credential;
}

export async function loginUser(username, password) {
  return signInWithEmailAndPassword(auth, toEmail(username), password);
}

export async function logoutUser() {
  return signOut(auth);
}
