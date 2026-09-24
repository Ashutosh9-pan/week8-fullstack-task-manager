import { describe, expect, it } from "vitest";
import axe from "axe-core";
import { render } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "../context/AuthContext";
import Login from "./Login";

describe("Login accessibility", () => {
  it("has no automated axe accessibility violations", async () => {
    const { container } = render(
      <BrowserRouter>
        <AuthProvider>
          <Login />
        </AuthProvider>
      </BrowserRouter>,
    );

    const results = await axe.run(container);
    expect(results.violations).toEqual([]);
  });
});
