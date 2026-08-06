import type { ReactNode } from "react";
import { MobileHeader } from "./mobile-header";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import type { AuthUser } from "@/types/auth";

interface AppShellProps {
  children: ReactNode;
  user: AuthUser;
}

export function AppShell({ children, user }: AppShellProps) {
  return (
    <div className="app-shell">
      <Sidebar user={user} />
      <MobileHeader user={user} />
      <main className="main-content">
        <Topbar user={user} />
        {children}
      </main>
    </div>
  );
}
