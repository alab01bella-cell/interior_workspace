import type { ChecklistFormState, ChecklistOption, ChecklistStepMeta, SpaceDetailGroup } from "@/types/checklist";

export const checklistSteps: ChecklistStepMeta[] = [
  { title: "기본 정보", guide: "현장 확인과 상담 안내를 위한 기본 정보입니다." },
  { title: "상담 일정", guide: "대면상담 및 유선안내 가능 일정을 확인하기 위한 항목입니다." },
  { title: "공사 범위 및 우선순위", guide: "원하는 공사 범위와 가장 중요하게 생각하는 부분을 알려주세요." },
  { title: "예산 및 일정", guide: "예산은 정확하지 않아도 됩니다. 상담 기준을 잡기 위한 항목입니다." },
  { title: "원하는 분위기", guide: "정확한 스타일명을 몰라도 괜찮습니다. 느낌만 체크해주세요." },
  { title: "생활 방식", guide: "생활 패턴에 따라 수납, 주방, 마감 방향이 달라질 수 있습니다." },
  { title: "사진 및 참고자료", guide: "현재 집 사진이나 원하는 분위기 자료가 있으면 첨부해주세요." },
  { title: "상담 및 연락 정보", guide: "상담 방식과 연락 정보를 마지막으로 확인해주세요." },
];

export interface ChecklistAnswerField {
  name: string;
  label: string;
  kind?: "files";
}

export const checklistAnswerSections: { title: string; fields: ChecklistAnswerField[] }[] = [
  { title: "기본 정보", fields: [
    { name: "address", label: "현장 주소" }, { name: "addressDetail", label: "상세주소" },
    { name: "housingType", label: "공간 형태" }, { name: "housingTypeOther", label: "기타 공간 형태" },
    { name: "areaSize", label: "평수" }, { name: "currentStatus", label: "현재 상태" },
    { name: "occupancyType", label: "거주 형태" }, { name: "renovationReason", label: "인테리어를 고려하게 된 이유" },
    { name: "renovationReasonOther", label: "기타 사유" },
  ] },
  { title: "상담 일정", fields: [
    { name: "visitDate", label: "대면상담 희망일" }, { name: "visitTime", label: "대면상담 희망 시간" },
    { name: "callDays", label: "유선안내 가능 요일" }, { name: "callTime", label: "유선안내 가능 시간" },
  ] },
  { title: "공사 범위 및 우선순위", fields: [
    { name: "constructionScope", label: "공사 범위" }, { name: "targetSpaces", label: "바꾸고 싶은 공간" },
    { name: "spaceDetails", label: "공간별로 바꾸고 싶은 항목" }, { name: "spaceDetailsOther", label: "기타 공간 및 항목" },
    { name: "inconvenience", label: "현재 공간에서 가장 불편하거나 개선하고 싶은 부분" },
    { name: "skipOk", label: "하지 않아도 되는 공사" }, { name: "priority", label: "가장 중요하게 생각하는 기준" },
    { name: "nonNegotiable", label: "절대 포기하기 어려운 부분" },
  ] },
  { title: "예산 및 일정", fields: [
    { name: "budget", label: "생각 중인 예산" }, { name: "budgetType", label: "예산 기준" },
    { name: "moveInDate", label: "입주 예정일" }, { name: "preferredStart", label: "공사 희망 시기" },
    { name: "livingDuringConstruction", label: "공사 중 거주 여부" }, { name: "scheduleNote", label: "일정 관련 특이사항" },
  ] },
  { title: "원하는 분위기", fields: [
    { name: "styles", label: "원하는 스타일" }, { name: "otherStyle", label: "원하는 스타일 기타" },
    { name: "colorTone", label: "선호 색감" }, { name: "avoidStyle", label: "피하고 싶은 느낌" },
  ] },
  { title: "생활 방식", fields: [
    { name: "residents", label: "거주 인원" }, { name: "hasChild", label: "아이 여부" },
    { name: "hasPet", label: "반려동물 여부" }, { name: "storageNeed", label: "수납 필요도" },
    { name: "cookingFrequency", label: "요리 빈도" }, { name: "workSpace", label: "재택근무·작업공간" },
    { name: "lifestyleNote", label: "생활 방식 및 취미 관련 특이사항" },
  ] },
  { title: "사진 및 참고자료", fields: [
    { name: "sitePhotos", label: "현장 사진", kind: "files" }, { name: "referenceImages", label: "참고 이미지", kind: "files" },
    { name: "referenceLinks", label: "참고 링크" }, { name: "referenceLike", label: "참고 자료에서 마음에 드는 부분" },
  ] },
  { title: "상담 및 연락 정보", fields: [
    { name: "ageGroup", label: "연령대" }, { name: "consultationExperience", label: "인테리어 상담 경험" },
    { name: "decisionStyle", label: "상담 시 원하는 의견 반영 방식" }, { name: "preferredContact", label: "상담 안내를 받으실 연락 방법" },
    { name: "questions", label: "상담 때 꼭 물어보고 싶은 내용" }, { name: "etc", label: "기타 요청사항" },
    { name: "name", label: "성함" }, { name: "phone", label: "휴대폰 번호" },
    { name: "privacyConsent", label: "개인정보 수집 및 이용 동의" },
  ] },
];

