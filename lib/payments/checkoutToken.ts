import crypto from "crypto";

function secret() {
  const value = process.env.JWT_SECRET;
  if (!value) throw new Error("JWT_SECRET is not configured.");
  return value;
}

// Binds an opaque checkout link to one specific (bookingId, txnid) pair. The client
// only ever holds this token plus the bookingId - never the amount, PayU merchant key,
// action URL or return URLs - so editing the query string cannot change what gets
// charged or where the form posts to. Rotating the txnid (a PayU retry) invalidates
// every previously issued token for that booking automatically, since the token is a
// function of the current txnid.
export function signCheckoutToken(bookingId: string, txnid: string) {
  return crypto.createHmac("sha256", secret()).update(`${bookingId}:${txnid}`).digest("hex").slice(0, 32);
}

export function verifyCheckoutToken(bookingId: string, txnid: string, token: string) {
  if (!token) return false;
  const expected = signCheckoutToken(bookingId, txnid);
  if (expected.length !== token.length) return false;
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(token));
}
