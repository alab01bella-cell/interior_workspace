import type { ReactNode } from "react";
import { MobileHeader } from "./mobile-header";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import type { WorkspaceIdentity } from "@/types/workspace";

interface AppShellProps {
  children: ReactNode;
  identity: WorkspaceIdentity;
}

export function AppShell({ children, identity }: AppShellProps) {
  return (
    <div className="app-shell">
      <Sidebar identity={identity} />
      <MobileHeader identity={identity} />
      <main className="main-content">
        <Topbar identity={identity} />
        {children}
      </main>
    </div>
  );
}
