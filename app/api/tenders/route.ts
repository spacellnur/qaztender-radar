import { readSessionFromRequest } from "../../auth";
import { getTenderSourceStatus, listTenders } from "../../db";
import { isGoszakupConfigured } from "../../goszakup";

export async function GET(request: Request) {
  if (!await readSessionFromRequest(request)) {
    return Response.json({ error: "Требуется вход в систему" }, { status: 401 });
  }
  const [tenders, sourceStatus] = await Promise.all([
    listTenders(),
    getTenderSourceStatus(isGoszakupConfigured()),
  ]);
  return Response.json({ tenders, sourceStatus }, { headers: { "Cache-Control": "no-store" } });
}
