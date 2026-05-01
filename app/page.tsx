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
  const [orders, setOrders] = useState<any[]>([]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) await loadOrders(u.uid);
      else setOrders([]);
    });

    return () => unsub();
  }, []);

  const login = async () => {
    await signInWithPopup(auth, provider);
  };

  const logout = async () => {
    await signOut(auth);
  };

  const loadOrders = async (uid: string) => {
    const q = query(collection(db, "orders"), where("userId", "==", uid));
    const snap = await getDocs(q);

    const data = snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    }));

    setOrders(data);
  };

  const createOrder = async () => {
    if (!user) return;

    await addDoc(collection(db, "orders"), {
      userId: user.uid,
      email: user.email,

      storeName: "SYLO Snacks",
      storeLogo: "/sylolove.png",
      storeAddress: "123 Main St, Rock Springs, WY",
      storeZip: "82901",
      storePhone: "(307) 555-1234",

      total: 100,
      status: "",
      createdAt: Date.now(),
    });

    await loadOrders(user.uid);
  };

  const sendOrder = async (id: string) => {
    await updateDoc(doc(db, "orders", id), {
      status: "sent",
    });

    if (user) await loadOrders(user.uid);
  };

  const receiveOrder = async (id: string) => {
    await updateDoc(doc(db, "orders", id), {
      status: "received",
    });

    if (user) await loadOrders(user.uid);
  };

  return (
    <main style={styles.page}>
      <section style={styles.card}>
        <div style={styles.logoBox}>
          <img src="/sylolove.png" alt="SYLO" style={styles.appLogo} />
          <div style={styles.badge}>Wallet App</div>
        </div>

        {!user ? (
          <>
            <h1 style={styles.title}>Welcome to SYLO</h1>
            <p style={styles.subtitle}>
              Secure login, live orders, and Firebase powered data.
            </p>

            <button style={styles.primaryButton} onClick={login}>
              🔥 Login with Google
            </button>
          </>
        ) : (
          <>
            <div style={styles.profile}>
              <img
                src={user.photoURL || ""}
                alt="profile"
                style={styles.avatar}
              />

              <div>
                <h2 style={styles.name}>{user.displayName}</h2>
                <p style={styles.email}>{user.email}</p>
              </div>
            </div>

            <div style={styles.actions}>
              <button style={styles.primaryButton} onClick={createOrder}>
                + Create Order
              </button>

              <button style={styles.logoutButton} onClick={logout}>
                Logout
              </button>
            </div>

            <h3 style={styles.sectionTitle}>Your Orders</h3>

            {orders.length === 0 ? (
              <div style={styles.empty}>No orders yet.</div>
            ) : (
              <div style={styles.orderList}>
                {orders.map((order) => (
                  <div key={order.id} style={styles.orderCard}>
                    <div style={styles.orderTop}>
                      <img
                        src={order.storeLogo || "/sylolove.png"}
                        alt="store"
                        style={styles.storeLogo}
                      />

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={styles.storeName}>
                          {order.storeName || "SYLO Snacks"}
                        </div>

                        <div style={styles.orderInfo}>
                          📍 {order.storeAddress || "123 Main St, Rock Springs, WY"}{" "}
                          {order.storeZip || "82901"}
                        </div>

                        <div style={styles.orderInfo}>
                          📞 {order.storePhone || "(307) 555-1234"}
                        </div>
                      </div>

                      <div style={styles.orderAmount}>${order.total}</div>
                    </div>

                    <div style={styles.orderButtons}>
                      <button
                        style={styles.smallButton}
                        onClick={() => sendOrder(order.id)}
                      >
                        Send
                      </button>

                      <button
                        style={styles.receiveButton}
                        onClick={() => receiveOrder(order.id)}
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
    marginBottom: 28,
  },
  appLogo: {
    width: 120,
    height: 120,
    borderRadius: "50%",
    display: "block",
    margin: "0 auto 10px",
    boxShadow: "0 0 30px rgba(0,150,255,0.7)",
  },
  badge: {
    marginTop: 6,
    color: "#d1d5db",
    fontSize: 14,
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
    padding: "14px 18px",
    borderRadius: 16,
    border: "1px solid rgba(255,255,255,0.2)",
    background: "rgba(255,255,255,0.08)",
    color: "white",
    fontWeight: 700,
    cursor: "pointer",
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
  },
  name: {
    margin: 0,
    fontSize: 22,
  },
  email: {
    margin: "5px 0 0",
    color: "#d1d5db",
    fontSize: 14,
  },
  actions: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 12,
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 20,
    marginBottom: 14,
  },
  empty: {
    padding: 20,
    textAlign: "center",
    color: "#d1d5db",
    border: "1px dashed rgba(255,255,255,0.2)",
    borderRadius: 16,
  },
  orderList: {
    display: "flex",
    flexDirection: "column",
    gap: 14,
  },
  orderCard: {
    padding: 16,
    borderRadius: 16,
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.12)",
    marginBottom: 12,
  },
  orderTop: {
    display: "flex",
    alignItems: "center",
    marginBottom: 10,
    gap: 12,
  },
  storeLogo: {
    width: 60,
    height: 60,
    borderRadius: 12,
    objectFit: "cover",
  },
  storeName: {
    fontSize: 15,
    fontWeight: 800,
    color: "white",
    marginBottom: 4,
  },
  orderInfo: {
    color: "#d1d5db",
    fontSize: 12,
    marginTop: 3,
    lineHeight: 1.35,
  },
  orderAmount: {
    fontSize: 20,
    fontWeight: 900,
    color: "#facc15",
    whiteSpace: "nowrap",
  },
  orderButtons: {
    display: "flex",
    gap: 10,
    marginTop: 14,
  },
  smallButton: {
    flex: 1,
    padding: 10,
    borderRadius: 12,
    border: "none",
    background: "#2563eb",
    color: "white",
    fontWeight: 700,
    cursor: "pointer",
  },
  receiveButton: {
    flex: 1,
    padding: 10,
    borderRadius: 12,
    border: "none",
    background: "#16a34a",
    color: "white",
    fontWeight: 700,
    cursor: "pointer",
  },
};