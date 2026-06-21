import { BoardCell, GameSettings, GameState, PendingAction, PendingAuctionAction, Player, DEFAULT_SETTINGS } from './types';
import { BOARD_CELLS } from './boardData';

const PLAYER_COLORS = [
  '#FF4757', '#2F80ED', '#27AE60', '#F2994A',
  '#9B59B6', '#1ABC9C', '#F1C40F', '#E67E22',
];
const BOARD_SIZE = 40;
const AIRPORT_RENT = [0, 25, 50, 100, 200];

export class GameRoom {
  private state: GameState;
  private colorIndex = 0;
  private doublesCount = 0;

  constructor(roomId: string) {
    this.state = {
      roomId,
      status: 'lobby',
      players: [],
      currentPlayerIndex: 0,
      hostId: '',
      lastDice: null,
      canRoll: false,
      diceRolled: false,
      board: BOARD_CELLS,
      log: [],
      properties: {},
      pendingAction: null,
      settings: { ...DEFAULT_SETTINGS },
      jackpotPool: 0,
      visitedJackpotThisRound: [],
      vacationPool: 0,
      roundNumber: 1,
      upgrades: {},
      oilModifier: 1,
      inflationMultiplier: 1,
      insured: [],
    };
  }

  // ── Settings ──────────────────────────────────────────────────

  updateSettings(playerId: string, patch: Partial<GameSettings>) {
    if (this.state.hostId !== playerId) return false;
    if (this.state.status !== 'lobby') return false;
    this.state.settings = { ...this.state.settings, ...patch };
    return true;
  }

  // ── Player management ──────────────────────────────────────────

  addPlayer(id: string, name: string, isHost: boolean): Player {
    const player: Player = {
      id,
      name,
      position: 0,
      color: PLAYER_COLORS[this.colorIndex++ % PLAYER_COLORS.length],
      money: this.state.settings.startingCash,
      isConnected: true,
      isHost,
      inJail: false,
      jailTurns: 0,
    };
    this.state.players.push(player);
    if (isHost) this.state.hostId = id;
    this.addLog(`${name} joined the room`);
    return player;
  }

  getPlayer(id: string): Player | undefined {
    return this.state.players.find(p => p.id === id);
  }

  removePlayer(id: string) {
    const player = this.getPlayer(id);
    if (player) this.addLog(`${player.name} left the room`);
    this.freeProperties(id);
    this.state.players = this.state.players.filter(p => p.id !== id);
    this.state.visitedJackpotThisRound = this.state.visitedJackpotThisRound.filter(pid => pid !== id);
    this.state.insured = this.state.insured.filter(pid => pid !== id);
    if (this.state.hostId === id && this.state.players.length > 0) {
      this.state.players[0].isHost = true;
      this.state.hostId = this.state.players[0].id;
    }
    this.clampPlayerIndex();
  }

  reconnectPlayer(oldId: string, newId: string): boolean {
    const player = this.getPlayer(oldId);
    if (!player) return false;
    Object.keys(this.state.properties).forEach(cellId => {
      if (this.state.properties[Number(cellId)] === oldId) {
        this.state.properties[Number(cellId)] = newId;
      }
    });
    this.state.visitedJackpotThisRound = this.state.visitedJackpotThisRound.map(
      pid => pid === oldId ? newId : pid
    );
    this.state.insured = this.state.insured.map(pid => pid === oldId ? newId : pid);
    player.id = newId;
    player.isConnected = true;
    if (this.state.hostId === oldId) this.state.hostId = newId;
    this.addLog(`${player.name} reconnected`);
    return true;
  }

  // ── Game lifecycle ─────────────────────────────────────────────

  startGame() {
    if (this.state.players.length < 2) return false;
    // Apply starting cash from settings
    this.state.players.forEach(p => { p.money = this.state.settings.startingCash; });
    this.state.status = 'playing';
    this.state.canRoll = true;
    this.state.diceRolled = false;
    this.state.currentPlayerIndex = 0;
    this.doublesCount = 0;
    // Prime jackpot pool if enabled
    if (this.state.settings.jackpotEnabled) {
      this.state.jackpotPool = this.state.settings.jackpotGrowthPerRound;
    }
    this.addLog('Game started! Good luck!');
    this.addLog(`--- ${this.state.players[0].name}'s turn ---`);
    return true;
  }

  // ── Dice roll ─────────────────────────────────────────────────

