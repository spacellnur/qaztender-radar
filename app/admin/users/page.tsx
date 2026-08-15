import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { readSessionToken, SESSION_COOKIE } from "../../auth";
import UserManager from "./UserManager";
import { getTelegramSubscriberStats, listTenderSpecialists } from "../../db";

export default async function UsersPage() {
  const session = await readSessionToken((await cookies()).get(SESSION_COOKIE)?.value);
  if (!session) redirect("/login");
  if (session.role !== "super_admin") redirect("/");

  const users = await listTenderSpecialists();
  const stats = await getTelegramSubscriberStats();

  return <UserManager initialUsers={users} initialStats={stats} />;
}

