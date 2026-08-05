import {
  CalendarDays,
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
  { label: "대시보드", href: "/", icon: LayoutDashboard },
  { label: "상담목록", href: "/consultations", icon: ListFilter },
  { label: "예약", href: "#", icon: CalendarDays },
  { label: "서류", href: "#", icon: Files },
  { label: "이미지", href: "#", icon: FileImage },
  { label: "File", href: "#", icon: FolderOpen },
];

export const utilityNavigation: readonly NavigationItem[] = [
  { label: "setting", href: "#", icon: Settings },
  { label: "logout", href: "#", icon: LogOut },
];
