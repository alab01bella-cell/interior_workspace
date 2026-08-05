import { Check } from "lucide-react";
import styles from "./checklist.module.css";

export function SuccessScreen({ onReset }: { onReset: () => void }) {
  return (
    <section className={styles.success}>
      <span><Check /></span>
      <p>CONSULTATION RECEIVED</p>
      <h1>접수가 완료되었습니다.</h1>
      <div>작성해주신 내용을 확인 후 상담 시 함께 안내드리겠습니다.<br />현재 데모에서는 실제 서버로 전송되지 않습니다.</div>
      <button onClick={onReset} type="button">새 체크리스트 작성</button>
    </section>
  );
}
