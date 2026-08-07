const SEOUL_ZONE = "Asia/Seoul";

export function parseSeoulDateTime(value: unknown): string | null {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return null;
  const parsed = new Date(`${value}:00+09:00`);
  if (!Number.isFinite(parsed.getTime())) return null;
  const roundTrip = formatSeoulInput(parsed.toISOString());
  return roundTrip === value ? parsed.toISOString() : null;
}

export function formatSeoulInput(value: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone:SEOUL_ZONE, year:"numeric", month:"2-digit", day:"2-digit", hour:"2-digit", minute:"2-digit", hourCycle:"h23" }).formatToParts(new Date(value));
  const get=(type:Intl.DateTimeFormatPartTypes)=>parts.find((part)=>part.type===type)?.value??"";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}

export function formatSeoulDateTime(value: string): string {
  const parts = new Intl.DateTimeFormat("ko-KR", { timeZone:SEOUL_ZONE, year:"numeric", month:"2-digit", day:"2-digit", hour:"2-digit", minute:"2-digit", hourCycle:"h23" }).formatToParts(new Date(value));
  const get=(type:Intl.DateTimeFormatPartTypes)=>parts.find((part)=>part.type===type)?.value??"";
  return `${get("year")}. ${get("month")}. ${get("day")}. ${get("hour")}:${get("minute")}`;
}

export function seoulDateKey(value: string | Date): string {
  return new Intl.DateTimeFormat("en-CA", {timeZone:SEOUL_ZONE,year:"numeric",month:"2-digit",day:"2-digit"}).format(typeof value==="string"?new Date(value):value);
}
