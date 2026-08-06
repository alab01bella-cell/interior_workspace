import type { TodoItem } from "@/types/dashboard";

export const demoWorkspace = {
  name: "공간인테리어",
  location: "부산광역시, 재송동",
};

export const demoTodoItems: TodoItem[] = [
  { id: "todo-001", label: "홍길동 고객님 견적서 작성", completed: false },
  { id: "todo-002", label: "고길동 고객님 실측 일정 확인", completed: true },
  { id: "todo-003", label: "마감재 샘플 발주 확인", completed: false },
  { id: "todo-004", label: "박지현 고객님 도면 검토", completed: false },
];
