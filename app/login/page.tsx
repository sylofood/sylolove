"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth } from "../../lib/firebase";

import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
} from "firebase/auth";

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  const provider = new GoogleAuthProvider();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (u) {
        router.push("/wallet");
        return;
      }

      setLoading(false);
    });

    return () => unsub();
  }, [router]);

  const login = async () => {
    try {
      await signInWithPopup(auth, provider);
      router.push("/wallet");
    } catch (error) {
      console.error(error);
      alert("Login failed");
    }
  };

  if (loading) {
    return <main style={styles.page}>Checking login...</main>;
  }

  return (
    <main style={styles.page}>
      <section style={styles.card}>
        <div style={styles.logo}>SYLO</div>

        <h1 style={styles.title}>SYLO Login</h1>
        <p style={styles.subtitle}>Sign in to access your wallet</p>

        <button style={styles.loginButton} onClick={login}>
          Login with Google
        </button>
      </section>
    </main>
  );
}

const styles: any = {
  page: {
    background: "#020617",
    color: "white",
    minHeight: "100vh",
    padding: "18px",
    fontFamily: "Arial, sans-serif",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  card: {
    width: "100%",
    maxWidth: 420,
    background: "#111827",
    border: "1px solid #334155",
    borderRadius: 28,
    padding: 28,
    textAlign: "center",
  },

  logo: {
    width: 110,
    height: 110,
    borderRadius: "50%",
    border: "5px solid #facc15",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 900,
    fontSize: 28,
    background: "#0f172a",
    boxShadow: "0 0 24px #facc15",
    margin: "0 auto 22px",
  },

  title: {
    color: "#facc15",
    fontSize: 36,
    fontWeight: 900,
    margin: 0,
  },

  subtitle: {
    color: "#cbd5e1",
    fontSize: 18,
    fontWeight: 800,
    marginTop: 10,
    marginBottom: 28,
  },

  loginButton: {
    width: "100%",
    padding: "18px 16px",
    borderRadius: 18,
    background: "linear-gradient(90deg,#ff7a00,#ffd21f)",
    color: "#111827",
    border: "none",
    fontSize: 20,
    fontWeight: 900,
    cursor: "pointer",
  },
};