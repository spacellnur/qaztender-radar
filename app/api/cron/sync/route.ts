import { synchronizeGoszakupTenders } from "@/app/goszakup";
import { checkAndSendDeadlineAlerts, checkAndSendInstantNewTenders, checkAndSendScheduledDigests, checkAndSendSubscriptionWarnings } from "@/app/telegram";

export async function handleCronSync() {
  let syncResult: { fetched: number; saved: number; records: any[]; error?: string | null } = {
    fetched: 0,
    saved: 0,
    records: [],
  };

  try {
    syncResult = await synchronizeGoszakupTenders();
  } catch (error) {
    syncResult.error = error instanceof Error ? error.message : "Sync error";
  }

  // Guaranteed execution of digests, deadline reminders, and subscription notices
  const deadlines = await checkAndSendDeadlineAlerts().catch((e) => ({ delivered: 0, error: String(e) }));
  const digests = await checkAndSendScheduledDigests().catch((e) => ({ delivered: 0, error: String(e) }));
  const subWarnings = await checkAndSendSubscriptionWarnings().catch((e) => ({ warned: 0, paywalled: 0, error: String(e) }));

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
}

export const POST = handleCronSync;
export const GET = handleCronSync;
