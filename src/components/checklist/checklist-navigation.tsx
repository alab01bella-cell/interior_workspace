import { ArrowLeft, ArrowRight, Send } from "lucide-react";
import styles from "./checklist.module.css";

interface ChecklistNavigationProps {
  currentStep: number;
  isSubmitting: boolean;
  totalSteps: number;
  onNext: () => void;
  onPrevious: () => void;
  onSubmit: () => void;
}

export function ChecklistNavigation({ currentStep, isSubmitting, totalSteps, onNext, onPrevious, onSubmit }: ChecklistNavigationProps) {
  const isLast = currentStep === totalSteps - 1;
  return (
    <nav aria-label="체크리스트 단계 이동" className={styles.navigation}>
      <button className={styles.previousButton} disabled={currentStep === 0 || isSubmitting} onClick={onPrevious} type="button"><ArrowLeft /> 이전</button>
      <button className={styles.nextButton} disabled={isSubmitting} onClick={isLast ? onSubmit : onNext} type="button">
        {isSubmitting ? <><span className={styles.spinner} /> 접수 중입니다.</> : isLast ? <>제출하기 <Send /></> : <>다음 <ArrowRight /></>}
      </button>
    </nav>
  );
}
