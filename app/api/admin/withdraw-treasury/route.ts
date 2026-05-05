import { NextResponse } from "next/server";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import bcrypt from "bcryptjs";

if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
  });
}

const adminAuth = getAuth();
const db = getFirestore();

const MAX_WITHDRAW = 1000;

const RATE_LIMIT = 5;
const RATE_WINDOW = 60 * 1000; // 1 minute

const FAILS_BEFORE_LOCK = 2;
const FIRST_LOCK_TIME = 30 * 60 * 1000; // 30 minutes
const SECOND_LOCK_TIME = 60 * 60 * 1000; // 1 hour

export async function POST(req: Request) {
  try {
    const { idToken, amount, pin } = await req.json();

    const ip =
      req.headers.get("x-forwarded-for") ||
      req.headers.get("x-real-ip") ||
      "unknown";

    const userAgent = req.headers.get("user-agent") || "unknown";

    if (!idToken || amount === undefined || !pin) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const withdrawAmount = Number(amount);

    if (!Number.isFinite(withdrawAmount) || withdrawAmount <= 0) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }

    if (withdrawAmount > MAX_WITHDRAW) {
      return NextResponse.json(
        { error: `Max withdraw is ${MAX_WITHDRAW} SYLO per time` },
        { status: 400 }
      );
    }
     console.log("WITHDRAW DEBUG:", {
  hasIdToken: !!idToken,
  tokenLength: idToken?.length,
  projectId: process.env.FIREBASE_PROJECT_ID,
  hasClientEmail: !!process.env.FIREBASE_CLIENT_EMAIL,
  hasPrivateKey: !!process.env.FIREBASE_PRIVATE_KEY,
  privateKeyStart: process.env.FIREBASE_PRIVATE_KEY?.slice(0, 25),
    });


    const decoded = await adminAuth.verifyIdToken(idToken, true);

    const superAdminUid = process.env.SUPER_ADMIN_UID;
    const pinHash = process.env.ADMIN_WITHDRAW_PIN_HASH;

    if (!superAdminUid || !pinHash) {
      return NextResponse.json(
        { error: "Server security env missing" },
        { status: 500 }
      );
    }

    if (decoded.uid !== superAdminUid) {
      await db.collection("adminLogs").add({
        type: "withdraw_blocked_not_super_admin",
        adminUid: decoded.uid,
        adminEmail: decoded.email || "",
        amount: withdrawAmount,
        ip,
        device: userAgent,
        status: "blocked",
        createdAt: new Date().toISOString(),
      });

      return NextResponse.json({ error: "Super admin only" }, { status: 403 });
    }

    const adminSnap = await db.collection("users").doc(decoded.uid).get();

    if (!adminSnap.exists || adminSnap.data()?.role !== "admin") {
      return NextResponse.json({ error: "Admin only" }, { status: 403 });
    }

    const now = Date.now();

    // RATE LIMIT: max 5 requests / 1 minute
    const rateRef = db.collection("adminRateLimit").doc(decoded.uid);
    const rateSnap = await rateRef.get();
    const rateData = rateSnap.exists ? rateSnap.data() || {} : {};
    const rateWindowStart = Number(rateData.windowStart || 0);
    const rateCount = Number(rateData.count || 0);

    if (now - rateWindowStart < RATE_WINDOW && rateCount >= RATE_LIMIT) {
      await db.collection("adminLogs").add({
        type: "withdraw_rate_limited",
        adminUid: decoded.uid,
        adminEmail: decoded.email || "",
        amount: withdrawAmount,
        ip,
        device: userAgent,
        status: "blocked",
        createdAt: new Date().toISOString(),
      });

      return NextResponse.json(
        { error: "Too many requests. Wait 1 minute." },
        { status: 429 }
      );
    }

    if (now - rateWindowStart >= RATE_WINDOW) {
      await rateRef.set({
        count: 1,
        windowStart: now,
        updatedAt: new Date().toISOString(),
      });
    } else {
      await rateRef.set(
        {
          count: rateCount + 1,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
    }

    // LOCK CHECK
    const lockRef = db.collection("adminLocks").doc(decoded.uid);
    const lockSnap = await lockRef.get();
    const lockData = lockSnap.exists ? lockSnap.data() || {} : {};
    const lockUntil = Number(lockData.lockUntil || 0);

    if (lockUntil > now) {
      const minutesLeft = Math.ceil((lockUntil - now) / 60000);

      await db.collection("adminLogs").add({
        type: "withdraw_blocked_locked",
        adminUid: decoded.uid,
        adminEmail: decoded.email || "",
        amount: withdrawAmount,
        ip,
        device: userAgent,
        minutesLeft,
        status: "blocked",
        createdAt: new Date().toISOString(),
      });

      return NextResponse.json(
        { error: `Account locked. Try again in ${minutesLeft} minutes.` },
        { status: 403 }
      );
    }

    // PIN CHECK
    const pinOk = await bcrypt.compare(String(pin), pinHash);

    if (!pinOk) {
      const failRef = db.collection("adminFails").doc(decoded.uid);
      const failSnap = await failRef.get();
      const failData = failSnap.exists ? failSnap.data() || {} : {};

      const fails = Number(failData.count || 0) + 1;
      const lockLevel = Number(failData.lockLevel || 0);

      await failRef.set(
        {
          count: fails,
          lockLevel,
          lastFailedAt: new Date().toISOString(),
          ip,
          device: userAgent,
        },
        { merge: true }
      );

      await db.collection("adminLogs").add({
        type: "withdraw_pin_failed",
        adminUid: decoded.uid,
        adminEmail: decoded.email || "",
        amount: withdrawAmount,
        fails,
        lockLevel,
        ip,
        device: userAgent,
        status: "blocked",
        createdAt: new Date().toISOString(),
      });

      if (fails >= FAILS_BEFORE_LOCK) {
        const nextLockLevel = lockLevel + 1;
        const lockDuration =
          nextLockLevel >= 2 ? SECOND_LOCK_TIME : FIRST_LOCK_TIME;

        await lockRef.set(
          {
            lockUntil: now + lockDuration,
            lockLevel: nextLockLevel,
            reason: "wrong_pin",
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );

        await failRef.set(
          {
            count: 0,
            lockLevel: nextLockLevel,
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );

        return NextResponse.json(
          {
            error:
              nextLockLevel >= 2
                ? "Wrong PIN twice. Locked 1 hour."
                : "Wrong PIN twice. Locked 30 minutes.",
          },
          { status: 403 }
        );
      }

      return NextResponse.json(
        { error: `Wrong PIN (${fails}/${FAILS_BEFORE_LOCK})` },
        { status: 403 }
      );
    }

    // PIN OK: reset fail count, keep lockLevel history
    await db.collection("adminFails").doc(decoded.uid).set(
      {
        count: 0,
        lastSuccessAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );

    const treasuryRef = db.collection("system").doc("treasury");
    const adminWalletRef = db.collection("wallets").doc(decoded.uid);
    const txRef = db.collection("transactions").doc();
    const logRef = db.collection("adminLogs").doc();

    await db.runTransaction(async (tx) => {
      const treasurySnap = await tx.get(treasuryRef);
      const walletSnap = await tx.get(adminWalletRef);

      if (!treasurySnap.exists) {
        throw new Error("Treasury not found");
      }

      const treasuryData = treasurySnap.data() || {};
      const treasuryBalance = Number(treasuryData.balance || 0);

      if (treasuryBalance < withdrawAmount) {
        throw new Error("Treasury not enough balance");
      }

      const walletData = walletSnap.exists ? walletSnap.data() || {} : {};
      const balances = walletData.balances || {};
      const currentAdminSylo = Number(balances.SYLO || 0);

      tx.set(
        treasuryRef,
        {
          balance: treasuryBalance - withdrawAmount,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );

      tx.set(
        adminWalletRef,
        {
          balances: {
            ...balances,
            SYLO: currentAdminSylo + withdrawAmount,
          },
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );

      tx.set(txRef, {
        type: "treasury_withdraw_admin",
        adminUid: decoded.uid,
        adminEmail: decoded.email || "",
        token: "SYLO",
        amount: withdrawAmount,
        status: "completed",
        createdAt: new Date().toISOString(),
      });

      tx.set(logRef, {
        type: "treasury_withdraw_admin",
        adminUid: decoded.uid,
        adminEmail: decoded.email || "",
        amount: withdrawAmount,
        token: "SYLO",
        ip,
        device: userAgent,
        alert: withdrawAmount >= 500,
        status: "completed",
        createdAt: new Date().toISOString(),
      });
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("ADMIN WITHDRAW TREASURY ERROR:", error);

    return NextResponse.json(
      { error: error.message || "Server error" },
      { status: 500 }
    );
  }
}