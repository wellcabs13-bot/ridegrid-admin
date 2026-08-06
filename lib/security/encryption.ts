export class EncryptionService {
  async hash(value: string): Promise<string> {
    const data = new TextEncoder().encode(value);

    const hash = await crypto.subtle.digest(
      "SHA-256",
      data
    );

    return Array.from(new Uint8Array(hash))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }

  async verify(
    value: string,
    hashed: string
  ): Promise<boolean> {
    return (await this.hash(value)) === hashed;
  }

  generateToken(length = 64) {
    const chars =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

    let token = "";

    for (let i = 0; i < length; i++) {
      token += chars.charAt(
        Math.floor(Math.random() * chars.length)
      );
    }

    return token;
  }

  generateOTP(length = 6) {
    return Math.random()
      .toString()
      .slice(2, 2 + length);
  }
}

export const encryptionService =
  new EncryptionService();