import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/require-user";
import { findActiveWorkspaceContext } from "@/lib/workspaces/workspace-repository";
import { canCreateWorkspace } from "@/lib/auth/workspace-creation-eligibility";

export default async function AccessDeniedPage(){
  const user=await requireUser();
  if(await findActiveWorkspaceContext(user.id))redirect("/dashboard");
  if((await canCreateWorkspace(user.email)).allowed)redirect("/onboarding");
  return <main className="onboarding-page"><section className="onboarding-card access-denied-card"><p className="login-eyebrow">ACCESS REQUIRED</p><h1>가입 권한이 필요합니다</h1><p className="login-description">등록되지 않은 계정입니다. 관리자에게 가입 권한 또는 업체 초대를 요청해주세요.</p><p className="access-denied-email">{user.email}</p><form action="/api/auth/logout" method="post"><button type="submit">다른 계정으로 로그인</button></form></section></main>;
}
