// User-related types and interfaces

export interface User {
  id: number;
  email: string;
  username: string | null;
  password: string | null;
  name: string | null;
  image: string | null;
  createdAt: Date | null;
  emailVerified: Date | null;
}

export interface UserDTO {
  name: string | null;
  image: string | null;
  createdAt: Date;
  id: number;
  email: string;
  password: string | null;
  username: string | null;
}

export interface Wallet {
  coins: number;
  points: number;
  updatedAt: Date;
}

export interface InventoryItem {
  id: number;
  itemTypeId: number;
  quantity: number;
  acquiredAt: Date;
  expiresAt: Date | null;
  key: string;
  name: string;
  category: string;
  imagePath: string;
  description: string;
}

export interface WalletLedger {
  id: number;
  kind: string;
  amount: number;
  source: string;
  refType: string | null;
  refId: number | null;
  meta: Record<string, unknown>;
  createdAt: Date;
}

export interface WalletMovement {
  id: number;
  kind: string;
  amount: number;
  source: string;
  refType: string | null;
  refId: number | null;
  meta: Record<string, unknown>;
  createdAt: Date;
}

export interface UserItem {
  id: number;
  itemTypeId: number;
  quantity: number;
  acquiredAt: Date;
  expiresAt: Date | null;
  updatedAt: Date;
}

export interface UserProfile {
  level: number;
  dailyStreak: number;
  lastClaimAt: Date | null;
  favouriteTeamId: number | null;
  favouriteLeagueId: number | null;
}

export interface UserWithIncludes extends User {
  wallet?: (Wallet & { movements?: Array<WalletLedger> }) | null;
  profile?: UserProfile | null;
  inventory?: Array<InventoryItem>;
  ladderSeasonState?: LadderSeasonState | null;
}

export interface LadderSeasonState {
  trophies: number;
  trophiesBest: number;
  wins: number;
  losses: number;
  milestoneClaimedUpTo: number;
  leagueId: number;
  stageNo: number;
}
