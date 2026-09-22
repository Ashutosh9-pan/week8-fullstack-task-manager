import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { loginUser } from "../services/api";
import { useAuth } from "../context/AuthContext";
import type { AuthResponse } from "../types";

type LoginForm = { email: string; password: string };

export default function Login() {
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>({
    mode: "onBlur",
  });

  const onSubmit = async (form: LoginForm) => {
    setError("");
    setLoading(true);
    try {
      const data = (await loginUser(form)) as AuthResponse;
      signIn(data);
      navigate("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to sign in");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="brand">TaskFlow</div>
        <h1>Welcome back</h1>
        <p className="subtitle">Sign in to manage your tasks.</p>
        <form onSubmit={handleSubmit(onSubmit)}>
          <label htmlFor="login-email">Email</label>
          <input
            id="login-email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            {...register("email", {
              required: "Email is required",
              pattern: { value: /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/, message: "Enter a valid email" },
            })}
          />
          {errors.email && <div className="field-error">{errors.email.message}</div>}
          <label htmlFor="login-password">Password</label>
          <input
            id="login-password"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            {...register("password", { required: "Password is required" })}
          />
          {errors.password && <div className="field-error">{errors.password.message}</div>}
          {error && <div className="error-box">{error}</div>}
          <button className="primary-btn" disabled={loading}>
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>
        <p className="switch-text">
          Don't have an account? <Link to="/register">Create one</Link>
        </p>
      </div>
    </div>
  );
}
