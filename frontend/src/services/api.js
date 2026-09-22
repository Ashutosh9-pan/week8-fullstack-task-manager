const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8080/api";
async function request(endpoint, options = {}) {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  if (!response.ok) {
    let message = "Something went wrong";
    try {
      const data = await response.json();
      message = data.message || data.error || message;
    } catch {
      // Ignore non-JSON error responses
    }
    if (response.status === 401 || response.status === 403) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
    }
    throw new Error(message);
  }
  if (response.status === 204) {
    return null;
  }
  return response.json();
}
export const registerUser = (data) =>
  request("/auth/register", {
    method: "POST",
    body: JSON.stringify(data),
  });
export const loginUser = (data) =>
  request("/auth/login", {
    method: "POST",
    body: JSON.stringify(data),
  });
export const getTasks = (token) =>
  request("/tasks", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
export const createTask = (token, data) =>
  request("/tasks", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
export const updateTask = (token, id, data) =>
  request(`/tasks/${id}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
export const deleteTask = (token, id) =>
  request(`/tasks/${id}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
