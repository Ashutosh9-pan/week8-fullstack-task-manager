import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { registerUser } from "../services/api";
import { useAuth } from "../context/AuthContext";
import type { AuthResponse } from "../types";

type RegisterForm = { name: string; email: string; password: string };

export default function Register() {
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, watch, formState: { errors } } = useForm<RegisterForm>({
    mode: "onBlur",
  });
  const password = watch("password", "");
  const passwordStrength = useMemo(() => {
    let score = 0;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    return score;
  }, [password]);

  const onSubmit = async (form: RegisterForm) => {
    setError("");
    setLoading(true);
    try {
      const data = (await registerUser(form)) as AuthResponse;
      signIn(data);
      navigate("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create account");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="brand">TaskFlow</div>
        <h1>Create account</h1>
        <p className="subtitle">Start organizing your work today.</p>
        <form onSubmit={handleSubmit(onSubmit)}>
          <label htmlFor="register-name">Name</label>
          <input
            id="register-name"
            type="text"
            autoComplete="name"
            placeholder="Ashutosh"
            maxLength={80}
            {...register("name", { required: "Name is required", maxLength: { value: 80, message: "Name is too long" } })}
          />
          {errors.name && <div className="field-error">{errors.name.message}</div>}
          <label htmlFor="register-email">Email</label>
          <input
            id="register-email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            {...register("email", {
              required: "Email is required",
              pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: "Enter a valid email" },
            })}
          />
          {errors.email && <div className="field-error">{errors.email.message}</div>}
          <label htmlFor="register-password">Password</label>
          <input
            id="register-password"
            type="password"
            autoComplete="new-password"
            placeholder="••••••••"
            minLength={8}
            maxLength={72}
            {...register("password", {
              required: "Password is required",
              minLength: { value: 8, message: "Password must be at least 8 characters" },
              maxLength: { value: 72, message: "Password must be 72 characters or less" },
            })}
          />
          {password && <div className="password-hint">Password strength: {["Weak", "Fair", "Good", "Strong"][passwordStrength - 1] || "Weak"}</div>}
          {errors.password && <div className="field-error">{errors.password.message}</div>}
          {error && <div className="error-box">{error}</div>}
          <button className="primary-btn" disabled={loading}>
            {loading ? "Creating..." : "Create Account"}
          </button>
        </form>
        <p className="switch-text">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}