import { isRoundResultLocked, roundScoringComplete, type EventData } from "./model";

// Recommend the earliest unfinished round, even when later draws were prepared ahead.
export function tournamentNextStep(data: EventData) {
  if (data.qualificationLockedAt) return { status: "TURNAMEN SELESAI", title: "Lihat hasil akhir", detail: `${data.qualifiedIds.length} peserta lolos sudah dikunci. Tahap lanjutan dapat dibuat dari klasemen.`, path: "/standings", label: "Buka klasemen →", round: null };
  if (data.participants.length !== data.settings.target) return { status: "PERSIAPAN PESERTA", title: "Lengkapi daftar peserta", detail: `${data.participants.length}/${data.settings.target} peserta terdaftar. Lengkapi nama atau sesuaikan target pada pengaturan turnamen.`, path: "#participants", label: "Kelola peserta →", round: null };
  for (let round = 1; round <= data.settings.rounds; round++) {
    const draw = data.draws.find(item => item.number === round);
    if (!draw?.locked) return { status: `BABAK ${round} · PERSIAPAN MEJA`, title: draw ? `Periksa pembagian babak ${round}` : `Susun meja babak ${round}`, detail: draw ? "Pembagian masih berupa draf. Periksa susunan, lalu kunci pembagian agar resmi dan skor dapat diisi." : round === 1 ? "Mulai dengan Shuffle Rotasi, periksa susunan, lalu kunci pembagian." : "Pilih Shuffle Rotasi atau Shuffle Tier berdasarkan hasil babak sebelumnya yang sudah dikunci.", path: `/draws?round=${round}`, label: draw ? "Periksa pembagian →" : "Susun pembagian →", round };
    if (!isRoundResultLocked(data, round)) {
      const complete = roundScoringComplete(data, round);
      const completed = draw.tables.filter((_, index) => data.results.some(result => result.round === round && result.table === index + 1)).length;
      return { status: `BABAK ${round} · ${complete ? "PERIKSA HASIL" : "PERTANDINGAN"}`, title: complete ? `Kunci hasil babak ${round}` : `Isi skor babak ${round}`, detail: complete ? "Seluruh skor meja sudah masuk. Periksa skor dan urutan akhir jika skor sama, lalu kunci hasil babak." : `Pembagian babak ${round} sudah dikunci. Pertandingan dapat dimulai; ${completed}/${draw.tables.length} hasil meja sudah masuk.`, path: `/game?round=${round}${complete ? "#round-results" : ""}`, label: complete ? "Periksa dan kunci hasil →" : "Buka input skor →", round };
    }
  }
  return { status: "SEMUA HASIL BABAK DIKUNCI", title: "Periksa peserta lolos", detail: "Periksa klasemen akhir, lalu kunci daftar peserta yang lolos. Mengunci hasil babak belum mengunci kelolosan.", path: "/standings", label: "Periksa klasemen →", round: null };
}
