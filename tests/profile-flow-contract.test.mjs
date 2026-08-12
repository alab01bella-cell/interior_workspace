import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("protected workspace pages redirect incomplete profiles to first-time setup", async () => {
  const contents=await source("src/lib/auth/require-user.ts");
  assert.match(contents,/if \(!user\.profileCompleted\) redirect\(["']\/profile\/setup["']\)/);
});

test("profile setup requires a membership and completed profiles skip it", async () => {
  const contents=await source("src/app/profile/setup/page.tsx");
  assert.match(contents,/findActiveWorkspaceContext\(user\.id\)/);
  assert.match(contents,/if\(user\.profileCompleted\)redirect\(["']\/dashboard["']\)/);
});

test("profile updates cannot modify membership roles", async () => {
  const [route,repository]=await Promise.all([
    source("src/app/api/profile/route.ts"),
    source("src/lib/auth/user-repository.ts"),
  ]);
  assert.match(route,/context\.user\.id/);
  assert.match(repository,/UPDATE users SET display_name=\?,job_title=\?,profile_completed=/);
  assert.doesNotMatch(route,/workspace_members|\brole\b/i);
  assert.doesNotMatch(repository,/UPDATE workspace_members|SET role/i);
});

test("migration preserves existing onboarded users and leaves future invitees incomplete", async () => {
  const contents=await source("migrations/0014_user_profile_completion.sql");
  assert.match(contents,/profile_completed INTEGER NOT NULL DEFAULT 0/);
  assert.match(contents,/SET profile_completed = 1\s+WHERE onboarding_completed = 1/);
});
