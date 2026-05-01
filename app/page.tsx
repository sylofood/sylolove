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
  deleteDoc,
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
      total: 100,
      status: "pending",
      createdAt: Date.now(),
    });

    await loadOrders(user.uid);
  };

  const markDone = async (id: string) => {
    await updateDoc(doc(db, "orders", id), {
      status: "done",
    });

    if (user) await loadOrders(user.uid);
  };

  const removeOrder = async (id: string) => {
    await deleteDoc(doc(db, "orders", id));
    if (user) await loadOrders(user.uid);
  };

  return (
    <main style={styles.page}>
      <section style={styles.card}>
        <div style={styles.logoBox}>
          <div style={styles.logo}>SYLO</div>
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
                    <div>
                      <p style={styles.orderTotal}>${order.total}</p>
                      <p style={styles.orderEmail}>{order.email}</p>
                    </div>

                    <span
                      style={{
                        ...styles.status,
                        background:
                          order.status === "done" ? "#16a34a" : "#f59e0b",
                      }}
                    >
                      {order.status}
                    </span>

                    <div style={styles.orderButtons}>
                      <button
                        style={styles.smallButton}
                        onClick={() => markDone(order.id)}
                      >
                        Done
                      </button>

                      <button
                        style={styles.deleteButton}
                        onClick={() => removeOrder(order.id)}
                      >
                        Delete
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
  logo: {
    fontSize: 34,
    fontWeight: 900,
    letterSpacing: 4,
    color: "#facc15",
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
    background: "rgba(255,255,255,0.1)",
    border: "1px solid rgba(255,255,255,0.15)",
    borderRadius: 18,
    padding: 16,
  },
  orderTotal: {
    fontSize: 26,
    fontWeight: 900,
    margin: 0,
    color: "#facc15",
  },
  orderEmail: {
    color: "#d1d5db",
    fontSize: 13,
    marginTop: 4,
  },
  status: {
    display: "inline-block",
    padding: "6px 12px",
    borderRadius: 999,
    marginTop: 10,
    fontSize: 12,
    fontWeight: 800,
    color: "white",
    textTransform: "uppercase",
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
  deleteButton: {
    flex: 1,
    padding: 10,
    borderRadius: 12,
    border: "none",
    background: "#dc2626",
    color: "white",
    fontWeight: 700,
    cursor: "pointer",
  },
};