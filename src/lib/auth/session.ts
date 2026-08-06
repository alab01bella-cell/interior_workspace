import { cookies } from "next/headers";
import type { NextResponse } from "next/server";
import type { AuthUser } from "@/types/auth";
import { getAuthConfig } from "./config";

export const SESSION_COOKIE = "__Host-interior_session";
export const OAUTH_COOKIE = "__Host-interior_oauth";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7;
export const OAUTH_MAX_AGE = 60 * 10;

interface SealedPayload<T> {
  value: T;
  expiresAt: number;
}

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function toBase64Url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(value: string) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(base64);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function encryptionKey(secret: string) {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(secret));
  return crypto.subtle.importKey("raw", digest, "AES-GCM", false, ["encrypt", "decrypt"]);
}

export async function seal<T>(value: T, maxAge: number) {
  const { authSecret } = getAuthConfig();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plaintext = encoder.encode(JSON.stringify({ value, expiresAt: Date.now() + maxAge * 1000 } satisfies SealedPayload<T>));
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await encryptionKey(authSecret), plaintext);
  return `${toBase64Url(iv)}.${toBase64Url(new Uint8Array(ciphertext))}`;
}

export async function unseal<T>(token: string): Promise<T | null> {
  try {
    const [ivPart, ciphertextPart, extra] = token.split(".");
    if (!ivPart || !ciphertextPart || extra) return null;
    const plaintext = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: fromBase64Url(ivPart) },
      await encryptionKey(getAuthConfig().authSecret),
      fromBase64Url(ciphertextPart),
    );
    const payload = JSON.parse(decoder.decode(plaintext)) as SealedPayload<T>;
    return payload.expiresAt > Date.now() ? payload.value : null;
  } catch {
    return null;
  }
}

const cookieOptions = (maxAge: number) => ({
  httpOnly: true,
  secure: true,
  sameSite: "lax" as const,
  path: "/",
  maxAge,
});

export async function getCurrentUser(): Promise<AuthUser | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const user = await unseal<AuthUser>(token);
  if (!user || typeof user.id !== "string" || typeof user.googleSub !== "string" || typeof user.email !== "string") return null;
  return user;
}

export async function setSession(response: NextResponse, user: AuthUser) {
  response.cookies.set(SESSION_COOKIE, await seal(user, SESSION_MAX_AGE), cookieOptions(SESSION_MAX_AGE));
}

export function clearSession(response: NextResponse) {
  response.cookies.set(SESSION_COOKIE, "", cookieOptions(0));
}

export function setOAuthCookie(response: NextResponse, value: string) {
  response.cookies.set(OAUTH_COOKIE, value, cookieOptions(OAUTH_MAX_AGE));
}

export function clearOAuthCookie(response: NextResponse) {
  response.cookies.set(OAUTH_COOKIE, "", cookieOptions(0));
}
