export type CookieConsent = "accepted" | "declined";

export const COOKIE_CONSENT_COOKIE_NAME = "colortile-cookie-consent";
export const THEME_MODE_COOKIE_NAME = "colortile-theme-mode";

const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

type CookieOptions = {
  maxAgeSeconds?: number;
  path?: string;
  sameSite?: "Lax" | "Strict" | "None";
  secure?: boolean;
};

export function parseCookieHeader(cookieHeader: string) {
  return cookieHeader.split(";").reduce<Record<string, string>>((cookies, cookiePart) => {
    const [rawName, ...rawValueParts] = cookiePart.trim().split("=");
    const rawValue = rawValueParts.join("=");

    if (!rawName) {
      return cookies;
    }

    cookies[decodeURIComponent(rawName)] = decodeURIComponent(rawValue);
    return cookies;
  }, {});
}

export function serializeCookie(name: string, value: string, options: CookieOptions = {}) {
  const cookieParts = [
    `${encodeURIComponent(name)}=${encodeURIComponent(value)}`,
    `Path=${options.path ?? "/"}`,
    `Max-Age=${options.maxAgeSeconds ?? COOKIE_MAX_AGE_SECONDS}`,
    `SameSite=${options.sameSite ?? "Lax"}`,
  ];

  if (options.secure) {
    cookieParts.push("Secure");
  }

  return cookieParts.join("; ");
}

export function getCookie(name: string) {
  if (typeof document === "undefined") {
    return null;
  }

  return parseCookieHeader(document.cookie)[name] ?? null;
}

export function setCookie(name: string, value: string, options?: CookieOptions) {
  if (typeof document === "undefined") {
    return;
  }

  document.cookie = serializeCookie(name, value, options);
}

export function deleteCookie(name: string) {
  setCookie(name, "", { maxAgeSeconds: 0 });
}

export function getCookieConsent(): CookieConsent | null {
  const consent = getCookie(COOKIE_CONSENT_COOKIE_NAME);

  return consent === "accepted" || consent === "declined" ? consent : null;
}

export function setCookieConsent(consent: CookieConsent) {
  setCookie(COOKIE_CONSENT_COOKIE_NAME, consent);
}