  rollDice(playerId: string): boolean {
    const currentPlayer = this.state.players[this.state.currentPlayerIndex];
    if (!currentPlayer || currentPlayer.id !== playerId) return false;
    if (!this.state.canRoll || this.state.diceRolled) return false;
    if (this.state.pendingAction) return false;

    const die1 = Math.floor(Math.random() * 6) + 1;
    const die2 = Math.floor(Math.random() * 6) + 1;
    const isDouble = die1 === die2;
    const total = die1 + die2;

    this.state.lastDice = [die1, die2];
    this.state.canRoll = false;

    if (isDouble) { this.doublesCount++; } else { this.doublesCount = 0; }

    // 3 doubles in a row → jail
    if (isDouble && this.doublesCount >= 3) {
      this.doublesCount = 0;
      this.sendToJail(currentPlayer, `${currentPlayer.name} rolled 3 doubles → sent to prison!`);
      this.state.diceRolled = true;
      return true;
    }

    // Already in jail
    if (currentPlayer.inJail) {
      if (isDouble) {
        currentPlayer.inJail = false;
        currentPlayer.jailTurns = 0;
        this.addLog(`${currentPlayer.name} rolled doubles and escaped prison!`);
      } else {
        currentPlayer.jailTurns++;
        if (currentPlayer.jailTurns >= 3) {
          currentPlayer.inJail = false;
          currentPlayer.jailTurns = 0;
          this.payToBank(currentPlayer, 50, `paid $50 to get out of prison`);
        } else {
          this.addLog(`${currentPlayer.name} rolled ${die1}+${die2} — still in prison (turn ${currentPlayer.jailTurns}/3)`);
          this.state.diceRolled = true;
          return true;
        }
      }
    }

    // Move player
    const prev = currentPlayer.position;
    const next = (prev + total) % BOARD_SIZE;
    currentPlayer.position = next;

    // Passed START
    if (next <= prev && prev !== 0) {
      currentPlayer.money += 200;
      this.addLog(`${currentPlayer.name} passed START → +$200`);
    }

    // Go to Prison cell (30)
    if (next === 30) {
      this.sendToJail(currentPlayer, `${currentPlayer.name} landed on Go to Prison!`);
      this.state.diceRolled = true;
      return true;
    }

    const cell = BOARD_CELLS[next];
    this.addLog(`${currentPlayer.name} rolled ${die1}+${die2}=${total} → ${cell.name}`);

    // Handle landing
    this.handleLanding(currentPlayer, [die1, die2]);

    // After landing: if no pending action, mark turn complete
    if (!this.state.pendingAction) {
      this.state.diceRolled = true;
      if (isDouble && !currentPlayer.inJail) {
        this.state.canRoll = true;
        this.state.diceRolled = false;
        this.addLog(`${currentPlayer.name} rolls again (doubles)!`);
      }
    }

    return true;
  }

  // ── Landing logic ─────────────────────────────────────────────

  private handleLanding(player: Player, dice: [number, number]) {
    const cell = BOARD_CELLS[player.position];

    switch (cell.type) {
      case 'property':
      case 'railroad':
      case 'utility': {
        const ownerId = this.state.properties[cell.id];
        if (ownerId === undefined) {
          if (cell.price !== undefined) {
            this.state.pendingAction = {
              type: 'buy-property',
              cellId: cell.id,
              price: cell.price,
              cellName: cell.name,
            };
          }
        } else if (ownerId === player.id) {
          this.addLog(`${player.name} is on their own property`);
        } else {
          const owner = this.getPlayer(ownerId);
          if (owner) {
            const rent = this.calculateRent(cell, ownerId, dice);
            this.addLog(`${player.name} owes $${rent} rent to ${owner.name} for ${cell.name}`);
            this.transferMoney(player, owner, rent);
            if (player.money < 0) this.handleBankruptcy(player, owner);
          }
        }
        break;
      }

      case 'tax': {
        let amount = cell.taxAmount ?? 0;
        if (cell.taxPercent) amount = Math.floor(player.money * (cell.taxPercent / 100));
        this.payToBank(player, amount, `paid $${amount} in tax`);
        if (player.money < 0) this.handleBankruptcy(player, null);
        break;
      }

      case 'casino':
        this.handleCasinoLanding(player, dice);
        break;

      case 'jackpot':
        this.handleJackpotLanding(player);
        break;

      case 'duel':
        this.handleDuelLanding(player);
        break;

      case 'chance':
      case 'community_chest':
        this.drawCard(player, cell.type);
        break;

      case 'free_parking':
        this.handleVacationLanding(player);
        break;

      case 'jail':
        this.addLog(`${player.name} is just visiting prison`);
        break;

      default:
        break;
    }
  }

  // ── Casino ────────────────────────────────────────────────────

  private handleCasinoLanding(player: Player, dice: [number, number]) {
    if (!this.state.settings.casinoEnabled) {
      this.addLog(`${player.name} landed on Casino (disabled)`);
      return;
    }
    const sum = dice[0] + dice[1];
    const isEven = sum % 2 === 0;
    const amount = this.state.settings.casinoAmount;

    if (isEven) {
      player.money += amount;
      this.addLog(`🎰 ${player.name} rolled EVEN (${sum}) — Casino pays $${amount}! 🎉`);
    } else {
      this.payToBank(player, amount, `rolled ODD (${sum}) — Casino takes $${amount}`);
      this.addLog(`🎰 Odd roll at Casino: ${player.name} loses $${amount}`);
      if (player.money < 0) this.handleBankruptcy(player, null);
    }
  }

  // ── Jackpot ───────────────────────────────────────────────────

  private handleJackpotLanding(player: Player) {
    if (!this.state.settings.jackpotEnabled) {
      this.addLog(`${player.name} visited the Big Roll (disabled)`);
      return;
    }
    if (!this.state.visitedJackpotThisRound.includes(player.id)) {
      this.state.visitedJackpotThisRound.push(player.id);
    }
    this.addLog(`💎 ${player.name} registered for Big Roll! (pool: $${this.state.jackpotPool})`);
  }

