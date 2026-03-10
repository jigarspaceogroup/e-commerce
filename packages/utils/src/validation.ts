const SAUDI_PHONE_REGEX = /^(?:\+966|0)5\d{8}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidSaudiPhone(phone: string): boolean {
  return SAUDI_PHONE_REGEX.test(phone);
}

export function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email);
}

export function isValidPassword(password: string): boolean {
  return getPasswordErrors(password).length === 0;
}

export function getPasswordErrors(password: string): string[] {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push("Must be at least 8 characters");
  }
  if (!/[A-Z]/.test(password)) {
    errors.push("Must contain at least one uppercase letter");
  }
  if (!/\d/.test(password)) {
    errors.push("Must contain at least one number");
  }

  return errors;
}
