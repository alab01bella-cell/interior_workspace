import {
  CalendarClock,
  CircleCheckBig,
  FilePenLine,
  Handshake,
} from "lucide-react";
import type {
  DashboardStat,
  TodayConsultation,
  TodoItem,
} from "@/types/dashboard";

export const mockUser = {
  name: "은비",
  shortName: "Kim",
  location: "부산광역시, 재송동",
};

export const dashboardStats: DashboardStat[] = [
  { label: "접수", count: 2, icon: FilePenLine, featured: true },
  { label: "예약", count: 4, icon: CalendarClock },
  { label: "완료", count: 10, icon: CircleCheckBig },
  { label: "계약", count: 5, icon: Handshake },
];

export const todayConsultations: TodayConsultation[] = [
  {
    id: "consultation-001",
    time: "10:30",
    customerName: "홍길동",
    summary: "아파트 전체 리모델링 32평",
  },
  {
    id: "consultation-002",
    time: "14:00",
    customerName: "고길동",
    summary: "아파트 전체 리모델링 25평",
  },
  {
    id: "consultation-003",
    time: "15:30",
    customerName: "박지현",
    summary: "신축 아파트 부분 인테리어 34평",
  },
  {
    id: "consultation-004",
    time: "17:00",
    customerName: "이서준",
    summary: "상가 리뉴얼 상담 18평",
  },
  {
    id: "consultation-005",
    time: "19:00",
    customerName: "김민지",
    summary: "주방·욕실 부분 공사 28평",
  },
];

export const todoItems: TodoItem[] = [
  { id: "todo-001", label: "홍길동 고객님 견적서 작성", completed: false },
  { id: "todo-002", label: "고길동 고객님 실측 일정 확인", completed: true },
  { id: "todo-003", label: "마감재 샘플 발주 확인", completed: false },
  { id: "todo-004", label: "박지현 고객님 도면 검토", completed: false },
  { id: "todo-005", label: "이번 주 상담 일정 정리", completed: false },
];
