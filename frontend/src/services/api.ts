import type { AuthResponse, Task, TaskInput, User } from "../types";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:8080/api";

const saveSession = (data: AuthResponse) => {
  localStorage.setItem("token", data.accessToken || data.token);
  localStorage.setItem("refreshToken", data.refreshToken);
  localStorage.setItem(
    "user",
    JSON.stringify({
      userId: data.userId,
      name: data.name,
      email: data.email,
      role: data.role,
    })
  );
};

const clearSession = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("user");
};

const refreshAccessToken = async (): Promise<string | null> => {
  const refreshToken = localStorage.getItem("refreshToken");
  if (!refreshToken) return null;

  const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  });

  if (!response.ok) {
    clearSession();
    return null;
  }

  const data = (await response.json()) as AuthResponse;
  saveSession(data);
  return data.accessToken || data.token;
};

async function request<T>(
  endpoint: string,
  options: RequestInit = {},
  retry = true
): Promise<T> {
  const token = localStorage.getItem("token");
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });

  if (response.status === 401 && retry && localStorage.getItem("refreshToken")) {
    const refreshed = await refreshAccessToken();
    if (refreshed) return request<T>(endpoint, options, false);
  }

  if (!response.ok) {
    let message = "Something went wrong";
    try {
      const data = await response.json();
      message = data.message || data.error || message;
    } catch {
      // Non-JSON error response.
    }
    throw new Error(message);
  }

  if (response.status === 204) return null as T;
  return (await response.json()) as T;
}

export const registerUser = (data: {
  name: string;
  email: string;
  password: string;
}) => request<AuthResponse>("/auth/register", {
  method: "POST",
  body: JSON.stringify(data),
});

export const loginUser = (data: {
  email: string;
  password: string;
}) => request<AuthResponse>("/auth/login", {
  method: "POST",
  body: JSON.stringify(data),
});

export const logoutUser = async () => {
  const refreshToken = localStorage.getItem("refreshToken");
  if (refreshToken) {
    await request<null>("/auth/logout", {
      method: "POST",
      body: JSON.stringify({ refreshToken }),
    }, false).catch(() => null);
  }
  clearSession();
};

export const getTasks = (params: {
  q?: string;
  status?: string;
  priority?: string;
  sort?: string;
} = {}) => {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value) search.set(key, value);
  });
  const query = search.toString();
  return request<Task[]>(`/tasks${query ? `?${query}` : ""}`);
};

export const createTask = (data: TaskInput) =>
  request<Task>("/tasks", {
    method: "POST",
    body: JSON.stringify(data),
  });

export const updateTask = (id: number, data: TaskInput) =>
  request<Task>(`/tasks/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });

export const deleteTask = (id: number) =>
  request<null>(`/tasks/${id}`, { method: "DELETE" });

export const getAdminUsers = () => request<User[]>("/admin/users");