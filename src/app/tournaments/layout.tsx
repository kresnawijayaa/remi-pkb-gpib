import { requireAuth } from "@/lib/auth";
import { Shell } from "@/components/flexible/shell";
import "./neo.css";

export const metadata = {
  title: "REMI · PKB GPIB Harapan Indah",
  description: "Sistem turnamen REMI Persekutuan Kaum Bapak, diselenggarakan oleh GPIB Harapan Indah.",
};

export const dynamic = "force-dynamic";

export default async function TournamentLayout({ children }: { children: React.ReactNode }) {
  await requireAuth();
  return <Shell>{children}</Shell>;
}
