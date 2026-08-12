import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
const source=(path)=>readFile(new URL(`../${path}`,import.meta.url),"utf8");

test("the immutable service administrator is separate from workspace roles and job titles",async()=>{
  const [admin,eligibility,profile]=await Promise.all([source("src/lib/admin/super-admin.ts"),source("src/lib/auth/workspace-creation-eligibility.ts"),source("src/lib/auth/user-repository.ts")]);
  assert.match(admin,/SUPER_ADMIN_EMAIL=["']alab01bella@gmail\.com["']/);
  assert.match(eligibility,/isSuperAdminEmail/);
  assert.doesNotMatch(profile,/job_title[^\n]*(OWNER|SUPER_ADMIN)/i);
});

test("admin page and API both enforce server-side super admin access",async()=>{
  const [page,api]=await Promise.all([source("src/app/admin/page.tsx"),source("src/app/api/admin/owner-access/route.ts")]);
  assert.match(page,/requireSuperAdminUser\(context\.user\)/);
  assert.match(api,/requireSuperAdminUser\(context\.user\)/);
});

test("sidebar separates owner analytics from super-admin service management",async()=>{
  const [navigation,sidebar,team]=await Promise.all([source("src/config/navigation.ts"),source("src/components/layout/sidebar.tsx"),source("src/app/settings/team/page.tsx")]);
  assert.match(navigation,/운영 분석[^\n]*ownerOnly:\s*true/);
  assert.match(navigation,/서비스 관리[^\n]*superAdminOnly:\s*true/);
  assert.match(sidebar,/!item\.superAdminOnly\|\|identity\.isSuperAdmin/);
  assert.match(sidebar,/identity\.role==="OWNER"&&<Link href="\/settings\/team"/);
  assert.doesNotMatch(sidebar,/>체크리스트</);
  assert.match(team,/if\(context\.membership\.role!=="OWNER"\)notFound\(\)/);
});

test("workspace creation checks the replaceable eligibility service and consumes an allowance",async()=>{
  const contents=await source("src/lib/workspaces/workspace-repository.ts");
  assert.match(contents,/canCreateWorkspace\(current\.email\)/);
  assert.match(contents,/if\(!eligibility\.allowed\)throw new Error\(["']owner_signup_not_allowed["']\)/);
  assert.match(contents,/completeWorkspaceCreationEligibility/);
});

test("allowlist cancellation cannot remove completed owners or the protected administrator",async()=>{
  const contents=await source("src/lib/admin/owner-signup-repository.ts");
  assert.match(contents,/isSuperAdminEmail\(row\.email\)/);
  assert.match(contents,/row\.status!==["']ALLOWED["']/);
  assert.doesNotMatch(contents,/DELETE FROM (users|workspaces|workspace_members)/i);
});

test("admin workspace list is read-only and joins completed owner allowances",async()=>{
  const [repository,page,component]=await Promise.all([source("src/lib/admin/workspace-admin-repository.ts"),source("src/app/admin/page.tsx"),source("src/components/admin/admin-owner-access.tsx")]);
  assert.match(repository,/FROM workspaces w/);
  assert.match(repository,/JOIN users u ON u\.id=w\.owner_user_id/);
  assert.match(repository,/LEFT JOIN owner_signup_allowances osa ON osa\.completed_workspace_id=w\.id/);
  assert.match(repository,/WHERE w\.status='ACTIVE'/);
  assert.match(repository,/billing:\{plan:/);
  assert.doesNotMatch(repository,/\b(UPDATE|DELETE|INSERT)\b/i);
  assert.match(page,/listAdminWorkspaces\(\)/);
  assert.match(component,/가입 완료 업체/);
  assert.doesNotMatch(component,/업체 삭제|업체 수정/);
});

test("workspace creation records the completed user and workspace on its allowance",async()=>{
  const contents=await source("src/lib/auth/workspace-creation-eligibility.ts");
  assert.match(contents,/completed_user_id=\?,completed_workspace_id=\?/);
  assert.match(contents,/status='COMPLETED'/);
});
