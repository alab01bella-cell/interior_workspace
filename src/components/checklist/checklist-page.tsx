"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { checklistSteps, formatBudget, formatPhone, getLocalToday, initialChecklistState, spaceDetailGroups } from "@/lib/checklist/checklist-data";
import { createChecklistSubmission, mapSubmissionToConsultation } from "@/lib/demo/demo-consultation-mapper";
import { demoLocalStorageConsultationRepository } from "@/lib/demo/demo-local-storage-consultation-repository";
import type { ChecklistFormData } from "@/types/checklist";
import { ChecklistIntro } from "./checklist-intro";
import { ChecklistNavigation } from "./checklist-navigation";
import { ProgressHeader } from "./progress-header";
import { StepCard } from "./step-card";
import { SuccessScreen } from "./success-screen";
import styles from "./checklist.module.css";

export function ChecklistPage() {
  const router = useRouter();
  const [form, setForm] = useState<ChecklistFormData>(() => ({ ...initialChecklistState }));
  const [currentStep, setCurrentStep] = useState(0);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const submissionInProgress = useRef(false);
  const minDate = useMemo(() => getLocalToday(), []);

  const scrollTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  const updateText = (name: string, rawValue: string) => {
    let value = rawValue;
    if (name === "phone") value = formatPhone(value);
    if (name === "budget") value = formatBudget(value);
    if ((name === "visitDate" || name === "moveInDate") && value && value < minDate) {
      setError("지난 날짜는 선택할 수 없습니다.");
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
    if (submissionInProgress.current) return;
    const required: { name: keyof ChecklistFormData; label: string; step: number }[] = [
      { name: "address", label: "현장 주소", step: 0 },
      { name: "areaSize", label: "평수", step: 0 },
      { name: "visitDate", label: "상담 희망일", step: 1 },
      { name: "budget", label: "생각 중인 예산", step: 3 },
      { name: "name", label: "성함", step: 7 },
      { name: "phone", label: "휴대폰 번호", step: 7 },
      { name: "privacyConsent", label: "개인정보 수집 및 이용 동의", step: 7 },
    ];
    const missing = required.find(({ name }) => {
      const value = form[name];
      return typeof value === "boolean" ? !value : !String(value).trim();
    });
    if (missing) {
      setCurrentStep(missing.step);
      setError(`${missing.step + 1}단계의 '${missing.label}' 항목을 입력해주세요.`);
      window.setTimeout(() => {
        document.querySelector<HTMLElement>(`[name="${String(missing.name)}"]`)?.focus();
        scrollTop();
      });
      return;
    }
    setError("");
    submissionInProgress.current = true;
    setIsSubmitting(true);
    try {
      const submission = createChecklistSubmission(form);
      demoLocalStorageConsultationRepository.save(mapSubmissionToConsultation(submission));
      setIsComplete(true);
      scrollTop();
    } catch {
      submissionInProgress.current = false;
      setError("상담 내용을 브라우저에 저장하지 못했습니다. 저장 공간을 확인한 뒤 다시 시도해주세요.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const reset = () => {
    submissionInProgress.current = false;
    setForm({ ...initialChecklistState });
    setCurrentStep(0);
    setError("");
    setIsComplete(false);
    scrollTop();
  };

  if (isComplete) return <main className={styles.publicPage}><SuccessScreen onList={() => router.push("/demo")} onReset={reset} /></main>;

  return (
    <main className={styles.publicPage}>
      <div className={styles.shell}>
        <ChecklistIntro />
        <div className={styles.formColumn}>
          <ProgressHeader currentStep={currentStep} />
          <form onSubmit={(event) => { event.preventDefault(); if (currentStep === checklistSteps.length - 1) void submit(); }}>
            <StepCard currentStep={currentStep} form={form} minDate={minDate} setConsent={(checked) => setForm((state) => ({ ...state, privacyConsent: checked }))} setError={setError} setFiles={(name, files) => setForm((state) => ({ ...state, [name]: files }))} setMultiple={updateMultiple} setSingle={updateSingle} setText={updateText} />
            {error && <div aria-live="assertive" className={styles.error} role="alert">{error}</div>}
            <ChecklistNavigation currentStep={currentStep} isSubmitting={isSubmitting} onNext={() => move(1)} onPrevious={() => move(-1)} onSubmit={() => void submit()} totalSteps={checklistSteps.length} />
          </form>
        </div>
      </div>
    </main>
  );
}
