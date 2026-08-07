import type { ChangeEvent, ReactNode } from "react";
import { checklistSteps, option, spaceDetailGroups, timeOptions } from "@/lib/checklist/checklist-data";
import { isChecklistFieldRequired } from "@/lib/checklist/checklist-validation";
import type { ChecklistFormState, ChecklistOption } from "@/types/checklist";
import { AddressSearchField } from "./address-search-field";
import { FilePicker } from "./file-picker";
import { OptionChip } from "./option-chip";
import styles from "./checklist.module.css";

interface StepCardProps {
  currentStep: number;
  form: ChecklistFormState;
  minDate: string;
  setText: (name: string, value: string) => void;
  setSingle: (name: string, value: string) => void;
  setMultiple: (name: string, value: string, checked: boolean) => void;
  setFiles: (name: "sitePhotos" | "referenceImages", files: File[]) => void;
  setConsent: (checked: boolean) => void;
  setError: (message: string) => void;
  fieldErrors: Record<string,string>;
}

function Field({ children, label, hint, name, required, error }: { children: ReactNode; label: string; hint?: string; name:string; required?:boolean; error?:string }) {
  return <div className={`${styles.field}${error?` ${styles.fieldInvalid}`:""}`} data-field-name={name}><label className={styles.fieldLabel}>{label}{required&&<span className={styles.requiredMark}>필수</span>}</label>{children}{hint && <p className={styles.hint}>{hint}</p>}{error&&<p className={styles.fieldError} role="alert">{error}</p>}</div>;
}

function TextField({ form, label, name, placeholder = "", textarea = false, type = "text", min, inputMode, onChange, fieldErrors }: {
  form: ChecklistFormState; label: string; name: string; placeholder?: string; textarea?: boolean; type?: string; min?: string;
  inputMode?: "numeric"; onChange: (name: string, value: string) => void; fieldErrors:Record<string,string>;
}) {
  const value = String(form[name]);
  const required=isChecklistFieldRequired(name,form);
  const error=fieldErrors[name];
  const handleChange = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChange(name, event.target.value);
  return <Field error={error} label={label} name={name} required={required}>{textarea ? <textarea aria-invalid={Boolean(error)} name={name} onChange={handleChange} placeholder={placeholder} value={value} /> : <input aria-invalid={Boolean(error)} inputMode={inputMode} min={min} name={name} onChange={handleChange} placeholder={placeholder} type={type} value={value} />}</Field>;
}

function ChoiceField({ form, label, name, options, type, onSingle, onMultiple, required, error }: {
  form: ChecklistFormState; label: string; name: string; options: ChecklistOption[]; type: "radio" | "checkbox";
  onSingle: (name: string, value: string) => void; onMultiple: (name: string, value: string, checked: boolean) => void; required?:boolean; error?:string;
}) {
  const selected = form[name];
  const selectedStrings = Array.isArray(selected) ? selected.filter((item): item is string => typeof item === "string") : [];
  return (
    <Field error={error} label={label} name={name} required={required}><div className={styles.options}>
      {options.map((item) => <OptionChip checked={Array.isArray(selected) ? selectedStrings.includes(item.value) : selected === item.value} key={item.value} name={name} onChange={(value, checked) => type === "radio" ? onSingle(name, value) : onMultiple(name, value, checked)} option={item} type={type} />)}
    </div></Field>
  );
}

