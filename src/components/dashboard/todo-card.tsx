"use client";

import { useState } from "react";
import { ListChecks } from "lucide-react";
import { Card } from "@/components/ui/card";
import type { TodoItem } from "@/types/dashboard";

export function TodoCard({ initialItems }: { initialItems: TodoItem[] }) {
  const [items, setItems] = useState(initialItems);

  const toggleItem = (id: string) => {
    setItems((currentItems) =>
      currentItems.map((item) =>
        item.id === id ? { ...item, completed: !item.completed } : item,
      ),
    );
  };

  return (
    <Card className="todo-card">
      <div className="panel-title">
        <ListChecks aria-hidden="true" />
        <h2>To do list</h2>
      </div>
      <div className="todo-list">
        {items.map((item) => (
          <label className={item.completed ? "is-completed" : ""} key={item.id}>
            <input
              checked={item.completed}
              onChange={() => toggleItem(item.id)}
              type="checkbox"
            />
            <span>{item.label}</span>
          </label>
        ))}
        {items.length === 0 && <p className="dashboard-empty">등록된 할 일이 없습니다.</p>}
      </div>
      <button className="text-link" type="button">전체보기 <span>›</span></button>
    </Card>
  );
}
