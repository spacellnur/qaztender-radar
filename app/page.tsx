import type { Metadata } from "next";
import TenderDashboard from "./TenderDashboard";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { readSessionToken, SESSION_COOKIE } from "./auth";

export const metadata: Metadata = {
  title: "QazTender Radar — тендеры для строительной компании",
  description:
    "Понятный радар государственных закупок: рейтинг, причины соответствия и риски каждого тендера.",
};

export default async function Home() {
  const cookieStore = await cookies();
  const session = await readSessionToken(cookieStore.get(SESSION_COOKIE)?.value);
  if (!session) redirect("/login");
  return <TenderDashboard username={session.username} />;
}
