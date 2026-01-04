import { apiGet } from "@/lib/api";

export type UpcomingFixture = {
  id: string | number;
  kickoffAt: string;
  league: { id: string | number; name: string };
  homeTeam: { id: string | number; name: string };
  awayTeam: { id: string | number; name: string };
};

export type UpcomingFixturesResponse = {
  status: "success";
  data: UpcomingFixture[];
  pagination?: {
    page: number;
    perPage: number;
    totalItems: number | null;
    totalPages: number | null;
  };
};

export type GetUpcomingParams = {
  from?: string; // ISO datetime
  to?: string; // ISO datetime
  page: number;
  perPage: number;
};

export async function getUpcoming(params: GetUpcomingParams) {
  return apiGet<UpcomingFixturesResponse>("/api/fixtures/upcoming", params);
}


