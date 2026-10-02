export type Task = {
  id: number;
  title: string;
  done: boolean;
  created_at: string;
};

type ApiErrorBody = { error: { code: string; message: string; details?: unknown } };

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api/v1${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (res.status === 204) return undefined as T;

  const body = await res.json().catch(() => undefined);
  if (!res.ok) {
    const message = (body as ApiErrorBody | undefined)?.error?.message ?? "Une erreur est survenue";
    throw new Error(message);
  }
  return body as T;
}

export const listTasks = () => request<Task[]>("/tasks");

export const createTask = (title: string) =>
  request<Task>("/tasks", { method: "POST", body: JSON.stringify({ title }) });

export const updateTask = (id: number, patch: Partial<Pick<Task, "title" | "done">>) =>
  request<Task>(`/tasks/${id}`, { method: "PATCH", body: JSON.stringify(patch) });

export const deleteTask = (id: number) => request<void>(`/tasks/${id}`, { method: "DELETE" });
