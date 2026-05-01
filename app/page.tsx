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

  const createDemoToken = async () => {
    if (!user) return;

    await addDoc(collection(db, "orders"), {
      userId: user.uid,
      email: user.email,

      storeName: "SYLO Snacks",
      storeLogo: "/sylolove.png",
      storeAddress: "123 Main St, Rock Springs",
      storeStateZip: "WY 82901",
      storePhone: "(307) 555-1234",

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
          <img src="/sylolove.png" alt="SYLO" style={styles.appLogo} />
          <div style={styles.badge}>SYLO Wallet</div>
        </div>

        {!user ? (
          <>
            <h1 style={styles.title}>Welcome to SYLO</h1>
            <p style={styles.subtitle}>
              Hold, send, and receive gift tokens from your favorite local
              businesses.
            </p>

            <button style={styles.primaryButton} onClick={login}>
              Login with Google
            </button>
          </>
        ) : (
          <>
            <div style={styles.profile}>
              <img
                src={user.photoURL || "/sylolove.png"}
                alt="profile"
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

              <button style={styles.demoButton} onClick={createDemoToken}>
                Add Demo Token
              </button>
            </div>

            <h3 style={styles.sectionTitle}>My Gift Tokens</h3>

            {tokens.length === 0 ? (
              <div style={styles.empty}>
                No gift tokens yet.
                <br />
                Tap “Add Demo Token” to test.
              </div>
            ) : (
              <div style={styles.tokenList}>
                {tokens.map((token) => (
                  <div key={token.id} style={styles.tokenCard}>
                    <div style={styles.tokenTop}>
                      <img
                        src={token.storeLogo || "/sylolove.png"}
                        alt="token"
                        style={styles.storeLogo}
                      />

                      <div style={styles.tokenInfo}>
                        <div style={styles.storeName}>
                          {token.storeName || "Gift Token"}
                        </div>

                        <div style={styles.addressLine}>
                          📍 {token.storeAddress || "123 Main St, Rock Springs"}
                        </div>

                        <div style={styles.addressLine}>
                          {token.storeStateZip || token.storeZip || "WY 82901"}
                        </div>

                        <div style={styles.phoneLine}>
                          📞 {token.storePhone || "(307) 555-1234"}
                        </div>
                      </div>

                      <div style={styles.tokenAmount}>
                        ${Number(token.total || 0).toFixed(2)}
                      </div>
                    </div>

                    <div style={styles.tokenStatus}>
                      Status: {token.status || "active"}
                    </div>

                    <div style={styles.tokenButtons}>
                      <button
                        style={styles.sendButton}
                        onClick={() => sendToken(token.id)}
                      >
                        Send
                      </button>

                      <button
                        style={styles.receiveButton}
                        onClick={() => receiveToken(token.id)}
                      >
                        Receive
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </section>
    </main>
  );
}

const styles: any = {
  page: {
    minHeight: "100vh",
    background:
      "linear-gradient(135deg, #050505 0%, #111827 45%, #3b1d0f 100%)",
    color: "white",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    fontFamily: "Arial, sans-serif",
  },

  card: {
    width: "100%",
    maxWidth: 430,
    background: "rgba(255,255,255,0.08)",
    border: "1px solid rgba(255,255,255,0.15)",
    borderRadius: 28,
    padding: 26,
    boxShadow: "0 20px 60px rgba(0,0,0,0.45)",
    backdropFilter: "blur(18px)",
  },

  logoBox: {
    textAlign: "center",
    marginBottom: 26,
  },

  appLogo: {
    width: 118,
    height: 118,
    borderRadius: "50%",
    display: "block",
    margin: "0 auto 10px",
    boxShadow: "0 0 30px rgba(0,150,255,0.7)",
  },

  badge: {
    marginTop: 6,
    color: "#e5e7eb",
    fontSize: 17,
    fontWeight: 700,
  },

  title: {
    fontSize: 32,
    marginBottom: 10,
    textAlign: "center",
  },

  subtitle: {
    color: "#d1d5db",
    textAlign: "center",
    lineHeight: 1.5,
    marginBottom: 28,
  },

  profile: {
    display: "flex",
    alignItems: "center",
    gap: 14,
    marginBottom: 22,
  },

  avatar: {
    width: 64,
    height: 64,
    borderRadius: "50%",
    border: "3px solid #facc15",
    objectFit: "cover",
  },

  name: {
    margin: 0,
    fontSize: 22,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },

  email: {
    margin: "5px 0 0",
    color: "#d1d5db",
    fontSize: 14,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },

  balanceCard: {
    padding: 20,
    borderRadius: 20,
    background: "rgba(255,255,255,0.08)",
    border: "1px solid rgba(255,255,255,0.12)",
    marginBottom: 16,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },

  balanceLabel: {
    color: "#d1d5db",
    fontSize: 14,
    marginBottom: 6,
  },

  balanceAmount: {
    fontSize: 36,
    fontWeight: 900,
    color: "white",
  },

  balanceBadge: {
    padding: "10px 14px",
    borderRadius: 14,
    background: "rgba(250,204,21,0.12)",
    border: "1px solid rgba(250,204,21,0.25)",
    color: "#facc15",
    fontWeight: 900,
  },

  topActions: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 12,
    marginBottom: 24,
  },

  primaryButton: {
    width: "100%",
    padding: "15px 18px",
    borderRadius: 16,
    border: "none",
    background: "linear-gradient(135deg, #f97316, #facc15)",
    color: "#111827",
    fontWeight: 800,
    fontSize: 16,
    cursor: "pointer",
  },

  logoutButton: {
    width: "100%",
    padding: "13px 14px",
    borderRadius: 16,
    border: "1px solid rgba(255,255,255,0.2)",
    background: "rgba(255,255,255,0.08)",
    color: "white",
    fontWeight: 700,
    cursor: "pointer",
  },

  demoButton: {
    width: "100%",
    padding: "13px 14px",
    borderRadius: 16,
    border: "none",
    background: "linear-gradient(135deg, #f97316, #facc15)",
    color: "#111827",
    fontWeight: 800,
    cursor: "pointer",
  },

  sectionTitle: {
    fontSize: 22,
    marginBottom: 14,
    fontWeight: 900,
  },

  empty: {
    padding: 20,
    textAlign: "center",
    color: "#d1d5db",
    border: "1px dashed rgba(255,255,255,0.2)",
    borderRadius: 16,
    lineHeight: 1.5,
  },

  tokenList: {
    display: "flex",
    flexDirection: "column",
    gap: 14,
  },

  tokenCard: {
    padding: 16,
    borderRadius: 18,
    background: "rgba(255,255,255,0.07)",
    border: "1px solid rgba(255,255,255,0.13)",
  },

  tokenTop: {
    display: "flex",
    alignItems: "flex-start",
    gap: 12,
  },

  storeLogo: {
    width: 62,
    height: 62,
    borderRadius: 14,
    objectFit: "cover",
    flexShrink: 0,
  },

  tokenInfo: {
    flex: 1,
    minWidth: 0,
  },

  storeName: {
    fontSize: 16,
    fontWeight: 900,
    color: "white",
    marginBottom: 6,
  },

  addressLine: {
    color: "#d1d5db",
    fontSize: 13,
    lineHeight: 1.35,
    marginTop: 2,
  },

  phoneLine: {
    color: "#9ca3af",
    fontSize: 12,
    marginTop: 6,
  },

  tokenAmount: {
    fontSize: 20,
    fontWeight: 900,
    color: "#4ade80",
    whiteSpace: "nowrap",
    textAlign: "right",
  },

  tokenStatus: {
    marginTop: 12,
    color: "#9ca3af",
    fontSize: 12,
    textTransform: "capitalize",
  },

  tokenButtons: {
    display: "flex",
    gap: 10,
    marginTop: 14,
  },

  sendButton: {
    flex: 1,
    padding: 11,
    borderRadius: 13,
    border: "none",
    background: "#2563eb",
    color: "white",
    fontWeight: 800,
    cursor: "pointer",
  },

  receiveButton: {
    flex: 1,
    padding: 11,
    borderRadius: 13,
    border: "none",
    background: "#16a34a",
    color: "white",
    fontWeight: 800,
    cursor: "pointer",
  },
};