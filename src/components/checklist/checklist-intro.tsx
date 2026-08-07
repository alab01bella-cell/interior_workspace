import styles from "./checklist.module.css";

export function ChecklistIntro({ mode, workspaceName }: { mode: "demo" | "production"; workspaceName?: string }) {
  return (
    <aside className={styles.intro}>
      <div className={styles.introMain}>
        <div className={styles.introIdentityBlock}>
          <div className={styles.brand}><span aria-hidden="true" /> INTERIOR WORKSPACE</div>
          {mode === "production" && workspaceName && (
            <div className={styles.workspaceIdentity}>
              <span>상담 업체</span>
              <strong>{workspaceName}</strong>
            </div>
          )}
        </div>
        <div className={styles.introCopy}>
          <p>INTERIOR CONSULTING CHECKLIST</p>
          <h1>어떤 공간을<br />꿈꾸고 계신가요?</h1>
          <div>
            <p>더 나은 상담을 위해 고객님의 취향과 생각을 미리 들려주세요.</p>
            <p>고객님의 상황과 취향을 자세히 알려주실수록<br />더 원활한 상담이 가능합니다.</p>
            <p>작성에는 약 5~10분 정도 소요되며,<br />정확한 공사 범위와 견적은 현장 확인 후<br />상담을 통해 안내드립니다.</p>
          </div>
        </div>
      </div>
      <div className={styles.introMeta}>
        {mode === "demo" && <p className={styles.demoNotice}>체험용 데이터이며 실제로 저장되지 않습니다.</p>}
        <small>8단계 · 약 5~10분</small>
      </div>
    </aside>
  );
}
