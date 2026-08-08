import bcrypt from "bcrypt";
import crypto from "crypto";

const BCRYPT_ROUNDS = 12;

export interface PasswordValidation {
  valid: boolean;
  errors: string[];
}

export class PasswordService {
  async hash(
    password: string
  ): Promise<string> {
    if (!password) {
      throw new Error(
        "Password is required."
      );
    }

    return bcrypt.hash(
      password,
      BCRYPT_ROUNDS
    );
  }

  async verify(
    password: string,
    hashedPassword: string
  ): Promise<boolean> {
    if (
      !password ||
      !hashedPassword
    ) {
      return false;
    }

    return bcrypt.compare(
      password,
      hashedPassword
    );
  }

  validateStrength(
    password: string
  ): PasswordValidation {
    const errors: string[] = [];

    if (password.length < 8) {
      errors.push(
        "Minimum 8 characters required."
      );
    }

    if (!/[A-Z]/.test(password)) {
      errors.push(
        "At least one uppercase letter required."
      );
    }

    if (!/[a-z]/.test(password)) {
      errors.push(
        "At least one lowercase letter required."
      );
    }

    if (!/[0-9]/.test(password)) {
      errors.push(
        "At least one number required."
      );
    }

    if (
      !/[!@#$%^&*(),.?":{}|<>]/.test(
        password
      )
    ) {
      errors.push(
        "At least one special character required."
      );
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  generateTemporaryPassword(
    length = 12
  ): string {
    const upper =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const lower =
      "abcdefghijklmnopqrstuvwxyz";
    const numbers =
      "0123456789";
    const special =
      "!@#$%^&*";

    const chars =
      upper +
      lower +
      numbers +
      special;

    const required = [
      upper[
        crypto.randomInt(
          upper.length
        )
      ],
      lower[
        crypto.randomInt(
          lower.length
        )
      ],
      numbers[
        crypto.randomInt(
          numbers.length
        )
      ],
      special[
        crypto.randomInt(
          special.length
        )
      ],
    ];

    while (
      required.length < length
    ) {
      required.push(
        chars[
          crypto.randomInt(
            chars.length
          )
        ]
      );
    }

    for (
      let i = required.length - 1;
      i > 0;
      i--
    ) {
      const j =
        crypto.randomInt(i + 1);

      [
        required[i],
        required[j],
      ] = [
        required[j],
        required[i],
      ];
    }

    return required.join("");
  }
}

export const passwordService =
  new PasswordService();