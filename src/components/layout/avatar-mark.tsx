import { UserRound } from "lucide-react";

interface AvatarMarkProps {
  compact?: boolean;
  imageUrl?: string;
}

export function AvatarMark({ compact = false, imageUrl }: AvatarMarkProps) {
  return (
    <span
      className={compact ? "avatar-mark avatar-mark--compact" : "avatar-mark"}
      aria-hidden="true"
    >
      {imageUrl ? <span className="avatar-photo" style={{ backgroundImage: `url(${JSON.stringify(imageUrl).slice(1, -1)})` }} /> : <UserRound strokeWidth={2.3} />}
    </span>
  );
}
