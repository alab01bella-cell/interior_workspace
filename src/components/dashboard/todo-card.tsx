"use client";

import { FormEvent,useMemo,useState } from "react";
import { ListChecks,Plus,Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import type { TodoItem } from "@/types/dashboard";

export function TodoCard({initialItems,demo=false}:{initialItems:TodoItem[];demo?:boolean}){
  const [items,setItems]=useState(initialItems),[label,setLabel]=useState(""),[pending,setPending]=useState(false),[error,setError]=useState("");
  const ordered=useMemo(()=>[...items].sort((a,b)=>Number(a.completed)-Number(b.completed)||(b.createdAt??b.id).localeCompare(a.createdAt??a.id)),[items]);
  const add=async(event:FormEvent)=>{event.preventDefault();const value=label.trim();if(!value)return;if(demo){setItems((current)=>[{id:crypto.randomUUID(),label:value,completed:false},...current]);setLabel("");return}setPending(true);setError("");const response=await fetch("/api/todos",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({label:value})});const result=await response.json().catch(()=>null) as {item?:TodoItem}|null;setPending(false);if(!response.ok||!result?.item){setError("할 일을 추가하지 못했습니다.");return}setItems((current)=>[result.item!,...current]);setLabel("")};
  const toggle=async(item:TodoItem)=>{const completed=!item.completed;setItems((current)=>current.map((value)=>value.id===item.id?{...value,completed}:value));if(demo)return;const response=await fetch(`/api/todos/${encodeURIComponent(item.id)}`,{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify({completed})});if(!response.ok)setItems((current)=>current.map((value)=>value.id===item.id?item:value))};
  const remove=async(item:TodoItem)=>{setItems((current)=>current.filter((value)=>value.id!==item.id));if(demo)return;const response=await fetch(`/api/todos/${encodeURIComponent(item.id)}`,{method:"DELETE"});if(!response.ok){setItems((current)=>[...current,item]);setError("할 일을 삭제하지 못했습니다.")}};
  return <Card className="todo-card"><div className="panel-title"><ListChecks aria-hidden="true"/><h2>To do list</h2></div><form className="todo-form" onSubmit={(event)=>void add(event)}><input value={label} maxLength={300} onChange={(event)=>setLabel(event.target.value)} placeholder="할 일을 입력하세요" aria-label="할 일"/><button type="submit" disabled={pending||!label.trim()} aria-label="할 일 추가"><Plus/></button></form><div className="todo-list">{ordered.map((item)=><div className={item.completed?"todo-item is-completed":"todo-item"} key={item.id}><label><input checked={item.completed} onChange={()=>void toggle(item)} type="checkbox"/><span>{item.label}</span></label><button type="button" aria-label={`${item.label} 삭제`} onClick={()=>void remove(item)}><Trash2/></button></div>)}{!ordered.length&&<p className="dashboard-empty">등록된 할 일이 없습니다.</p>}</div>{error&&<p className="todo-error" role="alert">{error}</p>}</Card>;
}
