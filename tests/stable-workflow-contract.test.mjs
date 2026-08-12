import assert from "node:assert/strict";
import { readFile,readdir } from "node:fs/promises";
import test from "node:test";

const source=(path)=>readFile(new URL(`../${path}`,import.meta.url),"utf8");

test("owner analytics and team routes remain server protected",async()=>{
  const [analytics,team]=await Promise.all([source("src/app/analytics/page.tsx"),source("src/app/settings/team/page.tsx")]);
  assert.match(analytics,/context\.membership\.role!=="OWNER"\)notFound\(\)/);
  assert.match(team,/context\.membership\.role!=="OWNER"\)notFound\(\)/);
});

test("workspace consultation and file reads retain server-side workspace scope",async()=>{
  const [detail,checklist,session,file]=await Promise.all([
    source("src/app/consultations/[id]/page.tsx"),
    source("src/app/consultations/[id]/checklist/page.tsx"),
    source("src/app/consultations/[id]/session/page.tsx"),
    source("src/app/api/consultations/[id]/files/[fileId]/open/route.ts"),
  ]);
  for(const contents of [detail,checklist,session])assert.match(contents,/findConsultation\(context\.workspace\.id,/);
  assert.match(file,/findConsultation\(context\.workspace\.id,id\)/);
  assert.match(file,/findConsultationFile\(context\.workspace\.id,id,fileId\)/);
});

test("demo pages remain fixture-only and public demo checklist remains demo mode",async()=>{
  const [dashboard,checklist]=await Promise.all([source("src/app/demo/page.tsx"),source("src/app/consult/demo/page.tsx")]);
  assert.match(dashboard,/demoConsultations/);
  assert.match(dashboard,/demoTodoItems/);
  assert.match(checklist,/<ChecklistPage mode="demo"/);
  assert.doesNotMatch(`${dashboard}\n${checklist}`,/\/api\/public\/consultations|uploadDriveFile|append.*Sheet/i);
});

test("deployment preserves remote vars and applied migrations are append-only numbered files",async()=>{
  const [wrangler,packageJson,files]=await Promise.all([source("wrangler.jsonc"),source("package.json"),readdir(new URL("../migrations",import.meta.url))]);
  assert.match(wrangler,/"keep_vars"\s*:\s*true/);
  assert.match(packageJson,/deploy:cloudflare[^\n]*--keep-vars/);
  const migrations=files.filter((file)=>file.endsWith(".sql")).sort();
  assert.equal(new Set(migrations.map((file)=>file.slice(0,4))).size,migrations.length);
  assert.ok(migrations.includes("0017_checklist_review_three_states.sql"));
});
