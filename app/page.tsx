"use client";

import { useEffect, useState } from "react";
import app, { db } from "./lid/firebase";

import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  User,
} from "firebase/auth";

import {
  addDoc,
  collection,
  doc,
  getDocs,
  query,
  updateDoc,
  where,
} from "firebase/firestore";

const auth = getAuth(app);
const provider = new GoogleAuthProvider();

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [tokens, setTokens] = useState<any[]>([]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) await loadTokens(u.uid);
      else setTokens([]);
    });

    return () => unsub();
  }, []);

  const login = async () => {
    await signInWithPopup(auth, provider);
  };

  const logout = async () => {
    await signOut(auth);
  };

  const loadTokens = async (uid: string) => {
    const q = query(collection(db, "orders"), where("userId", "==", uid));
    const snap = await getDocs(q);

    const data = snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    }));

    setTokens(data);
  };

  const addGiftToken = async () => {
    if (!user) return;

    await addDoc(collection(db, "orders"), {
      userId: user.uid,
      email: user.email,

      storeName: "SYLO Snacks",
      storeLogo: "/sylolove.png",

      storeAddress: "123 Main St",
      storeCity: "Rock Springs",
      storeState: "WY",
      storeZip: "82901",

      // 🔥 TEST PHONE
      storePhone: "2258888999",

      total: 100,
      status: "active",
      createdAt: Date.now(),
    });

    await loadTokens(user.uid);
  };

  const sendToken = async (id: string) => {
    await updateDoc(doc(db, "orders", id), {
      status: "sent",
    });
    if (user) await loadTokens(user.uid);
  };

  const receiveToken = async (id: string) => {
    await updateDoc(doc(db, "orders", id), {
      status: "received",
    });
    if (user) await loadTokens(user.uid);
  };

  const totalBalance = tokens.reduce(
    (sum, token) => sum + Number(token.total || 0),
    0
  );

  return (
    <main style={styles.page}>
      <section style={styles.card}>
        <div style={styles.logoBox}>
          <img src="/sylolove.png" style={styles.appLogo} />
          <div style={styles.badge}>SYLO Wallet</div>
        </div>

        {!user ? (
          <>
            <h1 style={styles.title}>Welcome</h1>
            <button style={styles.primaryButton} onClick={login}>
              Login with Google
            </button>
          </>
        ) : (
          <>
            <div style={styles.profile}>
              <img
                src={user.photoURL || "/sylolove.png"}
                style={styles.avatar}
              />

              <div style={{ minWidth: 0 }}>
                <h2 style={styles.name}>{user.displayName}</h2>
                <p style={styles.email}>{user.email}</p>
              </div>
            </div>

            <div style={styles.balanceCard}>
              <div>
                <div style={styles.balanceLabel}>Wallet Balance</div>
                <div style={styles.balanceAmount}>
                  ${totalBalance.toFixed(2)}
                </div>
              </div>

              <div style={styles.balanceBadge}>SYLO</div>
            </div>

            <div style={styles.topActions}>
              <button style={styles.logoutButton} onClick={logout}>
                Logout
              </button>

              <button style={styles.addButton} onClick={addGiftToken}>
                Add Gift Token
              </button>
            </div>

            <h3 style={styles.sectionTitle}>My Gift Tokens</h3>

            {tokens.map((token) => {
              const address = `${token.storeAddress} ${token.storeCity} ${token.storeState} ${token.storeZip}`;

              const mapUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
                address
              )}`;

              return (
                <div key={token.id} style={styles.tokenCard}>
                  <div style={styles.tokenTop}>
                    <img
                      src={token.storeLogo}
                      style={styles.storeLogo}
                    />

                    <div style={styles.tokenInfo}>
                      <div style={styles.storeName}>
                        {token.storeName}
                      </div>

                      <div style={styles.address}>
                        <div>📍 {token.storeAddress}</div>
                        <div>
                          {token.storeCity}, {token.storeState}{" "}
                          {token.storeZip}
                        </div>
                      </div>

                      {/* 🔥 CALL PHONE */}
                      <a
                        href={`tel:${token.storePhone}`}
                        style={styles.phoneLink}
                      >
                        📞 {token.storePhone}
                      </a>

                      {/* 🔥 MAP */}
                      <a href={mapUrl} target="_blank" style={styles.mapBtn}>
                        Open Map
                      </a>
                    </div>

                    <div style={styles.amount}>
                      ${Number(token.total).toFixed(2)}
                    </div>
                  </div>

                  <div style={styles.buttons}>
                    <button
                      style={styles.sendBtn}
                      onClick={() => sendToken(token.id)}
                    >
                      Send
                    </button>

                    <button
                      style={styles.receiveBtn}
                      onClick={() => receiveToken(token.id)}
                    >
                      Receive
                    </button>
                  </div>
                </div>
              );
            })}
          </>
        )}
      </section>
    </main>
  );
}

const styles: any = {
  page: {
    minHeight: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    background: "linear-gradient(135deg,#050505,#111827,#3b1d0f)",
    padding: 14,
  },

  card: {
    width: "100%",
    maxWidth: 420,
    background: "rgba(255,255,255,0.08)",
    borderRadius: 28,
    padding: 20,
  },

  logoBox: { textAlign: "center", marginBottom: 20 },

  appLogo: {
    width: 100,
    height: 100,
    borderRadius: "50%",
  },

  badge: { marginTop: 6, fontWeight: 700 },

  title: { textAlign: "center" },

  primaryButton: {
    width: "100%",
    padding: 14,
    borderRadius: 14,
    background: "#facc15",
    border: "none",
    fontWeight: 800,
  },

  profile: {
    display: "flex",
    gap: 12,
    marginBottom: 20,
  },

  avatar: {
    width: 60,
    height: 60,
    borderRadius: "50%",
  },

  name: { margin: 0 },

  email: { color: "#ccc", fontSize: 13 },

  balanceCard: {
    padding: 18,
    borderRadius: 18,
    background: "#2a2a2a",
    marginBottom: 14,
    display: "flex",
    justifyContent: "space-between",
  },

  balanceLabel: { color: "#aaa" },

  balanceAmount: {
    fontSize: 32,
    fontWeight: 900,
  },

  balanceBadge: {
    background: "#333",
    padding: 10,
    borderRadius: 10,
  },

  topActions: {
    display: "flex",
    gap: 10,
    marginBottom: 20,
  },

  logoutButton: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
  },

  addButton: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    background: "#facc15",
    border: "none",
  },

  sectionTitle: {
    fontSize: 20,
    marginBottom: 10,
  },

  tokenCard: {
    background: "#2a2a2a",
    padding: 14,
    borderRadius: 16,
    marginBottom: 12,
  },

  tokenTop: {
    display: "grid",
    gridTemplateColumns: "60px 1fr auto",
    gap: 10,
  },

  storeLogo: {
    width: 60,
    height: 60,
    borderRadius: 12,
  },

  storeName: {
    fontWeight: 800,
    marginBottom: 4,
  },

  address: {
    fontSize: 12,
    color: "#ccc",
  },

  phoneLink: {
    display: "block",
    marginTop: 6,
    color: "#60a5fa",
    fontSize: 13,
    textDecoration: "none",
    fontWeight: 600,
  },

  mapBtn: {
    display: "block",
    marginTop: 6,
    fontSize: 12,
    color: "#4ade80",
  },

  amount: {
    fontWeight: 900,
    color: "#4ade80",
  },

  buttons: {
    display: "flex",
    gap: 8,
    marginTop: 10,
  },

  sendBtn: {
    flex: 1,
    padding: 10,
    background: "#2563eb",
    color: "white",
    borderRadius: 10,
  },

  receiveBtn: {
    flex: 1,
    padding: 10,
    background: "#16a34a",
    color: "white",
    borderRadius: 10,
  },
};