"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { checklistSteps, formatBudget, formatPhone, getLocalToday, initialChecklistState, spaceDetailGroups } from "@/lib/checklist/checklist-data";
import { stepForChecklistField, validateChecklistRequired } from "@/lib/checklist/checklist-validation";
import { createChecklistSubmission, mapSubmissionToConsultation } from "@/lib/demo/demo-consultation-mapper";
import { demoLocalStorageConsultationRepository } from "@/lib/demo/demo-local-storage-consultation-repository";
import type { ChecklistFormData } from "@/types/checklist";
import { ChecklistIntro } from "./checklist-intro";
import { ChecklistNavigation } from "./checklist-navigation";
import { ProgressHeader } from "./progress-header";
import { StepCard } from "./step-card";
import { SuccessScreen } from "./success-screen";
import styles from "./checklist.module.css";

type ChecklistMode = "demo" | "production";

export function ChecklistPage({ mode, submissionPath, workspaceName }: { mode: ChecklistMode; submissionPath?: string; workspaceName?: string }) {
  const router = useRouter();
  const [form, setForm] = useState<ChecklistFormData>(() => ({ ...initialChecklistState }));
  const [currentStep, setCurrentStep] = useState(0);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string,string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const submissionInProgress = useRef(false);
  const minDate = useMemo(() => getLocalToday(), []);

  const scrollTop = () => window.scrollTo({ top: 0, behavior: "smooth" });
  const answers=()=>form as unknown as Record<string,unknown>;
  const clearFieldError=(name:string)=>setFieldErrors((current)=>{if(!current[name])return current;const next={...current};delete next[name];return next;});
  const focusFirstError=(errors:Record<string,string>)=>{
    const name=Object.keys(errors)[0];
    if(!name)return;
    window.setTimeout(()=>{
      const field=document.querySelector<HTMLElement>(`[data-field-name="${name}"]`);
      field?.scrollIntoView({behavior:"smooth",block:"center"});
      field?.querySelector<HTMLElement>(`[name="${name}"]`)?.focus({preventScroll:true});
    });
  };

  const updateText = (name: string, rawValue: string) => {
    clearFieldError(name);
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
    clearFieldError(name);
    setError("");
    setForm((state) => {
      const next = { ...state, [name]: value };
      if (name === "housingType" && value !== "기타") next.housingTypeOther = "";
      if (name === "renovationReason" && value !== "기타") next.renovationReasonOther = "";
      return next;
    });
  };

  const updateMultiple = (name: string, value: string, checked: boolean) => {
    clearFieldError(name);
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
    if(direction===1){const errors=validateChecklistRequired(answers(),currentStep);setFieldErrors(errors);if(Object.keys(errors).length){setError("");focusFirstError(errors);return;}}
    setError("");
    setCurrentStep((step) => Math.min(checklistSteps.length - 1, Math.max(0, step + direction)));
    scrollTop();
  };

  const submit = async () => {
    if (submissionInProgress.current) return;
    const requiredErrors=validateChecklistRequired(answers());
    if(Object.keys(requiredErrors).length){
      const firstName=Object.keys(requiredErrors)[0];
      setFieldErrors(requiredErrors);
      setCurrentStep(stepForChecklistField(firstName));
      setError("");
      focusFirstError(requiredErrors);
      return;
    }
    setError("");
    setFieldErrors({});
    submissionInProgress.current = true;
    setIsSubmitting(true);
    try {
      if (mode === "production" && submissionPath) {
        const answers = Object.fromEntries(Object.entries(form).filter(([key]) => key !== "sitePhotos" && key !== "referenceImages"));
        const storageKey = `iw-submission-${submissionPath}`;
        let idempotencyKey = sessionStorage.getItem(storageKey);
        if (!idempotencyKey) { idempotencyKey = crypto.randomUUID(); sessionStorage.setItem(storageKey, idempotencyKey); }
        const response = await fetch(submissionPath, { method: "POST", headers: { "content-type": "application/json", "idempotency-key": idempotencyKey }, body: JSON.stringify({ idempotencyKey, answers }) });
        if (!response.ok) throw new Error("submission_failed");
        sessionStorage.removeItem(storageKey);
      } else {
        const submission = createChecklistSubmission(form);
        demoLocalStorageConsultationRepository.save(mapSubmissionToConsultation(submission));
      }
      setIsComplete(true);
      scrollTop();
    } catch {
      submissionInProgress.current = false;
      setError(mode === "production" ? "상담 접수를 완료하지 못했습니다. 입력 내용을 확인한 뒤 다시 시도해주세요." : "상담 내용을 브라우저에 저장하지 못했습니다. 저장 공간을 확인한 뒤 다시 시도해주세요.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const reset = () => {
    submissionInProgress.current = false;
    setForm({ ...initialChecklistState });
    setCurrentStep(0);
    setError("");
    setFieldErrors({});
    setIsComplete(false);
    scrollTop();
  };

  if (isComplete) return <main className={styles.publicPage}><SuccessScreen onList={() => router.push("/demo")} onReset={reset} production={mode === "production"} /></main>;

  return (
    <main className={styles.publicPage}>
      <div className={styles.shell}>
        <ChecklistIntro mode={mode} workspaceName={workspaceName} />
        <div className={styles.formColumn}>
          <ProgressHeader currentStep={currentStep} />
          <form onSubmit={(event) => { event.preventDefault(); if (currentStep === checklistSteps.length - 1) void submit(); }}>
            <StepCard currentStep={currentStep} fieldErrors={fieldErrors} form={form} minDate={minDate} setConsent={(checked) => {clearFieldError("privacyConsent");setForm((state) => ({ ...state, privacyConsent: checked }));}} setError={setError} setFiles={(name, files) => setForm((state) => ({ ...state, [name]: files }))} setMultiple={updateMultiple} setSingle={updateSingle} setText={updateText} />
            {error && <div aria-live="assertive" className={styles.error} role="alert">{error}</div>}
            <ChecklistNavigation currentStep={currentStep} isSubmitting={isSubmitting} onNext={() => move(1)} onPrevious={() => move(-1)} onSubmit={() => void submit()} totalSteps={checklistSteps.length} />
          </form>
        </div>
      </div>
    </main>
  );
}
