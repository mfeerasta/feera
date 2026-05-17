import type { CountryCode, Uuid } from '@feera/types';

export type FederationCode =
  | 'FIP'   // International Padel Federation
  | 'PPF'   // Pakistan Padel Federation
  | 'SPC'   // Saudi Padel Committee
  | 'UAEPA' // UAE Padel Association
  | 'QPF'   // Qatar Padel Federation
  | 'BPF'   // Bahrain Padel Federation
  | 'KPF'   // Kuwait Padel Federation
  | 'OPF';  // Oman Padel Federation

export type FederationPlayerData = Readonly<{
  federationCode: FederationCode;
  federationPlayerId: string;
  displayName: string;
  countryCode: CountryCode;
  currentRank?: number;
  currentPoints?: number;
  lastUpdatedAt: string;
}>;

export type FederationRanking = Readonly<{
  rank: number;
  federationPlayerId: string;
  displayName: string;
  points: number;
  countryCode: CountryCode;
}>;

export type FederationTournament = Readonly<{
  federationCode: FederationCode;
  externalId: string;
  name: string;
  startsAt: string;
  endsAt: string;
  countryCode: CountryCode;
  city?: string;
  category?: string;
  pointsAvailable?: number;
}>;

export interface FederationAdapter {
  readonly code: FederationCode;
  readonly name: string;
  syncPlayer(federationPlayerId: string): Promise<FederationPlayerData>;
  searchPlayers(query: string): Promise<readonly FederationPlayerData[]>;
  getRankings(category?: string): Promise<readonly FederationRanking[]>;
  getTournaments(
    filters?: Readonly<{ from?: string; to?: string; countryCode?: CountryCode }>,
  ): Promise<readonly FederationTournament[]>;
}

export class FederationNotImplemented extends Error {
  constructor(code: FederationCode, operation: string) {
    super(`Federation ${code} adapter operation not implemented in Phase 1: ${operation}`);
    this.name = 'FederationNotImplemented';
  }
}

/** Used by services/workers to keep links fresh. */
export type FederationLinkSync = Readonly<{
  userId: Uuid;
  federationCode: FederationCode;
  federationPlayerId: string;
  syncedAt: string;
  status: 'ok' | 'stale' | 'failed';
}>;
