// packages/db/scripts/seed-fixtures.ts
import "dotenv/config";
import { prisma } from "../";

const SPORTMONKS_API_KEY = process.env.SPORTMONKS_API_KEY!;
const BASE_URL = "https://api.sportmonks.com/v3/football";

async function fetchUpcomingFixtures() {
  const today = new Date();
  const to = new Date();
  to.setDate(today.getDate() + 7);

  const fromDate = today.toISOString().slice(0, 10);
  const toDate = to.toISOString().slice(0, 10);

  const url = `${BASE_URL}/fixtures/between/${fromDate}/${toDate}?api_token=${SPORTMONKS_API_KEY}&include=participants;league;season`;

  const res = await fetch(url);
  const json = await res.json();

  return json.data ?? [];
}

async function run() {
  const fixtures = await fetchUpcomingFixtures();

  console.log(`Fetched ${fixtures.length} fixtures`);

  let inserted = 0;

  for (const f of fixtures) {
    const home = f.participants.find((p: any) => p.meta.location === "home");
    const away = f.participants.find((p: any) => p.meta.location === "away");

    if (!home || !away) continue;

    await prisma.fixtures.upsert({
      where: { externalId: BigInt(f.id) },
      update: {
        name: f.name,
        startTs: f.start_timestamp,
        startIso: new Date(f.start_timestamp * 1000).toISOString(),
        state: f.state,
      },
      create: {
        externalId: BigInt(f.id),
        name: f.name,
        startTs: f.start_timestamp,
        startIso: new Date(f.start_timestamp * 1000).toISOString(),
        state: f.state,
        homeTeam: {
          connectOrCreate: {
            where: { externalId: BigInt(home.id) },
            create: {
              name: home.name,
              externalId: BigInt(home.id),
            },
          },
        },
        awayTeam: {
          connectOrCreate: {
            where: { externalId: BigInt(away.id) },
            create: {
              name: away.name,
              externalId: BigInt(away.id),
            },
          },
        },
      },
    });

    inserted++;
  }

  console.log(`Upserted ${inserted} fixtures`);
}

run()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