  private resolveJackpot() {
    const eligible = this.state.visitedJackpotThisRound
      .map(id => this.getPlayer(id))
      .filter(Boolean) as Player[];

    this.state.visitedJackpotThisRound = [];

    if (eligible.length === 0) {
      this.state.jackpotPool += this.state.settings.jackpotGrowthPerRound;
      this.addLog(`💎 No one visited Big Roll — jackpot grows to $${this.state.jackpotPool}!`);
      return;
    }

    if (eligible.length === 1) {
      const winner = eligible[0];
      winner.money += this.state.jackpotPool;
      this.addLog(`💎 ${winner.name} is the only Big Roll visitor — wins $${this.state.jackpotPool}!`);
      this.state.jackpotPool = this.state.settings.jackpotGrowthPerRound;
      return;
    }

    // Multiple visitors: each rolls a die
    const rolls: Array<{ player: Player; roll: number }> = eligible.map(p => ({
      player: p,
      roll: Math.floor(Math.random() * 6) + 1,
    }));

    const maxRoll = Math.max(...rolls.map(r => r.roll));
    const winners = rolls.filter(r => r.roll === maxRoll);
    const summary = rolls.map(r => `${r.player.name}:${r.roll}`).join(' | ');

    this.addLog(`🎲 Big Roll! ${summary}`);

    if (winners.length === 1) {
      const winner = winners[0].player;
      winner.money += this.state.jackpotPool;
      this.addLog(`💎 ${winner.name} wins the Big Roll — $${this.state.jackpotPool}!`);
    } else {
      // Tie — split evenly
      const share = Math.floor(this.state.jackpotPool / winners.length);
      winners.forEach(w => { w.player.money += share; });
      this.addLog(`💎 Tie between ${winners.map(w => w.player.name).join(', ')} — each gets $${share}`);
    }
    this.state.jackpotPool = this.state.settings.jackpotGrowthPerRound;
  }

  // ── Duel ──────────────────────────────────────────────────────

  private handleDuelLanding(player: Player) {
    if (!this.state.settings.duelEnabled) {
      this.addLog(`${player.name} landed on Duel cell (disabled)`);
      return;
    }
    const others = this.state.players.filter(p => p.id !== player.id && p.isConnected);
    if (others.length === 0) {
      this.addLog(`⚔️ ${player.name} landed on Duel — no opponents available`);
      return;
    }

    const opponent = others[Math.floor(Math.random() * others.length)];
    const myRoll   = Math.floor(Math.random() * 6) + 1;
    const theirRoll = Math.floor(Math.random() * 6) + 1;
    const amount = this.state.settings.duelAmount;

    this.addLog(`⚔️ DUEL! ${player.name} [${myRoll}] vs ${opponent.name} [${theirRoll}]`);

    if (myRoll > theirRoll) {
      this.transferMoney(opponent, player, amount);
      this.addLog(`${player.name} wins the duel! +$${amount}`);
      if (opponent.money < 0) this.handleBankruptcy(opponent, player);
    } else if (theirRoll > myRoll) {
      this.transferMoney(player, opponent, amount);
      this.addLog(`${opponent.name} wins the duel! ${player.name} pays $${amount}`);
      if (player.money < 0) this.handleBankruptcy(player, opponent);
    } else {
      this.addLog(`DRAW! No money exchanged.`);
    }
  }

  // ── Vacation cash ─────────────────────────────────────────────

  private handleVacationLanding(player: Player) {
    if (this.state.settings.vacationCash && this.state.vacationPool > 0) {
      const collected = this.state.vacationPool;
      player.money += collected;
      this.state.vacationPool = 0;
      this.addLog(`🏖 ${player.name} landed on Vacation and collected $${collected} from the pot!`);
    } else {
      this.addLog(`${player.name} is on Vacation — relax!`);
    }
  }

  // ── Buy / decline ─────────────────────────────────────────────

  buyProperty(playerId: string): boolean {
    const currentPlayer = this.state.players[this.state.currentPlayerIndex];
    if (!currentPlayer || currentPlayer.id !== playerId) return false;
    const action = this.state.pendingAction;
    if (!action || action.type !== 'buy-property') return false;
    if (currentPlayer.money < action.price) {
      this.addLog(`${currentPlayer.name} can't afford ${action.cellName} ($${action.price})`);
      return false;
    }
    currentPlayer.money -= action.price;
    this.state.properties[action.cellId] = playerId;
    this.addLog(`${currentPlayer.name} bought ${action.cellName} for $${action.price}`);
    this.clearPendingAction();
    return true;
  }

  buyInsurance(playerId: string): string | null {
    if (!this.state.settings.insuranceEnabled) return 'Insurance is not enabled';
    const player = this.state.players.find(p => p.id === playerId);
    if (!player) return 'Player not found';
    if (this.state.insured.includes(playerId)) return 'Already insured';
    const { insurancePremium } = this.state.settings;
    if (player.money < insurancePremium) return `Need $${insurancePremium}`;
    player.money -= insurancePremium;
    if (this.state.settings.vacationCash) this.state.vacationPool += insurancePremium;
    this.state.insured.push(playerId);
    this.addLog(`🛡 ${player.name} bought bankruptcy insurance for $${insurancePremium}`);
    return null;
  }

