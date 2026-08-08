"use client";

import { useMemo,useState } from "react";
import Link from "next/link";
import { CalendarDays,ChevronLeft,ChevronRight } from "lucide-react";
import type { Consultation } from "@/types/consultation";
import { Card } from "@/components/ui/card";
import { formatSeoulInput,seoulDateKey } from "@/lib/consultations/reservation-time";

const weekDays=["일","월","화","수","목","금","토"];
const seoulToday=()=>new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Seoul",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
export function CalendarCard({consultations,demo}:{consultations:Consultation[];demo:boolean}){
  const initial=demo?"2026-08-01":seoulToday(),[initialYear,initialMonth]=initial.split("-").map(Number);const [cursor,setCursor]=useState({year:initialYear,month:initialMonth-1});
  const firstWeekday=new Date(Date.UTC(cursor.year,cursor.month,1)).getUTCDay(),daysInMonth=new Date(Date.UTC(cursor.year,cursor.month+1,0)).getUTCDate();const calendarDays=Array.from({length:42},(_,index)=>index-firstWeekday+1),todayKey=demo?"2026-08-04":seoulToday();
  const events=useMemo(()=>consultations.reduce<Record<number,Consultation[]>>((byDay,item)=>{const key=item.scheduledAt?seoulDateKey(item.scheduledAt):demo?item.visitDate:"";const [year,month,day]=key.split("-").map(Number);if(year===cursor.year&&month===cursor.month+1&&day)(byDay[day]??=[]).push(item);return byDay},{}),[consultations,cursor,demo]);
  Object.values(events).forEach((day)=>day.sort((a,b)=>(a.scheduledAt??a.visitTime).localeCompare(b.scheduledAt??b.visitTime)));
  const move=(amount:number)=>setCursor((value)=>{const next=new Date(Date.UTC(value.year,value.month+amount,1));return{year:next.getUTCFullYear(),month:next.getUTCMonth()}});
  return <Card className="calendar-card"><div className="calendar-heading"><div className="panel-title"><CalendarDays/><h2>월간 캘린더</h2></div><nav><button type="button" aria-label="이전 달" onClick={()=>move(-1)}><ChevronLeft/></button><strong>{cursor.year}. {String(cursor.month+1).padStart(2,"0")}</strong><button type="button" aria-label="다음 달" onClick={()=>move(1)}><ChevronRight/></button></nav></div><div className="calendar-grid calendar-weekdays" aria-hidden="true">{weekDays.map((day)=><span key={day}>{day}</span>)}</div><div className="calendar-grid calendar-month-grid">{calendarDays.map((day,index)=>{const inMonth=day>0&&day<=daysInMonth,displayDay=day<=0?new Date(Date.UTC(cursor.year,cursor.month,day)).getUTCDate():day>daysInMonth?day-daysInMonth:day,key=`${cursor.year}-${String(cursor.month+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`,dayEvents=inMonth?events[day]??[]:[];return <span className={`${inMonth?"":"is-muted"}${inMonth&&key===todayKey?" is-today":""}`} key={`${day}-${index}`}><b>{displayDay}</b><em>{dayEvents.slice(0,3).map((item)=>{const content=<>{item.scheduledAt?formatSeoulInput(item.scheduledAt).slice(11,16):item.visitTime} {item.customerName}</>;return demo?<small key={item.id}>{content}</small>:<Link href={`/consultations/${encodeURIComponent(item.id)}`} key={item.id}>{content}</Link>})}{dayEvents.length>3&&<small>+{dayEvents.length-3}건</small>}</em></span>})}</div></Card>;
}
