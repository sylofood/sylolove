"use client";

import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

// 🔥 CONFIG FIREBASE
const firebaseConfig = {
  apiKey: "AIzaSyAecyquuxOflbdGAillDVEKtOjr4FZLUIk",
  authDomain: "sylo-wallet.firebaseapp.com",
  projectId: "sylo-wallet",
  storageBucket: "sylo-wallet.firebasestorage.app",
  messagingSenderId: "705344480510",
  appId: "1:705344480510:web:d86fbb4973bbfed8d871af",
};

// ✅ KHÔNG INIT 2 LẦN
const app = !getApps().length
  ? initializeApp(firebaseConfig)
  : getApp();

// 🔥 SERVICES
const db = getFirestore(app);
const storage = getStorage(app, "gs://sylo-wallet.firebasestorage.app");
const auth = getAuth(app);

// 🔥 GOOGLE LOGIN (FIX CHỌN EMAIL)
const provider = new GoogleAuthProvider();

// ⚡ QUAN TRỌNG: luôn hỏi chọn account
provider.setCustomParameters({
  prompt: "select_account",
});

// 🔥 EXPORT
export { db, storage, auth, provider };
export default app;