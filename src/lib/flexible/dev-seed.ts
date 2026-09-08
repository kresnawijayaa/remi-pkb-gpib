export type DistributionProfile = "realistic" | "extreme" | "random";
export function randomFrom(seed: number) { let state = seed >>> 0; return () => ((state = Math.imul(state ^ state >>> 15, 1 | state) + Math.imul(state ^ state >>> 7, 61 | state) ^ state) >>> 0) / 4294967296; }

export function buildDistribution(total: number, communityCount: number, profile: DistributionProfile, seed: number) {
  const random = randomFrom(seed);
  const weights = Array.from({ length: communityCount }, (_, index) => profile === "extreme" ? (index === 0 ? 12 : index === 1 ? 5 : 0.5 + random()) : profile === "realistic" ? 1 / Math.pow(index + 1, 0.85) * (0.75 + random() * 0.5) : 0.15 + random() ** 2 * 3);
  const sum = weights.reduce((value, weight) => value + weight, 0);
  const counts = weights.map(weight => Math.floor(weight / sum * total));
  for (let remaining = total - counts.reduce((value, count) => value + count, 0), index = 0; remaining > 0; remaining--, index++) counts[index % counts.length]++;
  return counts;
}

const firstNames = ["Kresna", "Bhakti", "Arga", "Dimas", "Raka", "Nanda", "Bagas", "Rizky", "Bayu", "Aditya", "Wahyu", "Fajar", "Rangga", "Galih", "Yoga", "Putra", "Anindya", "Citra", "Dewi", "Gita", "Intan", "Laras", "Maya", "Nadia", "Ratih", "Sari", "Tiara", "Vina", "Wulan", "Yasmin"];
const lastNames = ["Wijaya", "Prasetyo", "Santoso", "Nugroho", "Saputra", "Permana", "Kusuma", "Hidayat", "Setiawan", "Ramadhan", "Mahendra", "Kurniawan", "Gunawan", "Utama", "Pratama", "Pangestu", "Anggraini", "Lestari", "Maharani", "Puspita", "Safitri", "Kartika", "Amalia", "Nirmala", "Oktaviani", "Rahmawati", "Salsabila", "Wulandari", "Anjani", "Paramitha"];

export function buildNames(total: number, seed: number) {
  const random = randomFrom(seed ^ 0x9e3779b9);
  const names = firstNames.flatMap(first => lastNames.map(last => `${first} ${last}`));
  for (let index = names.length - 1; index > 0; index--) { const other = Math.floor(random() * (index + 1)); [names[index], names[other]] = [names[other], names[index]]; }
  return names.slice(0, total);
}
