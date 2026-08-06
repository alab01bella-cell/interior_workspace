import { Check } from "lucide-react";
import styles from "./checklist.module.css";

export function SuccessScreen({ onList, onReset }: { onList: () => void; onReset: () => void }) {
  return (
    <section className={styles.success}>
      <span><Check /></span>
      <p>CONSULTATION RECEIVED</p>
      <h1>접수가 완료되었습니다.</h1>
      <div>작성해주신 체험 내용을 브라우저에 저장했습니다.<br />실제 Workspace 데이터에는 반영되지 않습니다.</div>
      <div className={styles.successActions}>
        <button onClick={onList} type="button">데모로 돌아가기</button>
        <button onClick={onReset} type="button">새로 작성하기</button>
      </div>
    </section>
  );
}
