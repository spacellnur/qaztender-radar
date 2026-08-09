import { hashPassword, readSessionFromRequest } from "../../../auth";
import { createTenderSpecialist, listTenderSpecialists } from "../../../db";

async function requireAdmin(request: Request) {
  const session = await readSessionFromRequest(request);
  return session?.role === "super_admin" ? session : null;
}

export async function GET(request: Request) {
  if (!(await requireAdmin(request))) return Response.json({ error: "Доступ запрещён" }, { status: 403 });
  return Response.json({ users: await listTenderSpecialists() });
}

export async function POST(request: Request) {
  if (!(await requireAdmin(request))) return Response.json({ error: "Доступ запрещён" }, { status: 403 });
  const body = await request.json().catch(() => ({})) as { username?: unknown; password?: unknown };
  const username = typeof body.username === "string" ? body.username.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  if (!/^[a-z0-9._-]{4,40}$/.test(username) || password.length < 10) return Response.json({ error: "Логин: 4–40 латинских символов. Пароль: минимум 10 символов." }, { status: 400 });
  try {
    return Response.json({ user: await createTenderSpecialist(username, await hashPassword(password)) }, { status: 201 });
  } catch (error) {
    if (String(error).includes("UNIQUE")) return Response.json({ error: "Такой логин уже существует" }, { status: 409 });
    return Response.json({ error: "Не удалось создать пользователя" }, { status: 500 });
  }
}
