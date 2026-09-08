import Link from "next/link";

export default function ArchiveLayout({ children }: { children: React.ReactNode }) {
  return <><div className="border-b-2 border-black bg-yellow-100 px-5 py-4 text-center font-semibold">Arsip REMI · Baca-saja. Data lama tidak diubah. <Link className="underline" href="/tournaments">Buka REMI baru →</Link></div><fieldset disabled className="min-w-0">{children}</fieldset></>;
}
