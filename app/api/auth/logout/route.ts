import { expiredSessionCookie } from "../../../auth";

export async function POST() {
  return Response.json(
    { ok: true },
    { headers: { "Set-Cookie": expiredSessionCookie(), "Cache-Control": "no-store" } },
  );
}