  upgradeProperty(playerId: string, cellId: number): string | null {
    const currentPlayer = this.state.players[this.state.currentPlayerIndex];
    if (!currentPlayer || currentPlayer.id !== playerId) return 'Not your turn';
    if (this.state.pendingAction) return 'Pending action';

    const cell = BOARD_CELLS[cellId];
    if (!cell || cell.type !== 'property') return 'Not a property';
    if (cell.industry !== 'it') return 'Only IT properties can be upgraded';
    if (this.state.properties[cellId] !== playerId) return 'Not your property';
    if (!cell.color || !this.hasMonopoly(playerId, cell.color)) return 'Need full color set to upgrade';

    const currentLevel = this.state.upgrades[cellId] ?? 0;
    if (currentLevel >= 4) return 'Max level reached';

    const upgradePrice = cell.upgradePrice ?? Math.floor((cell.price ?? 100) * 0.5);
    if (currentPlayer.money < upgradePrice) return 'Cannot afford upgrade';

    currentPlayer.money -= upgradePrice;
    this.state.upgrades[cellId] = currentLevel + 1;
    const newRent = Math.floor((cell.rent ?? 0) * Math.pow(2, currentLevel + 1));
    this.addLog(`💻 ${currentPlayer.name} upgraded ${cell.name} to Lv.${currentLevel + 1} (paid $${upgradePrice} → rent now $${newRent})`);
    return null;
  }

  declineProperty(playerId: string) {
    const currentPlayer = this.state.players[this.state.currentPlayerIndex];
    if (!currentPlayer || currentPlayer.id !== playerId) return;
    const action = this.state.pendingAction;
    if (!action || action.type !== 'buy-property') return;
    this.addLog(`${currentPlayer.name} declined to buy ${action.cellName}`);
    this.clearPendingAction();
  }

  private clearPendingAction() {
    const isDouble = this.state.lastDice !== null && this.state.lastDice[0] === this.state.lastDice[1];
    const inJail = this.state.players[this.state.currentPlayerIndex]?.inJail ?? false;
    this.state.pendingAction = null;
    this.state.diceRolled = true;
    if (isDouble && !inJail) {
      this.state.canRoll = true;
      this.state.diceRolled = false;
    }
  }

  // ── End turn ──────────────────────────────────────────────────

  endTurn(playerId: string) {
    const currentPlayer = this.state.players[this.state.currentPlayerIndex];
    if (!currentPlayer || currentPlayer.id !== playerId) return;
    if (!this.state.diceRolled || this.state.pendingAction) return;

    this.doublesCount = 0;
    const nextIndex = (this.state.currentPlayerIndex + 1) % this.state.players.length;
    const isRoundEnd = nextIndex === 0;

    this.state.currentPlayerIndex = nextIndex;
    this.state.diceRolled = false;
    this.state.canRoll = true;
    this.state.pendingAction = null;

    if (isRoundEnd) this.resolveRoundEnd();

    const nextPlayer = this.state.players[this.state.currentPlayerIndex];
    if (nextPlayer) this.addLog(`--- ${nextPlayer.name}'s turn ---`);
  }

  private resolveRoundEnd() {
    this.state.roundNumber++;
    this.addLog(`═══ Round ${this.state.roundNumber} begins ═══`);
    if (this.state.settings.jackpotEnabled) this.resolveJackpot();
    this.resolveOilEvent();
    this.applyInflation();
    this.applyWealthTax();
  }

  private applyInflation() {
    if (!this.state.settings.inflationEnabled) return;
    this.state.inflationMultiplier = parseFloat(
      (this.state.inflationMultiplier * (1 + this.state.settings.inflationRate / 100)).toFixed(3),
    );
    this.addLog(`📈 Inflation: rents now ×${this.state.inflationMultiplier.toFixed(2)}`);
  }

  private applyWealthTax() {
    if (!this.state.settings.wealthTaxEnabled) return;
    const { wealthTaxThreshold, wealthTaxRate } = this.state.settings;
    const snapshot = [...this.state.players];
    for (const p of snapshot) {
      if (p.money > wealthTaxThreshold) {
        const tax = Math.floor(p.money * wealthTaxRate / 100);
        this.payToBank(p, tax, `paid wealth tax $${tax} (${wealthTaxRate}% on $${p.money})`);
        if (p.money < 0) this.handleBankruptcy(p, null);
      }
    }
  }

  private resolveOilEvent() {
    const prev = this.state.oilModifier;
    const roll = Math.random();
    if (roll < 0.125) {
      this.state.oilModifier = 0;
      this.addLog('💥 Oil price CRASH! ⛽ properties pay NO rent this round!');
    } else if (roll < 0.25) {
      this.state.oilModifier = 2;
      this.addLog('📈 Oil price BOOM! ⛽ properties pay ×2 rent this round!');
    } else {
      this.state.oilModifier = 1;
      if (prev !== 1) this.addLog('⛽ Oil markets return to normal');
    }
  }

