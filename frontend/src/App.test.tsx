import { render, screen } from "@testing-library/react";
import { beforeEach, expect, test } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import App from "./App";

beforeEach(() => {
  localStorage.clear();
});

test("renders the login screen for unauthenticated users", () => {
  render(
    <AuthProvider>
      <MemoryRouter initialEntries={["/login"]}>
        <App />
      </MemoryRouter>
    </AuthProvider>
  );
  expect(screen.getByText("Welcome back")).toBeTruthy();
});