"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { primaryNavigation, utilityNavigation } from "@/config/navigation";

export function MobileHeader() {
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
            {[...primaryNavigation, ...utilityNavigation].map(({ label, href, icon: Icon }) => {
              const active = href === "/" ? pathname === "/" : href !== "#" && pathname.startsWith(href);
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