  // ── Cards ─────────────────────────────────────────────────────

  private drawCard(player: Player, type: 'chance' | 'community_chest') {
    const label = type === 'chance' ? '🎲 Surprise' : '📦 Treasure';
    type CardDef = { text: string; effect: (p: Player) => void };

    const RAILROADS = [5, 16, 25, 35];

    const chance: CardDef[] = [
      {
        text: 'Bank error in your favor — collect $200',
        effect: p => { p.money += 200; this.addLog(`${p.name} collected $200 (bank error)`); },
      },
      {
        text: 'Speeding fine — pay $50',
        effect: p => { this.payToBank(p, 50, 'paid speeding fine $50'); if (p.money < 0) this.handleBankruptcy(p, null); },
      },
      {
        text: 'Advance to START — collect $200',
        effect: p => { p.position = 0; p.money += 200; this.addLog(`${p.name} advanced to START +$200`); },
      },
      {
        text: 'Go directly to Jail',
        effect: p => { this.sendToJail(p, `${p.name} was sent to Jail by Surprise card!`); },
      },
      {
        text: 'Your GPS failed — move back 3 spaces',
        effect: p => {
          p.position = (p.position - 3 + BOARD_SIZE) % BOARD_SIZE;
          this.addLog(`${p.name} moved back 3 → ${BOARD_CELLS[p.position].name}`);
          this.handleLanding(p, this.state.lastDice ?? [1, 1]);
        },
      },
      {
        text: "It's your birthday! Collect $50 from each player",
        effect: p => { const t = this.collectFromAll(p, 50); this.addLog(`🎂 Birthday! ${p.name} collected $${t}`); },
      },
      {
        text: 'Charity donation — pay $30 to each player',
        effect: p => { this.payToAll(p, 30); },
      },
      {
        text: 'Win the lottery — collect $150!',
        effect: p => { p.money += 150; this.addLog(`🎰 ${p.name} won the lottery +$150`); },
      },
      {
        text: 'Tax audit — pay 15% of your current cash',
        effect: p => {
          const amt = Math.floor(Math.max(0, p.money) * 0.15);
          this.payToBank(p, amt, `paid tax audit $${amt} (15%)`);
          if (p.money < 0) this.handleBankruptcy(p, null);
        },
      },
      {
        text: 'Lucky break — move forward 6 spaces',
        effect: p => {
          const prev = p.position;
          p.position = (p.position + 6) % BOARD_SIZE;
          if (p.position <= prev && prev !== 0) { p.money += 200; this.addLog(`${p.name} passed START → +$200`); }
          this.addLog(`${p.name} moves forward 6 → ${BOARD_CELLS[p.position].name}`);
          this.handleLanding(p, this.state.lastDice ?? [1, 1]);
        },
      },
      {
        text: 'CHOICE: Tax refund $100 OR Advance to nearest Airport',
        effect: p => {
          const nearest = RAILROADS.find(r => r > p.position) ?? RAILROADS[0];
          this.state.pendingAction = {
            type: 'choose-card', label,
            options: [
              { id: 'choice_refund_100', text: '💰 Tax refund — collect $100' },
              { id: `choice_railroad_${nearest}`, text: `✈ Advance to nearest Airport (${BOARD_CELLS[nearest]?.name ?? `pos ${nearest}`})` },
            ],
          };
        },
      },
      {
        text: 'CHOICE: Steal $50 from wealthiest player OR Collect $25 from each',
        effect: () => {
          this.state.pendingAction = {
            type: 'choose-card', label,
            options: [
              { id: 'choice_steal_richest_50', text: '🥷 Steal $50 from wealthiest player' },
              { id: 'choice_collect_all_25', text: '🤝 Collect $25 from each player' },
            ],
          };
        },
      },
    ];

    const chest: CardDef[] = [
      {
        text: 'Bank dividend — collect $100',
        effect: p => { p.money += 100; this.addLog(`${p.name} received $100 bank dividend`); },
      },
      {
        text: 'Hospital fees — pay $100',
        effect: p => { this.payToBank(p, 100, 'paid hospital fees $100'); if (p.money < 0) this.handleBankruptcy(p, null); },
      },
      {
        text: 'Receive inheritance — collect $200',
        effect: p => { p.money += 200; this.addLog(`${p.name} received inheritance +$200`); },
      },
      {
        text: 'Insurance premium — pay $50',
        effect: p => { this.payToBank(p, 50, 'paid insurance premium $50'); if (p.money < 0) this.handleBankruptcy(p, null); },
      },
      {
        text: 'Community fundraiser! Collect $25 from each player',
        effect: p => { const t = this.collectFromAll(p, 25); this.addLog(`❤️ Fundraiser! ${p.name} collected $${t}`); },
      },
      {
        text: 'School fees — pay $150',
        effect: p => { this.payToBank(p, 150, 'paid school fees $150'); if (p.money < 0) this.handleBankruptcy(p, null); },
      },
      {
        text: 'Win beauty contest — collect $10',
        effect: p => { p.money += 10; this.addLog(`${p.name} won beauty contest +$10`); },
      },
      {
        text: 'Emergency fund — collect $50',
        effect: p => { p.money += 50; this.addLog(`${p.name} received emergency fund +$50`); },
      },
      {
        text: 'Renovation costs — pay $75',
        effect: p => { this.payToBank(p, 75, 'paid renovation costs $75'); if (p.money < 0) this.handleBankruptcy(p, null); },
      },
      {
        text: 'Income tax refund — collect $20',
        effect: p => { p.money += 20; this.addLog(`${p.name} received tax refund +$20`); },
      },
      {
        text: 'CHOICE: Collect $150 from bank OR Collect $30 from each player',
        effect: () => {
          this.state.pendingAction = {
            type: 'choose-card', label,
            options: [
              { id: 'choice_bank_150', text: '🏦 Collect $150 from bank' },
              { id: 'choice_collect_all_30', text: '🤝 Collect $30 from each player' },
            ],
          };
        },
      },
      {
        text: 'CHOICE: Pay $100 fine OR Go to Jail',
        effect: () => {
          this.state.pendingAction = {
            type: 'choose-card', label,
            options: [
              { id: 'choice_fine_100', text: '💸 Pay $100 fine' },
              { id: 'choice_jail', text: '🔒 Go to Jail instead' },
            ],
          };
        },
      },
      {
        text: 'AUCTION! A random unowned property goes up for sale!',
        effect: p => {
          const unowned = BOARD_CELLS.filter(
            c => c.type === 'property' && c.price !== undefined && !this.state.properties[c.id],
          );
          if (unowned.length === 0) {
            p.money += 100;
            this.addLog(`${p.name} drew Auction card — no unowned properties, bank pays $100`);
            return;
          }
          const target = unowned[Math.floor(Math.random() * unowned.length)];
          this.startAuction(target.id, p.id);
        },
      },
    ];

    const deck = type === 'chance' ? chance : chest;
    const card = deck[Math.floor(Math.random() * deck.length)];
    this.addLog(`${player.name} drew ${label}: "${card.text}"`);
    card.effect(player);
  }

