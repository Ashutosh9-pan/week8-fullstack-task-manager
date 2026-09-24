import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { getTasks } from "./api";
import type { Task } from "../types";

const server = setupServer(
  http.get("http://localhost:8080/api/tasks", ({ request }) => {
    const url = new URL(request.url);
    if (
      url.searchParams.get("q") !== "release" ||
      url.searchParams.get("status") !== "IN_PROGRESS" ||
      url.searchParams.get("priority") !== "HIGH" ||
      url.searchParams.get("sort") !== "title"
    ) {
      return HttpResponse.json({ message: "Unexpected query" }, { status: 400 });
    }

    expect(request.headers.get("authorization")).toBe("Bearer msw-test-token");

    const task: Task = {
      id: 101,
      title: "Release checklist",
      description: "Prepare release notes",
      completed: false,
      status: "IN_PROGRESS",
      priority: "HIGH",
      dueDate: null,
      position: 1,
      category: "release",
      assigneeEmail: null,
      createdAt: "2026-09-24T08:00:00Z",
      updatedAt: "2026-09-24T08:00:00Z",
    };

    return HttpResponse.json([task]);
  }),
);

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => {
  server.resetHandlers();
  localStorage.clear();
});
afterAll(() => server.close());

describe("API integration with MSW", () => {
  it("mocks the authenticated tasks API without changing application code", async () => {
    localStorage.setItem("token", "msw-test-token");

    const tasks = await getTasks({
      q: "release",
      status: "IN_PROGRESS",
      priority: "HIGH",
      sort: "title",
    });

    expect(tasks).toHaveLength(1);
    expect(tasks[0].title).toBe("Release checklist");
  });
});
