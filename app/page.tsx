"use client";

import { useEffect, useState } from "react";
import app, { db } from "./lid/firebase";

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

  // ✅ FIX LOGIN iPHONE (redirect)
  useEffect(() => {
    getRedirectResult(auth).catch((error) => {
      console.error(error);
      alert(error.message);
    });

    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) await loadTokens(u.uid);
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

              <div>
                <h2>{user.displayName}</h2>
                <p>{user.email}</p>
              </div>
            </div>

            <div style={styles.balanceCard}>
              <div>
                <div>Wallet Balance</div>
                <div style={styles.balanceAmount}>
                  ${totalBalance.toFixed(2)}
                </div>
              </div>
            </div>

            <button style={styles.addButton} onClick={addGiftToken}>
              Add Gift Token
            </button>

            <button style={styles.logoutButton} onClick={logout}>
              Logout
            </button>

            {tokens.map((t) => (
              <div key={t.id} style={styles.token}>
                <div>{t.storeName}</div>
                <div>${t.total}</div>
                <div>Status: {t.status}</div>

                <button onClick={() => sendToken(t.id)}>Send</button>
                <button onClick={() => receiveToken(t.id)}>
                  Receive
                </button>
              </div>
            ))}
          </>
        )}
      </section>
    </main>
  );
}

const styles: any = {
  page: {
    minHeight: "100vh",
    background: "#000",
    color: "white",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  },

  card: {
    width: 350,
    padding: 20,
    background: "#111",
    borderRadius: 20,
  },

  primaryButton: {
    padding: 15,
    width: "100%",
    background: "orange",
    border: "none",
    borderRadius: 10,
    fontWeight: "bold",
  },

  addButton: {
    marginTop: 10,
    padding: 12,
    width: "100%",
    background: "orange",
  },

  logoutButton: {
    marginTop: 10,
  },

  token: {
    marginTop: 10,
    background: "#222",
    padding: 10,
  },

  balanceCard: {
    marginTop: 10,
  },

  balanceAmount: {
    fontSize: 28,
    fontWeight: "bold",
  },

  profile: {
    display: "flex",
    gap: 10,
    alignItems: "center",
  },

  avatar: {
    width: 50,
    height: 50,
    borderRadius: "50%",
  },

  logoBox: {
    textAlign: "center",
  },

  appLogo: {
    width: 100,
    borderRadius: "50%",
  },

  badge: {
    marginTop: 5,
  },

  title: {
    textAlign: "center",
  },
};