  // ── Choice card resolution ─────────────────────────────────────

  chooseCardOption(playerId: string, optionId: string): boolean {
    const player = this.state.players[this.state.currentPlayerIndex];
    if (!player || player.id !== playerId) return false;
    const action = this.state.pendingAction;
    if (!action || action.type !== 'choose-card') return false;
    const option = action.options.find(o => o.id === optionId);
    if (!option) return false;

    this.addLog(`${player.name} chose: "${option.text}"`);
    this.state.pendingAction = null;
    this.applyEffect(optionId, player);

    if (!this.state.pendingAction) this.clearPendingAction();
    return true;
  }

  private applyEffect(effectId: string, player: Player): void {
    const RAILROADS = [5, 16, 25, 35];

    if (effectId === 'choice_refund_100') {
      player.money += 100;
      this.addLog(`${player.name} collects tax refund +$100`);
    } else if (effectId.startsWith('choice_railroad_')) {
      const dest = Number(effectId.split('_').pop());
      const prev = player.position;
      player.position = dest;
      if (dest <= prev && prev > 0) { player.money += 200; this.addLog(`${player.name} passed START → +$200`); }
      this.addLog(`${player.name} advances to ${BOARD_CELLS[dest]?.name ?? `pos ${dest}`}`);
      this.handleLanding(player, this.state.lastDice ?? [1, 1]);
    } else if (effectId === 'choice_steal_richest_50') {
      const richest = [...this.state.players]
        .filter(p => p.id !== player.id)
        .sort((a, b) => b.money - a.money)[0];
      if (richest) {
        const steal = Math.min(50, Math.max(0, richest.money));
        richest.money -= steal;
        player.money += steal;
        this.addLog(`${player.name} stole $${steal} from ${richest.name}!`);
      }
    } else if (effectId === 'choice_collect_all_25') {
      const t = this.collectFromAll(player, 25);
      this.addLog(`${player.name} collected $${t} from all players`);
    } else if (effectId === 'choice_bank_150') {
      player.money += 150;
      this.addLog(`${player.name} collected $150 from bank`);
    } else if (effectId === 'choice_collect_all_30') {
      const t = this.collectFromAll(player, 30);
      this.addLog(`${player.name} collected $${t} from all players`);
    } else if (effectId === 'choice_fine_100') {
      this.payToBank(player, 100, 'paid $100 fine');
      if (player.money < 0) this.handleBankruptcy(player, null);
    } else if (effectId === 'choice_jail') {
      this.sendToJail(player, `${player.name} chose to go to Jail`);
    }

    void RAILROADS; // suppress unused warning
  }

  // ── Global card helpers ────────────────────────────────────────

  private collectFromAll(recipient: Player, amount: number): number {
    const snapshot = [...this.state.players];
    let total = 0;
    for (const p of snapshot) {
      if (p.id === recipient.id) continue;
      const actual = Math.min(amount, Math.max(0, p.money));
      if (actual > 0) {
        p.money -= actual;
        recipient.money += actual;
        total += actual;
      }
      if (p.money < 0) this.handleBankruptcy(p, recipient);
    }
    return total;
  }

