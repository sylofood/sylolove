import { NextResponse } from "next/server";
import admin from "firebase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId:
        process.env.FIREBASE_ADMIN_PROJECT_ID || process.env.FIREBASE_PROJECT_ID,
      clientEmail:
        process.env.FIREBASE_ADMIN_CLIENT_EMAIL || process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: (
        process.env.FIREBASE_ADMIN_PRIVATE_KEY ||
        process.env.FIREBASE_PRIVATE_KEY ||
        ""
      ).replace(/\\n/g, "\n"),
    }),
  });
}

const db = admin.firestore();

function makeMerchantId(name: string, uid: string) {
  const cleanName =
    name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 35) || "merchant";

  return `${cleanName}-${uid.slice(0, 6)}`;
}

export async function POST(req: Request) {
  try {
    console.log("APPROVE MERCHANT API CALLED");

    const { idToken, applicationId } = await req.json();

    if (!idToken || !applicationId) {
      return NextResponse.json(
        { error: "Missing idToken or applicationId" },
        { status: 400 }
      );
    }

    const decoded = await admin.auth().verifyIdToken(idToken);
    const adminUid = decoded.uid;

    const adminSnap = await db.collection("users").doc(adminUid).get();

    if (!adminSnap.exists || adminSnap.data()?.role !== "admin") {
      return NextResponse.json({ error: "Admin only" }, { status: 403 });
    }

    const appRef = db.collection("merchantApplications").doc(applicationId);

    let merchantId = "";

    await db.runTransaction(async (tx) => {
      const appSnap = await tx.get(appRef);

      if (!appSnap.exists) {
        throw new Error("Application not found");
      }

      const appData: any = appSnap.data();

      const ownerUid = appData.ownerUid;
      const businessName = appData.businessName || "merchant";

      if (!ownerUid) {
        throw new Error("Application missing ownerUid");
      }

      if (appData.status === "approved" && appData.merchantId) {
        merchantId = appData.merchantId;
        return;
      }

      merchantId = makeMerchantId(businessName, ownerUid);

      const merchantRef = db.collection("merchants").doc(merchantId);
      const merchantWalletRef = db.collection("merchantWallets").doc(merchantId);
      const userRef = db.collection("users").doc(ownerUid);
      const userWalletRef = db.collection("wallets").doc(ownerUid);
      const logRef = db.collection("adminLogs").doc();

      tx.set(
        merchantRef,
        {
          merchantId,
          ownerUid,
          email: appData.email || "",
          businessName,
          name: businessName,
          ownerName: appData.ownerName || "",
          phone: appData.phone || "",
          address: appData.address || "",
          city: appData.city || "",
          state: appData.state || "",
          zip: appData.zip || "",
          licenseUrl: appData.licenseUrl || "",
          licensePath: appData.licensePath || "",
          status: "active",
          approvedBy: adminUid,
          approvedAt: admin.firestore.FieldValue.serverTimestamp(),
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      tx.set(
        merchantWalletRef,
        {
          merchantId,
          ownerUid,
          balances: {
            SYLO: 0,
          },
          status: "active",
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      tx.set(
        userWalletRef,
        {
          balances: {
            SYLO: 0,
          },
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      tx.set(
        userRef,
        {
          role: "merchant",
          merchantIds: admin.firestore.FieldValue.arrayUnion(merchantId),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      tx.update(appRef, {
        status: "approved",
        merchantId,
        approvedBy: adminUid,
        approvedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      tx.set(logRef, {
        type: "merchant_approved",
        applicationId,
        merchantId,
        ownerUid,
        adminUid,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    });

    console.log("MERCHANT APPROVED:", merchantId);

    return NextResponse.json({
      success: true,
      merchantId,
      message: "Merchant approved and created",
    });
  } catch (err: any) {
    console.error("APPROVE MERCHANT ERROR:", err);

    return NextResponse.json(
      { error: err?.message || "Approve merchant failed" },
      { status: 500 }
    );
  }
}