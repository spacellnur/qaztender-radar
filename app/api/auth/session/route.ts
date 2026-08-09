import { readSessionFromRequest } from "../../../auth";

export async function GET(request: Request) {
  const session = await readSessionFromRequest(request);
  if (!session) return Response.json({ authenticated: false }, { status: 401 });
  return Response.json({ authenticated: true, username: session.username, role: session.role });
}