const options = {
  housingType: ["아파트", "빌라", "단독주택", "오피스텔", "상가", "기타"].map((item) => option(item)),
  areaSize: ["10평 미만~10평대", "20평대", "30평대", "40평대", "50평대", "60평 이상"].map((item) => option(item)),
  currentStatus: ["현재 공실", "공실 예정", "거주 중", "입주 예정", "신축 입주", "기타(부동산 계약 전)"].map((item) => option(item)),
  occupancyType: ["소유", "전·월세"].map((item) => option(item)),
  renovationReason: ["새로 입주할 공간의 리모델링", "현재 거주 중인 공간의 리모델링", "매매·임대를 위한 리모델링", "기타"].map((item) => option(item)),
  callDays: ["월요일", "화요일", "수요일", "목요일", "금요일", "토요일", "상관없음"].map((item) => option(item)),
  constructionScope: ["전체공사", "부분공사", "상담 필요"].map((item) => option(item)),
  targetSpaces: ["전체", "현관", "거실", "주방", "욕실", "방", "베란다", "다용도실", "기타"].map((item) => option(item)),
  priority: ["예산", "디자인", "수납", "동선", "마감", "일정", "내구성"].map((item) => option(item)),
  budgetType: ["최대한 절약", "퀄리티 우선", "상담 필요"].map((item) => option(item)),
  preferredStart: ["최대한 빠르게", "1개월 이내", "2~3개월 이내", "협의 후 진행"].map((item) => option(item)),
  livingDuringConstruction: ["공실 상태에서 공사", "거주하면서 공사"].map((item) => option(item)),
  styles: [option("화이트"), option("우드"), option("모던"), option("심플", "미니멀"), option("내추럴"), option("따뜻한 느낌"), option("고급스러운 느낌"), option("기타")],
  colorTone: ["밝은 톤", "어두운 톤", "베이지톤", "그레이톤", "우드톤", "컬러 포인트", "상담 필요"].map((item) => option(item)),
  residents: ["1인", "2인", "3인", "4인 이상"].map((item) => option(item)),
  yesNo: ["있음", "없음"].map((item) => option(item)),
  storageNeed: ["적음", "보통", "많음"].map((item) => option(item)),
  cookingFrequency: ["거의 안 함", "보통", "자주 함"].map((item) => option(item)),
  workSpace: ["필요", "필요 없음", "상담 필요"].map((item) => option(item)),
  ageGroup: ["20~30대", "40대", "50대", "60대 이상"].map((item) => option(item)),
  consultationExperience: ["없음", "1~2회", "3회 이상"].map((item) => option(item)),
  decisionStyle: ["제 의견을 중심으로 진행하고 싶어요", "전문가의 추천을 참고해서 결정하고 싶어요", "전문가에게 전체적으로 맡기고 싶어요"].map((item) => option(item)),
  preferredContact: ["전화", "문자·카카오톡"].map((item) => option(item)),
};

