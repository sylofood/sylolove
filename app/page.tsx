"use client";

import { useEffect, useState } from "react";
import app, { db } from "./lib/firebase";

import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  User,
} from "firebase/auth";

import {
  collection,
  getDocs,
} from "firebase/firestore";

const auth = getAuth(app);
const provider = new GoogleAuthProvider();

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [tokens, setTokens] = useState<any[]>([]);

  useEffect(() => {
    getRedirectResult(auth).catch(console.error);

    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) loadTokens();
      else setTokens([]);
    });

    return () => unsub();
  }, []);

  const login = async () => {
    await signInWithRedirect(auth, provider);
  };

  const logout = async () => {
    await signOut(auth);
  };

  const loadTokens = async () => {
    const snap = await getDocs(collection(db, "orders"));
    const data = snap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    setTokens(data);
  };

  if (!user) {
    return (
      <main style={styles.page}>
        <div style={styles.container}>
          <div style={styles.loginCard}>
            <img src="/sylolove.png" style={styles.logo} />

            <h2>SYLO Wallet</h2>
            <p>Welcome to SYLO</p>

            <button style={styles.primaryButton} onClick={login}>
              Login with Google
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main style={styles.page}>
      <div style={styles.container}>
        <div style={styles.topBar}>
          <button style={styles.logout} onClick={logout}>
            Logout
          </button>

          <button style={styles.addButton}>
            Add Gift Token
          </button>
        </div>

        <h2 style={{ marginTop: 10 }}>My Gift Tokens</h2>

        {tokens.map((t) => (
          <div key={t.id} style={styles.card}>
            <div style={styles.row}>
              <img src="/sylolove.png" style={styles.cardLogo} />

              <div style={{ flex: 1 }}>
                <div style={styles.storeName}>
                  {t.storeName || "SYLO Snacks"}
                </div>

                <div style={styles.address}>
                  📍 {t.address || "123 Main St"}
                </div>

                <div style={styles.address}>
                  Rock Springs, WY
                </div>

                <div style={styles.phone}>
                  📞 2258888999
                </div>

                <button style={styles.mapButton}>
                  Open Map
                </button>
              </div>

              <div style={styles.amount}>
                ${t.total || 100}
              </div>
            </div>

            <div style={styles.buttons}>
              <button style={styles.send}>Send</button>
              <button style={styles.receive}>Receive</button>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}

const styles: any = {
  page: {
    minHeight: "100vh",
    background: "#000",
    color: "white",
    padding: 16,
  },

  container: {
    maxWidth: 500,
    margin: "0 auto",
  },

  loginCard: {
    background: "#111",
    padding: 20,
    borderRadius: 20,
    textAlign: "center",
  },

  logo: {
    width: 120,
    marginBottom: 10,
  },

  primaryButton: {
    padding: 15,
    width: "100%",
    background: "orange",
    border: "none",
    borderRadius: 10,
    fontWeight: "bold",
    marginTop: 10,
  },

  topBar: {
    display: "flex",
    justifyContent: "space-between",
  },

  logout: {
    padding: 10,
    borderRadius: 10,
    border: "1px solid #555",
    background: "transparent",
    color: "white",
  },

  addButton: {
    padding: 10,
    borderRadius: 10,
    background: "orange",
    border: "none",
  },

  card: {
    marginTop: 15,
    padding: 16,
    background: "#111",
    borderRadius: 20,
  },

  row: {
    display: "flex",
    gap: 10,
  },

  cardLogo: {
    width: 60,
    height: 60,
  },

  storeName: {
    fontWeight: "bold",
    fontSize: 16,
  },

  address: {
    fontSize: 13,
    color: "#ccc",
  },

  phone: {
    fontSize: 13,
    color: "#4ade80",
  },

  mapButton: {
    marginTop: 5,
    padding: 6,
    background: "#14532d",
    border: "none",
    borderRadius: 10,
    color: "white",
  },

  amount: {
    color: "#4ade80",
    fontWeight: "bold",
    fontSize: 18,
  },

  buttons: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 10,
    marginTop: 10,
  },

  send: {
    padding: 12,
    background: "#2563eb",
    border: "none",
    borderRadius: 10,
    color: "white",
    fontWeight: "bold",
  },

  receive: {
    padding: 12,
    background: "#16a34a",
    border: "none",
    borderRadius: 10,
    color: "white",
    fontWeight: "bold",
  },
};