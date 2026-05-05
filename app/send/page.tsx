"use client";

import { useEffect, useState } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import app from "../../lib/firebase";
import { useRouter } from "next/navigation";
import { Html5Qrcode } from "html5-qrcode";

export default function SendPage() {
  const router = useRouter();

  const [user, setUser] = useState<any>(null);
  const [receiverUid, setReceiverUid] = useState("");
  const [amount, setAmount] = useState("");
  const [scanning, setScanning] = useState(false);

  // 🔐 check login
  useEffect(() => {
    const auth = getAuth(app);

    const unsub = onAuthStateChanged(auth, (u) => {
      if (!u) {
        router.push("/login");
      } else {
        setUser(u);
      }
    });

    return () => unsub();
  }, [router]);

  // 📷 scan QR
  const startScan = async () => {
    setScanning(true);

    const scanner = new Html5Qrcode("reader");

    try {
     await scanner.start(
  { facingMode: "environment" },
  { fps: 10, qrbox: { width: 250, height: 250 } },
  async (decodedText: string) => {
    setReceiverUid(decodedText);
    await scanner.stop();
    setScanning(false);
  },
  (errorMessage: string) => {
    // bỏ qua lỗi scan liên tục
  }
);
    } catch (err) {
      console.error(err);
      alert("Camera error");
      setScanning(false);
    }
  };

  // 💸 send token
  async function sendToken() {
    if (!user) return alert("Login first");

    const idToken = await user.getIdToken();

    const res = await fetch("/api/send-token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        idToken,
        receiverUid,
        merchantId: "SYLO",
        amount: Number(amount),
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.error || "Send failed");
      return;
    }

    alert("Send success!");
    router.push("/wallet");
  }

  return (
    <div style={{ padding: 20 }}>
      <h1>Send Token</h1>

      <button onClick={startScan}>📷 Scan QR</button>

      {/* 👇 QUAN TRỌNG */}
      {scanning && <div id="reader" style={{ width: 300, marginTop: 20 }} />}

      <input
        placeholder="Receiver UID"
        value={receiverUid}
        onChange={(e) => setReceiverUid(e.target.value)}
        style={{ display: "block", marginTop: 10 }}
      />

      <input
        placeholder="Amount"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        style={{ display: "block", marginTop: 10 }}
      />

      <button onClick={sendToken} style={{ marginTop: 10 }}>
        Send
      </button>
    </div>
  );
}