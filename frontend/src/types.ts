export type TaskStatus = "TODO" | "IN_PROGRESS" | "DONE";
export type TaskPriority = "LOW" | "MEDIUM" | "HIGH";

export interface User {
  userId: number;
  name: string;
  email: string;
  role: "USER" | "ADMIN";
}

export interface Task {
  id: number;
  title: string;
  description?: string;
  completed: boolean;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: string | null;
  position: number;
  category?: string | null;
  assigneeEmail?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TaskInput {
  title: string;
  description?: string;
  completed?: boolean;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: string | null;
  position?: number;
  category?: string;
  assigneeEmail?: string;
}

export interface AuthResponse {
  token: string;
  accessToken: string;
  refreshToken: string;
  userId: number;
  name: string;
  email: string;
  role: "USER" | "ADMIN";
}