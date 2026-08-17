import { synchronizeGoszakupTenders, isGoszakupConfigured } from "@/app/goszakup";
import { checkAndSendDeadlineAlerts, checkAndSendInstantNewTenders, checkAndSendScheduledDigests, checkAndSendSubscriptionWarnings } from "@/app/telegram";

export async function POST() {
  if (!isGoszakupConfigured()) {
    const deadlines = await checkAndSendDeadlineAlerts().catch(() => ({ delivered: 0 }));
    const digests = await checkAndSendScheduledDigests().catch(() => ({ delivered: 0 }));
    const subWarnings = await checkAndSendSubscriptionWarnings().catch(() => ({ warned: 0, paywalled: 0 }));
    return Response.json({
      ok: true,
      mode: "local_cache_only",
      deadlinesSent: deadlines.delivered,
      digestsSent: digests.delivered,
      subscriptionsChecked: subWarnings,
      message: "Синхронизация локальной базы, проверка дедлайнов, расписания и подписок выполнена",
    });
  }

  try {
    const syncResult = await synchronizeGoszakupTenders();
    const deadlines = await checkAndSendDeadlineAlerts().catch(() => ({ delivered: 0 }));
    const digests = await checkAndSendScheduledDigests().catch(() => ({ delivered: 0 }));
    const subWarnings = await checkAndSendSubscriptionWarnings().catch(() => ({ warned: 0, paywalled: 0 }));
    let instantPushes = 0;
    if (syncResult.records && syncResult.records.length > 0) {
      const instantRes = await checkAndSendInstantNewTenders(syncResult.records).catch(() => ({ delivered: 0 }));
      instantPushes = instantRes.delivered;
    }

    return Response.json({
      ok: true,
      sync: syncResult,
      deadlinesSent: deadlines.delivered,
      digestsSent: digests.delivered,
      subscriptionsChecked: subWarnings,
      instantPushesSent: instantPushes,
      timestamp: Date.now(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Ошибка автосинхронизации";
    return Response.json({ error: message }, { status: 500 });
  }
}