  private payToAll(payer: Player, amount: number): void {
    const others = this.state.players.filter(p => p.id !== payer.id);
    for (const p of others) {
      payer.money -= amount;
      p.money += amount;
    }
    this.addLog(`${payer.name} paid $${amount} to each player (total $${amount * others.length})`);
    if (payer.money < 0) this.handleBankruptcy(payer, null);
  }

  // ── Auction ────────────────────────────────────────────────────

  private startAuction(cellId: number, startedBy: string) {
    const cell = BOARD_CELLS[cellId];
    if (!cell || !cell.price) return;
    const minPrice = Math.floor(cell.price * 0.6);

    const starterIdx = this.state.players.findIndex(p => p.id === startedBy);
    const ordered = [
      ...this.state.players.slice(starterIdx + 1),
      ...this.state.players.slice(0, starterIdx + 1),
    ].filter(p => p.isConnected);

    if (ordered.length === 0) return;

    this.state.pendingAction = {
      type: 'auction',
      cellId,
      cellName: cell.name,
      minPrice,
      highestBid: 0,
      highestBidder: null,
      highestBidderName: null,
      activeBidder: ordered[0].id,
      activeBidderName: ordered[0].name,
      remainingBidders: ordered.slice(1).map(p => p.id),
    };
    this.addLog(`🔨 AUCTION: ${cell.name} — min bid $${minPrice}! ${ordered[0].name} bids first`);
  }

  submitBid(playerId: string, amount: number): boolean {
    const action = this.state.pendingAction;
    if (!action || action.type !== 'auction') return false;
    if (action.activeBidder !== playerId) return false;

    const minValid = action.highestBid > 0 ? action.highestBid + 1 : action.minPrice;
    if (amount < minValid) return false;
    const bidder = this.getPlayer(playerId);
    if (!bidder || bidder.money < amount) return false;

    action.highestBid = amount;
    action.highestBidder = playerId;
    action.highestBidderName = bidder.name;
    this.addLog(`🔨 ${bidder.name} bids $${amount}`);
    this.advanceAuction(action);
    return true;
  }

  passBid(playerId: string): boolean {
    const action = this.state.pendingAction;
    if (!action || action.type !== 'auction') return false;
    if (action.activeBidder !== playerId) return false;

    const passer = this.getPlayer(playerId);
    this.addLog(`🔨 ${passer?.name ?? 'Player'} passes`);
    this.advanceAuction(action);
    return true;
  }

  private advanceAuction(action: PendingAuctionAction) {
    if (action.remainingBidders.length === 0) {
      this.resolveAuction(action);
      return;
    }
    const nextId = action.remainingBidders[0];
    const next = this.getPlayer(nextId);
    action.activeBidder = nextId;
    action.activeBidderName = next?.name ?? '';
    action.remainingBidders = action.remainingBidders.slice(1);
    this.addLog(`🔨 ${action.activeBidderName}'s turn to bid`);
  }

  private resolveAuction(action: PendingAuctionAction) {
    if (action.highestBidder) {
      const winner = this.getPlayer(action.highestBidder);
      if (winner && winner.money >= action.highestBid) {
        winner.money -= action.highestBid;
        this.state.properties[action.cellId] = action.highestBidder;
        this.addLog(`🔨 ${winner.name} wins the auction! Paid $${action.highestBid} for ${action.cellName}`);
      } else {
        this.addLog(`🔨 ${winner?.name ?? 'Winner'} can't afford $${action.highestBid} — ${action.cellName} unsold`);
      }
    } else {
      this.addLog(`🔨 No bids — ${action.cellName} remains unsold`);
    }
    this.clearPendingAction();
  }

  // ── Rent calculation ──────────────────────────────────────────

  private calculateRent(cell: BoardCell, ownerId: string, dice: [number, number]): number {
    if (cell.type === 'utility') {
      const count = this.countOwned(ownerId, 'utility');
      return (dice[0] + dice[1]) * (count >= 2 ? 10 : 4);
    }
    if (cell.type === 'railroad') {
      const count = this.countOwned(ownerId, 'railroad');
      return AIRPORT_RENT[Math.min(count, 4)];
    }
    const baseRent = cell.rent ?? 0;
    const hasMonopoly = cell.color ? this.hasMonopoly(ownerId, cell.color) : false;
    let rent = 0;

    switch (cell.industry) {
      case 'it': {
        const level = this.state.upgrades[cell.id] ?? 0;
        rent = Math.floor(baseRent * Math.pow(2, level));
        if (level > 0) this.addLog(`💻 IT Lv.${level} rent: $${rent}`);
        break;
      }
      case 'oil': {
        if (this.state.oilModifier === 0) {
          this.addLog(`⛽ Oil CRASH — no rent collected!`);
          return 0;
        }
        rent = baseRent;
        if (this.state.settings.doubleRentOnMonopoly && hasMonopoly) {
          rent *= 2;
          this.addLog(`(full color set — rent doubled!)`);
        }
        if (this.state.oilModifier === 2) {
          rent *= 2;
          this.addLog(`⛽ Oil BOOM — rent doubled again!`);
        }
        break;
      }
      case 'crypto': {
        rent = baseRent;
        if (this.state.settings.doubleRentOnMonopoly && hasMonopoly) rent *= 2;
        const multipliers = [0.5, 0.75, 1.0, 1.25, 1.5];
        const mult = multipliers[Math.floor(Math.random() * multipliers.length)];
        rent = Math.max(1, Math.floor(rent * mult));
        this.addLog(`🪙 Crypto volatility ×${mult} → $${rent}`);
        break;
      }
      default: {
        rent = baseRent;
        if (this.state.settings.doubleRentOnMonopoly && hasMonopoly) {
          rent *= 2;
          this.addLog(`(full color set — rent doubled!)`);
        }
        break;
      }
    }

    if (this.state.settings.inflationEnabled && this.state.inflationMultiplier > 1.0) {
      const inflated = Math.floor(rent * this.state.inflationMultiplier);
      if (inflated !== rent) this.addLog(`📈 Inflation ×${this.state.inflationMultiplier.toFixed(2)} → $${inflated}`);
      rent = inflated;
    }
    return rent;
  }

