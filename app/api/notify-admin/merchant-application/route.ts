import { NextResponse } from "next/server";

import { Resend } from "resend";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const apiKey = process.env.RESEND_API_KEY;

if (!apiKey) {
  throw new Error("Missing RESEND_API_KEY");
}

const resend = new Resend(apiKey);
    const data = await req.json();

    console.log("NEW MERCHANT APPLICATION:", data);

    const emailTo = process.env.ADMIN_NOTIFY_EMAIL;

    if (!emailTo) {
      throw new Error("Missing ADMIN_NOTIFY_EMAIL");
    }

    const res = await resend.emails.send({
      from: "onboarding@resend.dev",
      to: emailTo,
      subject: "🚨 New Merchant Application",
      html: `
        <h2>New Merchant Application</h2>
        <p><strong>Business:</strong> ${data.businessName}</p>
        <p><strong>Owner:</strong> ${data.ownerName}</p>
        <p><strong>Email:</strong> ${data.email}</p>
        <p><strong>Phone:</strong> ${data.phone}</p>
        <p><strong>Address:</strong> ${data.address}</p>
        <p><strong>City:</strong> ${data.city}</p>
        <p><strong>State:</strong> ${data.state}</p>
        <p><strong>ZIP:</strong> ${data.zip}</p>
      `,
    });

    console.log("EMAIL SENT:", res);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("EMAIL ERROR:", err);
    return NextResponse.json(
      { error: err.message || "Email failed" },
      { status: 500 }
    );
  }
}