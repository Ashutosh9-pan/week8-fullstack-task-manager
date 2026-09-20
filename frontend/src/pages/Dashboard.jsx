import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  createTask,
  deleteTask,
  getTasks,
  updateTask,
} from "../services/api";
function CheckIcon() {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M5 12.5 9.5 17 19 7.5" />
    </svg>
  );
}
function TrashIcon() {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 7h16" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
      <path d="M6 7l1 13h10l1-13" />
      <path d="M9 7V4h6v3" />
    </svg>
  );
}
function PencilIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z" />
    </svg>
  );
}
function Dashboard() {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const [tasks, setTasks] = useState([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const loadTasks = async () => {
    try {
      setError("");
      const data = await getTasks(token);
      setTasks(data);
    } catch (err) {
      setError(err.message);
      if (!localStorage.getItem("token")) {
        navigate("/login");
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
  }, []);
  const handleCreate = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    try {
      setSaving(true);
      setError("");
      const newTask = await createTask(token, {
        title: title.trim(),
        description: description.trim(),
        completed: false,
      });
      setTasks((current) => [...current, newTask]);
      setTitle("");
      setDescription("");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };
  const handleToggle = async (task) => {
    try {
      setError("");
      const updated = await updateTask(token, task.id, {
        title: task.title,
        description: task.description || "",
        completed: !task.completed,
      });
      setTasks((current) =>
        current.map((item) => (item.id === updated.id ? updated : item))
      );
    } catch (err) {
      setError(err.message);
    }
  };
  const handleDelete = async (id) => {
    try {
      setError("");
      await deleteTask(token, id);
      setTasks((current) => current.filter((task) => task.id !== id));
      if (editingId === id) {
        cancelEdit();
      }
    } catch (err) {
      setError(err.message);
    }
  };
  const startEdit = (task) => {
    setEditingId(task.id);
    setEditTitle(task.title);
    setEditDescription(task.description || "");
    setError("");
  };
  const cancelEdit = () => {
    setEditingId(null);
    setEditTitle("");
    setEditDescription("");
  };
  const saveEdit = async (task) => {
    if (!editTitle.trim()) return;
    try {
      setSaving(true);
      setError("");
      const updated = await updateTask(token, task.id, {
        title: editTitle.trim(),
        description: editDescription.trim(),
        completed: task.completed,
      });
      setTasks((current) =>
        current.map((item) => (item.id === updated.id ? updated : item))
      );
      cancelEdit();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };
  const filteredTasks = useMemo(() => {
    if (filter === "active") {
      return tasks.filter((task) => !task.completed);
    }
    if (filter === "completed") {
      return tasks.filter((task) => task.completed);
    }
    return tasks;
  }, [tasks, filter]);
  const completedCount = tasks.filter((task) => task.completed).length;
  const activeCount = tasks.length - completedCount;
  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };
  return (
    <div className="dashboard-page">
      <header className="topbar">
        <div>
          <div className="brand">TaskFlow</div>
          <span className="welcome">
            Welcome, {user.name || "User"}
          </span>
        </div>
        <button className="logout-btn" onClick={handleLogout}>
          Logout
        </button>
      </header>
      <main className="dashboard-content">
        <section className="hero">
          <div>
            <p className="eyebrow">MY WORKSPACE</p>
            <h1>Manage your tasks.</h1>
            <p>
              Stay focused, track progress and keep everything organized.
            </p>
          </div>
          <div className="stats-grid">
            <div className="task-count">
              <strong>{tasks.length}</strong>
              <span>Total</span>
            </div>
            <div className="task-count">
              <strong>{activeCount}</strong>
              <span>Active</span>
            </div>
            <div className="task-count">
              <strong>{completedCount}</strong>
              <span>Done</span>
            </div>
          </div>
        </section>
        <section className="create-card">
          <div className="section-title-row">
            <div>
              <p className="eyebrow">QUICK ADD</p>
              <h2>Create a new task</h2>
            </div>
          </div>
          <form onSubmit={handleCreate} className="task-form">
            <input
              type="text"
              placeholder="Task title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
            <textarea
              placeholder="Description (optional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows="3"
            />
            <button
              className="primary-btn"
              type="submit"
              disabled={saving}
            >
              {saving ? "Adding..." : "+ Add Task"}
            </button>
          </form>
        </section>
        {error && (
          <div className="error-box dashboard-error">
            {error}
          </div>
        )}
        <section className="tasks-section">
          <div className="section-heading">
            <div>
              <p className="eyebrow">YOUR WORK</p>
              <h2>Your Tasks</h2>
            </div>
            <span>{filteredTasks.length} items</span>
          </div>
          <div className="filter-bar">
            {[
              ["all", "All"],
              ["active", "Active"],
              ["completed", "Completed"],
            ].map(([value, label]) => (
              <button
                key={value}
                className={`filter-btn ${
                  filter === value ? "active" : ""
                }`}
                onClick={() => setFilter(value)}
              >
                {label}
              </button>
            ))}
          </div>
          {loading ? (
            <div className="empty-state">
              <div className="loader"></div>
              <h3>Loading tasks...</h3>
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">
                <CheckIcon />
              </div>
              <h3>
                {filter === "all"
                  ? "No tasks yet"
                  : `No ${filter} tasks`}
              </h3>
              <p>
                {filter === "all"
                  ? "Create your first task above."
                  : "Try another filter."}
              </p>
            </div>
          ) : (
            <div className="task-grid">
              {filteredTasks.map((task) => (
                <article
                  className={`task-card ${
                    task.completed ? "completed" : ""
                  }`}
                  key={task.id}
                >
                  {editingId === task.id ? (
                    <div className="edit-form">
                      <div className="task-card-top">
                        <span className="edit-label">EDIT TASK</span>
                        <button
                          className="icon-btn"
                          onClick={cancelEdit}
                          title="Cancel edit"
                          type="button"
                        >
                          ×
                        </button>
                      </div>
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) =>
                          setEditTitle(e.target.value)
                        }
                      />
                      <textarea
                        rows="4"
                        value={editDescription}
                        onChange={(e) =>
                          setEditDescription(e.target.value)
                        }
                      />
                      <div className="edit-actions">
                        <button
                          className="secondary-btn"
                          onClick={cancelEdit}
                          type="button"
                        >
                          Cancel
                        </button>
                        <button
                          className="primary-btn"
                          onClick={() => saveEdit(task)}
                          type="button"
                          disabled={saving}
                        >
                          {saving ? "Saving..." : "Save Changes"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="task-card-top">
                        <button
                          className={`check-btn ${
                            task.completed ? "checked" : ""
                          }`}
                          onClick={() => handleToggle(task)}
                          title={
                            task.completed
                              ? "Mark as active"
                              : "Mark as completed"
                          }
                          type="button"
                        >
                          {task.completed && <CheckIcon />}
                        </button>
                        <div className="task-actions">
                          <button
                            className="edit-btn"
                            onClick={() => startEdit(task)}
                            title="Edit task"
                            type="button"
                          >
                            <PencilIcon />
                          </button>
                          <button
                            className="delete-btn"
                            onClick={() => handleDelete(task.id)}
                            title="Delete task"
                            type="button"
                          >
                            <TrashIcon />
                          </button>
                        </div>
                      </div>
                      <h3>{task.title}</h3>
                      {task.description && (
                        <p>{task.description}</p>
                      )}
                      <div className="task-footer">
                        <span className="status">
                          {task.completed
                            ? "Completed"
                            : "In Progress"}
                        </span>
                      </div>
                    </>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
export default Dashboard;
