import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import {
  createTask,
  getTasks,
  loginUser,
  logoutUser,
} from "./api";

describe("TaskFlow API service", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test("getTasks sends auth token and query parameters", async () => {
    localStorage.setItem("token", "access-token");

    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify([]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    await getTasks({
      q: "bug",
      status: "TODO",
      priority: "HIGH",
      sort: "title",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8080/api/tasks?q=bug&status=TODO&priority=HIGH&sort=title",
      expect.objectContaining({
        headers: expect.objectContaining({
          "Content-Type": "application/json",
          Authorization: "Bearer access-token",
        }),
      })
    );
  });

  test("login returns the authenticated session", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            accessToken: "access-123",
            refreshToken: "refresh-123",
            userId: 7,
            name: "Ashutosh",
            email: "user@example.com",
            role: "USER",
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      )
    );

    const session = await loginUser({ email: "user@example.com", password: "password123" });

    expect(session).toEqual({
      accessToken: "access-123",
      refreshToken: "refresh-123",
      userId: 7,
      name: "Ashutosh",
      email: "user@example.com",
      role: "USER",
    });
    expect(localStorage.getItem("token")).toBeNull();
  });

  test("refreshes an expired access token and retries the request", async () => {
    localStorage.setItem("token", "expired-token");
    localStorage.setItem("refreshToken", "refresh-123");

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response("Unauthorized", { status: 401 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            accessToken: "fresh-token",
            refreshToken: "fresh-refresh",
            userId: 7,
            name: "Ashutosh",
            email: "user@example.com",
            role: "USER",
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify([]), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      );

    vi.stubGlobal("fetch", fetchMock);

    await getTasks();

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[1][0]).toBe(
      "http://localhost:8080/api/auth/refresh"
    );
    expect(fetchMock.mock.calls[2][1]).toEqual(
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer fresh-token",
        }),
      })
    );
    expect(localStorage.getItem("token")).toBe("fresh-token");
  });

  test("createTask sends POST payload", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ id: 1, title: "Test task" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      )
    );

    await createTask({
      title: "Test task",
      description: "Description",
      status: "TODO",
      priority: "HIGH",
      dueDate: null,
      category: "",
      assigneeEmail: "",
    });

    expect(fetch).toHaveBeenCalledWith(
      "http://localhost:8080/api/tasks",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          title: "Test task",
          description: "Description",
          status: "TODO",
          priority: "HIGH",
          dueDate: null,
          category: "",
          assigneeEmail: "",
        }),
      })
    );
  });

  test("logout clears the local session even if the logout request fails", async () => {
    localStorage.setItem("token", "access-token");
    localStorage.setItem("refreshToken", "refresh-token");
    localStorage.setItem("user", JSON.stringify({ userId: 1 }));

    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("network error"))
    );

    await logoutUser();

    expect(localStorage.getItem("token")).toBeNull();
    expect(localStorage.getItem("refreshToken")).toBeNull();
    expect(localStorage.getItem("user")).toBeNull();
  });
});
