import Link from "next/link";

export default function MissingShare() {
  return <main className="p-8"><h1 className="text-3xl font-bold">Link tidak tersedia.</h1><p className="my-4">Link mungkin sudah dicabut atau diganti. Minta link terbaru dari panitia.</p><Link href="/login" className="underline">Masuk sebagai panitia</Link></main>;
}
