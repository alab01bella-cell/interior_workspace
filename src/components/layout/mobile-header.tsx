"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { primaryNavigation, utilityNavigation } from "@/config/navigation";
import type { AuthUser } from "@/types/auth";
import { AvatarMark } from "./avatar-mark";

export function MobileHeader({ user }: { user: AuthUser }) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  return (
    <>
      <header className="mobile-header">
        <div className="mobile-brand">
          <strong>Interior</strong>
          <span>Workspace</span>
        </div>
        <button
          className="icon-button icon-button--light"
          aria-expanded={isOpen}
          aria-label={isOpen ? "메뉴 닫기" : "메뉴 열기"}
          onClick={() => setIsOpen((current) => !current)}
          type="button"
        >
          {isOpen ? <X /> : <Menu />}
        </button>
      </header>
      {isOpen && (
        <div className="mobile-menu-backdrop" onClick={() => setIsOpen(false)}>
          <nav className="mobile-menu" aria-label="모바일 메뉴" onClick={(event) => event.stopPropagation()}>
            <div className="mobile-menu-profile">
              <AvatarMark compact imageUrl={user.profileImage} />
              <div><strong>{user.name}</strong><span>{user.email}</span></div>
            </div>
            {[...primaryNavigation, ...utilityNavigation].map(({ label, href, icon: Icon }) => {
              const active = href !== "#" && pathname.startsWith(href);
              if (label === "logout") return (
                <form action="/api/auth/logout" key={label} method="post">
                  <button className="mobile-menu-link mobile-menu-link--button" type="submit"><Icon aria-hidden="true" /><span>로그아웃</span></button>
                </form>
              );
              return (
              <Link
                className={`mobile-menu-link${active ? " is-active" : ""}`}
                href={href}
                key={label}
                onClick={() => setIsOpen(false)}
              >
                <Icon aria-hidden="true" />
                <span>{label}</span>
              </Link>
              );
            })}
          </nav>
        </div>
      )}
    </>
  );
}
