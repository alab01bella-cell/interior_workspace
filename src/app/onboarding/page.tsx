import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/require-user";
import { getServiceDisplayName } from "@/lib/auth/user-repository";
import { findActiveWorkspaceContext } from "@/lib/workspaces/workspace-repository";
import { submitOnboarding } from "./actions";
import { canCreateWorkspace } from "@/lib/auth/workspace-creation-eligibility";

const errors: Record<string, string> = {
  validation: "업체명과 서비스에서 사용할 이름을 확인해주세요.",
  save_failed: "가입 설정을 저장하지 못했습니다. 잠시 후 다시 시도해주세요.",
};

export default async function OnboardingPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const user = await requireUser();
  if(!(await canCreateWorkspace(user.email)).allowed)redirect("/access-denied");
  if (user.onboardingCompleted) {
    if (await findActiveWorkspaceContext(user.id)) redirect("/dashboard");
    notFound();
  }
  const { error } = await searchParams;

  return (
    <main className="onboarding-page">
      <section className="onboarding-card">
        <p className="login-eyebrow">WELCOME TO INTERIOR WORKSPACE</p>
        <h1>업체 Workspace를<br />설정해주세요</h1>
        <p className="login-description">업체 정보와 서비스에서 사용할 이름은 Google 계정 정보와 별도로 관리됩니다.</p>
        {error && <div className="login-error" role="alert">{errors[error] ?? errors.save_failed}</div>}
        <form action={submitOnboarding} className="onboarding-form">
          <label>
            <span>업체명 <strong>필수</strong></span>
            <input name="workspaceName" maxLength={80} required autoComplete="organization" placeholder="예: 공간인테리어" />
          </label>
          <label>
            <span>서비스에서 사용할 내 이름 <strong>필수</strong></span>
            <input name="displayName" maxLength={40} required autoComplete="name" defaultValue={getServiceDisplayName(user)} />
            <small>Google 계정 이름과 별도로 언제든 변경할 수 있습니다.</small>
          </label>
          <label>
            <span>직책 <em>선택</em></span>
            <select name="jobTitle" defaultValue="">
              <option value="">선택하지 않음</option>
              <option value="대표">대표</option>
              <option value="실장">실장</option>
              <option value="디자이너">디자이너</option>
              <option value="기타">기타</option>
            </select>
            <small>직책은 프로필 표시용이며 Workspace 권한과는 별개입니다.</small>
          </label>
          <button type="submit">Workspace 만들고 시작하기</button>
        </form>
      </section>
    </main>
  );
}
