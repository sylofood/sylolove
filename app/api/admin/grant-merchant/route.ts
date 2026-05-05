import { NextResponse } from "next/server";
import admin from "firebase-admin";

export const runtime = "nodejs";

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
  });
}

const db = admin.firestore();

export async function POST(req: Request) {
  try {
    const { idToken, merchantId, amount } = await req.json();

    if (!idToken || !merchantId || !amount) {
      return NextResponse.json(
        { error: "Missing idToken, merchantId, or amount" },
        { status: 400 }
      );
    }

    const amountNumber = Number(amount);

    if (!Number.isFinite(amountNumber) || amountNumber <= 0) {
      return NextResponse.json(
        { error: "Invalid amount" },
        { status: 400 }
      );
    }

    const decoded = await admin.auth().verifyIdToken(idToken);
    const adminUid = decoded.uid;

    const adminSnap = await db.collection("users").doc(adminUid).get();

    if (!adminSnap.exists || adminSnap.data()?.role !== "admin") {
      return NextResponse.json(
        { error: "Admin only" },
        { status: 403 }
      );
    }

    const merchantRef = db.collection("merchants").doc(merchantId);
    const merchantSnap = await merchantRef.get();

    if (!merchantSnap.exists) {
      return NextResponse.json(
        { error: "Merchant not found" },
        { status: 404 }
      );
    }

    const merchantData = merchantSnap.data() || {};
    const ownerUid = merchantData.ownerUid;

    if (!ownerUid) {
      return NextResponse.json(
        { error: "Merchant missing ownerUid" },
        { status: 400 }
      );
    }

    const merchantWalletRef = db.collection("merchantWallets").doc(merchantId);
    const userWalletRef = db.collection("wallets").doc(ownerUid);

    await db.runTransaction(async (tx) => {
      const merchantWalletSnap = await tx.get(merchantWalletRef);
      const userWalletSnap = await tx.get(userWalletRef);

      const currentMerchantSylo =
        Number(merchantWalletSnap.data()?.balances?.SYLO || 0);

      const currentUserSylo =
        Number(userWalletSnap.data()?.balances?.SYLO || 0);

      tx.set(
        merchantWalletRef,
        {
          merchantId,
          ownerUid,
          balances: {
            SYLO: currentMerchantSylo + amountNumber,
          },
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      tx.set(
        userWalletRef,
        {
          balances: {
            SYLO: currentUserSylo + amountNumber,
          },
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      const txRef = db.collection("transactions").doc();

      tx.set(txRef, {
        type: "admin_grant_merchant",
        token: "SYLO",
        amount: amountNumber,
        merchantId,
        merchantOwnerUid: ownerUid,
        receiverUid: ownerUid,
        adminUid,
        status: "completed",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      const logRef = db.collection("adminLogs").doc();

      tx.set(logRef, {
        type: "grant_merchant_sylo",
        merchantId,
        ownerUid,
        amount: amountNumber,
        adminUid,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    });

    return NextResponse.json({
      success: true,
      message: "Merchant funded successfully",
      merchantId,
      ownerUid,
      amount: amountNumber,
    });
  } catch (err: any) {
    console.error("GRANT MERCHANT ERROR:", err);

    return NextResponse.json(
      { error: err?.message || "Grant merchant failed" },
      { status: 500 }
    );
  }
}