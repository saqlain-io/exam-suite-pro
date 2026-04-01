import crypto from "crypto";

export function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password + "sfoes_salt").digest("hex");
}

export function verifyPassword(password: string, hash: string): boolean {
  return hashPassword(password) === hash;
}

export function generateToken(userId: number, role: string): string {
  const payload = JSON.stringify({ userId, role, ts: Date.now() });
  const sig = crypto.createHash("sha256").update(payload + process.env.SESSION_SECRET).digest("hex");
  return Buffer.from(payload).toString("base64") + "." + sig;
}

export function verifyToken(token: string): { userId: number; role: string } | null {
  try {
    const [payloadB64, sig] = token.split(".");
    const payload = Buffer.from(payloadB64, "base64").toString();
    const expected = crypto.createHash("sha256").update(payload + process.env.SESSION_SECRET).digest("hex");
    if (sig !== expected) return null;
    return JSON.parse(payload);
  } catch {
    return null;
  }
}
