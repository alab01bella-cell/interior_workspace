import { Bell, Search, UserPlus } from "lucide-react";
import { mockUser } from "@/lib/mock/dashboard-data";
import { AvatarMark } from "./avatar-mark";

export function Topbar() {
  return (
    <header className="topbar">
      <label className="search-field">
        <Search aria-hidden="true" />
        <input aria-label="고객 검색" placeholder="고객을 검색해보세요" type="search" />
      </label>

      <div className="topbar-actions">
        <button className="icon-button" aria-label="사용자 추가" type="button">
          <UserPlus />
        </button>
        <button className="icon-button notification-button" aria-label="알림" type="button">
          <Bell />
          <span aria-hidden="true" />
        </button>
        <div className="topbar-profile">
          <AvatarMark compact />
          <div>
            <strong>{mockUser.name}</strong>
            <span>관리자</span>
          </div>
        </div>
      </div>
    </header>
  );
}
