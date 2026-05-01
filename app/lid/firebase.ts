"use client";

import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAecyquuxOflbdGAillDVEKtOjr4FZLUIk",
  authDomain: "sylo-wallet.firebaseapp.com",
  projectId: "sylo-wallet",
  storageBucket: "sylo-wallet.firebasestorage.app",
  messagingSenderId: "705344480510",
  appId: "1:705344480510:web:d86fbb4973bbfed8d871af"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// 👇 QUAN TRỌNG
export { db };
export default app;