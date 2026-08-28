import { NextRequest, NextResponse } from "next/server";

const MSG91_AUTH_KEY = process.env.MSG91_AUTH_KEY as string;

export async function POST(req: NextRequest) {
  try {
    const { phone } = await req.json();

    if (!phone || !/^[0-9]{10}$/.test(phone)) {
      return NextResponse.json(
        { error: "Enter a valid 10-digit phone number." },
        { status: 400 }
      );
    }

    if (!MSG91_AUTH_KEY) {
      console.error("MSG91_AUTH_KEY is not set in environment variables.");
      return NextResponse.json(
        { error: "OTP service is not configured. Please contact support." },
        { status: 500 }
      );
    }

    const mobile = `91${phone}`;
    const url = `https://control.msg91.com/api/v5/otp?template_id=&mobile=${mobile}&authkey=${MSG91_AUTH_KEY}&otp_length=6&otp_expiry=10`;

    // DEBUG: log the exact URL being called (auth key partially masked)
    console.log("=== MSG91 SEND OTP DEBUG ===");
    console.log("Calling URL:", url.replace(MSG91_AUTH_KEY, MSG91_AUTH_KEY.slice(0, 4) + "****"));

    const msgRes = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });

    console.log("MSG91 HTTP status:", msgRes.status);

    const rawText = await msgRes.text();
    console.log("MSG91 raw response body:", rawText);

    let data: any = {};
    try {
      data = JSON.parse(rawText);
    } catch {
      console.error("Could not parse MSG91 response as JSON.");
    }

    console.log("Parsed MSG91 data:", data);
    console.log("=== END DEBUG ===");

    if (data.type !== "success") {
      return NextResponse.json(
        { error: "Could not send OTP right now. Please try again." },
        { status: 502 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("send-otp error:", err);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}