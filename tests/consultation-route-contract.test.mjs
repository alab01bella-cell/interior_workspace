import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  consultationChecklistPath,
  consultationDetailPath,
  consultationFileOpenPath,
  consultationSessionPath,
} from "../src/lib/consultations/consultation-routes.ts";

const source = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("customer detail, submitted checklist, and archived PDF routes stay distinct", () => {
  const id = "customer/id with space";
  assert.equal(consultationDetailPath(id), "/consultations/customer%2Fid%20with%20space");
  assert.equal(consultationChecklistPath(id), "/consultations/customer%2Fid%20with%20space/checklist");
  assert.notEqual(consultationDetailPath(id), consultationChecklistPath(id));
  assert.equal(consultationSessionPath(id), "/consultations/customer%2Fid%20with%20space/session");
  assert.notEqual(consultationSessionPath(id), consultationChecklistPath(id));
  assert.notEqual(consultationSessionPath(id), consultationDetailPath(id));
  assert.equal(
    consultationFileOpenPath(id, "pdf/id"),
    "/api/consultations/customer%2Fid%20with%20space/files/pdf%2Fid/open",
  );
});

test("consultation list keeps customer and checklist entry points separate", async () => {
  const contents = await source("src/components/consultations/consultations-page.tsx");
  assert.match(contents, /consultation-customer-link[^\n]*consultationDetailPath\(item\.id\)/);
  assert.match(contents, /consultation-original-link[^\n]*consultationChecklistPath\(item\.id\)/);
  assert.doesNotMatch(contents, /consultation-original-link[^\n]*consultationDetailPath\(item\.id\)/);
  assert.match(contents, /consultation-session-link[^\n]*consultationSessionPath\(item\.id\)/);
});

test("received status opens the existing reservation drawer while scheduled time remains editable",async()=>{
  const contents=await source("src/components/consultations/consultations-page.tsx");
  assert.match(contents,/canAddReservation\(item\)\?<button[^>]*status-reservation-trigger/);
  assert.match(contents,/aria-label=\{`\$\{item\.customerName\} 예약 추가`\}/);
  assert.match(contents,/onClick=\{\(\)=>setReservationTarget\(item\)\}/);
  assert.match(contents,/item\.scheduledAt&&<button[^>]*confirmed-schedule[^>]*onClick=\{\(\)=>setReservationTarget\(item\)\}/);
  assert.match(contents,/<ReservationEditor consultation=\{reservationTarget\}/);
});

test("consultation list keeps explicit desktop columns and horizontal overflow", async () => {
  const [component, styles] = await Promise.all([
    source("src/components/consultations/consultations-page.tsx"),
    source("src/app/globals.css"),
  ]);
  assert.match(component, /<colgroup>/);
  assert.match(component, /consultation-col-session/);
  assert.match(component, /<th>상담 진행<\/th>/);
  assert.match(styles, /\.consultations-table-wrap[^}]*overflow-x:\s*auto/);
  assert.match(styles, /\.consultations-table[^}]*width:\s*max\(100%,\s*1540px\)/);
  assert.match(styles, /word-break:\s*keep-all/);
});

test("consultation session uses exclusive three-state filters and ordered checkboxes", async () => {
  const [contents,styles] = await Promise.all([source("src/components/consultations/consultation-session.tsx"),source("src/app/globals.css")]);
  assert.match(contents, /type="checkbox"/);
  assert.match(contents, /padStart\(2,\s*"0"\)/);
  assert.match(contents, /\["all","전체"\].*\["checked","체크"\].*\["unchecked","미체크"\].*\["confirmed","확인완료"\]/s);
  assert.match(contents, /review\?\.isChecked&&!review\.isConfirmed/);
  assert.match(contents, /if\(filter==="confirmed"\)return Boolean\(review\?\.isConfirmed\)/);
  assert.match(contents, /status!=="unchecked"&&<div className="session-note-area"/);
  assert.match(contents, /status==="confirmed"\?"다시 확인":"확인 완료"/);
  assert.match(styles, /overflow-anchor:none/);
});

test("integrated detail links to the submitted checklist and keeps files on the Drive API", async () => {
  const contents = await source("src/app/consultations/[id]/page.tsx");
  assert.match(contents, /consultationChecklistPath\(record\.id\)[^\n]*고객이 작성한 체크리스트 전체 보기/);
  assert.match(contents, /consultationFileOpenPath\(record\.id,file\.id\)/);
});

