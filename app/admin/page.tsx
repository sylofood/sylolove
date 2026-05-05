"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "../../lib/firebase";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";

type Member = {
  id: string;
  email: string;
  name: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  role: string;
};

type MerchantApplication = {
  id: string;
  ownerUid: string;
  email: string;
  businessName: string;
  ownerName: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  licenseUrl: string;
  status: string;
};

export default function AdminPage() {
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const [usersCount, setUsersCount] = useState(0);
  const [merchantsCount, setMerchantsCount] = useState(0);
  const [transactionsCount, setTransactionsCount] = useState(0);
  const [totalUserSylo, setTotalUserSylo] = useState(0);
  const [totalMerchantSylo, setTotalMerchantSylo] = useState(0);

  const [members, setMembers] = useState<Member[]>([]);
  const [applications, setApplications] = useState<MerchantApplication[]>([]);
  const [approvingId, setApprovingId] = useState("");

  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [pin, setPin] = useState("");
  const [withdrawing, setWithdrawing] = useState(false);

  const [merchantId, setMerchantId] = useState("");
  const [grantAmount, setGrantAmount] = useState("");
  const [granting, setGranting] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      try {
        if (!u) {
          router.push("/login");
          return;
        }

        const userRef = doc(db, "users", u.uid);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists() || userSnap.data()?.role !== "admin") {
          router.push("/wallet");
          return;
        }

        setUser(u);

        try {
          await loadReport();
          await loadApplications();
        } catch (err) {
          console.error("LOAD REPORT ERROR:", err);
        }
      } catch (err) {
        console.error("ADMIN AUTH ERROR:", err);
      } finally {
        setLoading(false);
      }
    });

    return () => unsub();
  }, [router]);

  const safeGetDocs = async (name: string) => {
    try {
      return await getDocs(collection(db, name));
    } catch (err) {
      console.error(`Cannot read ${name}:`, err);
      return null;
    }
  };

  const loadApplications = async () => {
    try {
      const appSnap = await getDocs(collection(db, "merchantApplications"));

      const pendingApps: MerchantApplication[] = [];

      appSnap.forEach((d) => {
        const data: any = d.data();

        if (data.status === "pending") {
          pendingApps.push({
            id: d.id,
            ...data,
          });
        }
      });

      setApplications(pendingApps);
    } catch (err: any) {
      console.error("LOAD APPLICATIONS ERROR:", err);
      alert(
        (err?.code ? err.code + "\n" : "") +
          (err?.message || "Load applications failed")
      );
      setApplications([]);
    }
  };

  const loadReport = async () => {
    const usersSnap = await safeGetDocs("users");
    const merchantsSnap = await safeGetDocs("merchants");
    const transactionsSnap = await safeGetDocs("transactions");
    const walletsSnap = await safeGetDocs("wallets");
    const merchantWalletsSnap = await safeGetDocs("merchantWallets");

    let userSylo = 0;
    if (walletsSnap) {
      walletsSnap.forEach((d) => {
        const data = d.data();
        userSylo += Number(data?.balances?.SYLO || 0);
      });
    }

    let merchantSylo = 0;
    if (merchantWalletsSnap) {
      merchantWalletsSnap.forEach((d) => {
        const data = d.data();
        merchantSylo += Number(data?.balances?.SYLO || 0);
      });
    }

    const realMembers: Member[] = [];

    if (usersSnap) {
      usersSnap.forEach((d) => {
        const data = d.data();

        realMembers.push({
          id: d.id,
          email: data.email || "",
          name: data.name || "",
          phone: data.phone || "",
          address: data.address || "",
          city: data.city || "",
          state: data.state || "",
          zip: data.zip || "",
          role: data.role || "user",
        });
      });
    }

    setMembers(realMembers);
    setUsersCount(usersSnap?.size || 0);
    setMerchantsCount(merchantsSnap?.size || 0);
    setTransactionsCount(transactionsSnap?.size || 0);
    setTotalUserSylo(userSylo);
    setTotalMerchantSylo(merchantSylo);
  };

  const approveMerchant = async (applicationId: string) => {
    if (!user) return;

    setApprovingId(applicationId);

    try {
      const idToken = await user.getIdToken(true);

      const res = await fetch("/api/admin/approve-merchant", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          idToken,
          applicationId,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "Approve failed");
        return;
      }

      alert("Merchant approved ✅");
      await loadApplications();
      await loadReport();
    } catch (err) {
      console.error("APPROVE MERCHANT ERROR:", err);
      alert("Approve error");
    } finally {
      setApprovingId("");
    }
  };

  const withdrawTreasury = async () => {
    if (!user) return;
    if (!withdrawAmount || !pin) return alert("Enter amount and PIN");

    const amountNumber = Number(withdrawAmount);

    if (!Number.isFinite(amountNumber) || amountNumber <= 0) {
      return alert("Invalid amount");
    }

    setWithdrawing(true);

    try {
      const idToken = await user.getIdToken(true);

      const res = await fetch("/api/admin/withdraw-treasury", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          idToken,
          amount: amountNumber,
          pin,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "Withdraw failed");
        return;
      }

      alert("Withdraw success ✅");
      setWithdrawAmount("");
      setPin("");
      await loadReport();
    } catch (err) {
      console.error("WITHDRAW ERROR:", err);
      alert("Error");
    } finally {
      setWithdrawing(false);
    }
  };

  const grantMerchant = async () => {
    if (!user) return;
    if (!merchantId || !grantAmount) return alert("Enter merchant ID and amount");

    const amountNumber = Number(grantAmount);

    if (!Number.isFinite(amountNumber) || amountNumber <= 0) {
      return alert("Invalid amount");
    }

    setGranting(true);

    try {
      const idToken = await user.getIdToken(true);

      const res = await fetch("/api/admin/grant-merchant", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          idToken,
          merchantId: merchantId.trim(),
          amount: amountNumber,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "Grant failed");
        return;
      }

      alert("Merchant funded ✅");
      setMerchantId("");
      setGrantAmount("");
      await loadReport();
    } catch (err) {
      console.error("GRANT ERROR:", err);
      alert("Error");
    } finally {
      setGranting(false);
    }
  };

  const logout = async () => {
    await signOut(auth);
    router.push("/login");
  };

  if (loading) {
    return <main style={styles.page}>Loading admin...</main>;
  }

  return (
    <main style={styles.page}>
      <section style={styles.hero}>
        <div style={styles.logo}>SYLO</div>
        <div>
          <h1 style={styles.title}>Admin Control Center</h1>
          <p style={styles.subtitle}>
            Treasury, members, merchants, wallet control, phone and map
          </p>
        </div>
      </section>

      <section style={styles.adminBox}>
        <p style={styles.label}>Admin</p>
        <p style={styles.email}>{user?.email}</p>
      </section>

      <section style={styles.grid}>
        <Stat title="Users" value={usersCount} />
        <Stat title="Merchants" value={merchantsCount} />
        <Stat title="Transactions" value={transactionsCount} />
        <Stat title="User SYLO" value={totalUserSylo} />
        <Stat title="Merchant SYLO" value={totalMerchantSylo} />
      </section>

      <section style={styles.card}>
        <h2 style={styles.sectionTitle}>Merchant Applications</h2>

        {applications.length === 0 && (
          <p style={styles.emptyText}>No pending merchant applications.</p>
        )}

        <div style={styles.memberList}>
          {applications.map((app) => {
            const fullAddress = `${app.address} ${app.city} ${app.state} ${app.zip}`.trim();
            const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
              fullAddress || app.businessName || app.email
            )}`;

            const cleanPhone = app.phone.replace(/[^\d]/g, "");
            const phoneUrl = cleanPhone ? `tel:${cleanPhone}` : "#";

            return (
              <div key={app.id} style={styles.memberCard}>
                <div style={styles.memberTop}>
                  <div>
                    <h3 style={styles.memberName}>
                      {app.businessName || "No Business Name"}
                    </h3>
                    <p style={styles.memberEmail}>{app.email}</p>
                  </div>

                  <span style={styles.roleBadge}>{app.status || "pending"}</span>
                </div>

                <div style={styles.infoBox}>
                  <p style={styles.infoText}>Owner: {app.ownerName || "No owner"}</p>
                  <p style={styles.infoText}>📍 {fullAddress || "No address"}</p>
                  <p style={styles.infoText}>
                    🏙️ {app.city || "No city"} {app.state || ""}
                  </p>
                  <p style={styles.infoText}>☎️ {app.phone || "No phone"}</p>
                </div>

                <div style={styles.memberActions}>
                  <a
                    href={phoneUrl}
                    style={{
                      ...styles.callButton,
                      opacity: cleanPhone ? 1 : 0.45,
                      pointerEvents: cleanPhone ? "auto" : "none",
                    }}
                  >
                    Call
                  </a>

                  <a
                    href={mapUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={styles.mapButton}
                  >
                    Map
                  </a>
                </div>

                <a
                  href={app.licenseUrl || "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    ...styles.licenseButton,
                    opacity: app.licenseUrl ? 1 : 0.45,
                    pointerEvents: app.licenseUrl ? "auto" : "none",
                  }}
                >
                  View Business License
                </a>

                <button
                  style={styles.grantButton}
                  onClick={() => approveMerchant(app.id)}
                  disabled={approvingId === app.id}
                >
                  {approvingId === app.id ? "Approving..." : "Approve Merchant"}
                </button>
              </div>
            );
          })}
        </div>
      </section>

      <section style={styles.card}>
        <h2 style={styles.sectionTitle}>Withdraw from Treasury</h2>

        <input
          style={styles.input}
          placeholder="Amount"
          value={withdrawAmount}
          inputMode="decimal"
          onChange={(e) => setWithdrawAmount(e.target.value)}
        />

        <input
          style={styles.input}
          type="password"
          placeholder="Admin PIN"
          value={pin}
          inputMode="numeric"
          onChange={(e) => setPin(e.target.value)}
        />

        <button
          style={styles.withdrawButton}
          onClick={withdrawTreasury}
          disabled={withdrawing}
        >
          {withdrawing ? "Withdrawing..." : "Withdraw Treasury"}
        </button>
      </section>

      <section style={styles.card}>
        <h2 style={styles.sectionTitle}>Grant SYLO to Merchant</h2>

        <input
          style={styles.input}
          placeholder="Merchant ID"
          value={merchantId}
          onChange={(e) => setMerchantId(e.target.value)}
        />

        <input
          style={styles.input}
          placeholder="Amount"
          value={grantAmount}
          inputMode="decimal"
          onChange={(e) => setGrantAmount(e.target.value)}
        />

        <button style={styles.grantButton} onClick={grantMerchant} disabled={granting}>
          {granting ? "Funding..." : "Grant Merchant Token"}
        </button>
      </section>

      <section style={styles.card}>
        <h2 style={styles.sectionTitle}>Members</h2>

        {members.length === 0 && (
          <p style={styles.emptyText}>No members found or Firestore read is blocked.</p>
        )}

        <div style={styles.memberList}>
          {members.map((m) => {
            const cleanPhone = m.phone.replace(/[^\d]/g, "");
            const phoneUrl = cleanPhone ? `tel:${cleanPhone}` : "#";

            const fullAddress = `${m.address} ${m.city} ${m.state} ${m.zip}`.trim();
            const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
              fullAddress || m.city || m.state || m.email
            )}`;

            return (
              <div key={m.id} style={styles.memberCard}>
                <div style={styles.memberTop}>
                  <div>
                    <h3 style={styles.memberName}>{m.name || "No Name"}</h3>
                    <p style={styles.memberEmail}>{m.email}</p>
                  </div>

                  <span style={styles.roleBadge}>{m.role}</span>
                </div>

                <div style={styles.infoBox}>
                  <p style={styles.infoText}>📍 {fullAddress || "No address"}</p>
                  <p style={styles.infoText}>
                    🏙️ {m.city || "No city"} {m.state || ""}
                  </p>
                  <p style={styles.infoText}>☎️ {m.phone || "No phone"}</p>
                </div>

                <div style={styles.memberActions}>
                  <a
                    href={phoneUrl}
                    style={{
                      ...styles.callButton,
                      opacity: cleanPhone ? 1 : 0.45,
                      pointerEvents: cleanPhone ? "auto" : "none",
                    }}
                  >
                    Call
                  </a>

                  <a
                    href={mapUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={styles.mapButton}
                  >
                    Map
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section style={styles.actions}>
        <button style={styles.blueButton} onClick={() => router.push("/merchant")}>
          Merchant Panel
        </button>

        <button style={styles.goldButton} onClick={() => router.push("/wallet")}>
          Wallet
        </button>

        <button style={styles.logoutButton} onClick={logout}>
          Logout
        </button>
      </section>
    </main>
  );
}

function Stat({ title, value }: { title: string; value: number }) {
  return (
    <div style={styles.statCard}>
      <p style={styles.statLabel}>{title}</p>
      <h2 style={styles.statNumber}>{value}</h2>
    </div>
  );
}

const styles: any = {
  page: {
    background: "#020617",
    color: "white",
    minHeight: "100vh",
    padding: 18,
    paddingBottom: 40,
    fontFamily: "Arial, sans-serif",
    overflowX: "hidden",
  },
  hero: {
    display: "flex",
    alignItems: "center",
    gap: 16,
    marginTop: 20,
    marginBottom: 24,
  },
  logo: {
    width: 86,
    height: 86,
    minWidth: 86,
    borderRadius: "50%",
    border: "5px solid #facc15",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 900,
    fontSize: 22,
    background: "#0f172a",
    boxShadow: "0 0 24px #facc15",
  },
  title: {
    color: "#facc15",
    fontSize: 32,
    fontWeight: 900,
    margin: 0,
    lineHeight: 1.05,
  },
  subtitle: {
    color: "#cbd5e1",
    fontSize: 16,
    fontWeight: 800,
    marginTop: 8,
  },
  adminBox: {
    background: "#0f172a",
    border: "1px solid #334155",
    borderRadius: 22,
    padding: 18,
    marginBottom: 18,
  },
  label: {
    color: "#94a3b8",
    fontSize: 13,
    fontWeight: 900,
    textTransform: "uppercase",
    margin: 0,
  },
  email: {
    fontSize: 18,
    fontWeight: 900,
    marginTop: 8,
    wordBreak: "break-word",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 14,
    marginBottom: 18,
  },
  statCard: {
    background: "#111827",
    border: "1px solid #334155",
    borderRadius: 22,
    padding: 18,
  },
  statLabel: {
    color: "#94a3b8",
    fontSize: 13,
    fontWeight: 900,
    textTransform: "uppercase",
    margin: 0,
  },
  statNumber: {
    color: "#facc15",
    fontSize: 34,
    fontWeight: 900,
    margin: "8px 0 0",
  },
  card: {
    background: "#111827",
    border: "1px solid #334155",
    borderRadius: 24,
    padding: 18,
    marginBottom: 18,
  },
  sectionTitle: {
    fontSize: 25,
    fontWeight: 900,
    marginTop: 0,
    marginBottom: 14,
    color: "#facc15",
  },
  input: {
    width: "100%",
    padding: 15,
    marginBottom: 12,
    borderRadius: 14,
    border: "1px solid #334155",
    background: "#020617",
    color: "white",
    fontSize: 16,
    fontWeight: 800,
    boxSizing: "border-box",
  },
  withdrawButton: {
    width: "100%",
    padding: 16,
    borderRadius: 16,
    border: "none",
    background: "linear-gradient(90deg,#22c55e,#facc15)",
    color: "#111827",
    fontSize: 18,
    fontWeight: 900,
  },
  grantButton: {
    width: "100%",
    padding: 16,
    borderRadius: 16,
    border: "none",
    background: "linear-gradient(90deg,#f97316,#facc15)",
    color: "#111827",
    fontSize: 18,
    fontWeight: 900,
    marginTop: 14,
  },
  licenseButton: {
    display: "block",
    textAlign: "center",
    padding: 14,
    borderRadius: 14,
    background: "#7c3aed",
    color: "white",
    fontSize: 17,
    fontWeight: 900,
    textDecoration: "none",
    marginTop: 14,
  },
  emptyText: {
    color: "#cbd5e1",
    fontSize: 16,
    fontWeight: 800,
  },
  memberList: {
    display: "flex",
    flexDirection: "column",
    gap: 14,
  },
  memberCard: {
    background: "#020617",
    border: "1px solid #334155",
    borderRadius: 20,
    padding: 16,
  },
  memberTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 12,
  },
  memberName: {
    fontSize: 21,
    fontWeight: 900,
    margin: 0,
  },
  memberEmail: {
    color: "#cbd5e1",
    fontSize: 15,
    fontWeight: 800,
    marginTop: 6,
    wordBreak: "break-word",
  },
  roleBadge: {
    color: "#facc15",
    border: "1px solid #8a741e",
    borderRadius: 999,
    padding: "7px 12px",
    fontSize: 13,
    fontWeight: 900,
    textTransform: "uppercase",
    whiteSpace: "nowrap",
  },
  infoBox: {
    background: "#0f172a",
    borderRadius: 16,
    padding: 13,
    marginBottom: 14,
  },
  infoText: {
    color: "#e5e7eb",
    fontSize: 15,
    fontWeight: 800,
    lineHeight: 1.35,
    margin: "6px 0",
    wordBreak: "break-word",
  },
  memberActions: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 12,
  },
  callButton: {
    textAlign: "center",
    padding: 14,
    borderRadius: 14,
    background: "#16a34a",
    color: "white",
    fontSize: 17,
    fontWeight: 900,
    textDecoration: "none",
  },
  mapButton: {
    textAlign: "center",
    padding: 14,
    borderRadius: 14,
    background: "#2563eb",
    color: "white",
    fontSize: 17,
    fontWeight: 900,
    textDecoration: "none",
  },
  actions: {
    display: "grid",
    gridTemplateColumns: "1fr",
    gap: 12,
  },
  blueButton: {
    padding: 16,
    borderRadius: 16,
    border: "none",
    background: "#2563eb",
    color: "white",
    fontSize: 18,
    fontWeight: 900,
  },
  goldButton: {
    padding: 16,
    borderRadius: 16,
    border: "none",
    background: "linear-gradient(90deg,#ff7a00,#ffd21f)",
    color: "#111827",
    fontSize: 18,
    fontWeight: 900,
  },
  logoutButton: {
    padding: 16,
    borderRadius: 16,
    background: "#111827",
    color: "white",
    border: "1px solid #334155",
    fontSize: 18,
    fontWeight: 900,
  },
};