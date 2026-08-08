import bcrypt from "bcrypt";
import { randomBytes, randomInt } from "crypto";

const BCRYPT_ROUNDS = 12;

export class EncryptionService {
  async hash(value: string): Promise<string> {
    if (!value) {
      throw new Error(
        "Value is required for hashing."
      );
    }

    return bcrypt.hash(
      value,
      BCRYPT_ROUNDS
    );
  }

  async verify(
    value: string,
    hashed: string
  ): Promise<boolean> {
    if (!value || !hashed) {
      return false;
    }

    return bcrypt.compare(
      value,
      hashed
    );
  }

  generateToken(length = 64): string {
    const byteLength =
      Math.max(
        32,
        Math.ceil(length * 0.75)
      );

    return randomBytes(byteLength)
      .toString("base64url")
      .slice(0, length);
  }

  generateOTP(length = 6): string {
    if (
      length < 4 ||
      length > 10
    ) {
      throw new Error(
        "OTP length must be between 4 and 10."
      );
    }

    const minimum =
      10 ** (length - 1);

    const maximum =
      10 ** length;

    return randomInt(
      minimum,
      maximum
    ).toString();
  }
}

export const encryptionService =
  new EncryptionService();