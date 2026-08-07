import styles from "./checklist.module.css";

export function ChecklistIntro({ mode, workspaceName }: { mode: "demo" | "production"; workspaceName?: string }) {
  return (
    <aside className={styles.intro}>
      <div className={styles.brand}><span aria-hidden="true" /> INTERIOR WORKSPACE</div>
      {mode === "production" && workspaceName && (
        <div className={styles.workspaceIdentity}>
          <span>상담 업체</span>
          <strong>{workspaceName}</strong>
        </div>
      )}
      <div className={styles.introCopy}>
        <p>INTERIOR CONSULTING CHECKLIST</p>
        <h1>어떤 공간을<br />꿈꾸고 계세요?</h1>
        <div>더 나은 상담을 위해 고객님의 취향과 생각을 미리 들려주세요.<br />작성에는 약 5~10분 정도 소요되며, 정확한 공사 범위와 견적은 현장 확인 후 상담을 통해 안내드립니다.</div>
      </div>
      {mode === "demo" && <p className={styles.demoNotice}>체험용 데이터이며 실제로 저장되지 않습니다.</p>}
      <small>8단계 · 약 5~10분</small>
    </aside>
  );
}
