import Link from "next/link";
import { findInvitationByToken } from "@/lib/workspaces/team-repository";

const messages:Record<string,string>={email_mismatch:"초대받은 Google 계정으로 로그인해주세요.",expired:"초대 링크가 만료되었거나 더 이상 유효하지 않습니다.",invalid:"유효하지 않은 초대 링크입니다."};

export default async function InvitePage({params,searchParams}:{params:Promise<{token:string}>;searchParams:Promise<{error?:string}>}){
  const {token}=await params,{error}=await searchParams;const invitation=await findInvitationByToken(token);
  const available=invitation?.is_available===1;
  return <main className="invite-page"><section><p>INTERIOR WORKSPACE</p><h1>팀 초대</h1>{invitation?<><h2>{invitation.workspace_name}에서<br/>Interior Workspace에 초대했습니다.</h2><p className="invite-email">초대 계정 <strong>{invitation.email}</strong></p></>:<h2>초대 정보를 찾을 수 없습니다.</h2>}{error&&<p className="invite-error">{messages[error]??messages.invalid}</p>}{available?<Link className="google-login-button" href={`/api/auth/google?invite=${encodeURIComponent(token)}`}>Google 계정으로 참여</Link>:<p className="invite-expired">초대 링크가 만료되었거나 취소되었습니다.</p>}</section></main>;
}
