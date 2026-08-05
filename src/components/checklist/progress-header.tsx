import { checklistSteps } from "@/lib/checklist/checklist-data";
import styles from "./checklist.module.css";

export function ProgressHeader({ currentStep }: { currentStep: number }) {
  const percent = ((currentStep + 1) / checklistSteps.length) * 100;
  return (
    <header className={styles.progressHeader}>
      <div><span>{currentStep + 1} / {checklistSteps.length}</span><strong>{checklistSteps[currentStep].title}</strong><em>{Math.round(percent)}%</em></div>
      <div className={styles.progressTrack}><span style={{ width: `${percent}%` }} /></div>
    </header>
  );
}
