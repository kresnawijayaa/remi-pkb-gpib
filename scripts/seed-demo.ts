import { neon } from "@neondatabase/serverless";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { formatCommunityDisplayName, normalizeCommunityName } from "../src/lib/tournament/normalization";

const env = readFileSync(join(process.cwd(), ".env.local"), "utf8");
const connectionString =
  process.env.DATABASE_URL ??
  env
    .split(/\r?\n/)
    .find((line) => line.startsWith("DATABASE_URL="))
    ?.replace("DATABASE_URL=", "")
    .replace(/^"|"$/g, "");
if (!connectionString) throw new Error("DATABASE_URL belum diatur.");

const sql = neon(connectionString);

async function main() {
const [tournament] = await sql`
  insert into tournaments (name, event_date, location, status)
  values ('Turnamen Remi PKB HUT 2026', current_date, 'Aula Gereja', 'draft')
  returning id
`;

const names = [
  "Pak Andri",
  "Pak Edo",
  "Pak Jone",
  "Pak Yeshy",
  "Pak Rasendira",
  "Pak Budi",
  "Pak Agus",
  "Pak Daniel",
  "Pak Hendra",
  "Pak Johan",
  "Pak Markus",
  "Pak Samuel",
  "Pak Niko",
  "Pak Ferry",
  "Pak Mario",
  "Pak Chris",
  "Pak Rio",
  "Pak Anton",
  "Pak Benny",
  "Pak Paulus",
];

const communityIds = new Map<string, string>();
for (let i = 1; i <= 8; i++) {
  const name = formatCommunityDisplayName(`Sektor ${i}`);
  const [community] = await sql`
    insert into communities (tournament_id, name, normalized_name)
    values (${tournament.id}, ${name}, ${normalizeCommunityName(name)})
    returning id
  `;
  communityIds.set(name, community.id);
}

for (const [index, name] of names.entries()) {
  const community = `Sektor ${(index % 8) + 1}`;
  await sql`
    insert into participants (tournament_id, community_id, participant_number, name)
    values (${tournament.id}, ${communityIds.get(community)}, ${index + 1}, ${name})
  `;
}

console.log(`Demo tournament dibuat: ${tournament.id}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
