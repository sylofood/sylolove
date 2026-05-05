"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth } from "../../lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";

export default function AddPage() {
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (!u) {
        setUser(null);
        setLoading(false);
        router.push("/login");
        return;
      }

      setUser(u);
      setLoading(false);
    });

    return () => unsub();
  }, [router]);

  if (loading) {
    return <main style={styles.page}>Loading...</main>;
  }

  return (
    <main style={styles.page}>
      <section style={styles.header}>
        <h1 style={styles.title}>Add Token</h1>
        <p style={styles.subtitle}>Scan merchant QR or add token manually</p>
      </section>

      <section style={styles.card}>
        <p style={styles.label}>Logged in as</p>
        <p style={styles.email}>{user?.email}</p>
      </section>

      <section style={styles.card}>
        <h2 style={styles.sectionTitle}>QR Scanner</h2>
        <p style={styles.text}>QR scanner will be added in the next step.</p>

        <button
          style={styles.primaryButton}
          onClick={() => alert("QR Scanner coming next")}
        >
          Open Scanner
        </button>
      </section>

      <section style={styles.actionRow}>
        <button style={styles.backButton} onClick={() => router.push("/wallet")}>
          Back to Wallet
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
  },

  header: {
    marginTop: 20,
    marginBottom: 24,
  },

  title: {
    color: "#facc15",
    fontSize: 38,
    fontWeight: 900,
    margin: 0,
  },

  subtitle: {
    color: "#cbd5e1",
    fontSize: 18,
    fontWeight: 800,
    marginTop: 8,
  },

  card: {
    background: "#111827",
    border: "1px solid #334155",
    borderRadius: 24,
    padding: 18,
    marginBottom: 18,
  },

  label: {
    color: "#94a3b8",
    fontSize: 14,
    fontWeight: 900,
    textTransform: "uppercase",
    letterSpacing: 1,
    margin: 0,
  },

  email: {
    fontSize: 18,
    fontWeight: 900,
    marginTop: 8,
    wordBreak: "break-word",
  },

  sectionTitle: {
    fontSize: 28,
    fontWeight: 900,
    marginTop: 0,
    marginBottom: 12,
  },

  text: {
    color: "#cbd5e1",
    fontSize: 17,
    fontWeight: 800,
    lineHeight: 1.4,
  },

  primaryButton: {
    width: "100%",
    padding: "17px 12px",
    borderRadius: 18,
    background: "linear-gradient(90deg,#ff7a00,#ffd21f)",
    color: "#111827",
    border: "none",
    fontSize: 20,
    fontWeight: 900,
    marginTop: 12,
  },

  actionRow: {
    marginTop: 10,
  },

  backButton: {
    width: "100%",
    padding: "17px 12px",
    borderRadius: 18,
    background: "#111827",
    color: "white",
    border: "1px solid #334155",
    fontSize: 20,
    fontWeight: 900,
  },
};