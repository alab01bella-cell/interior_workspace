import { UserRound } from "lucide-react";

interface AvatarMarkProps {
  compact?: boolean;
}

export function AvatarMark({ compact = false }: AvatarMarkProps) {
  return (
    <span
      className={compact ? "avatar-mark avatar-mark--compact" : "avatar-mark"}
      aria-hidden="true"
    >
      <UserRound strokeWidth={2.3} />
    </span>
  );
}
