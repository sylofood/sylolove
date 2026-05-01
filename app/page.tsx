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
      if (u) {
        await loadOrders(u.uid);
      } else {
        setOrders([]);
      }
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
      name: user.displayName,
      email: user.email,
      total: 100,
      status: "pending",
      createdAt: new Date().toISOString(),
    });

    await loadOrders(user.uid);
    alert("✅ Order created");
  };

  const markDone = async (orderId: string) => {
    if (!user) return;

    await updateDoc(doc(db, "orders", orderId), {
      status: "done",
    });

    await loadOrders(user.uid);
  };

  const deleteOrder = async (orderId: string) => {
    if (!user) return;

    await deleteDoc(doc(db, "orders", orderId));

    await loadOrders(user.uid);
  };

  return (
    <div style={{ padding: 30 }}>
      <h1>SYLO App</h1>

      {!user ? (
        <button onClick={login}>🔥 Login with Google</button>
      ) : (
        <div>
          <h2>Welcome 👋</h2>
          <p>Name: {user.displayName}</p>
          <p>Email: {user.email}</p>

          {user.photoURL && (
            <img src={user.photoURL} width={70} alt="avatar" />
          )}

          <br />
          <br />

          <button onClick={createOrder}>➕ Create Order</button>
          <button onClick={logout} style={{ marginLeft: 10 }}>
            Logout
          </button>

          <h3>Your Orders</h3>

          {orders.length === 0 ? (
            <p>No orders yet.</p>
          ) : (
            orders.map((order) => (
              <div
                key={order.id}
                style={{
                  border: "1px solid #ccc",
                  padding: 12,
                  marginBottom: 10,
                  borderRadius: 8,
                  maxWidth: 400,
                }}
              >
                <p>Total: ${order.total}</p>
                <p>Status: {order.status}</p>
                <p>Email: {order.email}</p>

                <button onClick={() => markDone(order.id)}>Mark Done</button>
                <button
                  onClick={() => deleteOrder(order.id)}
                  style={{ marginLeft: 10 }}
                >
                  Delete
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}