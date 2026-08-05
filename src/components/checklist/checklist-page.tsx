"use client";

import { useMemo, useState } from "react";
import { checklistSteps, formatBudget, formatPhone, getLocalToday, initialChecklistState, spaceDetailGroups } from "@/lib/checklist/checklist-data";
import type { ChecklistFormState } from "@/types/checklist";
import { ChecklistIntro } from "./checklist-intro";
import { ChecklistNavigation } from "./checklist-navigation";
import { ProgressHeader } from "./progress-header";
import { StepCard } from "./step-card";
import { SuccessScreen } from "./success-screen";
import styles from "./checklist.module.css";

export function ChecklistPage() {
  const [form, setForm] = useState<ChecklistFormState>(() => ({ ...initialChecklistState }));
  const [currentStep, setCurrentStep] = useState(0);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const minDate = useMemo(() => getLocalToday(), []);

  const scrollTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  const updateText = (name: string, rawValue: string) => {
    let value = rawValue;
    if (name === "phone") value = formatPhone(value);
    if (name === "budget") value = formatBudget(value);
    if ((name === "visitDate" || name === "moveInDate") && value && value < minDate) {
      setError("오늘보다 이전 날짜는 선택할 수 없습니다.");
      value = "";
    } else setError("");
    setForm((state) => ({ ...state, [name]: value }));
  };

  const updateSingle = (name: string, value: string) => {
    setError("");
    setForm((state) => {
      const next = { ...state, [name]: value };
      if (name === "housingType" && value !== "기타") next.housingTypeOther = "";
      if (name === "renovationReason" && value !== "기타") next.renovationReasonOther = "";
      return next;
    });
  };

  const updateMultiple = (name: string, value: string, checked: boolean) => {
    setError("");
    setForm((state) => {
      const current = state[name];
      if (!Array.isArray(current)) return state;
      const currentValues = current.filter((item): item is string => typeof item === "string");
      let values = checked ? [...currentValues, value] : currentValues.filter((item) => item !== value);
      const next = { ...state, [name]: values };

      if (name === "targetSpaces") {
        if (value === "전체" && checked) values = ["전체"];
        else if (checked) values = values.filter((item) => item !== "전체");
        next.targetSpaces = values;

        const visibleSpaces = values.includes("전체") ? spaceDetailGroups.map((group) => group.space) : values;
        next.spaceDetails = state.spaceDetails.filter((detail) => visibleSpaces.some((space) => detail.startsWith(`${space} · `)));
        if (!values.includes("전체") && !values.includes("기타")) next.spaceDetailsOther = "";
      }
      if (name === "styles" && value === "기타" && !checked) next.otherStyle = "";
      return next;
    });
  };

  const move = (direction: 1 | -1) => {
    setError("");
    setCurrentStep((step) => Math.min(checklistSteps.length - 1, Math.max(0, step + direction)));
    scrollTop();
  };

  const submit = async () => {
    if (!form.privacyConsent) {
      setError("제출하려면 개인정보 수집 및 이용에 동의해주세요.");
      document.querySelector<HTMLInputElement>('input[name="privacyConsent"]')?.focus();
      return;
    }
    setError("");
    setIsSubmitting(true);
    await new Promise((resolve) => window.setTimeout(resolve, 900));
    setIsSubmitting(false);
    setIsComplete(true);
    scrollTop();
  };

  const reset = () => {
    setForm({ ...initialChecklistState });
    setCurrentStep(0);
    setError("");
    setIsComplete(false);
    scrollTop();
  };

  if (isComplete) return <main className={styles.publicPage}><SuccessScreen onReset={reset} /></main>;

  return (
    <main className={styles.publicPage}>
      <div className={styles.shell}>
        <ChecklistIntro />
        <div className={styles.formColumn}>
          <ProgressHeader currentStep={currentStep} />
          <form onSubmit={(event) => { event.preventDefault(); if (currentStep === checklistSteps.length - 1) void submit(); }}>
            <StepCard currentStep={currentStep} form={form} minDate={minDate} setConsent={(checked) => setForm((state) => ({ ...state, privacyConsent: checked }))} setError={setError} setFiles={(name, files) => setForm((state) => ({ ...state, [name]: files }))} setMultiple={updateMultiple} setSingle={updateSingle} setText={updateText} />
            {error && <div aria-live="assertive" className={styles.error} role="alert">{error}</div>}
            <ChecklistNavigation currentStep={currentStep} isSubmitting={isSubmitting} onNext={() => currentStep === checklistSteps.length - 1 ? undefined : move(1)} onPrevious={() => move(-1)} totalSteps={checklistSteps.length} />
          </form>
        </div>
      </div>
    </main>
  );
}
