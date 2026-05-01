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

const TEST_PHONE = "2258888999";

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
      storePhone: TEST_PHONE,
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
              Hold, send, and receive gift tokens from local businesses.
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

              <div style={styles.profileInfo}>
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

            {tokens.length === 0 ? (
              <div style={styles.empty}>No gift tokens yet.</div>
            ) : (
              <div style={styles.tokenList}>
                {tokens.map((token) => {
                  const address = `${token.storeAddress || "123 Main St"} ${
                    token.storeCity || "Rock Springs"
                  } ${token.storeState || "WY"} ${
                    token.storeZip || "82901"
                  }`;

                  const mapUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
                    address
                  )}`;

                  return (
                    <div key={token.id} style={styles.tokenCard}>
                      <div style={styles.tokenTop}>
                        <img
                          src={token.storeLogo || "/sylolove.png"}
                          alt="token"
                          style={styles.storeLogo}
                        />

                        <div style={styles.tokenInfo}>
                          <div style={styles.storeName}>
                            {token.storeName || "SYLO Snacks"}
                          </div>

                          <div style={styles.addressBox}>
                            <div>📍 {token.storeAddress || "123 Main St"}</div>
                            <div>
                              {token.storeCity || "Rock Springs"},{" "}
                              {token.storeState || "WY"}{" "}
                              {token.storeZip || "82901"}
                            </div>
                          </div>

                          <a href={`tel:${TEST_PHONE}`} style={styles.phoneLink}>
                            📞 {TEST_PHONE}
                          </a>

                          <a
                            href={mapUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={styles.mapButton}
                          >
                            Open Map
                          </a>
                        </div>

                        <div style={styles.tokenAmount}>
                          ${Number(token.total || 0).toFixed(2)}
                        </div>
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
                  );
                })}
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
    padding: 14,
    fontFamily: "Arial, sans-serif",
  },

  card: {
    width: "100%",
    maxWidth: 430,
    background: "rgba(255,255,255,0.1)",
    border: "1px solid rgba(255,255,255,0.18)",
    borderRadius: 28,
    padding: 22,
    boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
    backdropFilter: "blur(18px)",
  },

  logoBox: {
    textAlign: "center",
    marginBottom: 20,
  },

  appLogo: {
    width: 105,
    height: 105,
    borderRadius: "50%",
    display: "block",
    margin: "0 auto 8px",
    boxShadow: "0 0 30px rgba(0,150,255,0.7)",
  },

  badge: {
    color: "white",
    fontSize: 18,
    fontWeight: 900,
  },

  title: {
    fontSize: 30,
    marginBottom: 10,
    textAlign: "center",
  },

  subtitle: {
    color: "#e5e7eb",
    textAlign: "center",
    lineHeight: 1.5,
    marginBottom: 24,
  },

  profile: {
    display: "flex",
    alignItems: "center",
    gap: 13,
    marginBottom: 22,
  },

  profileInfo: {
    minWidth: 0,
    flex: 1,
  },

  avatar: {
    width: 62,
    height: 62,
    borderRadius: "50%",
    border: "3px solid #facc15",
    objectFit: "cover",
    flexShrink: 0,
  },

  name: {
    margin: 0,
    fontSize: 24,
    color: "white",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },

  email: {
    margin: "5px 0 0",
    color: "#f3f4f6",
    fontSize: 15,
    fontWeight: 700,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },

  balanceCard: {
    padding: 20,
    borderRadius: 20,
    background: "rgba(0,0,0,0.35)",
    border: "1px solid rgba(255,255,255,0.16)",
    marginBottom: 16,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },

  balanceLabel: {
    color: "#f3f4f6",
    fontSize: 15,
    marginBottom: 8,
    fontWeight: 700,
  },

  balanceAmount: {
    fontSize: 40,
    fontWeight: 900,
    color: "white",
    letterSpacing: -1,
  },

  balanceBadge: {
    padding: "12px 18px",
    borderRadius: 16,
    background: "rgba(250,204,21,0.18)",
    border: "1px solid rgba(250,204,21,0.45)",
    color: "#facc15",
    fontWeight: 900,
    fontSize: 18,
  },

  topActions: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 12,
    marginBottom: 26,
  },

  primaryButton: {
    width: "100%",
    padding: "15px 18px",
    borderRadius: 16,
    border: "none",
    background: "linear-gradient(135deg, #f97316, #facc15)",
    color: "#111827",
    fontWeight: 900,
    fontSize: 16,
    cursor: "pointer",
  },

  logoutButton: {
    width: "100%",
    padding: "15px 12px",
    borderRadius: 16,
    border: "1px solid rgba(255,255,255,0.25)",
    background: "rgba(0,0,0,0.25)",
    color: "white",
    fontWeight: 900,
    fontSize: 15,
    cursor: "pointer",
  },

  addButton: {
    width: "100%",
    padding: "15px 12px",
    borderRadius: 16,
    border: "none",
    background: "linear-gradient(135deg, #f97316, #facc15)",
    color: "#111827",
    fontWeight: 900,
    fontSize: 15,
    cursor: "pointer",
  },

  sectionTitle: {
    fontSize: 26,
    marginBottom: 16,
    fontWeight: 900,
    color: "white",
  },

  empty: {
    padding: 20,
    textAlign: "center",
    color: "#e5e7eb",
    border: "1px dashed rgba(255,255,255,0.25)",
    borderRadius: 16,
  },

  tokenList: {
    display: "flex",
    flexDirection: "column",
    gap: 14,
  },

  tokenCard: {
    padding: 16,
    borderRadius: 22,
    background: "rgba(0,0,0,0.35)",
    border: "1px solid rgba(255,255,255,0.16)",
  },

  tokenTop: {
    display: "grid",
    gridTemplateColumns: "62px minmax(0, 1fr) auto",
    gap: 12,
    alignItems: "start",
  },

  storeLogo: {
    width: 62,
    height: 62,
    borderRadius: 15,
    objectFit: "cover",
  },

  tokenInfo: {
    minWidth: 0,
  },

  storeName: {
    fontSize: 17,
    fontWeight: 900,
    color: "white",
    marginBottom: 8,
    lineHeight: 1.15,
  },

  addressBox: {
    color: "#f3f4f6",
    fontSize: 13,
    fontWeight: 700,
    lineHeight: 1.35,
    marginTop: 4,
  },

  phoneLink: {
    display: "block",
    marginTop: 7,
    color: "#93c5fd",
    fontSize: 13,
    fontWeight: 800,
    textDecoration: "none",
  },

  mapButton: {
    display: "inline-block",
    marginTop: 8,
    padding: "6px 10px",
    borderRadius: 10,
    background: "rgba(34,197,94,0.18)",
    border: "1px solid rgba(34,197,94,0.4)",
    color: "#86efac",
    fontSize: 12,
    fontWeight: 900,
    textDecoration: "none",
  },

  tokenAmount: {
    fontSize: 18,
    fontWeight: 900,
    color: "#4ade80",
    whiteSpace: "nowrap",
    textAlign: "right",
    lineHeight: 1,
  },

  tokenButtons: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 12,
    marginTop: 16,
  },

  sendButton: {
    padding: 13,
    borderRadius: 15,
    border: "none",
    background: "#2563eb",
    color: "white",
    fontWeight: 900,
    fontSize: 16,
    cursor: "pointer",
  },

  receiveButton: {
    padding: 13,
    borderRadius: 15,
    border: "none",
    background: "#16a34a",
    color: "white",
    fontWeight: 900,
    fontSize: 16,
    cursor: "pointer",
  },
};