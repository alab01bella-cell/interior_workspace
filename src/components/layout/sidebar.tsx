import Link from "next/link";
import { primaryNavigation, utilityNavigation } from "@/config/navigation";
import { mockUser } from "@/lib/mock/dashboard-data";
import { AvatarMark } from "./avatar-mark";

export function Sidebar() {
  return (
    <aside className="sidebar" aria-label="사이드바">
      <Link className="brand" href="/" aria-label="Interior Workspace 홈">
        <strong>Interior</strong>
        <span>Workspace</span>
      </Link>

      <div className="sidebar-profile">
        <AvatarMark />
        <span>{mockUser.shortName}</span>
      </div>

      <nav className="sidebar-nav" aria-label="주 메뉴">
        {primaryNavigation.map(({ label, href, icon: Icon, active }) => (
          <Link
            className={`sidebar-link${active ? " is-active" : ""}`}
            href={href}
            key={label}
            aria-current={active ? "page" : undefined}
          >
            <Icon aria-hidden="true" />
            <span>{label}</span>
          </Link>
        ))}
      </nav>

      <nav className="sidebar-nav sidebar-nav--utility" aria-label="설정 메뉴">
        {utilityNavigation.map(({ label, href, icon: Icon }) => (
          <Link className="sidebar-link" href={href} key={label}>
            <Icon aria-hidden="true" />
            <span>{label}</span>
          </Link>
        ))}
      </nav>
    </aside>
  );
}