  private countOwned(ownerId: string, type: string): number {
    return Object.entries(this.state.properties).filter(
      ([cellId, id]) => id === ownerId && BOARD_CELLS[Number(cellId)]?.type === type,
    ).length;
  }

  private hasMonopoly(ownerId: string, color: string): boolean {
    return BOARD_CELLS
      .filter(c => c.color === color)
      .every(c => this.state.properties[c.id] === ownerId);
  }

  // ── Money helpers ─────────────────────────────────────────────

  /** Money paid to the bank — optionally pools in vacationPool */
  private payToBank(player: Player, amount: number, logSuffix: string) {
    player.money -= amount;
    this.addLog(`${player.name} ${logSuffix}`);
    if (this.state.settings.vacationCash) {
      this.state.vacationPool += amount;
    }
  }

  private transferMoney(from: Player, to: Player, amount: number) {
    from.money -= amount;
    to.money += amount;
    this.addLog(`${from.name} paid $${amount} → ${to.name}`);
  }

  // ── Bankruptcy ────────────────────────────────────────────────

  private handleBankruptcy(player: Player, creditor: Player | null) {
    // Bankruptcy insurance check
    if (this.state.settings.insuranceEnabled) {
      const idx = this.state.insured.indexOf(player.id);
      if (idx !== -1) {
        this.state.insured.splice(idx, 1);
        player.money = this.state.settings.insurancePayout;
        this.addLog(`🛡 ${player.name} used bankruptcy insurance! Bailed out with $${this.state.settings.insurancePayout}`);
        return;
      }
    }

    this.addLog(`💀 ${player.name} is BANKRUPT and is eliminated!`);
    if (creditor && player.money > 0) creditor.money += player.money;
    Object.keys(this.state.properties).forEach(cid => {
      if (this.state.properties[Number(cid)] === player.id) {
        if (creditor) { this.state.properties[Number(cid)] = creditor.id; }
        else { delete this.state.properties[Number(cid)]; }
      }
    });

    const wasCurrentId = this.state.players[this.state.currentPlayerIndex]?.id;
    this.state.players = this.state.players.filter(p => p.id !== player.id);
    this.state.visitedJackpotThisRound = this.state.visitedJackpotThisRound.filter(
      pid => pid !== player.id
    );

    if (this.state.players.length <= 1) {
      if (this.state.players.length === 1) {
        this.addLog(`🏆 ${this.state.players[0].name} WINS THE GAME!`);
      }
      this.state.status = 'finished';
      return;
    }

    this.clampPlayerIndex();
    if (wasCurrentId === player.id) {
      this.state.pendingAction = null;
      this.state.diceRolled = false;
      this.state.canRoll = true;
      const next = this.state.players[this.state.currentPlayerIndex];
      if (next) this.addLog(`--- ${next.name}'s turn ---`);
    } else {
      const keepIdx = this.state.players.findIndex(p => p.id === wasCurrentId);
      if (keepIdx !== -1) this.state.currentPlayerIndex = keepIdx;
    }
  }

  // ── Jail ──────────────────────────────────────────────────────

  private sendToJail(player: Player, logMsg: string) {
    player.position = 10;
    player.inJail = true;
    player.jailTurns = 0;
    this.doublesCount = 0;
    this.addLog(logMsg);
  }

  // ── Helpers ───────────────────────────────────────────────────

  private freeProperties(ownerId: string) {
    Object.keys(this.state.properties).forEach(cid => {
      if (this.state.properties[Number(cid)] === ownerId) {
        delete this.state.properties[Number(cid)];
      }
    });
  }

  private clampPlayerIndex() {
    if (this.state.players.length === 0) return;
    this.state.currentPlayerIndex =
      this.state.currentPlayerIndex % this.state.players.length;
  }

  private addLog(message: string) {
    this.state.log.unshift(message);
    if (this.state.log.length > 80) this.state.log.pop();
  }

  getState(): GameState {
    return {
      ...this.state,
      players: this.state.players.map(p => ({ ...p })),
      log: [...this.state.log],
      properties: { ...this.state.properties },
      upgrades: { ...this.state.upgrades },
      insured: [...this.state.insured],
      visitedJackpotThisRound: [...this.state.visitedJackpotThisRound],
    };
  }
}
