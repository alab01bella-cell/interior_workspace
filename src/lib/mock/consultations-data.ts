import type { Consultation, ConsultationStatus } from "@/types/consultation";

const names = [
  "홍길동", "고길동", "박지현", "이서준", "김민지", "최유진", "정하늘", "윤서아",
  "한도윤", "송예린", "강현우", "임수빈", "조민준", "오지우", "백서진", "신유나",
  "권도현", "문가영", "안재원", "류하린", "배시우", "남채원", "구지호",
];
const regions = ["부산 해운대구", "부산 수영구", "부산 동래구", "부산 연제구", "부산 남구"];
const statuses: ConsultationStatus[] = ["접수", "예약", "완료", "계약"];
const areas = ["24평", "28평", "32평", "34평", "42평"];

export const initialConsultations: Consultation[] = names.map((customerName, index) => {
  const day = String(28 - index).padStart(2, "0");
  const visitDay = String(5 + (index % 22)).padStart(2, "0");
  const areaSize = areas[index % areas.length];
  return {
    id: `CONS-202608-${String(index + 1).padStart(3, "0")}`,
    status: statuses[index % statuses.length],
    customerName,
    phone: `010-${String(2345 + index * 17).padStart(4, "0")}-${String(7812 + index * 7).slice(-4)}`,
    region: regions[index % regions.length],
    fullAddress: `${regions[index % regions.length]} 센텀로 ${20 + index}`,
    housingType: index % 5 === 4 ? "상가" : "아파트",
    areaSize,
    visitDate: `2026-08-${visitDay}`,
    visitTime: `${String(10 + (index % 9)).padStart(2, "0")}:00`,
    budget: 3500 + (index % 7) * 500,
    receivedAt: `2026-07-${day}T${String(9 + (index % 8)).padStart(2, "0")}:30:00+09:00`,
    request: "수납을 충분히 확보하고 공간이 밝아 보이는 방향으로 전체적인 개선을 원합니다.",
    style: index % 2 === 0 ? "화이트 · 우드 · 미니멀" : "베이지 · 내추럴 · 따뜻한 느낌",
    family: index % 3 === 0 ? "부부와 자녀 1명" : "2인 가구",
  };
});
