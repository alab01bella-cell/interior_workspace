import { ExternalLink, HardDrive, LockKeyhole } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { requireWorkspace } from "@/lib/auth/require-user";
import { findPublicDriveConnection } from "@/lib/google/drive-connection-repository";
import { toWorkspaceIdentity } from "@/lib/workspaces/workspace-repository";

interface PageProps {
  searchParams: Promise<{ result?: string; error?: string; warning?: string }>;
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

  return (
    <AppShell identity={toWorkspaceIdentity(context)}>
      <section className="integrations-page">
        <header className="integrations-heading">
          <p className="eyebrow">WORKSPACE SETTINGS</p>
          <h1>연동 관리</h1>
          <span>업체 Workspace에서 사용하는 외부 서비스를 관리합니다.</span>
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
              <p className="integration-description">상담 자료를 업체 Google Drive에 저장하려면 연결이 필요합니다. 앱이 만든 파일에만 접근하는 제한된 권한을 요청합니다.</p>
            )}

            <div className="integration-actions">
              {isConnected && connection?.driveRootFolderId && (
                <a className="integration-button is-secondary" href={`https://drive.google.com/drive/folders/${encodeURIComponent(connection.driveRootFolderId)}`} target="_blank" rel="noreferrer">
                  Drive 폴더 열기 <ExternalLink aria-hidden="true" />
                </a>
              )}
              {isOwner ? isConnected ? (
                <form action="/api/google/drive/disconnect" method="post">
                  <button className="integration-button is-danger" type="submit">연결 해제</button>
                </form>
              ) : (
                <a className="integration-button" href="/api/google/drive/connect">Google Drive 연결하기</a>
              ) : (
                <p className="integration-permission"><LockKeyhole aria-hidden="true" />대표 또는 관리자에게 문의하세요. 현재 연결·해제는 OWNER만 가능합니다.</p>
              )}
            </div>
          </div>
        </article>
      </section>
    </AppShell>
  );
}
