// teams/builders.ts
// DTO builders for teams - transform Prisma data to API format.

import type { ApiTeamItem } from "@repo/types";
import type { Prisma } from "@repo/db";
import { TEAM_SELECT_BASE, TEAM_SELECT_WITH_COUNTRY } from "./selects";

type TeamBase = Prisma.teamsGetPayload<{ select: typeof TEAM_SELECT_BASE }>;
type TeamWithCountry = Prisma.teamsGetPayload<{ select: typeof TEAM_SELECT_WITH_COUNTRY }>;

/**
 * Build team item from Prisma data to API format.
 */
export function buildTeamItem(
  team: TeamBase | TeamWithCountry,
  includeCountry: boolean
): ApiTeamItem {
  const item: ApiTeamItem = {
    id: team.id,
    name: team.name,
    imagePath: team.imagePath ?? null,
    countryId: team.countryId ?? null,
    shortCode: team.shortCode ?? null,
  };

  if (includeCountry && "countries" in team && team.countries) {
    item.country = {
      id: team.countries.id,
      name: team.countries.name,
      imagePath: team.countries.imagePath ?? null,
      iso2: team.countries.iso2 ?? null,
    };
  }

  return item;
}
