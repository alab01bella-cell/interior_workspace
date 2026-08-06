const SEOUL_TIME_ZONE = "Asia/Seoul";

export function getGreetingForSeoulTime(date = new Date()): string {
  const hour = Number(new Intl.DateTimeFormat("en-US", {
    timeZone: SEOUL_TIME_ZONE,
    hour: "2-digit",
    hourCycle: "h23",
  }).format(date));

  if (hour >= 6 && hour < 12) return "좋은 아침입니다.";
  if (hour >= 12 && hour < 18) return "활기찬 오후입니다.";
  return "오늘 하루도 고생 많으셨습니다.";
}

export function formatGreetingSubject(displayName: string, jobTitle?: string | null): string {
  const nameWithoutHonorific = displayName.trim().replace(/(?:\s*님)+$/u, "").trim() || "사용자";
  const normalizedJobTitle = jobTitle?.trim().replace(/(?:\s*님)+$/u, "").trim();
  return `${nameWithoutHonorific}${normalizedJobTitle ? ` ${normalizedJobTitle}` : ""}님`;
}
