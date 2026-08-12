import {
  CalendarDays,
  FileImage,
  Files,
  LayoutDashboard,
  ChartNoAxesCombined,
  ListFilter,
  ReceiptText,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";

interface NavigationItem {
  label: string;
  href: string;
  icon: LucideIcon;
  active?: boolean;
  ownerOnly?: boolean;
  superAdminOnly?: boolean;
}

export const primaryNavigation: readonly NavigationItem[] = [
  { label: "대시보드", href: "/dashboard", icon: LayoutDashboard },
  { label: "상담목록", href: "/consultations", icon: ListFilter },
  { label: "예약", href: "/reservations", icon: CalendarDays },
  { label: "견적", href: "/quotes", icon: ReceiptText },
  { label: "이미지", href: "/images", icon: FileImage },
  { label: "파일", href: "/documents", icon: Files },
];

export const managementNavigation: readonly NavigationItem[] = [
  { label: "운영 분석", href: "/analytics", icon: ChartNoAxesCombined, ownerOnly: true },
  { label: "서비스 관리", href: "/admin", icon: ShieldCheck, superAdminOnly: true },
];
