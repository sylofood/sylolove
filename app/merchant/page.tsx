"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "../../lib/firebase";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

type Merchant = {
  id: string;
  name: string;
  address: string;
  phone: string;
  status: string;
};

export default function MerchantPage() {
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [merchants, setMerchants] = useState<Merchant[]>([]);

  const [receiverUid, setReceiverUid] = useState("");
  const [amount, setAmount] = useState("");
  const [grantingMerchantId, setGrantingMerchantId] = useState("");

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) {
        setUser(null);
        setLoading(false);
        router.push("/login");
        return;
      }

      setUser(u);
      await loadMerchants(u.uid);
      setLoading(false);
    });

    return () => unsub();
  }, [router]);

  const loadMerchants = async (uid: string) => {
    const userRef = doc(db, "users", uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      setMerchants([]);
      router.push("/wallet");
      return;
    }

    const userData = userSnap.data();
    const merchantIds: string[] = userData.merchantIds || [];

    if (merchantIds.length === 0) {
      setMerchants([]);
      router.push("/wallet");
      return;
    }

    const realMerchants: Merchant[] = [];

    for (const merchantId of merchantIds) {
      const merchantRef = doc(db, "merchants", merchantId);
      const merchantSnap = await getDoc(merchantRef);

      if (merchantSnap.exists()) {
        const merchant = merchantSnap.data();

        realMerchants.push({
          id: merchantId,
          name: merchant.name || merchantId,
          address: merchant.address || "",
          phone: merchant.phone || "",
          status: merchant.status || "ACTIVE",
        });
      }
    }

    setMerchants(realMerchants);
  };

  const grantToken = async (merchantId: string) => {
    if (!user) return alert("Login first");
    if (!receiverUid || !amount) return alert("Missing UID or amount");

    setGrantingMerchantId(merchantId);

    try {
      const idToken = await user.getIdToken();

      const res = await fetch("/api/merchant/grant-user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          idToken,
          merchantId,
          receiverUid,
          amount: Number(amount),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "Grant failed");
        return;
      }

      alert("Grant success ✅");
      setReceiverUid("");
      setAmount("");
    } catch (err) {
      console.error(err);
      alert("Grant error");
    } finally {
      setGrantingMerchantId("");
    }
  };

  const logout = async () => {
    await signOut(auth);
    router.push("/login");
  };

  if (loading) {
    return <main style={styles.page}>Loading merchant...</main>;
  }

  return (
    <main style={styles.page}>
      <section style={styles.header}>
        <h1 style={styles.title}>Merchant Dashboard</h1>
        <p style={styles.subtitle}>Manage your SYLO merchant wallet</p>
      </section>

      <section style={styles.userBox}>
        <p style={styles.label}>Logged in as</p>
        <p style={styles.email}>{user?.email}</p>
      </section>

      <section style={styles.actionRow}>
        <button style={styles.walletButton} onClick={() => router.push("/wallet")}>
          Wallet
        </button>

        <button style={styles.logoutButton} onClick={logout}>
          Logout
        </button>
      </section>

      <section style={styles.sectionHeader}>
        <h2 style={styles.sectionTitle}>Your Merchants</h2>
        <span style={styles.count}>{merchants.length}</span>
      </section>

      <section style={styles.list}>
        {merchants.length === 0 && (
          <div style={styles.card}>
            <h3>No merchant access</h3>
            <p>This account is not connected to any merchant.</p>
          </div>
        )}

        {merchants.map((merchant) => {
          const phoneUrl = `tel:${merchant.phone.replace(/[^\d]/g, "")}`;
          const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
            merchant.address
          )}`;

          return (
            <div key={merchant.id} style={styles.card}>
              <div style={styles.cardTop}>
                <div>
                  <h3 style={styles.merchantName}>{merchant.name}</h3>
                  <span style={styles.status}>{merchant.status}</span>
                </div>
              </div>

              <div style={styles.infoBox}>
                <p style={styles.infoText}>📍 {merchant.address}</p>

                <a href={phoneUrl} style={styles.phoneLink}>
                  📞 {merchant.phone}
                </a>

                <br />

                <a
                  href={mapUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={styles.mapButton}
                >
                  Open Map
                </a>
              </div>

              <div style={styles.grantBox}>
                <h3 style={styles.grantTitle}>Grant SYLO to User</h3>

                <input
                  placeholder="Receiver UID"
                  value={receiverUid}
                  onChange={(e) => setReceiverUid(e.target.value)}
                  style={styles.input}
                />

                <input
                  placeholder="Amount"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  style={styles.input}
                />

                <button
                  style={styles.grantButton}
                  onClick={() => grantToken(merchant.id)}
                  disabled={grantingMerchantId === merchant.id}
                >
                  {grantingMerchantId === merchant.id
                    ? "Sending..."
                    : "Grant Token"}
                </button>
              </div>

              <div style={styles.merchantActions}>
                <button
                  style={styles.primaryButton}
                  onClick={() => router.push("/send")}
                >
                  Send Token
                </button>

                <button
                  style={styles.secondaryButton}
                  onClick={() => alert("Merchant QR Generator coming next")}
                >
                  QR Code
                </button>
              </div>
            </div>
          );
        })}
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
    fontSize: 34,
    fontWeight: 900,
    margin: 0,
  },

  subtitle: {
    color: "#cbd5e1",
    fontSize: 18,
    fontWeight: 800,
    marginTop: 8,
  },

  userBox: {
    background: "#0f172a",
    border: "1px solid #334155",
    borderRadius: 22,
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

  actionRow: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 14,
    marginBottom: 28,
  },

  walletButton: {
    padding: "17px 12px",
    borderRadius: 18,
    background: "linear-gradient(90deg,#ff7a00,#ffd21f)",
    color: "#111827",
    border: "none",
    fontSize: 20,
    fontWeight: 900,
  },

  logoutButton: {
    padding: "17px 12px",
    borderRadius: 18,
    background: "#111827",
    color: "white",
    border: "1px solid #334155",
    fontSize: 20,
    fontWeight: 900,
  },

  sectionHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },

  sectionTitle: {
    fontSize: 28,
    fontWeight: 900,
    margin: 0,
  },

  count: {
    background: "#1e3a8a",
    borderRadius: "50%",
    width: 46,
    height: 46,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 900,
    fontSize: 20,
  },

  list: {
    display: "flex",
    flexDirection: "column",
    gap: 18,
  },

  card: {
    background: "#111827",
    border: "1px solid #334155",
    borderRadius: 24,
    padding: 18,
  },

  cardTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },

  merchantName: {
    fontSize: 26,
    fontWeight: 900,
    margin: 0,
  },

  status: {
    display: "inline-block",
    marginTop: 8,
    padding: "5px 13px",
    borderRadius: 20,
    color: "#86efac",
    border: "1px solid #15803d",
    fontWeight: 900,
    fontSize: 14,
  },

  infoBox: {
    background: "#0f172a",
    borderRadius: 18,
    padding: 14,
    marginBottom: 16,
  },

  infoText: {
    fontSize: 17,
    lineHeight: 1.35,
    fontWeight: 800,
  },

  phoneLink: {
    color: "#93c5fd",
    fontSize: 17,
    fontWeight: 900,
    textDecoration: "none",
  },

  mapButton: {
    display: "inline-block",
    marginTop: 14,
    padding: "10px 16px",
    borderRadius: 12,
    color: "#facc15",
    border: "1px solid #facc15",
    textDecoration: "none",
    fontWeight: 900,
  },

  grantBox: {
    background: "#020617",
    border: "1px solid #334155",
    borderRadius: 18,
    padding: 14,
    marginBottom: 16,
  },

  grantTitle: {
    fontSize: 20,
    fontWeight: 900,
    marginTop: 0,
    marginBottom: 12,
    color: "#facc15",
  },

  input: {
    width: "100%",
    padding: 14,
    marginBottom: 10,
    borderRadius: 14,
    border: "1px solid #334155",
    background: "#0f172a",
    color: "white",
    fontSize: 16,
    fontWeight: 800,
    boxSizing: "border-box",
  },

  grantButton: {
    width: "100%",
    padding: 15,
    borderRadius: 14,
    border: "none",
    background: "linear-gradient(90deg,#f97316,#facc15)",
    color: "#111827",
    fontSize: 18,
    fontWeight: 900,
  },

  merchantActions: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 14,
  },

  primaryButton: {
    padding: 15,
    borderRadius: 14,
    border: "none",
    background: "#2563eb",
    color: "white",
    fontSize: 18,
    fontWeight: 900,
  },

  secondaryButton: {
    padding: 15,
    borderRadius: 14,
    border: "none",
    background: "#16a34a",
    color: "white",
    fontSize: 18,
    fontWeight: 900,
  },
};