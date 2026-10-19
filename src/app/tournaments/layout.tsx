import { requireAuth } from "@/lib/auth";
import { Shell } from "@/components/flexible/shell";
import { DeveloperToggle } from "@/components/flexible/developer-toggle";
import { getDeveloperAccess } from "@/lib/developer-access";
import "./neo.css";

export const metadata = {
  title: "REMI · PKB GPIB Harapan Indah",
  description: "Sistem turnamen REMI Persekutuan Kaum Bapak, diselenggarakan oleh GPIB Harapan Indah.",
};

export const dynamic = "force-dynamic";

export default async function TournamentLayout({ children }: { children: React.ReactNode }) {
  await requireAuth();
  const developer = await getDeveloperAccess();
  return <Shell>{children}<DeveloperToggle key={developer.enabled ? "enabled" : "disabled"} {...developer} /></Shell>;
}
