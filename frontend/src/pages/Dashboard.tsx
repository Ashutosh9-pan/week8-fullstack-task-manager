import { useEffect, useMemo, useRef, useState, type DragEvent, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  createTask,
  deleteTask,
  getTasks,
  updateTask,
} from "../services/api";
import type { Task, TaskInput, TaskPriority, TaskStatus, User } from "../types";

const STATUSES: TaskStatus[] = ["TODO", "IN_PROGRESS", "DONE"];
const STATUS_LABELS: Record<TaskStatus, string> = {
  TODO: "To Do",
  IN_PROGRESS: "In Progress",
  DONE: "Done",
};
const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:8080/api";

function CheckIcon() {
  return <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12.5 9.5 17 19 7.5" /></svg>;
}
function TrashIcon() {
  return <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 7h16" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M6 7l1 13h10l1-13" /><path d="M9 7V4h6v3" /></svg>;
}
function PencilIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z" /></svg>;
}
function BellIcon() {
  return <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" /><path d="M13.7 21a2 2 0 0 1-3.4 0" /></svg>;
}
function SunIcon() {
  return <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>;
}
function dueState(dueDate?: string | null) {
  if (!dueDate) return null;
  const diff = new Date(dueDate).getTime() - Date.now();
  if (diff < 0) return "overdue";
  if (diff <= 24 * 60 * 60 * 1000) return "soon";
  return "upcoming";
}
function formatDueDate(dueDate?: string | null) {
  if (!dueDate) return "No due date";
  return new Date(dueDate).toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
}
function emptyTaskInput(): TaskInput {
  return { title: "", description: "", status: "IN_PROGRESS", priority: "MEDIUM", dueDate: null, category: "", assigneeEmail: "" };
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { user: authUser, token, signOut } = useAuth();
  const user = authUser || { userId: 0, name: "User", email: "", role: "USER" };

  const [tasks, setTasks] = useState<Task[]>([]);
  const [form, setForm] = useState<TaskInput>(emptyTaskInput());
  const [editId, setEditId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<TaskInput>(emptyTaskInput());
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | TaskStatus>("ALL");
  const [priorityFilter, setPriorityFilter] = useState<"ALL" | TaskPriority>("ALL");
  const [sort, setSort] = useState("position");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [offline, setOffline] = useState(!navigator.onLine);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [theme, setTheme] = useState(localStorage.getItem("theme") || "dark");
  const [dragTaskId, setDragTaskId] = useState<number | null>(null);

  const titleRef = useRef<HTMLInputElement | null>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("theme", theme);
  }, [theme]);

  const loadTasks = async () => {
    try {
      const data = await getTasks();
      setTasks(data);
      localStorage.setItem("taskflow_cached_tasks", JSON.stringify(data));
      setOffline(false);
      setError("");
    } catch (err) {
      const cached = localStorage.getItem("taskflow_cached_tasks");
      if (cached) {
        setTasks(JSON.parse(cached) as Task[]);
        setOffline(true);
        setError("You are offline. Showing the last cached tasks.");
      } else {
        setError(err instanceof Error ? err.message : "Unable to load tasks");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!token) {
      navigate("/login");
      return;
    }
    loadTasks();
    const wsOrigin = new URL(API_BASE_URL).origin.replace(/^http/, "ws");
    const socket = new WebSocket(wsOrigin + "/ws/tasks");
    socket.onmessage = () => loadTasks();
    socket.onerror = () => setOffline(true);
    const handleOnline = () => setOffline(false);
    const handleOffline = () => setOffline(true);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      socket.close();
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [navigate, token]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      const typing = target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT";
      if (event.key === "/" && !typing) {
        event.preventDefault();
        searchRef.current?.focus();
      }
      if (event.key.toLowerCase() === "n" && !typing) {
        event.preventDefault();
        titleRef.current?.focus();
      }
      if (event.key === "Escape") setNotificationsOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const filteredTasks = useMemo(() => {
    const query = search.trim().toLowerCase();
    const result = tasks.filter((task) => {
      const matchesSearch = !query ||
        task.title.toLowerCase().includes(query) ||
        (task.description || "").toLowerCase().includes(query);
      const matchesStatus = statusFilter === "ALL" || task.status === statusFilter;
      const matchesPriority = priorityFilter === "ALL" || task.priority === priorityFilter;
      return matchesSearch && matchesStatus && matchesPriority;
    });
    return [...result].sort((a, b) => {
      if (sort === "due") {
        return (a.dueDate ? new Date(a.dueDate).getTime() : Number.MAX_SAFE_INTEGER) -
          (b.dueDate ? new Date(b.dueDate).getTime() : Number.MAX_SAFE_INTEGER);
      }
      if (sort === "created") return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      if (sort === "title") return a.title.localeCompare(b.title);
      if (sort === "priority") {
        const rank: Record<TaskPriority, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 };
        return rank[a.priority] - rank[b.priority];
      }
      return a.position - b.position;
    });
  }, [tasks, search, statusFilter, priorityFilter, sort]);

  const notifications = useMemo(
    () => tasks
      .filter((task) => task.status !== "DONE" && dueState(task.dueDate) !== null)
      .sort((a, b) => (a.dueDate ? new Date(a.dueDate).getTime() : 0) - (b.dueDate ? new Date(b.dueDate).getTime() : 0)),
    [tasks]
  );

  const counts = {
    total: tasks.length,
    active: tasks.filter((task) => task.status !== "DONE").length,
    done: tasks.filter((task) => task.status === "DONE").length,
  };

  const tasksByStatus = useMemo(
    () => Object.fromEntries(STATUSES.map((status) => [status, filteredTasks.filter((task) => task.status === status)])) as Record<TaskStatus, Task[]>,
    [filteredTasks]
  );

  const create = async (event: FormEvent) => {
    event.preventDefault();
    if (!form.title?.trim() || offline) return;
    setSaving(true);
    setError("");
    try {
      const created = await createTask({ ...form, title: form.title.trim(), description: form.description?.trim() || "" });
      setTasks((current) => [...current, created]);
      setForm(emptyTaskInput());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create task");
    } finally {
      setSaving(false);
    }
  };

  const buildInput = (task: Task, override: Partial<TaskInput> = {}): TaskInput => ({
    title: task.title,
    description: task.description || "",
    status: task.status,
    priority: task.priority,
    dueDate: task.dueDate || null,
    position: task.position,
    category: task.category || "",
    assigneeEmail: task.assigneeEmail || "",
    completed: task.completed,
    ...override,
  });

  const startEdit = (task: Task) => {
    setEditId(task.id);
    setEditForm(buildInput(task));
  };

  const saveEdit = async (task: Task) => {
    if (!editForm.title?.trim()) return;
    setSaving(true);
    try {
      const updated = await updateTask(task.id, { ...editForm, title: editForm.title.trim(), completed: editForm.status === "DONE" });
      setTasks((current) => current.map((item) => item.id === updated.id ? updated : item));
      setEditId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update task");
    } finally {
      setSaving(false);
    }
  };

  const toggleTask = async (task: Task) => {
    const nextStatus: TaskStatus = task.status === "DONE" ? "IN_PROGRESS" : "DONE";
    try {
      const updated = await updateTask(task.id, buildInput(task, { status: nextStatus, completed: nextStatus === "DONE" }));
      setTasks((current) => current.map((item) => item.id === updated.id ? updated : item));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update task");
    }
  };

  const removeTask = async (id: number) => {
    try {
      await deleteTask(id);
      setTasks((current) => current.filter((task) => task.id !== id));
      if (editId === id) setEditId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to delete task");
    }
  };

  const dropOnStatus = async (event: DragEvent<HTMLDivElement>, status: TaskStatus) => {
    event.preventDefault();
    const id = Number(event.dataTransfer.getData("text/task-id") || dragTaskId);
    const task = tasks.find((item) => item.id === id);
    if (!task || task.status === status) return;
    try {
      const updated = await updateTask(id, buildInput(task, {
        status,
        completed: status === "DONE",
        position: Date.now(),
      }));
      setTasks((current) => current.map((item) => item.id === updated.id ? updated : item));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to move task");
    } finally {
      setDragTaskId(null);
    }
  };

  const enableNotifications = async () => {
    if ("Notification" in window) await Notification.requestPermission();
  };

  const handleLogout = async () => {
    await signOut();
    navigate("/login");
  };

  return (
    <div className="dashboard-page">
      <header className="topbar">
        <div>
          <div className="brand">TaskFlow</div>
          <span className="welcome">Welcome, {user.name}{user.role === "ADMIN" && <span className="role-badge">ADMIN</span>}</span>
        </div>
        <div className="topbar-actions">
          <button className="icon-btn" title="Toggle theme" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>{theme === "dark" ? <SunIcon /> : <span>☾</span>}</button>
          <button className="icon-btn notification-btn" title="Due date notifications" onClick={() => setNotificationsOpen(!notificationsOpen)}>
            <BellIcon />{notifications.length > 0 && <span className="notification-count">{notifications.length}</span>}
          </button>
          <button className="logout-btn" onClick={handleLogout}>Logout</button>
        </div>
        {notificationsOpen && (
          <div className="notifications-panel">
            <div className="notifications-header">
              <strong>Due reminders</strong>
              <button className="secondary-btn" onClick={enableNotifications}>Enable browser alerts</button>
            </div>
            {notifications.length === 0 ? <p>No upcoming or overdue tasks.</p> :
              notifications.map((task) => (
                <div className="notification-item" key={task.id}>
                  <span>{task.title}</span>
                  <small className={dueState(task.dueDate) === "overdue" ? "danger-text" : ""}>
                    {dueState(task.dueDate) === "overdue" ? "Overdue" : formatDueDate(task.dueDate)}
                  </small>
                </div>
              ))}
          </div>
        )}
      </header>

      <main className="dashboard-content">
        {offline && <div className="offline-banner">Offline mode: cached tasks are available. Changes need a connection.</div>}
        <section className="hero">
          <div>
            <p className="eyebrow">MY WORKSPACE</p>
            <h1>Manage your tasks.</h1>
            <p>Stay focused, track progress and keep everything organized.</p>
          </div>
          <div className="stats-grid">
            <div className="task-count"><strong>{counts.total}</strong><span>Total</span></div>
            <div className="task-count"><strong>{counts.active}</strong><span>Active</span></div>
            <div className="task-count"><strong>{counts.done}</strong><span>Done</span></div>
          </div>
        </section>

        <section className="create-card">
          <p className="eyebrow">QUICK ADD</p>
          <h2>Create a new task</h2>
          <form onSubmit={create} className="task-form">
            <input ref={titleRef} placeholder="Task title (press N)" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
            <textarea placeholder="Description" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            <div className="form-grid">
              <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value as TaskPriority })}>
                <option value="HIGH">High priority</option><option value="MEDIUM">Medium priority</option><option value="LOW">Low priority</option>
              </select>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as TaskStatus })}>
                <option value="TODO">To Do</option><option value="IN_PROGRESS">In Progress</option><option value="DONE">Done</option>
              </select>
              <input type="datetime-local" value={form.dueDate || ""} onChange={(e) => setForm({ ...form, dueDate: e.target.value || null })} />
              <input placeholder="Category / tag" value={form.category || ""} onChange={(e) => setForm({ ...form, category: e.target.value })} maxLength={80} />
              <input type="email" placeholder="Assignee email (optional)" value={form.assigneeEmail || ""} onChange={(e) => setForm({ ...form, assigneeEmail: e.target.value })} />
            </div>
            <button className="primary-btn" disabled={saving || offline}>{saving ? "Adding..." : "+ Add Task"}</button>
          </form>
        </section>

        {error && <div className="error-box dashboard-error">{error}</div>}

        <section className="tools-card">
          <div className="search-wrap">
            <input ref={searchRef} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search title or description  /" />
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as "ALL" | TaskStatus)}>
            <option value="ALL">All statuses</option><option value="TODO">To Do</option><option value="IN_PROGRESS">In Progress</option><option value="DONE">Done</option>
          </select>
          <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value as "ALL" | TaskPriority)}>
            <option value="ALL">All priorities</option><option value="HIGH">High</option><option value="MEDIUM">Medium</option><option value="LOW">Low</option>
          </select>
          <select value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="position">Custom order</option><option value="due">Due date</option><option value="priority">Priority</option><option value="created">Newest</option><option value="title">Title</option>
          </select>
        </section>

        <section className="tasks-section">
          <div className="section-heading">
            <div><p className="eyebrow">YOUR WORK</p><h2>Task board</h2></div>
            <span>{filteredTasks.length} visible items</span>
          </div>

          {loading ? (
            <div className="empty-state"><div className="loader"></div><h3>Loading tasks...</h3></div>
          ) : (
            <div className="kanban-grid">
              {STATUSES.map((status) => (
                <div className="kanban-column" key={status} onDragOver={(event) => event.preventDefault()} onDrop={(event) => dropOnStatus(event, status)}>
                  <div className="column-header"><div><span className="column-dot"></span><h3>{STATUS_LABELS[status]}</h3></div><span>{tasksByStatus[status].length}</span></div>
                  <div className="column-body">
                    {tasksByStatus[status].map((task) => {
                      const due = dueState(task.dueDate);
                      return (
                        <article
                          className={"task-card " + (task.status === "DONE" ? "completed " : "") + (dragTaskId === task.id ? "dragging" : "")}
                          key={task.id}
                          draggable
                          onDragStart={(event) => {
                            setDragTaskId(task.id);
                            event.dataTransfer.setData("text/task-id", String(task.id));
                          }}
                        >
                          {editId === task.id ? (
                            <div className="edit-form">
                              <span className="edit-label">EDIT TASK</span>
                              <input value={editForm.title} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} />
                              <textarea rows={3} value={editForm.description || ""} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} />
                              <div className="form-grid">
                                <select value={editForm.status} onChange={(e) => setEditForm({ ...editForm, status: e.target.value as TaskStatus })}>{STATUSES.map((value) => <option key={value} value={value}>{STATUS_LABELS[value]}</option>)}</select>
                                <select value={editForm.priority} onChange={(e) => setEditForm({ ...editForm, priority: e.target.value as TaskPriority })}><option value="HIGH">High</option><option value="MEDIUM">Medium</option><option value="LOW">Low</option></select>
                                <input type="datetime-local" value={editForm.dueDate || ""} onChange={(e) => setEditForm({ ...editForm, dueDate: e.target.value || null })} />
                                <input placeholder="Category" value={editForm.category || ""} onChange={(e) => setEditForm({ ...editForm, category: e.target.value })} />
                              </div>
                              <div className="edit-actions">
                                <button className="secondary-btn" type="button" onClick={() => setEditId(null)}>Cancel</button>
                                <button className="primary-btn" type="button" disabled={saving} onClick={() => saveEdit(task)}>{saving ? "Saving..." : "Save"}</button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className="task-card-top">
                                <button className={"check-btn " + (task.status === "DONE" ? "checked" : "")} onClick={() => toggleTask(task)} title={task.status === "DONE" ? "Mark as active" : "Mark as completed"}>
                                  {task.status === "DONE" && <CheckIcon />}
                                </button>
                                <div className="task-actions">
                                  <button className="edit-btn" onClick={() => startEdit(task)} title="Edit task"><PencilIcon /></button>
                                  <button className="delete-btn" onClick={() => removeTask(task.id)} title="Delete task"><TrashIcon /></button>
                                </div>
                              </div>
                              <h3>{task.title}</h3>
                              {task.description && <p>{task.description}</p>}
                              <div className="task-meta-row">
                                <span className={"priority-badge priority-" + task.priority.toLowerCase()}>{task.priority}</span>
                                {task.category && <span className="meta-chip">{task.category}</span>}
                              </div>
                              {task.assigneeEmail && <div className="assignee">Assigned: {task.assigneeEmail}</div>}
                              <div className={"due-date " + (due === "overdue" ? "overdue" : due === "soon" ? "soon" : "")}>
                                {task.dueDate ? (due === "overdue" ? "Overdue · " : "Due · ") + formatDueDate(task.dueDate) : "No due date"}
                              </div>
                            </>
                          )}
                        </article>
                      );
                    })}
                    {tasksByStatus[status].length === 0 && <div className="drop-placeholder">Drop tasks here</div>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
