import type { Metadata } from "next";
import TenderDashboard from "./TenderDashboard";

export const metadata: Metadata = {
  title: "QazTender Radar — тендеры для строительной компании",
  description:
    "Понятный радар государственных закупок: рейтинг, причины соответствия и риски каждого тендера.",
};

export default function Home() {
  return <TenderDashboard />;
}
