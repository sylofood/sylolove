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
    const { idToken, merchantId, receiverUid, amount } = await req.json();

    if (!idToken || !merchantId || !receiverUid || amount === undefined) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const grantAmount = Number(amount);

    if (!Number.isFinite(grantAmount) || grantAmount <= 0) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }

    if (grantAmount > 10000) {
      return NextResponse.json({ error: "Amount too large" }, { status: 400 });
    }

    const decoded = await adminAuth.verifyIdToken(idToken);
    const merchantOwnerUid = decoded.uid;

    const userSnap = await adminDb.collection("users").doc(merchantOwnerUid).get();

    if (!userSnap.exists || userSnap.data()?.role !== "merchant") {
      return NextResponse.json({ error: "Merchant only" }, { status: 403 });
    }

    const merchantRef = adminDb.collection("merchantWallets").doc(merchantId);
    const userWalletRef = adminDb.collection("wallets").doc(receiverUid);
    const txRef = adminDb.collection("transactions").doc();

    await adminDb.runTransaction(async (transaction) => {
      const merchantSnap = await transaction.get(merchantRef);
      const userWalletSnap = await transaction.get(userWalletRef);

      if (!merchantSnap.exists) {
        throw new Error("Merchant wallet not found");
      }

      if (!userWalletSnap.exists) {
        throw new Error("User wallet not found");
      }

      const merchantData = merchantSnap.data() || {};
      const userWalletData = userWalletSnap.data() || {};

      if (merchantData.ownerUid !== merchantOwnerUid) {
        throw new Error("Not allowed");
      }

      const merchantBalances = merchantData.balances || {};
      const userBalances = userWalletData.balances || {};

      const merchantCurrent = Number(merchantBalances.SYLO || 0);
      const userCurrent = Number(userBalances.SYLO || 0);

      if (merchantCurrent < grantAmount) {
        throw new Error("Merchant not enough balance");
      }

      transaction.set(
        merchantRef,
        {
          balances: {
            ...merchantBalances,
            SYLO: merchantCurrent - grantAmount,
          },
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );

      transaction.set(
        userWalletRef,
        {
          balances: {
            ...userBalances,
            SYLO: userCurrent + grantAmount,
          },
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );

      transaction.set(txRef, {
        type: "merchant_grant_user",
        merchantId,
        merchantOwnerUid,
        receiverUid,
        token: "SYLO",
        amount: grantAmount,
        status: "completed",
        createdAt: new Date().toISOString(),
      });
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("MERCHANT GRANT USER ERROR:", error);

    return NextResponse.json(
      { error: error.message || "Server error" },
      { status: 500 }
    );
  }
}