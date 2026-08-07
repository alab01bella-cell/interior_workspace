import {
  CalendarDays,
  ClipboardCheck,
  FileImage,
  Files,
  FolderOpen,
  LayoutDashboard,
  ListFilter,
  LogOut,
  Settings,
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
  { label: "예약", href: "#", icon: CalendarDays },
  { label: "이미지", href: "/images", icon: FileImage },
  { label: "서류", href: "/documents", icon: Files },
  { label: "File", href: "#", icon: FolderOpen },
];

export const utilityNavigation: readonly NavigationItem[] = [
  { label: "체크리스트", href: "#checklist", icon: ClipboardCheck },
  { label: "설정", href: "/settings/integrations", icon: Settings },
  { label: "logout", href: "#", icon: LogOut },
];
