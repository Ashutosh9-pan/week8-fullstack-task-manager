import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { logoutUser } from "../services/api";
import type { AuthResponse, User } from "../types";

interface AuthContextValue {
  user: User | null;
  token: string | null;
  signIn: (data: AuthResponse) => void;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function readUser(): User | null {
  const stored = localStorage.getItem("user");
  if (!stored) return null;
  try { return JSON.parse(stored) as User; } catch { return null; }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(readUser);
  const [token, setToken] = useState<string | null>(localStorage.getItem("token"));

  const signIn = (data: AuthResponse) => {
    const accessToken = data.accessToken || data.token;
    const nextUser: User = { userId: data.userId, name: data.name, email: data.email, role: data.role };
    localStorage.setItem("token", accessToken);
    localStorage.setItem("refreshToken", data.refreshToken);
    localStorage.setItem("user", JSON.stringify(nextUser));
    setToken(accessToken);
    setUser(nextUser);
  };

  const signOut = async () => {
    await logoutUser();
    setToken(null);
    setUser(null);
  };

  const value = useMemo(() => ({ user, token, signIn, signOut }), [user, token]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}