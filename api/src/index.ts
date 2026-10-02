import { Hono } from "hono";
import { getPool, closePool } from "./db.ts";
import { readSecret } from "./secrets.ts";
import { AppError, errorBody } from "./errors.ts";

const PORT = Number(process.env.PORT ?? 8081);

const app = new Hono();

app.onError((err, c) => {
  const { status, body } = errorBody(err as Error);
  if (status >= 500) console.error(err);
  return c.json(body, status as never);
});

// ─── Health checks (§ Health checks contract) ──────────────────────────────

app.get("/health", (c) => c.json({ status: "ok" }));

app.get("/ready", async (c) => {
  const checks: Record<string, "ok" | "down"> = { vault: "down", postgres: "down" };

  try {
    await readSecret("postgres");
    checks.vault = "ok";
  } catch {
    checks.vault = "down";
  }

  if (checks.vault === "ok") {
    try {
      const pool = await getPool();
      await pool.query("SELECT 1");
      checks.postgres = "ok";
    } catch {
      checks.postgres = "down";
    }
  }

  const ready = Object.values(checks).every((v) => v === "ok");
  return c.json({ status: ready ? "ready" : "not_ready", checks }, ready ? 200 : 503);
});

// ─── /api/v1/tasks ──────────────────────────────────────────────────────────

const tasks = new Hono();

tasks.get("/", async (c) => {
  const pool = await getPool();
  const { rows } = await pool.query(
    "SELECT id, title, done, created_at FROM tasks ORDER BY created_at ASC, id ASC",
  );
  return c.json(rows);
});

tasks.post("/", async (c) => {
  const payload = await c.req.json().catch(() => ({}));
  const title = typeof payload.title === "string" ? payload.title.trim() : "";
  if (!title) {
    throw new AppError({
      code: "validation.field_missing",
      message: "Field 'title' missing or empty",
      statusCode: 400,
      details: { field: "title" },
    });
  }
  if (title.length > 500) {
    throw new AppError({
      code: "validation.field_too_long",
      message: "Field 'title' must be 500 characters or fewer",
      statusCode: 400,
      details: { field: "title", maxLength: 500 },
    });
  }

  const pool = await getPool();
  const { rows } = await pool.query(
    "INSERT INTO tasks (title) VALUES ($1) RETURNING id, title, done, created_at",
    [title],
  );
  return c.json(rows[0], 201);
});

tasks.patch("/:id", async (c) => {
  const id = Number(c.req.param("id"));
  if (!Number.isInteger(id)) {
    throw new AppError({ code: "validation.invalid_id", message: "Invalid task id", statusCode: 400 });
  }

  const payload = await c.req.json().catch(() => ({}));
  const fields: string[] = [];
  const values: unknown[] = [];

  if (payload.title !== undefined) {
    const title = typeof payload.title === "string" ? payload.title.trim() : "";
    if (!title) {
      throw new AppError({
        code: "validation.field_missing",
        message: "Field 'title' cannot be empty",
        statusCode: 400,
        details: { field: "title" },
      });
    }
    values.push(title);
    fields.push(`title = $${values.length}`);
  }
  if (payload.done !== undefined) {
    if (typeof payload.done !== "boolean") {
      throw new AppError({
        code: "validation.invalid_field",
        message: "Field 'done' must be a boolean",
        statusCode: 400,
        details: { field: "done" },
      });
    }
    values.push(payload.done);
    fields.push(`done = $${values.length}`);
  }
  if (fields.length === 0) {
    throw new AppError({
      code: "validation.empty_update",
      message: "At least one of 'title' or 'done' must be provided",
      statusCode: 400,
    });
  }

  values.push(id);
  const pool = await getPool();
  const { rows } = await pool.query(
    `UPDATE tasks SET ${fields.join(", ")} WHERE id = $${values.length} RETURNING id, title, done, created_at`,
    values,
  );
  if (rows.length === 0) {
    throw new AppError({
      code: "resource.not_found",
      message: "Task not found",
      statusCode: 404,
      details: { id },
    });
  }
  return c.json(rows[0]);
});

tasks.delete("/:id", async (c) => {
  const id = Number(c.req.param("id"));
  if (!Number.isInteger(id)) {
    throw new AppError({ code: "validation.invalid_id", message: "Invalid task id", statusCode: 400 });
  }
  const pool = await getPool();
  const { rowCount } = await pool.query("DELETE FROM tasks WHERE id = $1", [id]);
  if (rowCount === 0) {
    throw new AppError({
      code: "resource.not_found",
      message: "Task not found",
      statusCode: 404,
      details: { id },
    });
  }
  return c.body(null, 204);
});

app.route("/api/v1/tasks", tasks);

// ─── Boot + graceful shutdown (§ Graceful shutdown contract) ───────────────

const server = Bun.serve({ port: PORT, fetch: app.fetch });
console.log(`[team17-api] listening on http://0.0.0.0:${server.port}`);

let shuttingDown = false;
async function shutdown(signal: string) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`[team17-api] ${signal} received — draining`);
  await server.stop();
  await closePool();
  process.exit(0);
}
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
