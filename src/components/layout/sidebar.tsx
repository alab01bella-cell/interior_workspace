"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { primaryNavigation, utilityNavigation } from "@/config/navigation";
import type { WorkspaceIdentity } from "@/types/workspace";
import { AvatarMark } from "./avatar-mark";

export function Sidebar({ identity }: { identity: WorkspaceIdentity }) {
  const pathname = usePathname();

  return (
    <aside className="sidebar" aria-label="사이드바">
      <Link className="brand" href="/dashboard" aria-label="Interior Workspace 홈">
        <strong>Interior</strong>
        <span>Workspace</span>
      </Link>

      <div className="sidebar-profile">
        <AvatarMark imageUrl={identity.profileImageUrl ?? undefined} />
        <div><strong>{identity.workspaceName}</strong><span>{identity.displayName}</span></div>
      </div>

      <nav className="sidebar-nav" aria-label="주 메뉴">
        {primaryNavigation.map(({ label, href, icon: Icon }) => {
          const active = pathname.startsWith(href);
          return (
          <Link
            className={`sidebar-link${active ? " is-active" : ""}`}
            href={href}
            key={label}
            aria-current={active ? "page" : undefined}
          >
            <Icon aria-hidden="true" />
            <span>{label}</span>
          </Link>
          );
        })}
      </nav>

      <nav className="sidebar-nav sidebar-nav--utility" aria-label="설정 메뉴">
        {utilityNavigation.map(({ label, href, icon: Icon }) => label === "logout" ? (
          <form action="/api/auth/logout" key={label} method="post">
            <button className="sidebar-link sidebar-link--button" type="submit"><Icon aria-hidden="true" /><span>로그아웃</span></button>
          </form>
        ) : (
          <Link className="sidebar-link" href={href} key={label}><Icon aria-hidden="true" /><span>{label}</span></Link>
        ))}
      </nav>
    </aside>
  );
}
