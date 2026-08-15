import { synchronizeGoszakupTenders, isGoszakupConfigured } from "@/app/goszakup";
import { checkAndSendDeadlineAlerts, checkAndSendInstantNewTenders } from "@/app/telegram";

export async function POST(request: Request) {
  // Can accept an authorization header or internal secret if needed
  if (!isGoszakupConfigured()) {
    // If goszakup token is not yet provided, still check deadlines from local DB
    const deadlines = await checkAndSendDeadlineAlerts().catch(() => ({ delivered: 0 }));
    return Response.json({
      ok: true,
      mode: "local_cache_only",
      deadlinesSent: deadlines.delivered,
      message: "API-токен Госзакупок не указан, проверка дедлайнов выполнена по локальной базе",
    });
  }

  try {
    const syncResult = await synchronizeGoszakupTenders();
    const deadlines = await checkAndSendDeadlineAlerts().catch(() => ({ delivered: 0 }));
    let instantPushes = 0;
    if (syncResult.records && syncResult.records.length > 0) {
      const instantRes = await checkAndSendInstantNewTenders(syncResult.records).catch(() => ({ delivered: 0 }));
      instantPushes = instantRes.delivered;
    }

    return Response.json({
      ok: true,
      sync: syncResult,
      deadlinesSent: deadlines.delivered,
      instantPushesSent: instantPushes,
      timestamp: Date.now(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Ошибка автосинхронизации";
    return Response.json({ error: message }, { status: 500 });
  }
}
