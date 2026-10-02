import { useEffect, useState } from "react";
import { type Task, createTask, deleteTask, listTasks, updateTask } from "./api.ts";

export default function App() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTitle, setNewTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listTasks()
      .then(setTasks)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const title = newTitle.trim();
    if (!title) return;
    try {
      const task = await createTask(title);
      setTasks((prev) => [...prev, task]);
      setNewTitle("");
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function handleToggle(task: Task) {
    try {
      const updated = await updateTask(task.id, { done: !task.done });
      setTasks((prev) => prev.map((t) => (t.id === task.id ? updated : t)));
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function handleDelete(id: number) {
    try {
      await deleteTask(id);
      setTasks((prev) => prev.filter((t) => t.id !== id));
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <div className="min-h-screen bg-base-200 flex justify-center px-4 py-10">
      <div className="w-full max-w-prose-app">
        <h1 className="text-display text-base-content mb-6">Tâches — team17</h1>

        <form onSubmit={handleAdd} className="flex gap-2 mb-6">
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Nouvelle tâche…"
            className="input input-bordered flex-1 min-h-touch"
            maxLength={500}
          />
          <button type="submit" className="btn btn-primary min-h-touch">
            Ajouter
          </button>
        </form>

        {error && (
          <div role="alert" className="alert alert-error mb-4">
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <p className="text-body text-base-content/70">Chargement…</p>
        ) : tasks.length === 0 ? (
          <p className="text-body text-base-content/70">Aucune tâche pour le moment.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {tasks.map((task) => (
              <li
                key={task.id}
                className="card card-border bg-base-100 flex-row items-center gap-3 px-4 py-3"
              >
                <input
                  type="checkbox"
                  checked={task.done}
                  onChange={() => handleToggle(task)}
                  className="checkbox checkbox-primary min-h-touch min-w-touch"
                  aria-label={`Marquer « ${task.title} » comme ${task.done ? "à faire" : "faite"}`}
                />
                <span
                  className={`text-body flex-1 ${task.done ? "line-through text-base-content/50" : ""}`}
                >
                  {task.title}
                </span>
                <button
                  type="button"
                  onClick={() => handleDelete(task.id)}
                  className="btn btn-ghost btn-sm text-error min-h-touch"
                  aria-label={`Supprimer « ${task.title} »`}
                >
                  Supprimer
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