export const option = (value: string, label = value): ChecklistOption => ({ value, label });

export const timeOptions = Array.from({ length: 23 }, (_, index) => {
  const minutes = 9 * 60 + index * 30;
  const value = `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
  return option(value);
});

export const spaceDetailGroups: SpaceDetailGroup[] = [
  { space: "현관", options: ["중문", "신발장", "바닥", "조명"].map((item) => option(`현관 · ${item}`, item)) },
  { space: "거실", options: ["바닥", "벽·천장", "조명", "수납"].map((item) => option(`거실 · ${item}`, item)) },
  { space: "주방", options: ["싱크대·가구", "상판", "벽타일", "수납·동선"].map((item) => option(`주방 · ${item}`, item)) },
  { space: "욕실", options: ["타일", "세면대·양변기", "수전·샤워", "욕조·파티션"].map((item) => option(`욕실 · ${item}`, item)) },
  { space: "방", options: ["바닥", "벽·천장", "붙박이장", "조명"].map((item) => option(`방 · ${item}`, item)) },
  { space: "베란다", options: ["바닥", "탄성코트·도장", "창호", "수납"].map((item) => option(`베란다 · ${item}`, item)) },
  { space: "다용도실", options: ["바닥", "수납", "세탁기·건조기 공간", "배수·설비"].map((item) => option(`다용도실 · ${item}`, item)) },
];

export const initialChecklistState: ChecklistFormState = {
  address: "", addressDetail: "", housingType: "", housingTypeOther: "", areaSize: "", currentStatus: "", occupancyType: "",
  renovationReason: "", renovationReasonOther: "", visitDate: "", visitTime: "", callDays: [], callTime: "",
  constructionScope: "", targetSpaces: [], spaceDetails: [], spaceDetailsOther: "", inconvenience: "", skipOk: "", priority: [], nonNegotiable: "",
  budget: "", budgetType: "", moveInDate: "", preferredStart: "", livingDuringConstruction: "", scheduleNote: "",
  styles: [], otherStyle: "", colorTone: [], avoidStyle: "", residents: "", hasChild: "", hasPet: "", storageNeed: "",
  cookingFrequency: "", workSpace: "", lifestyleNote: "", sitePhotos: [], referenceImages: [], referenceLinks: "", referenceLike: "",
  ageGroup: "", consultationExperience: "", decisionStyle: "", preferredContact: "", questions: "", etc: "", name: "", phone: "",
  privacyConsent: false,
};

export const formatPhone = (value: string) => {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 7) return digits.replace(/(\d{3})(\d+)/, "$1-$2");
  if (digits.length === 10) return digits.replace(/(\d{3})(\d{3})(\d{4})/, "$1-$2-$3");
  return digits.replace(/(\d{3})(\d{4})(\d{4})/, "$1-$2-$3");
};

export const formatBudget = (value: string) => {
  const digits = value.replace(/\D/g, "");
  return digits ? Number(digits).toLocaleString("ko-KR") : "";
};

export const getLocalToday = () => {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
};
