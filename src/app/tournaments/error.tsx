"use client";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return <section className="neo-empty" role="alert"><h2>Halaman belum dapat dimuat.</h2><p>Periksa koneksi lalu coba lagi. Jangan kirim ulang perubahan yang sama sebelum memeriksa data terakhir.</p><button className="neo-button" onClick={reset}>Coba lagi</button></section>;
}
