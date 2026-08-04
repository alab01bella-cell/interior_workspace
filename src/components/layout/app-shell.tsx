import type { ReactNode } from "react";
import { MobileHeader } from "./mobile-header";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="app-shell">
      <Sidebar />
      <MobileHeader />
      <main className="main-content">
        <Topbar />
        {children}
      </main>
    </div>
  );
}
