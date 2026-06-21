import { BoardCell } from './types';

export const BOARD_CELLS: BoardCell[] = [
  // 0: START (top-left corner)
  { id: 0,  type: 'start',          name: 'START',          color: null },

  // 1-9: Top row going RIGHT
  { id: 1,  type: 'property',       name: 'Salvador',       price: 60,  color: 'brown',      flag: '🇧🇷', rent: 2,  industry: 'realestate' },
  { id: 2,  type: 'community_chest',name: 'Treasure',       color: null },
  { id: 3,  type: 'property',       name: 'Rio',            price: 60,  color: 'brown',      flag: '🇧🇷', rent: 4,  industry: 'realestate' },
  { id: 4,  type: 'tax',            name: 'Earnings Tax',   taxPercent: 10, color: null },
  { id: 5,  type: 'railroad',       name: 'TLV Airport',    price: 200, color: null },
  { id: 6,  type: 'property',       name: 'Tel Aviv',       price: 100, color: 'light-blue', flag: '🇮🇱', rent: 6,  industry: 'it', upgradePrice: 50 },
  { id: 7,  type: 'casino',         name: 'Casino',         color: null },
  { id: 8,  type: 'property',       name: 'Haifa',          price: 100, color: 'light-blue', flag: '🇮🇱', rent: 6,  industry: 'it', upgradePrice: 50 },
  { id: 9,  type: 'property',       name: 'Jerusalem',      price: 120, color: 'light-blue', flag: '🇮🇱', rent: 8,  industry: 'it', upgradePrice: 60 },

  // 10: In Prison (top-right corner)
  { id: 10, type: 'jail',           name: 'In Prison',      color: null },

  // 11-19: Right column going DOWN
  { id: 11, type: 'property',       name: 'Venice',         price: 140, color: 'pink',       flag: '🇮🇹', rent: 10, industry: 'realestate' },
  { id: 12, type: 'utility',        name: 'Electric Co.',   price: 150, color: null },
  { id: 13, type: 'property',       name: 'Milan',          price: 140, color: 'pink',       flag: '🇮🇹', rent: 10, industry: 'realestate' },
  { id: 14, type: 'jackpot',        name: 'Big Roll',       color: null },
  { id: 15, type: 'property',       name: 'Rome',           price: 160, color: 'pink',       flag: '🇮🇹', rent: 12, industry: 'realestate' },
  { id: 16, type: 'railroad',       name: 'MUC Airport',    price: 200, color: null },
  { id: 17, type: 'property',       name: 'Frankfurt',      price: 180, color: 'orange',     flag: '🇩🇪', rent: 14, industry: 'oil' },
  { id: 18, type: 'community_chest',name: 'Treasure',       color: null },
  { id: 19, type: 'property',       name: 'Munich',         price: 180, color: 'orange',     flag: '🇩🇪', rent: 14, industry: 'oil' },

  // 20: Vacation (bottom-right corner)
  { id: 20, type: 'free_parking',   name: 'Vacation',       color: null },

  // 21-29: Bottom row going LEFT
  { id: 21, type: 'property',       name: 'Berlin',         price: 200, color: 'orange',     flag: '🇩🇪', rent: 16, industry: 'oil' },
  { id: 22, type: 'chance',         name: 'Surprise',       color: null },
  { id: 23, type: 'property',       name: 'Shenzhen',       price: 220, color: 'red',        flag: '🇨🇳', rent: 18, industry: 'crypto' },
  { id: 24, type: 'property',       name: 'Beijing',        price: 220, color: 'red',        flag: '🇨🇳', rent: 18, industry: 'crypto' },
  { id: 25, type: 'railroad',       name: 'CDG Airport',    price: 200, color: null },
  { id: 26, type: 'property',       name: 'Shanghai',       price: 240, color: 'red',        flag: '🇨🇳', rent: 20, industry: 'crypto' },
  { id: 27, type: 'property',       name: 'Lyon',           price: 260, color: 'yellow',     flag: '🇫🇷', rent: 22, industry: 'oil' },
  { id: 28, type: 'property',       name: 'Toulouse',       price: 260, color: 'yellow',     flag: '🇫🇷', rent: 22, industry: 'oil' },
  { id: 29, type: 'utility',        name: 'Water Co.',      price: 150, color: null },

  // 30: Go to Prison (bottom-left corner)
  { id: 30, type: 'go_to_jail',     name: 'Go to Prison',   color: null },

  // 31-39: Left column going UP
  { id: 31, type: 'property',       name: 'Paris',          price: 280, color: 'yellow',     flag: '🇫🇷', rent: 24, industry: 'oil' },
  { id: 32, type: 'duel',           name: 'Duel',           color: null },
  { id: 33, type: 'property',       name: 'Manchester',     price: 300, color: 'green',      flag: '🇬🇧', rent: 26, industry: 'crypto' },
  { id: 34, type: 'property',       name: 'Liverpool',      price: 300, color: 'green',      flag: '🇬🇧', rent: 26, industry: 'crypto' },
  { id: 35, type: 'railroad',       name: 'JFK Airport',    price: 200, color: null },
  { id: 36, type: 'property',       name: 'London',         price: 320, color: 'green',      flag: '🇬🇧', rent: 28, industry: 'crypto' },
  { id: 37, type: 'tax',            name: 'Premium Tax',    taxAmount: 75, color: null },
  { id: 38, type: 'property',       name: 'San Francisco',  price: 350, color: 'dark-blue',  flag: '🇺🇸', rent: 35, industry: 'it', upgradePrice: 175 },
  { id: 39, type: 'property',       name: 'New York',       price: 400, color: 'dark-blue',  flag: '🇺🇸', rent: 50, industry: 'it', upgradePrice: 200 },
];
