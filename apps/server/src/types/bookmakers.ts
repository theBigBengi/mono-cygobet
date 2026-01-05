// src/types/bookmakers.ts
// Type definitions for bookmakers routes

export interface ListBookmakersQuerystring {
  page?: number;
  perPage?: number;
}

export interface GetBookmakerParams {
  id: string;
}

export interface SearchBookmakersQuerystring {
  q: string;
  take?: number;
}
