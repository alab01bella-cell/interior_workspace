import { Search } from "lucide-react";
import type { WorkspaceIdentity } from "@/types/workspace";
import { AvatarMark } from "./avatar-mark";
import { ConsultationNotifications } from "./consultation-notifications";
import { ConsultationLinkCopyButton } from "@/components/integrations/consultation-link-copy-button";

export function Topbar({ identity }: { identity: WorkspaceIdentity }) {
  return (
    <header className="topbar">
      <label className="search-field">
        <Search aria-hidden="true" />
        <input aria-label="고객 검색" placeholder="고객을 검색해보세요" type="search" />
      </label>

      <div className="topbar-actions">
        <ConsultationLinkCopyButton path={identity.consultationChecklistUrl}/>
        <ConsultationNotifications />
        <div className="topbar-profile">
          <AvatarMark compact imageUrl={identity.profileImageUrl ?? undefined} />
          <div>
            <strong>{identity.displayName}</strong>
            <span>{identity.workspaceName} · {identity.email}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
