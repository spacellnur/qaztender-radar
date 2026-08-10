import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { readSessionToken, SESSION_COOKIE } from "../../auth";
import { getCompanyProfile } from "../../db";
import CompanyForm from "../../onboarding/company/CompanyForm";

export default async function CompanyProfilePage() {
  const session = await readSessionToken((await cookies()).get(SESSION_COOKIE)?.value);
  if (!session) redirect("/login");
  if (session.role !== "tender_specialist" || !session.userId) redirect("/");
  const profile = await getCompanyProfile(session.userId);
  if (!profile) redirect("/onboarding/company");
  return <CompanyForm username={session.username} initialProfile={profile} editing />;
}
