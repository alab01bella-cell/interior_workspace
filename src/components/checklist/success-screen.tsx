import { Check } from "lucide-react";
import styles from "./checklist.module.css";

export function SuccessScreen({ onList, onReset, production = false }: { onList: () => void; onReset: () => void; production?: boolean }) {
  return (
    <section className={styles.success}>
      <span><Check /></span>
      <p>CONSULTATION RECEIVED</p>
      <h1>{production ? "상담 신청이 접수되었습니다." : "접수가 완료되었습니다."}</h1>
      <div>{production ? "작성해주신 내용을 확인한 후 상담 안내를 드리겠습니다." : <>작성해주신 체험 내용을 브라우저에 저장했습니다.<br />실제 Workspace 데이터에는 반영되지 않습니다.</>}</div>
      <div className={styles.successActions}>
        {!production && <button onClick={onList} type="button">데모로 돌아가기</button>}
        <button onClick={onReset} type="button">새로 작성하기</button>
      </div>
    </section>
  );
}
