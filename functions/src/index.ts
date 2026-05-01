import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

admin.initializeApp();

const db = admin.firestore();

type SendTokenData = {
  orderId?: string;
};

type OrderData = {
  userId?: string;
  status?: string;
};

export const sendToken = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Login required");
  }

  const uid = request.auth.uid;
  const data = request.data as SendTokenData;
  const orderId = data.orderId;

  if (!orderId || typeof orderId !== "string") {
    throw new HttpsError("invalid-argument", "Missing orderId");
  }

  const orderRef = db.collection("orders").doc(orderId);

  await db.runTransaction(async (transaction) => {
    const orderSnap = await transaction.get(orderRef);

    if (!orderSnap.exists) {
      throw new HttpsError("not-found", "Order not found");
    }

    const order = orderSnap.data() as OrderData;

    if (!order || order.userId !== uid) {
      throw new HttpsError("permission-denied", "Not your token");
    }

    if (order.status === "sent") {
      throw new HttpsError("failed-precondition", "Already sent");
    }

    transaction.update(orderRef, {
      status: "sent",
      sentAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  });

  return {
    success: true,
  };
});