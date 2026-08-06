import { CalendarDays } from "lucide-react";
import type { Consultation } from "@/types/consultation";
import { Card } from "@/components/ui/card";

const weekDays = ["일", "월", "화", "수", "목", "금", "토"];

export function CalendarCard({ consultations, demo }: { consultations: Consultation[]; demo: boolean }) {
  const reference = demo ? new Date("2026-08-01T00:00:00+09:00") : new Date();
  const year = reference.getFullYear();
  const month = reference.getMonth();
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const calendarDays = Array.from({ length: 42 }, (_, index) => index - firstWeekday + 1);
  const events = consultations.reduce<Record<number, Consultation[]>>((byDay, consultation) => {
    const [eventYear, eventMonth, eventDay] = consultation.visitDate.split("-").map(Number);
    if (eventYear === year && eventMonth === month + 1 && eventDay) (byDay[eventDay] ??= []).push(consultation);
    return byDay;
  }, {});
  const eventCount = Object.values(events).reduce((count, dayEvents) => count + dayEvents.length, 0);

  return (
    <Card className="calendar-card">
      <div className="calendar-heading">
        <div className="panel-title"><CalendarDays aria-hidden="true" /><h2>캘린더</h2></div>
        <strong>{year}. {String(month + 1).padStart(2, "0")}</strong>
      </div>
      <div className="calendar-grid calendar-weekdays" aria-hidden="true">
        {weekDays.map((day) => <span key={day}>{day}</span>)}
      </div>
      <div className="calendar-grid">
        {calendarDays.map((day, index) => {
          const inMonth = day > 0 && day <= daysInMonth;
          const dayEvents = inMonth ? events[day] ?? [] : [];
          const displayDay = day <= 0
            ? new Date(year, month, day).getDate()
            : day > daysInMonth ? day - daysInMonth : day;
          return (
            <span className={inMonth ? "" : "is-muted"} key={`${day}-${index}`}>
              <b>{displayDay}</b>
              {dayEvents.length > 0 && <em>{dayEvents.slice(0, 2).map((event) => <small key={event.id}>{event.visitTime} {event.customerName}</small>)}</em>}
            </span>
          );
        })}
      </div>
      <div className="calendar-legend"><span /> {eventCount ? `상담 일정 ${eventCount}건` : "일정 없음"}</div>
    </Card>
  );
}
