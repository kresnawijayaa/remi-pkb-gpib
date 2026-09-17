import { Shell } from "@/components/flexible/shell";
import "@/app/tournaments/neo.css";

export default function NotFound() {
  return <Shell publicView publicMode="standings"><section className="neo-empty"><h1>Link klasemen tidak aktif.</h1><p>Link mungkin sudah diganti atau dicabut oleh panitia. Minta link terbaru kepada panitia.</p></section></Shell>;
}
