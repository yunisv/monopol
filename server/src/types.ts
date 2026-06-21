export type CellType =
  | 'start'
  | 'property'
  | 'chance'
  | 'community_chest'
  | 'tax'
  | 'jail'
  | 'free_parking'
  | 'go_to_jail'
  | 'utility'
  | 'railroad'
  | 'casino'
  | 'jackpot'
  | 'duel';

export type PropertyColor =
  | 'brown'
  | 'light-blue'
  | 'pink'
  | 'orange'
  | 'red'
  | 'yellow'
  | 'green'
  | 'dark-blue';

export type IndustryType = 'it' | 'oil' | 'crypto' | 'realestate';

export interface BoardCell {
  id: number;
  type: CellType;
  name: string;
  price?: number;
  color?: PropertyColor | null;
  flag?: string;
  rent?: number;
  taxAmount?: number;
  taxPercent?: number;
  industry?: IndustryType;
  upgradePrice?: number;
}

export interface Player {
  id: string;
  name: string;
  position: number;
  color: string;
  money: number;
  isConnected: boolean;
  isHost: boolean;
  inJail: boolean;
  jailTurns: number;
}

export type GameStatus = 'lobby' | 'playing' | 'finished';

export interface PendingBuyAction {
  type: 'buy-property';
  cellId: number;
  price: number;
  cellName: string;
}

export interface PendingChoiceAction {
  type: 'choose-card';
  label: string;
  options: Array<{ id: string; text: string }>;
}

export interface PendingAuctionAction {
  type: 'auction';
  cellId: number;
  cellName: string;
  minPrice: number;
  highestBid: number;
  highestBidder: string | null;
  highestBidderName: string | null;
  activeBidder: string;
  activeBidderName: string;
  remainingBidders: string[];
}

export type PendingAction =
  | PendingBuyAction
  | PendingChoiceAction
  | PendingAuctionAction
  | null;

export interface GameSettings {
  startingCash: number;
  doubleRentOnMonopoly: boolean;
  casinoEnabled: boolean;
  casinoAmount: number;
  jackpotEnabled: boolean;
  jackpotGrowthPerRound: number;
  duelEnabled: boolean;
  duelAmount: number;
  vacationCash: boolean;
  // Economy rules (step 8)
  inflationEnabled: boolean;      // rents grow each round
  inflationRate: number;          // % per round (3 | 5 | 10)
  wealthTaxEnabled: boolean;      // richest players pay tax each round
  wealthTaxRate: number;          // % of total cash (3 | 5 | 10)
  wealthTaxThreshold: number;     // taxed only if money > threshold
  insuranceEnabled: boolean;      // players can buy bankruptcy insurance
  insurancePremium: number;       // cost to buy insurance
  insurancePayout: number;        // bank bailout amount when triggered
}

export const DEFAULT_SETTINGS: GameSettings = {
  startingCash: 1500,
  doubleRentOnMonopoly: true,
  casinoEnabled: true,
  casinoAmount: 40,
  jackpotEnabled: true,
  jackpotGrowthPerRound: 100,
  duelEnabled: true,
  duelAmount: 50,
  vacationCash: false,
  inflationEnabled: false,
  inflationRate: 5,
  wealthTaxEnabled: false,
  wealthTaxRate: 5,
  wealthTaxThreshold: 2000,
  insuranceEnabled: true,
  insurancePremium: 200,
  insurancePayout: 500,
};

export interface GameState {
  roomId: string;
  status: GameStatus;
  players: Player[];
  currentPlayerIndex: number;
  hostId: string;
  lastDice: [number, number] | null;
  canRoll: boolean;
  diceRolled: boolean;
  board: BoardCell[];
  log: string[];
  /** cellId → ownerId (socket id) */
  properties: Record<number, string>;
  pendingAction: PendingAction;
  settings: GameSettings;
  jackpotPool: number;
  visitedJackpotThisRound: string[];
  vacationPool: number;
  roundNumber: number;
  upgrades: Record<number, number>; // cellId → IT upgrade level (0–4)
  oilModifier: number;              // 0=crash, 1=normal, 2=boom
  inflationMultiplier: number;      // rent multiplier, grows each round
  insured: string[];                // playerIds with active insurance
}
