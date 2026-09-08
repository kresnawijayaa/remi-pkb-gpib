import Link from "next/link";

export default function MissingEvent() { return <section className="neo-empty"><h1>Turnamen tidak ditemukan.</h1><Link href="/tournaments" className="neo-button">Kembali ke daftar</Link></section>; }
