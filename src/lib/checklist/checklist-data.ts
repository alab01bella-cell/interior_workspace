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
