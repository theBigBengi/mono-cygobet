// src/types/countries.ts
// Type definitions for countries routes

export interface ListCountriesQuerystring {
  page?: number;
  perPage?: number;
  active?: boolean;
  include?: string;
}

export interface GetCountryQuerystring {
  include?: string;
}

export interface GetCountryParams {
  id: string;
}

export interface SearchCountriesQuerystring {
  q: string;
  take?: number;
}
