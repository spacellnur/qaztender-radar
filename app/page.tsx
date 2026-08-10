import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import TenderDashboard from "./TenderDashboard";
import { readSessionToken, SESSION_COOKIE, sessionOwnerKey } from "./auth";
import { companyProfileExists, getTenderSourceStatus, listTenders, listTenderWorkflow } from "./db";
import { isGoszakupConfigured } from "./goszakup";

export const metadata: Metadata = {
  title: "QazTender Radar — реальные государственные закупки",
  description: "Фильтрация официальных объявлений государственных закупок Казахстана по региону, виду закупки, бюджету и сроку подачи.",
};

export default async function Home() {
  const cookieStore = await cookies();
  const session = await readSessionToken(cookieStore.get(SESSION_COOKIE)?.value);
  if (!session) redirect("/login");
  if (session.role === "tender_specialist" && session.userId && !(await companyProfileExists(session.userId))) redirect("/onboarding/company");

  const configured = isGoszakupConfigured();
  const [tenders, sourceStatus, initialWorkflow] = await Promise.all([
    listTenders(),
    getTenderSourceStatus(configured),
    listTenderWorkflow(sessionOwnerKey(session)),
  ]);
  return <TenderDashboard username={session.username} role={session.role} tenders={tenders} sourceStatus={sourceStatus} initialWorkflow={initialWorkflow} />;
}
