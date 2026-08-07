import { ExternalLink, HardDrive, LockKeyhole } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { DriveConnectButton } from "@/components/integrations/drive-connect-button";
import { PublicConsultationLink } from "@/components/integrations/public-consultation-link";
import { requireWorkspace } from "@/lib/auth/require-user";
import { findPublicDriveConnection } from "@/lib/google/drive-connection-repository";
import { ensureConsultationPublicKey, toWorkspaceIdentity } from "@/lib/workspaces/workspace-repository";

interface PageProps {
  searchParams: Promise<{ result?: string; error?: string; warning?: string; setup?: string }>;
}

function formatConnectedAt(value: string): string {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    dateStyle: "long",
    timeStyle: "short",
  }).format(new Date(`${value.replace(" ", "T")}Z`));
}

export default async function IntegrationsPage({ searchParams }: PageProps) {
  const context = await requireWorkspace();
  const connection = await findPublicDriveConnection(context.workspace.id);
  const params = await searchParams;
  const isOwner = context.membership.role === "OWNER";
  const isConnected = connection?.connectionStatus === "CONNECTED";
  const consultationPublicKey=isOwner?await ensureConsultationPublicKey(context.workspace.id):null;

  return (
    <AppShell identity={toWorkspaceIdentity(context)}>
      <section className="integrations-page">
        <header className="integrations-heading">
          <p className="eyebrow">WORKSPACE SETTINGS</p>
          <h1>{params.setup === "storage" ? "저장공간 설정" : "연동 관리"}</h1>
          <span>{params.setup === "storage" ? "Workspace가 준비되었습니다. 상담 자료를 저장할 공간을 선택해주세요." : "업체 Workspace에서 사용하는 외부 서비스를 관리합니다."}</span>
        </header>

        {params.result === "connected" && <p className="integration-alert is-success">Google Drive 연결을 완료했습니다.</p>}
        {params.result === "disconnected" && <p className="integration-alert is-success">Google Drive 연결을 해제했습니다. 기존 폴더와 파일은 삭제하지 않았습니다.</p>}
        {params.warning === "revoke_failed" && <p className="integration-alert is-warning">Google의 토큰 해지 요청은 실패했지만, Workspace에서는 저장된 토큰을 폐기했습니다.</p>}
        {params.error && <p className="integration-alert is-error">Google Drive 작업을 완료하지 못했습니다. 잠시 후 다시 시도해주세요.</p>}

        <article className="integration-card">
          <div className="integration-icon"><HardDrive aria-hidden="true" /></div>
          <div className="integration-body">
            <div className="integration-title-row">
              <div>
                <h2>Google Drive</h2>
                <p>{isConnected ? "Google Drive 연결됨" : "Google Drive 미연결"}</p>
              </div>
              <span className={`connection-badge ${isConnected ? "is-connected" : ""}`}>
                {isConnected ? "연결됨" : "미연결"}
              </span>
            </div>

            {isConnected && connection ? (
              <dl className="integration-details">
                <div><dt>연결 계정</dt><dd>{connection.googleAccountEmail}</dd></div>
                <div><dt>연결 일시</dt><dd>{formatConnectedAt(connection.connectedAt)}</dd></div>
                <div><dt>루트 폴더</dt><dd>{connection.driveRootFolderId ? "생성 완료" : "생성되지 않음"}</dd></div>
              </dl>
            ) : (
              <>
                <p className="integration-description integration-guidance">상담 자료를 저장할 업체용 Google 계정을 연결해주세요.<br />개인 직원 계정보다는 회사에서 지속적으로 관리할 계정 사용을 권장합니다.</p>
                <p className="integration-scope-note">로그인한 Google 계정과 다른 계정을 연결할 수 있으며, 앱이 만든 파일에만 접근하는 제한된 권한을 요청합니다.</p>
                <div className="integration-unavailable" role="note">
                  <strong>Drive 연결 전 준비되지 않은 기능</strong>
                  <ul>
                    <li>실제 상담 접수 저장</li>
                    <li>파일 업로드</li>
                    <li>상담 자료 Drive 저장</li>
                  </ul>
                </div>
              </>
            )}

            <div className="integration-actions">
              {isOwner && isConnected && connection?.driveRootFolderId && (
                <a className="integration-button is-secondary" href={`https://drive.google.com/drive/folders/${encodeURIComponent(connection.driveRootFolderId)}`} target="_blank" rel="noreferrer">
                  Drive 폴더 열기 <ExternalLink aria-hidden="true" />
                </a>
              )}
              {isOwner ? isConnected ? (
                <>
                  <DriveConnectButton label="연결 계정 변경" className="integration-button is-secondary" />
                  <form action="/api/google/drive/disconnect" method="post">
                    <button className="integration-button is-danger" type="submit">연결 해제</button>
                  </form>
                </>
              ) : (
                <DriveConnectButton />
              ) : (
                <p className="integration-permission"><LockKeyhole aria-hidden="true" />연결 상태는 확인할 수 있지만, 연결·해제·변경은 Workspace OWNER만 가능합니다.</p>
              )}
              {params.setup === "storage" && <a className="integration-text-link" href="/dashboard">나중에 연결하기</a>}
            </div>
          </div>
        </article>
        {consultationPublicKey&&<article className="integration-card"><div className="integration-body"><h2>고객 상담 접수 링크</h2><p className="integration-description">고객에게 전달할 로그인 없는 실제 상담 접수 URL입니다.</p><PublicConsultationLink path={`/consult/${consultationPublicKey}`}/></div></article>}
      </section>
    </AppShell>
  );
}
