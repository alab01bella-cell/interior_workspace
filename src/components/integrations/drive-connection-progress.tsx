"use client";

import { Check, LoaderCircle, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { DriveConnectButton } from "./drive-connect-button";

const steps = [
  { id: "account", label: "Google 계정 확인" },
  { id: "security", label: "보안 연결 설정" },
  { id: "folder", label: "업체 전용 폴더 생성" },
  { id: "save", label: "연결 정보 저장" },
] as const;
type StepId = typeof steps[number]["id"];
type ViewState = "processing" | "complete" | "error";

interface Completion {
  email: string;
  workspaceName: string;
  folderId: string | null;
}

const errorMessages: Record<string, string> = {
  access_denied: "Google 권한 동의가 취소되었습니다.",
  invalid_state: "연결 시간이 만료되었습니다.",
  invalid_workspace_session: "연결 시간이 만료되었습니다.",
  expired: "연결 시간이 만료되었습니다.",
  account: "Google 계정을 확인하지 못했습니다.",
  security: "보안 연결을 설정하지 못했습니다.",
  folder: "업체 전용 폴더를 만들지 못했습니다.",
  save: "연결 정보를 안전하게 저장하지 못했습니다.",
  config: "Google Drive 설정을 확인해주세요. 관리자에게 문의해주세요.",
  permission: "Google Drive 접근 권한을 확인해주세요.",
  owner_required: "Workspace OWNER만 Google Drive를 연결할 수 있습니다.",
  temporary_error: "일시적인 오류가 발생했습니다.",
  temporary: "일시적인 오류가 발생했습니다.",
  timeout: "연결 시간이 초과되었습니다. 다시 시도해주세요.",
};

export function DriveConnectionProgress({
  initialCompletion,
  initialError,
  hasPendingProcess,
  recoverPending,
}: {
  initialCompletion: Completion | null;
  initialError?: string;
  hasPendingProcess: boolean;
  recoverPending: boolean;
}) {
  const existingCompletion = hasPendingProcess ? null : initialCompletion;
  const [view, setView] = useState<ViewState>(existingCompletion ? "complete" : initialError ? "error" : "processing");
  const [completedSteps, setCompletedSteps] = useState<StepId[]>(existingCompletion ? steps.map(({ id }) => id) : []);
  const [completion, setCompletion] = useState<Completion | null>(existingCompletion);
  const [error, setError] = useState(initialError ?? "temporary");
  const [isSlow, setIsSlow] = useState(false);
  const started = useRef(false);

  const finish = useCallback((data: Completion) => {
    setCompletedSteps(steps.map(({ id }) => id));
    setCompletion(data);
    setView("complete");
  }, []);

  const recover = useCallback(async (signal: AbortSignal) => {
    const deadline = Date.now() + 75_000;
    while (Date.now() < deadline && !signal.aborted) {
      const response = await fetch("/api/google/drive/status", { cache: "no-store", signal });
      if (response.ok) {
        const data = await response.json() as { status: string; email?: string; workspaceName?: string; folderId?: string | null };
        if (data.status === "CONNECTED" && data.email && data.workspaceName) {
          finish({ email: data.email, workspaceName: data.workspaceName, folderId: data.folderId ?? null });
          return;
        }
      }
      await new Promise((resolve) => window.setTimeout(resolve, 2_000));
    }
    if (!signal.aborted) {
      setError("timeout");
      setView("error");
    }
  }, [finish]);

  useEffect(() => {
    if (view !== "processing" || started.current) return;
    started.current = true;
    const controller = new AbortController();
    const slowTimer = window.setTimeout(() => setIsSlow(true), 12_000);
    const timeout = window.setTimeout(() => {
      setError("timeout");
      setView("error");
      controller.abort("timeout");
    }, 90_000);

    async function processConnection() {
      try {
        if (!hasPendingProcess) {
          if (recoverPending) await recover(controller.signal);
          else {
            setError("expired");
            setView("error");
          }
          return;
        }
        const response = await fetch("/api/google/drive/process", { method: "POST", signal: controller.signal });
        if (!response.ok || !response.body) {
          if (response.status === 409) await recover(controller.signal);
          else throw new Error("temporary");
          return;
        }
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";
          for (const line of lines) {
            if (!line) continue;
            const event = JSON.parse(line) as { type: string; step?: StepId; reason?: string; email?: string; workspaceName?: string; folderId?: string };
            if (event.type === "step" && event.step) setCompletedSteps((current) => current.includes(event.step!) ? current : [...current, event.step!]);
            if (event.type === "complete" && event.email && event.workspaceName) finish({ email: event.email, workspaceName: event.workspaceName, folderId: event.folderId ?? null });
            if (event.type === "error") {
              setError(event.reason ?? "temporary");
              setView("error");
            }
          }
        }
      } catch {
        if (!controller.signal.aborted) {
          setError("temporary");
          setView("error");
        }
      } finally {
        window.clearTimeout(slowTimer);
        window.clearTimeout(timeout);
      }
    }
    void processConnection();
    return () => {
      controller.abort();
      window.clearTimeout(slowTimer);
      window.clearTimeout(timeout);
    };
  }, [finish, hasPendingProcess, recover, recoverPending, view]);

  if (view === "complete" && completion) {
    return (
      <section className="drive-progress-card is-complete" aria-labelledby="drive-progress-title">
        <div className="progress-hero-icon"><Check aria-hidden="true" /></div>
        <h1 id="drive-progress-title">Google Drive 연결이 완료되었습니다</h1>
        <p>업체 전용 폴더가 준비되었습니다.<br />앞으로 상담 자료를 이 공간에 안전하게 저장할 수 있습니다.</p>
        <dl className="progress-result-details">
          <div><dt>연결 계정</dt><dd>{completion.email}</dd></div>
          <div><dt>Workspace</dt><dd>{completion.workspaceName}</dd></div>
          <div><dt>전용 폴더</dt><dd>{completion.folderId ? "생성 완료" : "확인 필요"}</dd></div>
        </dl>
        <div className="progress-actions">
          {completion.folderId && <a className="integration-button" href={`https://drive.google.com/drive/folders/${encodeURIComponent(completion.folderId)}`} target="_blank" rel="noreferrer">Drive 폴더 열기</a>}
          <a className="integration-button is-secondary" href="/dashboard">대시보드로 이동</a>
        </div>
      </section>
    );
  }

  if (view === "error") {
    return (
      <section className="drive-progress-card is-error" aria-labelledby="drive-progress-title">
        <div className="progress-hero-icon"><X aria-hidden="true" /></div>
        <h1 id="drive-progress-title">Google Drive를 연결하지 못했습니다</h1>
        <p role="alert">{errorMessages[error] ?? errorMessages.temporary}</p>
        <div className="progress-actions">
          <DriveConnectButton label="다시 연결하기" />
          <a className="integration-button is-secondary" href="/dashboard">나중에 연결하기</a>
          <a className="integration-text-link" href="/settings/integrations">설정으로 돌아가기</a>
        </div>
      </section>
    );
  }

  const activeIndex = Math.min(completedSteps.length, steps.length - 1);
  return (
    <section className="drive-progress-card" aria-labelledby="drive-progress-title" aria-busy="true">
      <div className="progress-hero-icon is-loading"><LoaderCircle aria-hidden="true" /></div>
      <h1 id="drive-progress-title">Google Drive를 연결하고 있어요</h1>
      <p>상담 자료를 안전하게 저장할 업체 전용 공간을 준비하고 있습니다.<br />잠시만 기다려주세요.</p>
      <ol className="drive-progress-steps" aria-live="polite">
        {steps.map((step, index) => {
          const isDone = completedSteps.includes(step.id);
          const isActive = !isDone && index === activeIndex;
          return (
            <li key={step.id} className={isDone ? "is-done" : isActive ? "is-active" : ""}>
              <span className="step-icon" aria-hidden="true">{isDone ? <Check /> : isActive ? <LoaderCircle className="step-spinner" /> : index + 1}</span>
              <span>{step.label}</span>
              <strong>{isDone ? "완료" : isActive ? "진행 중" : "대기 중"}</strong>
            </li>
          );
        })}
      </ol>
      {isSlow && <p className="progress-slow-message" role="status">연결에 평소보다 시간이 조금 더 걸리고 있습니다.<br />창을 닫지 않고 잠시만 기다려주세요.</p>}
    </section>
  );
}
