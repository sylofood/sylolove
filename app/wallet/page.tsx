"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "../../lib/firebase";
import { signOut, User, onAuthStateChanged } from "firebase/auth";
import { doc, getDoc,} from "firebase/firestore";

type Token = {
  id: string;
  store: string;
  amount: number;
  status: string;
  address: string;
  phone: string;
};

function WalletContent() {
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [walletBalance, setWalletBalance] = useState(0);
  const [tokens, setTokens] = useState<Token[]>([]);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) {
        setUser(null);
        setLoading(false);
        router.push("/login");
        return;
      }

     setUser(u);

try {
  await loadWallet(u.uid);
} catch (err) {
  console.error("LOAD WALLET ERROR:", err);
  alert("Wallet load failed. Please contact admin.");
} finally {
  setLoading(false);
}
    });

    return () => unsub();
  }, [router]);

  const logout = async () => {
    await signOut(auth);
    router.push("/login");
  };

  const loadWallet = async (uid: string) => {
    const walletRef = doc(db, "wallets", uid);
    const walletSnap = await getDoc(walletRef);

    if (!walletSnap.exists()) {
      
      setWalletBalance(0);
      setTokens([]);
      return;
    }

    const walletData = walletSnap.data();
    const balances = walletData.balances || {};

    const total = Object.values(balances).reduce<number>(
      (sum, val) => sum + Number(val || 0),
      0
    );

    setWalletBalance(total);

    const userRef = doc(db, "users", uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      setTokens([]);
      return;
    }

    const userData = userSnap.data();
    const merchantIds: string[] = userData.merchantIds || [];

    const realTokens: Token[] = [];

    for (const merchantId of merchantIds) {
      const merchantRef = doc(db, "merchants", merchantId);
      const merchantSnap = await getDoc(merchantRef);

      if (merchantSnap.exists()) {
        const merchant = merchantSnap.data();

        realTokens.push({
          id: merchantId,
          store: merchant.name || merchantId,
          amount: Number(balances[merchantId] || 0),
          status: merchant.status || "ACTIVE",
          address: merchant.address || "",
          phone: merchant.phone || "",
        });
      }
    }

    setTokens(realTokens);
  };

  const sendToken = async (merchantId: string, currentAmount: number) => {
    if (!user) {
      alert("Please login first");
      router.push("/login");
      return;
    }

    const receiverUid = prompt("Enter receiver UID:");
    if (!receiverUid) return;

    const input = prompt("How much do you want to send?");
    if (!input) return;

    const amount = Number(input);

    if (!amount || amount <= 0) {
      alert("Invalid amount");
      return;
    }

    if (amount > currentAmount) {
      alert("Not enough balance ❌");
      return;
    }

    try {
      const idToken = await user.getIdToken(true);

      const res = await fetch("/api/send-token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          idToken,
          receiverUid,
          merchantId,
          amount,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "Send failed ❌");
        return;
      }

      await loadWallet(user.uid);
      alert("Token sent successfully ✅");
    } catch (error) {
      console.error(error);
      alert("Something went wrong ❌");
    }
  };

  if (loading) {
    return <main style={styles.page}>Loading wallet...</main>;
  }

  return (
    <main style={styles.page}>
      <section style={styles.hero}>
        <div style={styles.logo}>SYLO</div>

        <div style={styles.heroText}>
          <h1 style={styles.brand}>SYLO WALLET</h1>
          <h2 style={styles.tagline}>Send your love out</h2>
          <p style={styles.subtag}>Share your love often</p>
        </div>
      </section>

      <section style={styles.balanceCard}>
        <p style={styles.balanceLabel}>WALLET BALANCE</p>

        <div style={styles.balanceRow}>
          <h2 style={styles.balance}>${walletBalance.toFixed(2)}</h2>
          <span style={styles.syloBadge}>SYLO</span>
        </div>
      </section>

      <section style={styles.actionRow}>
        <button style={styles.logoutButton} onClick={logout}>
          Logout
        </button>

        <button style={styles.addButton} onClick={() => router.push("/add")}>
          + Add Token
        </button>
      </section>

      <section style={styles.tokenHeader}>
        <h2 style={styles.sectionTitle}>GIFT TOKENS</h2>

        <div style={styles.tokenCount}>
          <span style={styles.countCircle}>{tokens.length}</span>
          <span>Tokens</span>
        </div>
      </section>

      <section style={styles.tokenList}>
        {tokens.length === 0 && (
          <div style={styles.emptyCard}>
            <p>No tokens yet</p>
            <p>Scan a merchant QR to add your first token.</p>
          </div>
        )}

        {tokens.map((token) => {
          const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
            token.address
          )}`;

          const cleanPhone = token.phone.replace(/[^\d]/g, "");
          const phoneUrl = cleanPhone ? `tel:${cleanPhone}` : "#";

          return (
            <div key={token.id} style={styles.tokenCard}>
              <div style={styles.tokenTop}>
                <div style={styles.smallLogo}>SYLO</div>

                <div style={styles.tokenMiddle}>
                  <h3 style={styles.storeName}>{token.store}</h3>
                  <span style={styles.status}>{token.status}</span>
                </div>

                <strong style={styles.tokenAmount}>
                  ${token.amount.toFixed(2)}
                </strong>
              </div>

              <div style={styles.infoBox}>
                <p style={styles.infoText}>
                  📍 {token.address || "No address"}
                </p>

                <a
                  href={phoneUrl}
                  style={{
                    ...styles.phoneLink,
                    opacity: cleanPhone ? 1 : 0.45,
                    pointerEvents: cleanPhone ? "auto" : "none",
                  }}
                >
                  📞 {token.phone || "No phone"}
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

              <div style={styles.tokenActions}>
                <button
                  style={styles.sendButton}
                  onClick={() => sendToken(token.id, token.amount)}
                >
                  Send
                </button>

                <button
                  style={styles.receiveButton}
                  onClick={() => alert("Receive coming next")}
                >
                  Receive
                </button>
              </div>
            </div>
          );
        })}
      </section>

      {menuOpen && (
        <section style={styles.profileMenu}>
          <button
            style={styles.menuItem}
            onClick={() => router.push("/merchant/register")}
          >
            🏪 Business Owner Registration
          </button>

          <button
            style={styles.menuItem}
            onClick={() => router.push("/merchant")}
          >
            💼 Merchant Dashboard
          </button>

          <button
            style={styles.menuItem}
            onClick={() => alert("History coming next")}
          >
            🕘 Transaction History
          </button>

          <button
            style={styles.menuItem}
            onClick={() => alert("Profile coming next")}
          >
            👤 Profile Settings
          </button>
        </section>
      )}

      <nav style={styles.bottomNav}>
        <div style={styles.navActive}>
          💳
          <br />
          Wallet
        </div>

        <div onClick={() => router.push("/send")}>
          ✈️
          <br />
          Send
        </div>

        <div onClick={() => alert("History coming next")}>
          🕘
          <br />
          History
        </div>

        <div onClick={() => setMenuOpen(!menuOpen)}>
          👤
          <br />
          Profile
        </div>
      </nav>
    </main>
  );
}

export default function WalletPage() {
  return (
    <Suspense fallback={<main style={styles.page}>Loading wallet...</main>}>
      <WalletContent />
    </Suspense>
  );
}

const styles: any = {
  page: {
    background: "#020617",
    color: "white",
    minHeight: "100vh",
    padding: "18px",
    paddingBottom: "105px",
    fontFamily: "Arial, sans-serif",
    overflowX: "hidden",
  },

  hero: {
    display: "flex",
    alignItems: "center",
    gap: 16,
    marginTop: 20,
    marginBottom: 22,
  },

  logo: {
    width: 92,
    height: 92,
    minWidth: 92,
    borderRadius: "50%",
    border: "5px solid #facc15",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 900,
    fontSize: 24,
    background: "#0f172a",
    boxShadow: "0 0 24px #facc15",
  },

  heroText: {
    flex: 1,
    minWidth: 0,
  },

  brand: {
    color: "#facc15",
    fontSize: 31,
    lineHeight: 1.05,
    fontWeight: 900,
    margin: 0,
  },

  tagline: {
    fontSize: 31,
    lineHeight: 1.08,
    fontWeight: 900,
    margin: "8px 0",
  },

  subtag: {
    color: "#facc15",
    fontSize: 21,
    lineHeight: 1.15,
    fontWeight: 900,
    margin: 0,
  },

  balanceCard: {
    border: "1px solid #8a741e",
    borderRadius: 24,
    padding: 22,
    marginBottom: 20,
    background: "#0f172a",
  },

  balanceLabel: {
    color: "#cbd5e1",
    fontSize: 18,
    fontWeight: 900,
    letterSpacing: 2,
    marginBottom: 16,
  },

  balanceRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },

  balance: {
    fontSize: 46,
    fontWeight: 900,
    margin: 0,
    lineHeight: 1,
    whiteSpace: "nowrap",
  },

  syloBadge: {
    color: "#facc15",
    border: "1px solid #8a741e",
    borderRadius: 18,
    padding: "13px 18px",
    fontSize: 21,
    fontWeight: 900,
    whiteSpace: "nowrap",
  },

  actionRow: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 14,
    marginBottom: 26,
  },

  logoutButton: {
    padding: "20px 12px",
    borderRadius: 22,
    background: "#0f172a",
    color: "white",
    border: "1px solid #334155",
    fontSize: 22,
    fontWeight: 900,
  },

  addButton: {
    padding: "20px 12px",
    borderRadius: 22,
    background: "linear-gradient(90deg,#ff7a00,#ffd21f)",
    color: "#111827",
    border: "none",
    fontSize: 22,
    fontWeight: 900,
  },

  tokenHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 18,
  },

  sectionTitle: {
    fontSize: 34,
    lineHeight: 1.1,
    fontWeight: 900,
    margin: 0,
  },

  tokenCount: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    fontSize: 21,
    fontWeight: 900,
  },

  countCircle: {
    background: "#1e3a8a",
    borderRadius: "50%",
    width: 48,
    height: 48,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  tokenList: {
    display: "flex",
    flexDirection: "column",
    gap: 20,
  },

  emptyCard: {
    border: "1px solid #334155",
    borderRadius: 24,
    padding: 22,
    background: "#111827",
    color: "#cbd5e1",
    fontSize: 18,
    fontWeight: 800,
  },

  tokenCard: {
    border: "1px solid #334155",
    borderRadius: 24,
    padding: 18,
    background: "#111827",
  },

  tokenTop: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    marginBottom: 14,
  },

  smallLogo: {
    width: 58,
    height: 58,
    minWidth: 58,
    borderRadius: "50%",
    background: "#0f172a",
    border: "3px solid #2563eb",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 15,
    fontWeight: 900,
  },

  tokenMiddle: {
    flex: 1,
    minWidth: 0,
  },

  storeName: {
    fontSize: 25,
    lineHeight: 1.05,
    margin: 0,
    wordBreak: "break-word",
  },

  status: {
    display: "inline-block",
    marginTop: 8,
    padding: "5px 13px",
    borderRadius: 20,
    color: "#86efac",
    border: "1px solid #15803d",
    fontWeight: 900,
    fontSize: 15,
  },

  tokenAmount: {
    color: "#4ade80",
    fontSize: 23,
    whiteSpace: "nowrap",
  },

  infoBox: {
    background: "#0f172a",
    borderRadius: 18,
    padding: 14,
    marginBottom: 16,
  },

  infoText: {
    fontSize: 18,
    lineHeight: 1.35,
    fontWeight: 800,
  },

  phoneLink: {
    color: "#93c5fd",
    fontSize: 18,
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

  tokenActions: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 14,
  },

  sendButton: {
    padding: 15,
    borderRadius: 14,
    border: "none",
    background: "#2563eb",
    color: "white",
    fontSize: 20,
    fontWeight: 900,
  },

  receiveButton: {
    padding: 15,
    borderRadius: 14,
    border: "none",
    background: "#16a34a",
    color: "white",
    fontSize: 20,
    fontWeight: 900,
  },

  profileMenu: {
    position: "fixed",
    bottom: 105,
    left: 16,
    right: 16,
    background: "#0f172a",
    border: "1px solid #334155",
    borderRadius: 24,
    padding: 14,
    display: "flex",
    flexDirection: "column",
    gap: 12,
    zIndex: 60,
  },

  menuItem: {
    width: "100%",
    padding: "16px 14px",
    borderRadius: 16,
    background: "#020617",
    color: "white",
    border: "1px solid #334155",
    fontSize: 18,
    fontWeight: 900,
    textAlign: "left",
  },

  bottomNav: {
    position: "fixed",
    bottom: 14,
    left: 16,
    right: 16,
    background: "#0f172a",
    border: "1px solid #334155",
    borderRadius: 24,
    padding: "13px 10px",
    display: "flex",
    justifyContent: "space-around",
    fontSize: 16,
    fontWeight: 900,
    color: "#94a3b8",
    zIndex: 50,
  },

  navActive: {
    color: "#facc15",
  },
};