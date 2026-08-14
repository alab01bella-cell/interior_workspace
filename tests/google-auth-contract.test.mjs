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

test("Drive reauthorization processes a pending OAuth result over an existing connected row", async () => {
  const [progress,connect,process]=await Promise.all([
    source("src/components/integrations/drive-connection-progress.tsx"),
    source("src/app/api/google/drive/connect/route.ts"),
    source("src/app/api/google/drive/process/route.ts"),
  ]);
  assert.match(progress, /hasPendingProcess \? null : initialCompletion/);
  assert.match(progress, /fetch\("\/api\/google\/drive\/process", \{ method: "POST"/);
  assert.match(connect,/access_type: "offline"/);
  assert.match(connect,/prompt: "select_account consent"/);
  assert.match(process,/if \(!tokens\.refresh_token\) throw new Error\("refresh_token_missing"\)/);
  assert.doesNotMatch(process,/existing\?\.encryptedRefreshToken && existing\.tokenIv/);
  assert.doesNotMatch(process,/connectionStatus\s*===?\s*["']CONNECTED["'][\s\S]{0,120}(return|complete)/);
  assert.match(process,/if \(folderId && !await isUsableDriveFolder\([\s\S]*throw new Error\("drive_folder_check_failed"\)/);
  assert.ok(process.indexOf("getDriveAccountEmail(tokens.access_token)")<process.indexOf("await saveConnectedDrive({"),"Drive API verification must precede the atomic credential replacement");
  assert.ok(process.indexOf("isUsableDriveFolder(tokens.access_token, folderId)")<process.indexOf("await saveConnectedDrive({"),"the existing root folder must be verified before CONNECTED is restored");
  assert.doesNotMatch(process,/createDriveRootFolder[\s\S]{0,120}existing\?\.driveRootFolderId/);
});

test("Drive auth classifies invalid_grant without collapsing config, permission, and temporary failures",async()=>{
  const [token,status,open,driveError,repository]=await Promise.all([
    source("src/lib/google/google-access-token.ts"),
    source("src/app/api/google/drive/status/route.ts"),
    source("src/app/api/consultations/[id]/files/[fileId]/open/route.ts"),
    source("src/lib/google/drive-error.ts"),
    source("src/lib/google/drive-connection-repository.ts"),
  ]);
  assert.match(token,/errorCode==="invalid_grant"\)throw new DriveError\("REAUTH_REQUIRED"/);
  assert.match(token,/invalid_client.*CONFIG_ERROR/);
  assert.match(token,/PERMISSION_ERROR/);
  assert.match(token,/TEMPORARY_ERROR/);
  assert.match(status,/await getGoogleAccessToken\(connection\)/);
  assert.match(open,/driveErrorKind\(error\)/);
  assert.match(open,/driveFile=\$\{value\}/);
  assert.match(driveError,/status===403.*PERMISSION_ERROR/);
  assert.match(driveError,/status===404.*FILE_NOT_FOUND/);
  assert.match(driveError,/status>=500.*TEMPORARY_ERROR/);
  assert.doesNotMatch(repository,/REAUTH_REQUIRED/);
  assert.doesNotMatch(repository,/invalid_grant/);
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
