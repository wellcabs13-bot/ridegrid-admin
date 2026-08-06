import crypto from "crypto";

export class PasswordService {
  async hash(
    password: string
  ): Promise<string> {
    return crypto
      .createHash("sha256")
      .update(password)
      .digest("hex");
  }

  async verify(
    password: string,
    hashedPassword: string
  ): Promise<boolean> {
    const hash = await this.hash(password);

    return hash === hashedPassword;
  }

  validateStrength(
    password: string
  ): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (password.length < 8)
      errors.push(
        "Minimum 8 characters required."
      );

    if (!/[A-Z]/.test(password))
      errors.push(
        "At least one uppercase letter required."
      );

    if (!/[a-z]/.test(password))
      errors.push(
        "At least one lowercase letter required."
      );

    if (!/[0-9]/.test(password))
      errors.push(
        "At least one number required."
      );

    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password))
      errors.push(
        "At least one special character required."
      );

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  generateTemporaryPassword(
    length = 12
  ): string {
    const chars =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";

    let password = "";

    for (let i = 0; i < length; i++) {
      password += chars.charAt(
        Math.floor(Math.random() * chars.length)
      );
    }

    return password;
  }
}

export const passwordService =
  new PasswordService();