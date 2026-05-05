import { NextResponse } from "next/server";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
  });
}

const adminAuth = getAuth();
const adminDb = getFirestore();

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const { idToken, receiverUid, merchantId, amount } = body;

    if (!idToken) {
      return NextResponse.json({ error: "No token" }, { status: 401 });
    }

    if (!receiverUid || !merchantId || amount === undefined) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    if (merchantId !== "SYLO") {
      return NextResponse.json({ error: "Invalid token type" }, { status: 400 });
    }

    const sendAmount = Number(amount);

    if (!Number.isFinite(sendAmount) || sendAmount <= 0) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }

    if (sendAmount > 10000) {
      return NextResponse.json({ error: "Amount too large" }, { status: 400 });
    }

    const decoded = await adminAuth.verifyIdToken(idToken);
    const senderUid = decoded.uid;

    if (senderUid === receiverUid) {
      return NextResponse.json(
        { error: "Cannot send to yourself" },
        { status: 400 }
      );
    }

    const senderRef = adminDb.collection("wallets").doc(senderUid);
    const receiverRef = adminDb.collection("wallets").doc(receiverUid);
    const txRef = adminDb.collection("transactions").doc();

    await adminDb.runTransaction(async (transaction) => {
      const senderSnap = await transaction.get(senderRef);
      const receiverSnap = await transaction.get(receiverRef);

      if (!senderSnap.exists) {
        throw new Error("Sender wallet not found");
      }

      if (!receiverSnap.exists) {
        throw new Error("Receiver wallet not found");
      }

      const senderData = senderSnap.data() || {};
      const receiverData = receiverSnap.data() || {};

      const senderBalances = senderData.balances || {};
      const receiverBalances = receiverData.balances || {};

      const senderCurrent = Number(senderBalances[merchantId] || 0);
      const receiverCurrent = Number(receiverBalances[merchantId] || 0);

      if (senderCurrent < sendAmount) {
        throw new Error("Not enough balance");
      }

      transaction.set(
        senderRef,
        {
          balances: {
            ...senderBalances,
            [merchantId]: senderCurrent - sendAmount,
          },
        },
        { merge: true }
      );

      transaction.set(
        receiverRef,
        {
          balances: {
            ...receiverBalances,
            [merchantId]: receiverCurrent + sendAmount,
          },
        },
        { merge: true }
      );

      transaction.set(txRef, {
        senderUid,
        receiverUid,
        merchantId,
        amount: sendAmount,
        type: "send",
        status: "completed",
        createdAt: new Date().toISOString(),
      });
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("SEND TOKEN ERROR:", error);

    return NextResponse.json(
      { error: error.message || "Server error" },
      { status: 500 }
    );
  }
}