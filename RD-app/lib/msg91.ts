// lib/msg91.ts
//
// Thin wrapper around MSG91's OTP API (v5).
//
// SETUP REQUIRED (one-time, in your MSG91 dashboard - https://control.msg91.com):
// 1. Sign up, add funds to your wallet (a small amount is enough to start
//    testing - MSG91 does not offer a free trial for OTP/SMS).
// 2. Complete DLT registration (mandatory in India for transactional SMS).
//    MSG91's dashboard walks you through this; it can take 1-2 days for
//    approval.
// 3. Create an OTP template under Dashboard -> OTP -> Templates. It must
//    contain the placeholder "##OTP##" somewhere, e.g.:
//      "Your Raj Dhanvarsha verification code is ##OTP##. Valid for 5 minutes."
//    Save it and copy the Template ID.
// 4. Copy your Auth Key from Dashboard -> API -> Auth Key.
// 5. Add these to RD-app/.env.local (never commit this file):
//
//    MSG91_AUTH_KEY=your_auth_key_here
//    MSG91_TEMPLATE_ID=your_template_id_here
//
// MSG91 also generates and checks the OTP itself server-side on their end,
// so we don't need our own OTP store for this flow - verify-otp just asks
// MSG91 "was this the code you sent this number?".

const MSG91_BASE_URL = "https://control.msg91.com/api/v5/otp";

function requireEnv() {
  const authKey = process.env.MSG91_AUTH_KEY;
  const templateId = process.env.MSG91_TEMPLATE_ID;

  if (!authKey || !templateId) {
    throw new Error(
      "MSG91_AUTH_KEY / MSG91_TEMPLATE_ID are not set. Add them to .env.local (see lib/msg91.ts for setup steps)."
    );
  }

  return { authKey, templateId };
}

/** phone10 is a bare 10-digit Indian mobile number, e.g. "8950146583" */
export async function sendMsg91Otp(phone10: string) {
  const { authKey, templateId } = requireEnv();
  const mobile = `91${phone10}`; // MSG91 wants country code with no "+"

  const url = `${MSG91_BASE_URL}?template_id=${encodeURIComponent(
    templateId
  )}&mobile=${mobile}&authkey=${encodeURIComponent(authKey)}&otp_length=6`;

  const res = await fetch(url, { method: "POST" });
  const data = await res.json();

  // MSG91 returns { type: "success" } or { type: "error", message: "..." }
  if (data.type !== "success") {
    throw new Error(data.message || "MSG91 could not send the OTP.");
  }

  return data;
}

export async function verifyMsg91Otp(phone10: string, otp: string) {
  const { authKey } = requireEnv();
  const mobile = `91${phone10}`;

  const url = `${MSG91_BASE_URL}/verify?mobile=${mobile}&otp=${encodeURIComponent(
    otp
  )}&authkey=${encodeURIComponent(authKey)}`;

  const res = await fetch(url, { method: "GET" });
  const data = await res.json();

  if (data.type !== "success") {
    throw new Error(data.message || "Incorrect OTP.");
  }

  return data;
}
