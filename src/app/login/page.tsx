import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthenticatedDestination } from "@/lib/auth/require-user";

const errorMessages: Record<string, string> = {
  access_denied: "Google 로그인이 취소되었습니다.",
  invalid_state: "로그인 요청이 만료되었거나 유효하지 않습니다. 다시 시도해주세요.",
  callback_failed: "Google 로그인 처리 중 오류가 발생했습니다. 다시 시도해주세요.",
  configuration: "로그인 설정이 완료되지 않았습니다. 관리자에게 문의해주세요.",
};

function GoogleMark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M21.6 12.2c0-.7-.1-1.4-.2-2H12v3.9h5.4a4.7 4.7 0 0 1-2 3v2.5h3.3c1.9-1.8 2.9-4.4 2.9-7.4Z" />
      <path fill="#34A853" d="M12 22c2.7 0 5-.9 6.7-2.4l-3.3-2.5c-.9.6-2.1 1-3.4 1a5.9 5.9 0 0 1-5.5-4.1H3.1v2.6A10 10 0 0 0 12 22Z" />
      <path fill="#FBBC05" d="M6.5 14a6 6 0 0 1 0-3.9V7.4H3.1a10 10 0 0 0 0 9.2L6.5 14Z" />
      <path fill="#EA4335" d="M12 6a5.4 5.4 0 0 1 3.8 1.5l2.9-2.8A9.7 9.7 0 0 0 12 2a10 10 0 0 0-8.9 5.4l3.4 2.7A5.9 5.9 0 0 1 12 6Z" />
    </svg>
  );
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const destination = await getAuthenticatedDestination();
  if (destination !== "/login") redirect(destination);
  const { error } = await searchParams;
  return (
    <main className="login-page">
      <section className="login-card">
        <div className="login-brand"><span aria-hidden="true" /> INTERIOR WORKSPACE</div>
        <p className="login-eyebrow">BUSINESS WORKSPACE</p>
        <h1>업체용 워크스페이스에<br />로그인하세요</h1>
        <p className="login-description">상담 일정과 고객 요청사항을 한곳에서 편리하게 관리할 수 있습니다.</p>
        {error && <div className="login-error" role="alert">{errorMessages[error] ?? errorMessages.callback_failed}</div>}
        <Link className="google-login-button" href="/api/auth/google">
          <GoogleMark />
          <span>Google 계정으로 계속하기</span>
        </Link>
        <p className="login-scope-notice">로그인에는 이름, 이메일, 프로필 정보만 사용합니다.</p>
        <Link className="demo-link" href="/consult/demo">로그인 없이 체크리스트 체험하기</Link>
      </section>
    </main>
  );
}
