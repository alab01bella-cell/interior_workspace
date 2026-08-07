import type { ChecklistFormState } from "@/types/checklist";

export type ChecklistFieldKind = "text" | "choice" | "date" | "consent";

export interface ChecklistRequiredField {
  name: keyof ChecklistFormState;
  label: string;
  step: number;
  kind: ChecklistFieldKind;
  when?: (answers: Record<string, unknown>) => boolean;
}

const hasStandardTargetSpace = (answers:Record<string,unknown>) => {
  const values=Array.isArray(answers.targetSpaces)?answers.targetSpaces:[];
  return values.some((value)=>value!=="기타");
};

export const checklistRequiredFields:ChecklistRequiredField[]=[
  {name:"address",label:"현장 주소",step:0,kind:"text"},
  {name:"addressDetail",label:"상세주소",step:0,kind:"text"},
  {name:"housingType",label:"공간 형태",step:0,kind:"choice"},
  {name:"housingTypeOther",label:"기타 공간 형태",step:0,kind:"text",when:(a)=>a.housingType==="기타"},
  {name:"areaSize",label:"평수",step:0,kind:"choice"},
  {name:"currentStatus",label:"현재 상태",step:0,kind:"choice"},
  {name:"occupancyType",label:"거주 형태",step:0,kind:"choice"},
  {name:"renovationReason",label:"인테리어를 고려하게 된 이유",step:0,kind:"choice"},
  {name:"renovationReasonOther",label:"기타 사유",step:0,kind:"text",when:(a)=>a.renovationReason==="기타"},
  {name:"visitDate",label:"대면상담 희망일",step:1,kind:"date"},
  {name:"visitTime",label:"대면상담 희망 시간",step:1,kind:"choice"},
  {name:"callDays",label:"유선안내 가능 요일",step:1,kind:"choice"},
  {name:"callTime",label:"유선안내 가능 시간",step:1,kind:"choice"},
  {name:"constructionScope",label:"공사 범위",step:2,kind:"choice"},
  {name:"targetSpaces",label:"바꾸고 싶은 공간",step:2,kind:"choice"},
  {name:"spaceDetails",label:"공간별로 바꾸고 싶은 항목",step:2,kind:"choice",when:hasStandardTargetSpace},
  {name:"spaceDetailsOther",label:"기타 공간 및 항목",step:2,kind:"text",when:(a)=>Array.isArray(a.targetSpaces)&&a.targetSpaces.includes("기타")},
  {name:"inconvenience",label:"현재 공간에서 가장 불편하거나 개선하고 싶은 부분",step:2,kind:"text"},
  {name:"priority",label:"가장 중요하게 생각하는 기준",step:2,kind:"choice"},
  {name:"budget",label:"생각 중인 예산",step:3,kind:"text"},
  {name:"budgetType",label:"예산 기준",step:3,kind:"choice"},
  {name:"preferredStart",label:"공사 희망 시기",step:3,kind:"choice"},
  {name:"livingDuringConstruction",label:"공사 중 거주 여부",step:3,kind:"choice"},
  {name:"styles",label:"원하는 스타일",step:4,kind:"choice"},
  {name:"otherStyle",label:"원하는 스타일 기타",step:4,kind:"text",when:(a)=>Array.isArray(a.styles)&&a.styles.includes("기타")},
  {name:"colorTone",label:"선호 색감",step:4,kind:"choice"},
  {name:"residents",label:"거주 인원",step:5,kind:"choice"},
  {name:"hasChild",label:"아이 여부",step:5,kind:"choice"},
  {name:"hasPet",label:"반려동물 여부",step:5,kind:"choice"},
  {name:"storageNeed",label:"수납 필요도",step:5,kind:"choice"},
  {name:"cookingFrequency",label:"요리 빈도",step:5,kind:"choice"},
  {name:"workSpace",label:"재택근무·작업공간",step:5,kind:"choice"},
  {name:"ageGroup",label:"연령대",step:7,kind:"choice"},
  {name:"consultationExperience",label:"인테리어 상담 경험",step:7,kind:"choice"},
  {name:"decisionStyle",label:"상담 시 원하는 의견 반영 방식",step:7,kind:"choice"},
  {name:"preferredContact",label:"상담 안내를 받으실 연락 방법",step:7,kind:"choice"},
  {name:"name",label:"성함",step:7,kind:"text"},
  {name:"phone",label:"휴대폰 번호",step:7,kind:"text"},
  {name:"privacyConsent",label:"개인정보 수집 및 이용 동의",step:7,kind:"consent"},
];

const isEmpty=(value:unknown)=>typeof value==="string"?!value.trim():Array.isArray(value)?value.length===0:value!==true;
const errorMessage=(kind:ChecklistFieldKind)=>kind==="choice"?"한 가지 이상 선택해주세요.":kind==="date"?"날짜를 선택해주세요.":kind==="consent"?"동의가 필요합니다.":"필수 항목입니다.";

export function isChecklistFieldRequired(name:string,answers:Record<string,unknown>):boolean {
  const field=checklistRequiredFields.find((item)=>item.name===name);
  return Boolean(field&&(!field.when||field.when(answers)));
}

export function validateChecklistRequired(answers:Record<string,unknown>,step?:number):Record<string,string> {
  const errors:Record<string,string>={};
  for(const field of checklistRequiredFields) {
    if(step!==undefined&&field.step!==step) continue;
    if(field.when&&!field.when(answers)) continue;
    if(isEmpty(answers[field.name])) errors[field.name]=errorMessage(field.kind);
  }
  return errors;
}

export function stepForChecklistField(name:string):number {
  return checklistRequiredFields.find((field)=>field.name===name)?.step??0;
}
