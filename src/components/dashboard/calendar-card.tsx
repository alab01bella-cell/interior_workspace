import { CalendarDays } from "lucide-react";
import { Card } from "@/components/ui/card";

const weekDays = ["일", "월", "화", "수", "목", "금", "토"];
const calendarDays = Array.from({ length: 35 }, (_, index) => index - 2);
const calendarEvents: Record<number, { time: string; customer: string }[]> = {
  4: [
    { time: "10:30", customer: "홍길동" },
    { time: "14:00", customer: "고길동" },
  ],
  8: [{ time: "11:00", customer: "박지현" }],
  13: [{ time: "15:30", customer: "이서준" }],
  21: [{ time: "13:00", customer: "김민지" }],
  27: [{ time: "16:00", customer: "최유진" }],
};

export function CalendarCard() {
  return (
    <Card className="calendar-card">
      <div className="calendar-heading">
        <div className="panel-title">
          <CalendarDays aria-hidden="true" />
          <h2>캘린더</h2>
        </div>
        <strong>2026. 08</strong>
      </div>
      <div className="calendar-grid calendar-weekdays" aria-hidden="true">
        {weekDays.map((day) => <span key={day}>{day}</span>)}
      </div>
      <div className="calendar-grid">
        {calendarDays.map((day, index) => {
          const inMonth = day > 0 && day <= 31;
          const events = inMonth ? calendarEvents[day] ?? [] : [];
          return (
            <span
              className={`${inMonth ? "" : "is-muted"}${day === 4 ? " is-today" : ""}`}
              key={`${day}-${index}`}
            >
              <b>{day <= 0 ? 31 + day : day > 31 ? day - 31 : day}</b>
              {events.length > 0 && (
                <em>
                  {events.slice(0, 2).map((event) => (
                    <small key={`${event.time}-${event.customer}`}>
                      {event.time} {event.customer}
                    </small>
                  ))}
                </em>
              )}
            </span>
          );
        })}
      </div>
      <div className="calendar-legend"><span /> 오늘 상담 2건</div>
    </Card>
  );
}
