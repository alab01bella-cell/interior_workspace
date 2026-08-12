import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("Google sign-in always requests the account chooser without changing the OAuth flow", async () => {
  const contents = await source("src/app/api/auth/google/route.ts");
  assert.match(contents, /prompt:\s*["']select_account["']/);
  assert.match(contents, /response_type:\s*["']code["']/);
  assert.match(contents, /scope:\s*["']openid email profile["']/);
  assert.match(contents, /code_challenge_method:\s*["']S256["']/);
  assert.match(contents, /setOAuthCookie\(/);
  assert.doesNotMatch(contents, /revoke|logout\.google|accounts\.google\.com\/Logout/i);
});

test("app logout clears local auth cookies but does not sign out or revoke Google", async () => {
  const contents = await source("src/app/api/auth/logout/route.ts");
  assert.match(contents, /clearSession\(response\)/);
  assert.match(contents, /clearOAuthCookie\(response\)/);
  assert.match(contents, /NextResponse\.redirect\(`\$\{baseUrl\}\/login`, 303\)/);
  assert.doesNotMatch(contents, /revoke|logout\.google|accounts\.google\.com/i);
});

test("Google callback keeps dashboard and onboarding destinations and creates the app session", async () => {
  const contents = await source("src/app/api/auth/google/callback/route.ts");
  assert.match(contents, /registered\?user\.profileCompleted\?["']\/dashboard["']:["']\/profile\/setup["']:["']\/onboarding["']/);
  assert.match(contents, /await setSession\(response, toAuthUser\(user\)\)/);
  assert.match(contents, /clearOAuthCookie\(response\)/);
});

test("unregistered Google accounts need an invitation or workspace creation eligibility", async () => {
  const contents = await source("src/app/api/auth/google/callback/route.ts");
  assert.match(contents,/!transaction\.inviteToken&&!registered&&!ownerEligibility\.allowed/);
  assert.match(contents,/registration_required/);
  assert.match(contents,/clearSession\(response\)/);
});

test("accepted invitations send only incomplete profiles through first-time setup", async () => {
  const contents = await source("src/app/api/auth/google/callback/route.ts");
  assert.match(contents, /accepted\.ok\?user\.profileCompleted\?["']\/dashboard["']:["']\/profile\/setup["']/);
});
