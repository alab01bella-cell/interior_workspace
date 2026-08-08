import {
  CalendarDays,
  ClipboardCheck,
  FileImage,
  Files,
  LayoutDashboard,
  ListFilter,
  ReceiptText,
  LogOut,
  Settings,
  Users,
  UserCog,
  type LucideIcon,
} from "lucide-react";

interface NavigationItem {
  label: string;
  href: string;
  icon: LucideIcon;
  active?: boolean;
}

export const primaryNavigation: readonly NavigationItem[] = [
  { label: "대시보드", href: "/dashboard", icon: LayoutDashboard },
  { label: "상담목록", href: "/consultations", icon: ListFilter },
  { label: "예약", href: "/reservations", icon: CalendarDays },
  { label: "견적", href: "/quotes", icon: ReceiptText },
  { label: "이미지", href: "/images", icon: FileImage },
  { label: "파일", href: "/documents", icon: Files },
];

export const utilityNavigation: readonly NavigationItem[] = [
  { label: "체크리스트", href: "#checklist", icon: ClipboardCheck },
  { label: "팀 관리", href: "/settings/team", icon: Users },
  { label: "프로필 설정", href: "/settings/profile", icon: UserCog },
  { label: "설정", href: "/settings/integrations", icon: Settings },
  { label: "logout", href: "#", icon: LogOut },
];
