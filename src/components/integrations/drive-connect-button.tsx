"use client";

import { useRef, useState } from "react";

export function DriveConnectButton({ label = "Google Drive 연결하기", className = "integration-button" }: { label?: string; className?: string }) {
  const started = useRef(false);
  const [isStarting, setIsStarting] = useState(false);

  function startConnection(event: React.FormEvent<HTMLFormElement>) {
    if (started.current) {
      event.preventDefault();
      return;
    }
    started.current = true;
    setIsStarting(true);
  }

  return (
    <form className="drive-connect-form" action="/api/google/drive/connect" method="get" onSubmit={startConnection}>
      <button className={className} type="submit" disabled={isStarting} aria-busy={isStarting}>
        {isStarting ? <><span className="button-spinner" aria-hidden="true" />Google로 이동 중…</> : label}
      </button>
    </form>
  );
}