export function StepCard(props: StepCardProps) {
  const { currentStep, form, minDate, setText, setSingle, setMultiple, setFiles, setConsent, setError, fieldErrors } = props;
  const meta=(name:string)=>({required:isChecklistFieldRequired(name,form),error:fieldErrors[name]});
  const choices = (label: string, name: string, items: ChecklistOption[], type: "radio" | "checkbox" = "radio") => <ChoiceField {...meta(name)} form={form} label={label} name={name} onMultiple={setMultiple} onSingle={setSingle} options={items} type={type} />;
  const visibleSpaces = form.targetSpaces.includes("전체") ? [...spaceDetailGroups.map((group) => group.space), "기타"] : form.targetSpaces;

  return (
    <section className={styles.stepCard}>
      <div className={styles.stepHeading}><span>STEP {currentStep + 1}</span><h2>{currentStep + 1}. {checklistSteps[currentStep].title}</h2><p>{checklistSteps[currentStep].guide}</p></div>
      {currentStep===0&&<p className={styles.requiredGuide}><span>필수</span> 표시는 반드시 입력해야 하는 항목입니다.</p>}
      <div className={styles.fields}>
        {currentStep === 0 && <>
          <AddressSearchField
            address={form.address}
            addressDetail={form.addressDetail}
            onAddressChange={(value) => setText("address", value)}
            onAddressDetailChange={(value) => setText("addressDetail", value)}
            onError={setError}
            errors={{address:fieldErrors.address,addressDetail:fieldErrors.addressDetail}}
            required
          />
          {choices("공간 형태", "housingType", options.housingType)}
          {form.housingType === "기타" && <TextField fieldErrors={fieldErrors} form={form} label="기타 공간 형태" name="housingTypeOther" onChange={setText} placeholder="공간 형태를 입력해주세요." />}
          {choices("평수", "areaSize", options.areaSize)}
          {choices("현재 상태", "currentStatus", options.currentStatus)}
          {choices("거주 형태", "occupancyType", options.occupancyType)}
          {choices("인테리어를 고려하게 된 이유", "renovationReason", options.renovationReason)}
          {form.renovationReason === "기타" && <TextField fieldErrors={fieldErrors} form={form} label="기타 사유" name="renovationReasonOther" onChange={setText} placeholder="인테리어를 고려하게 된 이유를 입력해주세요." />}
        </>}

        {currentStep === 1 && <>
          <Field {...meta("visitDate")} hint="오늘 이후의 날짜만 선택할 수 있습니다." label="대면상담 희망일" name="visitDate"><input aria-invalid={Boolean(fieldErrors.visitDate)} min={minDate} name="visitDate" onChange={(event) => setText("visitDate", event.target.value)} type="date" value={form.visitDate} /></Field>
          <Field {...meta("visitTime")} label="대면상담 희망 시간" name="visitTime"><select aria-invalid={Boolean(fieldErrors.visitTime)} name="visitTime" onChange={(event) => setText("visitTime", event.target.value)} value={form.visitTime}><option value="">시간을 선택해주세요.</option>{timeOptions.map((item) => <option key={item.value}>{item.value}</option>)}</select></Field>
          {choices("유선안내 가능 요일", "callDays", options.callDays, "checkbox")}
          <Field {...meta("callTime")} label="유선안내 가능 시간" name="callTime"><select aria-invalid={Boolean(fieldErrors.callTime)} name="callTime" onChange={(event) => setText("callTime", event.target.value)} value={form.callTime}><option value="">시간을 선택해주세요.</option>{timeOptions.map((item) => <option key={item.value}>{item.value}</option>)}</select></Field>
        </>}

        {currentStep === 2 && <>
          {choices("공사 범위", "constructionScope", options.constructionScope)}
          {choices("바꾸고 싶은 공간", "targetSpaces", options.targetSpaces, "checkbox")}
          {visibleSpaces.length > 0 && <Field {...meta("spaceDetails")} hint="선택한 공간에서 바꾸고 싶은 항목을 골라주세요." label="공간별로 바꾸고 싶은 항목" name="spaceDetails"><div className={styles.spaceGroups}>
            {spaceDetailGroups.filter((group) => visibleSpaces.includes(group.space)).map((group) => <div key={group.space}><strong>{group.space}</strong><div className={styles.options}>{group.options.map((item) => <OptionChip checked={form.spaceDetails.includes(item.value)} key={item.value} name="spaceDetails" onChange={(value, checked) => setMultiple("spaceDetails", value, checked)} option={item} type="checkbox" />)}</div></div>)}
            {visibleSpaces.includes("기타") && <div data-field-name="spaceDetailsOther"><strong>기타 공간 <span className={styles.requiredMark}>필수</span></strong><textarea aria-invalid={Boolean(fieldErrors.spaceDetailsOther)} name="spaceDetailsOther" onChange={(event) => setText("spaceDetailsOther", event.target.value)} placeholder="공간과 바꾸고 싶은 항목을 입력해주세요." value={form.spaceDetailsOther} />{fieldErrors.spaceDetailsOther&&<p className={styles.fieldError} role="alert">{fieldErrors.spaceDetailsOther}</p>}</div>}
          </div></Field>}
          <TextField fieldErrors={fieldErrors} form={form} label="현재 공간에서 가장 불편하거나 개선하고 싶은 부분" name="inconvenience" onChange={setText} placeholder="예: 수납이 부족해요 / 주방이 좁고 불편해요 / 공간이 전체적으로 어두워 보여요" textarea />
          <TextField fieldErrors={fieldErrors} form={form} label="하지 않아도 되는 공사" name="skipOk" onChange={setText} placeholder="예: 베란다는 꼭 안 해도 됩니다. 창호는 상태를 보고 결정하고 싶어요." textarea />
          {choices("가장 중요하게 생각하는 기준", "priority", options.priority, "checkbox")}
          <TextField fieldErrors={fieldErrors} form={form} label="절대 포기하기 어려운 부분" name="nonNegotiable" onChange={setText} placeholder="예: 욕실은 꼭 새것처럼 바꾸고 싶어요. 수납은 최대한 확보하고 싶어요." textarea />
        </>}

        {currentStep === 3 && <>
          <Field {...meta("budget")} label="생각 중인 예산" name="budget"><div className={styles.suffixInput}><input aria-invalid={Boolean(fieldErrors.budget)} inputMode="numeric" name="budget" onChange={(event) => setText("budget", event.target.value)} value={form.budget} /><span>만원</span></div></Field>
          {choices("예산 기준", "budgetType", options.budgetType)}
          <Field hint="오늘 이후의 날짜만 선택할 수 있습니다." label="입주 예정일" name="moveInDate"><input min={minDate} name="moveInDate" onChange={(event) => setText("moveInDate", event.target.value)} type="date" value={form.moveInDate} /></Field>
          {choices("공사 희망 시기", "preferredStart", options.preferredStart)}
          {choices("공사 중 거주 여부", "livingDuringConstruction", options.livingDuringConstruction)}
          <TextField fieldErrors={fieldErrors} form={form} label="일정 관련 특이사항" name="scheduleNote" onChange={setText} placeholder="예: 이사일이 정해져 있어요. 특정 날짜 전까지 끝나야 해요." textarea />
        </>}

        {currentStep === 4 && <>
          {choices("원하는 스타일", "styles", options.styles, "checkbox")}
          {form.styles.includes("기타") && <TextField fieldErrors={fieldErrors} form={form} label="원하는 스타일 기타" name="otherStyle" onChange={setText} placeholder="원하는 스타일이나 분위기를 자유롭게 적어주세요." textarea />}
          {choices("선호 색감", "colorTone", options.colorTone, "checkbox")}
          <TextField fieldErrors={fieldErrors} form={form} label="피하고 싶은 느낌" name="avoidStyle" onChange={setText} placeholder="예: 너무 차가운 느낌은 싫어요. 어두운 집은 피하고 싶어요." textarea />
        </>}

        {currentStep === 5 && <>
          {choices("거주 인원", "residents", options.residents)}
          {choices("아이 여부", "hasChild", options.yesNo)}
          {choices("반려동물 여부", "hasPet", options.yesNo)}
          {choices("수납 필요도", "storageNeed", options.storageNeed)}
          {choices("요리 빈도", "cookingFrequency", options.cookingFrequency)}
          {choices("재택근무·작업공간", "workSpace", options.workSpace)}
          <TextField fieldErrors={fieldErrors} form={form} label="생활 방식 및 취미 관련 특이사항" name="lifestyleNote" onChange={setText} placeholder="예: 홈짐이 필요해요 / 악기 연주를 해요 / 캠핑 장비가 많아요 / 큰 작품을 만드는 취미가 있어요" textarea />
        </>}

        {currentStep === 6 && <>
          <FilePicker files={form.sitePhotos} hint="현재 집 사진을 첨부해주세요. 여러 장 선택 가능합니다." label="현장 사진" name="sitePhotos" onChange={(files) => setFiles("sitePhotos", files)} onError={setError} />
          <FilePicker files={form.referenceImages} hint="원하는 분위기, 타업체 시공사례, 캡처 이미지 등을 첨부할 수 있습니다." label="참고 이미지" name="referenceImages" onChange={(files) => setFiles("referenceImages", files)} onError={setError} />
          <TextField fieldErrors={fieldErrors} form={form} label="참고 링크" name="referenceLinks" onChange={setText} placeholder="인스타그램 / 블로그 / 핀터레스트 / 타업체 시공사례 / 제품 링크 등을 붙여넣어주세요." textarea />
          <TextField fieldErrors={fieldErrors} form={form} label="참고 자료에서 마음에 드는 부분" name="referenceLike" onChange={setText} placeholder="예: 전체 분위기 / 색감 / 주방 디자인 / 욕실 분위기 / 조명 / 수납 방식 / 바닥재 느낌 / 가구 배치" textarea />
        </>}

        {currentStep === 7 && <>
          {choices("연령대", "ageGroup", options.ageGroup)}
          {choices("인테리어 상담 경험", "consultationExperience", options.consultationExperience)}
          {choices("상담 시 원하는 의견 반영 방식", "decisionStyle", options.decisionStyle)}
          {choices("상담 안내를 받으실 연락 방법", "preferredContact", options.preferredContact)}
          <TextField fieldErrors={fieldErrors} form={form} label="상담 때 꼭 물어보고 싶은 내용" name="questions" onChange={setText} placeholder="예: 이 예산으로 어디까지 가능한지 궁금해요. 공사 기간이 얼마나 걸릴지 궁금해요." textarea />
          <TextField fieldErrors={fieldErrors} form={form} label="기타 요청사항" name="etc" onChange={setText} placeholder="추가로 전달하고 싶은 내용을 적어주세요." textarea />
          <TextField fieldErrors={fieldErrors} form={form} label="성함" name="name" onChange={setText} placeholder="성함을 입력해주세요." />
          <TextField fieldErrors={fieldErrors} form={form} inputMode="numeric" label="휴대폰 번호" name="phone" onChange={setText} type="tel" />
          <div className={`${styles.consentBox}${fieldErrors.privacyConsent?` ${styles.fieldInvalid}`:""}`} data-field-name="privacyConsent"><label><input aria-invalid={Boolean(fieldErrors.privacyConsent)} checked={form.privacyConsent} name="privacyConsent" onChange={(event) => setConsent(event.target.checked)} type="checkbox" /><span><strong>개인정보 수집 및 이용에 동의합니다. <span className={styles.requiredMark}>필수</span></strong><small>상담 접수와 연락을 위해 성명, 연락처, 주소 및 상담 내용을 수집하며 상담 완료 후 관련 기준에 따라 보관·파기합니다.</small></span></label>{fieldErrors.privacyConsent&&<p className={styles.fieldError} role="alert">{fieldErrors.privacyConsent}</p>}</div>
          <div className={styles.review}><span>입력 내용 확인</span><h3>제출 전 한 번 더 확인해주세요.</h3><dl><div><dt>성함</dt><dd>{form.name || "미입력"}</dd></div><div><dt>휴대폰 번호</dt><dd>{form.phone || "미입력"}</dd></div><div><dt>현장 주소</dt><dd>{[form.address, form.addressDetail].filter(Boolean).join(" ") || "미입력"}</dd></div><div><dt>공간 정보</dt><dd>{[form.housingType, form.areaSize].filter(Boolean).join(" · ") || "미입력"}</dd></div><div><dt>상담 희망일</dt><dd>{[form.visitDate, form.visitTime].filter(Boolean).join(" ") || "미입력"}</dd></div><div><dt>생각 중인 예산</dt><dd>{form.budget ? `${form.budget}만원` : "미입력"}</dd></div><div><dt>첨부 이미지</dt><dd>현장 {form.sitePhotos.length}개 · 참고 {form.referenceImages.length}개</dd></div></dl></div>
        </>}
      </div>
    </section>
  );
}
