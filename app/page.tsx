"use client";

import { useEffect, useState } from "react";
import { auth, provider } from "../lib/firebase";
import {
  onAuthStateChanged,
  signInWithRedirect,
  getRedirectResult,
  User,
} from "firebase/auth";

export default function HomePage() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const saveNext = () => {
      const params = new URLSearchParams(window.location.search);
      const next = params.get("next");

      if (next) {
        localStorage.setItem("sylo_next", next);
      }
    };

    saveNext();

    getRedirectResult(auth).catch((err) => {
      console.error("Redirect error:", err);
    });

    const unsub = onAuthStateChanged(auth, (user: User | null) => {
      if (user) {
        const next = localStorage.getItem("sylo_next") || "/wallet";
        localStorage.removeItem("sylo_next");
        window.location.href = next;
        return;
      }

      setLoading(false);
    });

    return () => unsub();
  }, []);

  const login = async () => {
    const params = new URLSearchParams(window.location.search);
    const next = params.get("next") || "/wallet";
    localStorage.setItem("sylo_next", next);

    await signInWithRedirect(auth, provider);
  };

  if (loading) {
    return (
      <main style={styles.page}>
        <h1 style={styles.title}>SYLO Wallet</h1>
        <p style={styles.text}>Loading...</p>
      </main>
    );
  }

  return (
    <main style={styles.page}>
      <h1 style={styles.title}>SYLO Wallet</h1>

      <button type="button" style={styles.button} onClick={login}>
        Login with Google
      </button>
    </main>
  );
}

const styles: any = {
  page: {
    minHeight: "100vh",
    background: "#020617",
    color: "white",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    gap: 20,
    fontFamily: "Arial, sans-serif",
  },
  title: {
    fontSize: 42,
    fontWeight: 900,
  },
  text: {
    color: "#cbd5e1",
  },
  button: {
    padding: "16px 30px",
    borderRadius: 16,
    border: "none",
    background: "linear-gradient(135deg, #f97316, #facc15)",
    color: "#111827",
    fontSize: 18,
    fontWeight: 900,
  },
};