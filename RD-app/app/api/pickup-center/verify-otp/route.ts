import { NextRequest, NextResponse } from "next/server";

const MSG91_AUTH_KEY = process.env.MSG91_AUTH_KEY as string;

export async function POST(req: NextRequest) {
  try {
    const { phone, otp } = await req.json();

    if (!phone || !/^[0-9]{10}$/.test(phone)) {
      return NextResponse.json(
        { error: "Invalid phone number." },
        { status: 400 }
      );
    }
    if (!otp || !/^[0-9]{4,6}$/.test(otp)) {
      return NextResponse.json(
        { error: "Enter the OTP you received." },
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

    const url = `https://control.msg91.com/api/v5/otp/verify?otp=${otp}&mobile=${mobile}`;

    const msgRes = await fetch(url, {
      method: "GET",
      headers: { authkey: MSG91_AUTH_KEY },
    });

    const data = await msgRes.json().catch(() => ({}));

    // MSG91 returns { type: "success", message: "OTP verified success" } on success.
    if (data.type !== "success") {
      return NextResponse.json(
        { error: data.message || "Incorrect or expired OTP." },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("verify-otp error:", err);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