test("consultation session is workspace scoped and never updates submitted answers", async () => {
  const [page,api,repository]=await Promise.all([
    source("src/app/consultations/[id]/session/page.tsx"),
    source("src/app/api/consultations/[id]/checklist-reviews/route.ts"),
    source("src/lib/consultations/checklist-review-repository.ts"),
  ]);
  assert.match(page,/findConsultation\(context\.workspace\.id,/);
  assert.match(api,/findConsultation\(context\.workspace\.id,id\)/);
  assert.match(repository,/consultation_checklist_reviews/);
  assert.match(repository,/consultation_checklist_summaries/);
  assert.match(repository,/is_checked/);
  assert.doesNotMatch(`${api}\n${repository}`,/UPDATE consultations SET form_payload_json/i);
});

test("consultation save updates a separate Drive PDF without touching the original checklist PDF",async()=>{
  const [api,pdf]=await Promise.all([
    source("src/app/api/consultations/[id]/checklist-reviews/route.ts"),
    source("src/lib/pdf/consultation-session-pdf.ts"),
  ]);
  assert.match(api,/consultation-session-pdf/);
  assert.match(api,/fileCategory:"DOCUMENT"/);
  assert.match(api,/updateDriveFile/);
  assert.match(pdf,/상담 기록/);
  assert.doesNotMatch(api,/replaceChecklistOriginal/);
});

test("checklist summary upserts separately while ordinary consultation notes remain append-only",async()=>{
  const [reviews,notes]=await Promise.all([
    source("src/lib/consultations/checklist-review-repository.ts"),
    source("src/lib/consultations/consultation-note-repository.ts"),
  ]);
  assert.match(reviews,/ON CONFLICT\(workspace_id,consultation_id\) DO UPDATE SET content=/);
  assert.match(notes,/INSERT INTO consultation_notes/);
  assert.match(notes,/kind:"CHECKLIST_SUMMARY"/);
});

test("both pages and archived file access retain workspace-scoped lookups", async () => {
  const [detail, checklist, fileOpen, repository] = await Promise.all([
    source("src/app/consultations/[id]/page.tsx"),
    source("src/app/consultations/[id]/checklist/page.tsx"),
    source("src/app/api/consultations/[id]/files/[fileId]/open/route.ts"),
    source("src/lib/consultations/consultation-repository.ts"),
  ]);
  assert.match(detail, /findConsultation\(context\.workspace\.id,/);
  assert.match(checklist, /findConsultation\(context\.workspace\.id,/);
  assert.match(fileOpen, /findConsultation\(context\.workspace\.id,id\)/);
  assert.match(fileOpen, /findConsultationFile\(context\.workspace\.id,id,fileId\)/);
  assert.match(repository, /WHERE c\.workspace_id=\? AND c\.id=\?/);
});

test("quotes remain a table with exclusive outcome filters and no drag and drop",async()=>{
  const contents=await source("src/components/consultations/quotes-page.tsx");
  assert.match(contents,/<table className="quotes-table">/);
  assert.match(contents,/\["ALL","전체"\].*\["PENDING","결정 대기"\].*\["CONTRACTED","성사"\].*\["LOST","불성사"\]/s);
  assert.match(contents,/<option value="CONTRACTED">성사<\/option>/);
  assert.doesNotMatch(contents,/draggable|onDrag|onDrop|Kanban/i);
});

test("consultation list derives lost separately from completed and keeps exclusion user-scoped",async()=>{
  const contents=await source("src/components/consultations/consultations-page.tsx");
  assert.match(contents,/statusFilter==="완료"\)return item\.status==="완료"&&item\.contractOutcome==="PENDING"/);
  assert.match(contents,/statusFilter==="불성사"\)return item\.contractOutcome==="LOST"/);
  assert.match(contents,/consultations:exclude-lost:\$\{currentUserId\}/);
  assert.match(contents,/>불성사 제외<\/span>/);
  assert.match(contents,/statusFilter==="불성사"\?"is-disabled"/);
});

test("settings and topbar share the public consultation URL helper",async()=>{
  const [settings,quick,helper]=await Promise.all([
    source("src/components/integrations/public-consultation-link.tsx"),
    source("src/components/integrations/consultation-link-copy-button.tsx"),
    source("src/lib/consultations/public-consultation-url.ts"),
  ]);
  assert.match(settings,/publicConsultationUrl/);
  assert.match(settings,/>복사<\/button>/);
  assert.match(settings,/>바로가기<\/a>/);
  assert.match(quick,/publicConsultationUrl/);
  assert.match(quick,/상담 접수 링크 복사/);
  assert.match(helper,/path\.startsWith\("\/c\/"\)/);
});
