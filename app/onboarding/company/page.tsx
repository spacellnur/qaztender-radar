import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { readSessionToken, SESSION_COOKIE } from "../../auth";
import { companyProfileExists } from "../../db";
import CompanyForm from "./CompanyForm";

export default async function CompanyOnboardingPage() {
  const session = await readSessionToken((await cookies()).get(SESSION_COOKIE)?.value);
  if (!session) redirect("/login");
  if (session.role !== "tender_specialist" || !session.userId) redirect("/");
  if (await companyProfileExists(session.userId)) redirect("/");
  return <CompanyForm username={session.username} />;
}
