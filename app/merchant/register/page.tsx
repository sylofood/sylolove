"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db, storage } from "../../../lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import {
  addDoc,
  collection,
  getDocs,
  query,
  serverTimestamp,
  where,
} from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";

const MAX_FILE_SIZE = 2 * 1024 * 1024;
const ALLOWED_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp"];

export default function MerchantRegisterPage() {
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [businessName, setBusinessName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [stateValue, setStateValue] = useState("");
  const [zip, setZip] = useState("");
  const [licenseFile, setLicenseFile] = useState<File | null>(null);
  const [acceptedPolicy, setAcceptedPolicy] = useState(false);
  const [showPolicy, setShowPolicy] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (!u) {
        router.push("/login");
        return;
      }
      setUser(u);
      setLoading(false);
    });

    return () => unsub();
  }, [router]);

  const validateFile = (file: File) => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      alert("Only PDF, JPG, PNG, or WEBP files are allowed.");
      return false;
    }

    if (file.size > MAX_FILE_SIZE) {
      alert("File too large. Max size is 2MB.");
      return false;
    }

    return true;
  };

  const submitApplication = async () => {
    if (!user) return alert("Login first");

    if (
      !businessName.trim() ||
      !ownerName.trim() ||
      !phone.trim() ||
      !address.trim() ||
      !city.trim() ||
      !stateValue.trim() ||
      !zip.trim() ||
      !licenseFile
    ) {
      return alert("Please fill all fields and upload business license.");
    }

    if (!acceptedPolicy) {
      return alert("You must accept the Merchant Responsibility Policy.");
    }

    if (!validateFile(licenseFile)) return;

    setSubmitting(true);

    try {
      console.log("STEP 1 start submit");
      console.log("STEP 2 user", user.uid);
      console.log("STEP 3 file", licenseFile.name, licenseFile.type, licenseFile.size);

      const existingQ = query(
        collection(db, "merchantApplications"),
        where("ownerUid", "==", user.uid),
        where("status", "==", "pending")
      );

      const existingSnap = await getDocs(existingQ);

      if (!existingSnap.empty) {
        alert("You already have a pending merchant application.");
        return;
      }

      const safeFileName = licenseFile.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const filePath = `licenses/${user.uid}/${Date.now()}-${safeFileName}`;
      const fileRef = ref(storage, filePath);

      console.log("STEP 4 uploading to", filePath);

    const uploadPromise = uploadBytes(fileRef, licenseFile, {
  contentType: licenseFile.type,
});

const timeoutPromise = new Promise((_, reject) => {
  setTimeout(() => {
    reject(new Error("Upload timeout - Firebase Storage failed"));
  }, 15000);
});

await Promise.race([uploadPromise, timeoutPromise]);

      console.log("STEP 5 upload done");

      const licenseUrl = await getDownloadURL(fileRef);

      console.log("STEP 6 url", licenseUrl);

      await addDoc(collection(db, "merchantApplications"), {
        ownerUid: user.uid,
        email: user.email || "",
        businessName: businessName.trim(),
        ownerName: ownerName.trim(),
        phone: phone.trim(),
        address: address.trim(),
        city: city.trim(),
        state: stateValue.trim(),
        zip: zip.trim(),
        licenseUrl,
        licensePath: filePath,
        status: "pending",
        acceptedPolicy: true,
        policyAcceptedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      console.log("STEP 7 merchantApplications created");

      await addDoc(collection(db, "adminNotifications"), {
        type: "merchant_application",
        title: "New Merchant Application",
        message: `${businessName.trim()} submitted a merchant application.`,
        ownerUid: user.uid,
        email: user.email || "",
        status: "unread",
        createdAt: serverTimestamp(),
      });

  console.log("STEP 8 adminNotifications created");

try {
  const notifyRes = await fetch("/api/notify-admin/merchant-application", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      businessName: businessName.trim(),
      ownerName: ownerName.trim(),
      email: user.email || "",
      phone: phone.trim(),
      address: address.trim(),
      city: city.trim(),
      state: stateValue.trim(),
      zip: zip.trim(),
    }),
  });

  const notifyData = await notifyRes.json();

  if (!notifyRes.ok) {
    console.error("NOTIFY ADMIN ERROR:", notifyData);
  } else {
    console.log("STEP 9 notify-admin API called", notifyData);
  }
} catch (notifyErr) {
  console.error("EMAIL NOTIFY FAILED BUT APPLICATION WAS SAVED:", notifyErr);
}

alert("Application submitted ✅ Waiting for admin approval.");
router.push("/wallet");
    } catch (err: any) {
      console.error("MERCHANT APPLICATION ERROR:", err);
      alert((err?.code ? err.code + "\n" : "") + (err?.message || "Submit failed. Please try again."));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <main style={styles.page}>Loading...</main>;
  }

  return (
    <main style={styles.page}>
      <section style={styles.card}>
        <div style={styles.logo}>SYLO</div>

        <h1 style={styles.title}>Merchant Application</h1>
        <p style={styles.subtitle}>
          Submit your business information. Admin will review and approve your merchant access.
        </p>

        <div style={styles.userBox}>
          <p style={styles.label}>Logged in as</p>
          <p style={styles.email}>{user?.email}</p>
        </div>

        <input style={styles.input} placeholder="Business Name" value={businessName} onChange={(e) => setBusinessName(e.target.value)} />
        <input style={styles.input} placeholder="Owner Name" value={ownerName} onChange={(e) => setOwnerName(e.target.value)} />
        <input style={styles.input} placeholder="Phone" value={phone} inputMode="tel" onChange={(e) => setPhone(e.target.value)} />
        <input style={styles.input} placeholder="Business Address" value={address} onChange={(e) => setAddress(e.target.value)} />
        <input style={styles.input} placeholder="City" value={city} onChange={(e) => setCity(e.target.value)} />
        <input style={styles.input} placeholder="State" value={stateValue} onChange={(e) => setStateValue(e.target.value)} />
        <input style={styles.input} placeholder="ZIP" value={zip} inputMode="numeric" onChange={(e) => setZip(e.target.value)} />

        <div style={styles.uploadBox}>
          <p style={styles.uploadTitle}>Business License</p>
          <p style={styles.uploadNote}>PDF, JPG, PNG, WEBP only. Max 2MB.</p>

          <input
            type="file"
            accept="application/pdf,image/jpeg,image/png,image/webp"
            style={styles.fileInput}
            onChange={(e) => {
              const file = e.target.files?.[0] || null;
              if (file && !validateFile(file)) {
                e.target.value = "";
                setLicenseFile(null);
                return;
              }
              setLicenseFile(file);
            }}
          />

          {licenseFile && <p style={styles.fileName}>Selected: {licenseFile.name}</p>}
        </div>

        <div style={styles.policyBox}>
          <button
            type="button"
            style={styles.policyToggle}
            onClick={() => setShowPolicy(!showPolicy)}
          >
            {showPolicy ? "Hide Policy" : "Read Merchant Responsibility Policy"}
          </button>

          {showPolicy && (
            <div style={styles.policyContent}>
              <h3 style={styles.policyTitle}>Merchant Responsibility Policy</h3>

              <p style={styles.policyText}>
                By applying as a SYLO merchant, your business agrees to be responsible
                for all tokens issued, received, transferred, redeemed, or managed
                under your merchant account.
              </p>

              <p style={styles.policyText}>
                The merchant must keep accurate customer records, track token activity,
                protect customer information, and maintain proof of customer-related
                transactions when needed.
              </p>

              <p style={styles.policyText}>
                The merchant accepts responsibility for any loss, misuse, dispute,
                customer complaint, fraud, damage, missing balance, incorrect transfer,
                or financial harm caused by the merchant, its employees, its customers,
                or activity connected to the merchant account.
              </p>
            </div>
          )}

          <label style={styles.checkRow}>
            <input
              type="checkbox"
              checked={acceptedPolicy}
              onChange={(e) => setAcceptedPolicy(e.target.checked)}
            />
            <span>I have read and agree to the Merchant Responsibility Policy.</span>
          </label>
        </div>

        <button style={styles.submitButton} onClick={submitApplication} disabled={submitting}>
          {submitting ? "Submitting..." : "Submit Application"}
        </button>

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
    padding: 18,
    fontFamily: "Arial, sans-serif",
  },
  card: {
    background: "#111827",
    border: "1px solid #334155",
    borderRadius: 26,
    padding: 20,
    maxWidth: 520,
    margin: "20px auto",
  },
  logo: {
    width: 90,
    height: 90,
    borderRadius: "50%",
    border: "5px solid #facc15",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 900,
    fontSize: 22,
    background: "#0f172a",
    boxShadow: "0 0 24px #facc15",
    margin: "0 auto 20px",
  },
  title: {
    color: "#facc15",
    fontSize: 34,
    fontWeight: 900,
    margin: 0,
    textAlign: "center",
  },
  subtitle: {
    color: "#cbd5e1",
    fontSize: 17,
    fontWeight: 800,
    lineHeight: 1.35,
    marginBottom: 20,
    textAlign: "center",
  },
  userBox: {
    background: "#0f172a",
    border: "1px solid #334155",
    borderRadius: 18,
    padding: 14,
    marginBottom: 16,
  },
  label: {
    color: "#94a3b8",
    fontSize: 13,
    fontWeight: 900,
    textTransform: "uppercase",
    margin: 0,
  },
  email: {
    fontSize: 16,
    fontWeight: 900,
    marginTop: 6,
    wordBreak: "break-word",
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
  uploadBox: {
    background: "#020617",
    border: "1px solid #334155",
    borderRadius: 18,
    padding: 14,
    marginBottom: 16,
  },
  uploadTitle: {
    color: "#facc15",
    fontSize: 18,
    fontWeight: 900,
    margin: 0,
  },
  uploadNote: {
    color: "#cbd5e1",
    fontSize: 14,
    fontWeight: 800,
  },
  fileInput: {
    width: "100%",
    color: "white",
    fontSize: 15,
    fontWeight: 800,
  },
  fileName: {
    color: "#86efac",
    fontSize: 14,
    fontWeight: 800,
    wordBreak: "break-word",
  },
  policyBox: {
    background: "#020617",
    border: "1px solid #334155",
    borderRadius: 18,
    padding: 14,
    marginBottom: 16,
  },
  policyToggle: {
    width: "100%",
    padding: 14,
    borderRadius: 14,
    border: "1px solid #facc15",
    background: "#111827",
    color: "#facc15",
    fontSize: 17,
    fontWeight: 900,
    marginBottom: 12,
  },
  policyContent: {
    background: "#030712",
    border: "1px solid #334155",
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
  },
  policyTitle: {
    color: "#facc15",
    fontSize: 20,
    fontWeight: 900,
    marginTop: 0,
  },
  policyText: {
    color: "#cbd5e1",
    fontSize: 14,
    fontWeight: 800,
    lineHeight: 1.45,
  },
  checkRow: {
    display: "flex",
    gap: 10,
    alignItems: "flex-start",
    color: "white",
    fontSize: 15,
    fontWeight: 900,
  },
  submitButton: {
    width: "100%",
    padding: 16,
    borderRadius: 16,
    border: "none",
    background: "linear-gradient(90deg,#f97316,#facc15)",
    color: "#111827",
    fontSize: 18,
    fontWeight: 900,
    marginBottom: 12,
  },
  backButton: {
    width: "100%",
    padding: 16,
    borderRadius: 16,
    background: "#0f172a",
    color: "white",
    border: "1px solid #334155",
    fontSize: 18,
    fontWeight: 900,
  },
};