const RECAPTCHA_VERIFY_URL = "https://www.google.com/recaptcha/api/siteverify";

export interface RecaptchaResult {
  success: boolean;
  score: number;
  action?: string;
  challengeRequired: boolean;
}

export async function verifyRecaptchaV3(
  token: string,
  secretKey: string,
  threshold: number = 0.5,
): Promise<RecaptchaResult> {
  if (!secretKey) {
    // Skip in development if no key configured
    return { success: true, score: 1.0, challengeRequired: false };
  }

  try {
    const response = await fetch(RECAPTCHA_VERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret: secretKey, response: token }),
    });

    const data = (await response.json()) as {
      success: boolean;
      score?: number;
      action?: string;
      "error-codes"?: string[];
    };

    if (!data.success) {
      return { success: false, score: 0, challengeRequired: true };
    }

    const score = data.score ?? 0;
    const challengeRequired = score < threshold;

    return {
      success: true,
      score,
      action: data.action,
      challengeRequired,
    };
  } catch {
    return { success: false, score: 0, challengeRequired: true };
  }
}

export async function verifyRecaptchaV2(
  token: string,
  secretKey: string,
): Promise<boolean> {
  if (!secretKey) {
    return true;
  }

  try {
    const response = await fetch(RECAPTCHA_VERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret: secretKey, response: token }),
    });

    const data = (await response.json()) as { success: boolean };
    return data.success;
  } catch {
    return false;
  }
}
