import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { readSessionToken, SESSION_COOKIE } from "../../auth";
import UserManager from "./UserManager";
import { listTenderSpecialists } from "../../db";

export default async function UsersPage() {
  const session = await readSessionToken((await cookies()).get(SESSION_COOKIE)?.value);
  if (!session) redirect("/login");
  if (session.role !== "super_admin") redirect("/");
  return <UserManager initialUsers={await listTenderSpecialists()} />;
}
