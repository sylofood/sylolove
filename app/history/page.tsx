"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "../../lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  where,
} from "firebase/firestore";

type Tx = {
  id: string;
  type?: string;
  amount?: number;
  token?: string;
  status?: string;
  senderUid?: string;
  receiverUid?: string;
  adminUid?: string;
  merchantOwnerUid?: string;
  merchantId?: string;
  createdAt?: any;
};

export default function HistoryPage() {
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState("user");
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<Tx[]>([]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) {
        router.push("/login");
        return;
      }

      setUser(u);
      await loadHistory(u);
      setLoading(false);
    });

    return () => unsub();
  }, [router]);

  const loadHistory = async (u: User) => {
    const userSnap = await getDoc(doc(db, "users", u.uid));
    const userData = userSnap.exists() ? userSnap.data() : {};
    const userRole = userData.role || "user";
    setRole(userRole);

    let results: Tx[] = [];

    if (userRole === "admin") {
      const q = query(
        collection(db, "transactions"),
        orderBy("createdAt", "desc"),
        limit(100)
      );

      const snap = await getDocs(q);
      results = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Tx));
    } else {
      const queries = [
        query(
          collection(db, "transactions"),
          where("senderUid", "==", u.uid),
          limit(50)
        ),
        query(
          collection(db, "transactions"),
          where("receiverUid", "==", u.uid),
          limit(50)
        ),
        query(
          collection(db, "transactions"),
          where("merchantOwnerUid", "==", u.uid),
          limit(50)
        ),
        query(
          collection(db, "transactions"),
          where("adminUid", "==", u.uid),
          limit(50)
        ),
      ];

      const map = new Map<string, Tx>();

      for (const q of queries) {
        const snap = await getDocs(q);
        snap.docs.forEach((d) => {
          map.set(d.id, { id: d.id, ...d.data() } as Tx);
        });
      }

      results = Array.from(map.values()).sort((a, b) => {
        const ta = a.createdAt?.toMillis?.() || 0;
        const tb = b.createdAt?.toMillis?.() || 0;
        return tb - ta;
      });
    }

    setTransactions(results);
  };

  const formatDate = (createdAt: any) => {
    if (!createdAt?.toDate) return "No date";
    return createdAt.toDate().toLocaleString();
  };

  if (loading) {
    return <main style={styles.page}>Loading history...</main>;
  }

  return (
    <main style={styles.page}>
      <h1 style={styles.title}>Transaction History</h1>
      <p style={styles.subtitle}>
        Logged in as {user?.email} · Role: {role}
      </p>

      <button style={styles.backButton} onClick={() => router.push("/wallet")}>
        Back to Wallet
      </button>

      {transactions.length === 0 && (
        <section style={styles.emptyCard}>
          No transactions found.
        </section>
      )}

      <section style={styles.list}>
        {transactions.map((tx) => (
          <div key={tx.id} style={styles.card}>
            <div style={styles.row}>
              <strong style={styles.type}>{tx.type || "transaction"}</strong>
              <span style={styles.status}>{tx.status || "completed"}</span>
            </div>

            <h2 style={styles.amount}>
              ${Number(tx.amount || 0).toFixed(2)} {tx.token || "SYLO"}
            </h2>

            <p style={styles.text}>Date: {formatDate(tx.createdAt)}</p>
            <p style={styles.text}>Merchant: {tx.merchantId || "N/A"}</p>
            <p style={styles.text}>Sender: {tx.senderUid || "N/A"}</p>
            <p style={styles.text}>Receiver: {tx.receiverUid || "N/A"}</p>
            <p style={styles.text}>Admin: {tx.adminUid || "N/A"}</p>
          </div>
        ))}
      </section>
    </main>
  );
}

const styles: any = {
  page: {
    background: "#020617",
    color: "white",
    minHeight: "100vh",
    padding: 18,
    fontFamily: "Arial, sans-serif",
  },
  title: {
    color: "#facc15",
    fontSize: 34,
    fontWeight: 900,
    marginBottom: 8,
  },
  subtitle: {
    color: "#cbd5e1",
    fontSize: 15,
    fontWeight: 800,
    wordBreak: "break-word",
  },
  backButton: {
    width: "100%",
    padding: 16,
    borderRadius: 16,
    background: "linear-gradient(90deg,#f97316,#facc15)",
    color: "#111827",
    border: "none",
    fontSize: 18,
    fontWeight: 900,
    margin: "18px 0",
  },
  emptyCard: {
    background: "#111827",
    border: "1px solid #334155",
    borderRadius: 20,
    padding: 20,
    color: "#cbd5e1",
    fontWeight: 900,
  },
  list: {
    display: "flex",
    flexDirection: "column",
    gap: 14,
  },
  card: {
    background: "#111827",
    border: "1px solid #334155",
    borderRadius: 20,
    padding: 16,
  },
  row: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    alignItems: "center",
  },
  type: {
    color: "#facc15",
    fontSize: 18,
    fontWeight: 900,
  },
  status: {
    color: "#86efac",
    border: "1px solid #15803d",
    borderRadius: 16,
    padding: "4px 10px",
    fontSize: 13,
    fontWeight: 900,
  },
  amount: {
    fontSize: 28,
    fontWeight: 900,
    margin: "12px 0",
  },
  text: {
    color: "#cbd5e1",
    fontSize: 14,
    fontWeight: 800,
    wordBreak: "break-word",
    margin: "7px 0",
  },
};