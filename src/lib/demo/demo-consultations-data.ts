import type { Consultation, ConsultationStatus } from "@/types/consultation";

const names = ["홍길동", "고길동", "박지현", "이서준", "김민지", "최유진"];
const regions = ["부산 해운대구", "부산 수영구", "부산 동래구", "부산 연제구", "부산 남구"];
const statuses: ConsultationStatus[] = ["접수", "예약", "완료", "계약"];
const areas = ["24평", "28평", "32평", "34평", "42평"];

export const demoConsultations: Consultation[] = names.map((customerName, index) => ({
  id: `DEMO-CONS-202608-${String(index + 1).padStart(3, "0")}`,
  source: "mock",
  status: statuses[index % statuses.length],
  customerName,
  phone: "010-0000-0000",
  region: regions[index % regions.length],
  fullAddress: `${regions[index % regions.length]} 체험용 주소`,
  housingType: "아파트",
  areaSize: areas[index % areas.length],
  visitDate: `2026-08-${String(4 + index).padStart(2, "0")}`,
  visitTime: `${String(10 + index).padStart(2, "0")}:00`,
  budget: 3500 + index * 500,
  receivedAt: `2026-08-${String(index + 1).padStart(2, "0")}T09:30:00+09:00`,
  request: "체험용 상담 요청사항입니다.",
  style: "화이트 · 우드 · 미니멀",
  family: "체험용 고객",
  quoteStatus:"NOT_CREATED",quoteAmount:null,quoteSentAt:null,quoteNote:null,quoteFileId:null,
  contractOutcome:statuses[index%statuses.length]==="계약"?"CONTRACTED":"PENDING",
  contractDecidedAt:null,lostReason:null,lostReasonNote:null,
}));
