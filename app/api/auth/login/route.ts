import { createSession, sessionCookie, verifyCredentials } from "../../../auth";

export async function POST(request: Request) {
  let body: { username?: unknown; password?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Некорректный запрос" }, { status: 400 });
  }
  const username = typeof body.username === "string" ? body.username.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";
  if (!(await verifyCredentials(username, password))) {
    return Response.json({ error: "Неверный логин или пароль" }, { status: 401 });
  }
  const token = await createSession(username, "super_admin");
  return Response.json(
    { ok: true, role: "super_admin" },
    { headers: { "Set-Cookie": sessionCookie(token), "Cache-Control": "no-store" } },
  );
}
