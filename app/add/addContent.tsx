"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { auth, db } from "../../lib/firebase";
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, User } from "firebase/auth";
import { doc, getDoc, setDoc, updateDoc, arrayUnion } from "firebase/firestore";

export default function AddContent() {
  const router = useRouter();
  const params = useSearchParams();

  const merchantId = params.get("merchant");
  const code = params.get("code");

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("Checking login...");

  const provider = new GoogleAuthProvider();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      setLoading(false);

      if (!u) {
        setStatus("Please login to add token");
        return;
      }
    });

    return () => unsub();
  }, []);

  const login = async () => {
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error(error);
      setStatus("Login failed ❌");
    }
  };

  useEffect(() => {
    const run = async () => {
      if (!user) return;

      try {
        if (!merchantId || !code) {
          setStatus("Invalid QR link ❌");
          return;
        }

        setStatus("Verifying merchant...");

        const merchantRef = doc(db, "merchants", merchantId);
        const merchantSnap = await getDoc(merchantRef);

        if (!merchantSnap.exists()) {
          setStatus("Merchant not found ❌");
          return;
        }

        const merchant = merchantSnap.data();

        if (merchant.status !== "active") {
          setStatus("Merchant inactive ❌");
          return;
        }

        if (merchant.secretCode !== code) {
          setStatus("Invalid code ❌");
          return;
        }

        setStatus("Adding merchant to wallet...");

        const userRef = doc(db, "users", user.uid);

        await setDoc(
          userRef,
          {
            uid: user.uid,
            email: user.email,
          },
          { merge: true }
        );

        await updateDoc(userRef, {
          merchantIds: arrayUnion(merchantId),
        });

        const walletRef = doc(db, "wallets", user.uid);

        await setDoc(
          walletRef,
          {
            balances: {
              [merchantId]: 0,
            },
          },
          { merge: true }
        );

        setStatus("Added successfully ✅ Redirecting...");

        setTimeout(() => {
          router.push("/wallet");
        }, 1500);
      } catch (error) {
        console.error(error);
        setStatus("Something went wrong ❌");
      }
    };

    run();
  }, [user, merchantId, code, router]);

  if (loading) {
    return <main style={styles.page}>Loading...</main>;
  }

  if (!user) {
    return (
      <main style={styles.page}>
        <section style={styles.card}>
          <h1 style={styles.title}>Login Required</h1>
          <p style={styles.text}>Please login to add this merchant token.</p>

          <button style={styles.button} onClick={login}>
            Login with Google
          </button>
        </section>
      </main>
    );
  }

  return (
    <main style={styles.page}>
      <section style={styles.card}>
        <div style={styles.logo}>SYLO</div>

        <h1 style={styles.title}>Add Merchant</h1>
        <p style={styles.text}>{status}</p>

        <button style={styles.backButton} onClick={() => router.push("/wallet")}>
          Back to Wallet
        </button>
      </section>
    </main>
  );
}

const styles: any = {
  page: {
    background: "#020617",
    color: "white",
    minHeight: "100vh",
    padding: 20,
    fontFamily: "Arial, sans-serif",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  card: {
    width: "100%",
    maxWidth: 420,
    background: "#111827",
    border: "1px solid #334155",
    borderRadius: 24,
    padding: 24,
    textAlign: "center",
  },

  logo: {
    width: 96,
    height: 96,
    borderRadius: "50%",
    border: "5px solid #facc15",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 900,
    fontSize: 24,
    background: "#0f172a",
    boxShadow: "0 0 24px #facc15",
    margin: "0 auto 20px",
  },

  title: {
    color: "#facc15",
    fontSize: 32,
    fontWeight: 900,
    margin: 0,
  },

  text: {
    color: "#cbd5e1",
    fontSize: 18,
    fontWeight: 800,
    lineHeight: 1.4,
    marginTop: 16,
  },

  button: {
    width: "100%",
    padding: 16,
    background: "linear-gradient(90deg,#ff7a00,#ffd21f)",
    color: "#111827",
    border: "none",
    borderRadius: 16,
    cursor: "pointer",
    fontWeight: 900,
    fontSize: 18,
    marginTop: 20,
  },

  backButton: {
    width: "100%",
    padding: 16,
    background: "#0f172a",
    color: "white",
    border: "1px solid #334155",
    borderRadius: 16,
    cursor: "pointer",
    fontWeight: 900,
    fontSize: 18,
    marginTop: 20,
  },
};