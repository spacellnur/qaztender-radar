import { createSession, sessionCookie, verifyAdminCredentials, verifyPassword } from "../../../auth";
import { findUserByUsername } from "../../../db";

export async function POST(request: Request) {
  let body: { username?: unknown; password?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Некорректный запрос" }, { status: 400 });
  }
  const username = typeof body.username === "string" ? body.username.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";
  if (await verifyAdminCredentials(username, password)) {
    const token = await createSession(username, "super_admin");
    return Response.json({ ok: true, role: "super_admin" }, { headers: { "Set-Cookie": sessionCookie(token), "Cache-Control": "no-store" } });
  }
  const user = await findUserByUsername(username);
  if (!user || !user.isActive || !(await verifyPassword(password, user.passwordHash))) {
    return Response.json({ error: "Неверный логин или пароль" }, { status: 401 });
  }
  const token = await createSession(username, user.role, user.id);
  return Response.json(
    { ok: true, role: user.role },
    { headers: { "Set-Cookie": sessionCookie(token), "Cache-Control": "no-store" } },
  );
}
