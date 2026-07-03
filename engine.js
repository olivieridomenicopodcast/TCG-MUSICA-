// ===================================================================
// HEADLINER — Motore di gioco (prototipo playtest)
// Implementa: griglia 2x4 condivisa (Fase X), Note tap/freeze (Fase 2),
// costo singolo generico (Fase 4/7), tassonomia carte (Fase 3),
// Hype come asse unico (Fase 5), interazione/reazioni (Fase 6),
// condizione di vittoria e fail-safe (Fase 1).
// ===================================================================

let S = null; // stato globale di partita
let uidCounter = 1;
function uid() { return uidCounter++; }

function log(msg) {
  S.log.unshift(msg);
  if (S.log.length > 200) S.log.pop();
}

// -------------------- SETUP --------------------

function newPlayer(name, genre) {
  const mainDeck = shuffle(buildMainDeck(genre));
  const noteDeck = shuffle(buildNoteDeck(genre));
  const p = {
    name, genre,
    mainDeck, hand: [],
    noteDeck, notePool: [],
    unlockedSongs: [], hype: 0,
  };
  return p;
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function initGame(genreA, genreB, songsToTrigger) {
  const pA = newPlayer("Giocatore 1", genreA);
  const pB = newPlayer("Giocatore 2", genreB);
  S = {
    players: [pA, pB],
    active: 0,
    grid: Array(8).fill(null),
    songsToTrigger: songsToTrigger || 3,
    turn: 1,
    log: [],
    over: false,
    winner: null,
    pendingSabotage: null,
    availableUnlocks: [], // computed each render for active player
  };
  // mano iniziale
  [0, 1].forEach(i => {
    for (let k = 0; k < 4; k++) drawMain(i, true);
    drawNotes(i, 2, true);
  });
  log("Partita iniziata. " + pA.name + " (" + genreLabel(genreA) + ") vs " + pB.name + " (" + genreLabel(genreB) + ").");
  startTurn();
}

function genreLabel(g) { return g === "metalcore" ? "Metalcore" : "Grunge"; }

// -------------------- TURNO --------------------

function startTurn() {
  const p = S.players[S.active];
  // untap + decremento freeze
  p.notePool.forEach(n => {
    if (n.frozenTurns > 0) {
      n.frozenTurns -= 1;
    } else {
      n.tapped = false;
    }
  });
  drawNotes(S.active, 2);
  const okDraw = drawMain(S.active);
  if (!okDraw) {
    endGameFailSafe(S.active);
    return;
  }
  log("--- Turno " + S.turn + ": tocca a " + p.name + " ---");
}

function drawNotes(playerIdx, n, silent) {
  const p = S.players[playerIdx];
  for (let i = 0; i < n; i++) {
    if (p.noteDeck.length === 0) break; // mazzo-note esaurito: nessun trigger di fine partita
    const color = p.noteDeck.shift();
    p.notePool.push({ id: uid(), color, tapped: false, frozenTurns: 0 });
  }
}

function drawMain(playerIdx, silent) {
  const p = S.players[playerIdx];
  if (p.mainDeck.length === 0) return false;
  const cardId = p.mainDeck.shift();
  p.hand.push(cardId);
  return true;
}

function endGameFailSafe(playerIdx) {
  S.over = true;
  log((S.players[playerIdx].name) + " deve pescare dal mazzo principale ma è vuoto: fail-safe, la partita finisce subito.");
  resolveWinner();
}

function endTurn() {
  if (S.over) return;
  S.active = 1 - S.active;
  if (S.active === 0) S.turn += 1;
  startTurn();
}

// -------------------- NOTE: pagamento costo generico --------------------

function untappedNotes(playerIdx) {
  return S.players[playerIdx].notePool.filter(n => !n.tapped && n.frozenTurns === 0);
}

function canPay(playerIdx, cost) {
  return untappedNotes(playerIdx).length >= cost;
}

function payCost(playerIdx, cost) {
  const avail = untappedNotes(playerIdx).slice(0, cost);
  avail.forEach(n => n.tapped = true);
  return avail.length === cost;
}

// -------------------- GRIGLIA: piazzamento Musicisti --------------------

function neighborsOf(index) {
  const row = Math.floor(index / 4), col = index % 4;
  const res = [];
  if (row === 1) res.push({ idx: index - 4, dir: "N", back: "S" });
  if (row === 0) res.push({ idx: index + 4, dir: "S", back: "N" });
  if (col > 0) res.push({ idx: index - 1, dir: "O", back: "E" });
  if (col < 3) res.push({ idx: index + 1, dir: "E", back: "O" });
  return res;
}

function canPlaceMusician(index, playerIdx, stats) {
  if (S.grid[index]) return { ok: false, reason: "Slot occupato." };
  const neigh = neighborsOf(index);
  for (const n of neigh) {
    const cell = S.grid[n.idx];
    if (!cell) continue;
    const mine = stats[n.dir];
    const theirs = cell[n.back];
    if (cell.owner === playerIdx) {
      if (!(mine <= theirs)) {
        return { ok: false, reason: "Verso l'alleato in " + n.dir + " serve un valore ≤ " + theirs + " (hai " + mine + ")." };
      }
    } else {
      if (!(mine > theirs)) {
        return { ok: false, reason: "Verso l'avversario in " + n.dir + " serve un valore > " + theirs + " (hai " + mine + ")." };
      }
    }
  }
  return { ok: true };
}

function placeMusician(index, playerIdx, cardId) {
  const card = findCard(cardId);
  const check = canPlaceMusician(index, playerIdx, card);
  if (!check.ok) return check;
  if (!canPay(playerIdx, card.cost)) return { ok: false, reason: "Note libere insufficienti." };
  payCost(playerIdx, card.cost);
  S.grid[index] = {
    owner: playerIdx, cardId, instId: uid(),
    central: card.central, N: card.N, E: card.E, S: card.S, O: card.O,
    gear: null,
  };
  removeFromHand(playerIdx, cardId);
  log(S.players[playerIdx].name + " piazza " + card.name + " nello slot " + (index + 1) + ".");
  return { ok: true };
}

function removeFromHand(playerIdx, cardId) {
  const p = S.players[playerIdx];
  const i = p.hand.indexOf(cardId);
  if (i >= 0) p.hand.splice(i, 1);
}

// -------------------- GEAR --------------------

// direction è opzionale: richiesto solo se l'effetto del Gear lo prevede.
// La chiamata è atomica: se manca la direzione richiesta, non paga nulla e
// ritorna needsDirection:true così la UI può chiedere la scelta prima di riprovare.
function equipGear(index, playerIdx, cardId, direction) {
  const cell = S.grid[index];
  if (!cell) return { ok: false, reason: "Nessun Musicista in quello slot." };
  if (cell.gear) return { ok: false, reason: "Quel Musicista ha già un Gear equipaggiato." };
  const card = findCard(cardId);
  const onOwn = cell.owner === playerIdx;
  const eff = onOwn ? card.ownEffect : card.enemyEffect;
  if (eff.direction && !direction) return { ok: false, needsDirection: true, card, onOwn };
  if (!canPay(playerIdx, card.cost)) return { ok: false, reason: "Note libere insufficienti." };
  payCost(playerIdx, card.cost);
  cell.gear = { cardId, equippedBy: playerIdx, onOwn };
  if (eff.direction) cell[direction] = Math.max(0, cell[direction] + eff.direction);
  if (eff.central) cell.central = Math.max(0, cell.central + eff.central);
  if (eff.allDirections) {
    ["N","E","S","O"].forEach(d => cell[d] = Math.max(0, cell[d] + eff.allDirections));
  }
  removeFromHand(playerIdx, cardId);
  log(S.players[playerIdx].name + " equipaggia " + card.name + " su slot " + (index + 1) + (onOwn ? " (proprio Musicista)" : " (Musicista avversario)") + ".");
  return { ok: true, card, onOwn };
}

// -------------------- SPELL --------------------
// ritorna {needsReaction:bool, resolve:fn} per gestire la finestra di reazione lato UI

function castSpell(playerIdx, cardId, ctx) {
  const card = findCard(cardId);
  if (!canPay(playerIdx, card.cost)) return { ok: false, reason: "Note libere insufficienti." };
  payCost(playerIdx, card.cost);
  removeFromHand(playerIdx, cardId);

  const eff = card.effect;
  const defenderIdx = 1 - playerIdx;

  if (eff.kind === "directHype") {
    S.players[playerIdx].hype += eff.amount;
    log(S.players[playerIdx].name + " gioca " + card.name + ": +" + eff.amount + " Hype diretto.");
    return { ok: true, needsReaction: false };
  }

  if (eff.kind === "directionalMod") {
    const target = ctx.targetIndex;
    const cell = S.grid[target];
    if (!cell) return { ok: false, reason: "Bersaglio non valido." };
    const targetsEnemy = (eff.targetSide === "enemy");
    if (targetsEnemy && cell.owner === playerIdx) return { ok: false, reason: "Il bersaglio deve essere un Musicista avversario." };
    if (!targetsEnemy && cell.owner !== playerIdx) return { ok: false, reason: "Il bersaglio deve essere un tuo Musicista." };

    const applyEffect = (delta) => {
      cell[ctx.direction] = Math.max(0, cell[ctx.direction] + delta);
      log(S.players[playerIdx].name + " gioca " + card.name + ": " + (delta>0?"+":"") + delta + " a " + ctx.direction + " sullo slot " + (target+1) + ".");
    };

    if (targetsEnemy) {
      return {
        ok: true, needsReaction: true, defenderIdx, spellName: card.name,
        baseEffect: { kind: "directionalMod", delta: eff.delta },
        resolve: (mitigation) => {
          let delta = eff.delta;
          if (mitigation === "counter") { log(S.players[defenderIdx].name + " annulla " + card.name + " con una Reazione."); return; }
          if (mitigation === "mitigate") delta = Math.trunc(delta / 2);
          applyEffect(delta);
        }
      };
    } else {
      applyEffect(eff.delta);
      return { ok: true, needsReaction: false };
    }
  }

  if (eff.kind === "centralMod") {
    const target = ctx.targetIndex;
    const cell = S.grid[target];
    if (!cell) return { ok: false, reason: "Bersaglio non valido." };
    if (cell.owner !== playerIdx) return { ok: false, reason: "Il bersaglio deve essere un tuo Musicista." };
    cell.central = Math.max(0, cell.central + eff.delta);
    log(S.players[playerIdx].name + " gioca " + card.name + ": " + (eff.delta>0?"+":"") + eff.delta + " al valore centrale sullo slot " + (target+1) + ".");
    return { ok: true, needsReaction: false };
  }

  if (eff.kind === "selfRiskTrade") {
    const target = ctx.targetIndex;
    const cell = S.grid[target];
    if (!cell) return { ok: false, reason: "Bersaglio non valido." };
    if (cell.owner !== playerIdx) return { ok: false, reason: "Il bersaglio deve essere un tuo Musicista." };
    cell[ctx.direction] = Math.max(0, cell[ctx.direction] + eff.directionDelta);
    cell.central = Math.max(0, cell.central + eff.centralDelta);
    log(S.players[playerIdx].name + " gioca " + card.name + " su un proprio Musicista: " + eff.directionDelta + " a " + ctx.direction + ", " + (eff.centralDelta>0?"+":"") + eff.centralDelta + " al centrale.");
    return { ok: true, needsReaction: false };
  }

  if (eff.kind === "doubleEdgeFreeze") {
    // parte su di sé: sempre applicata
    freezeRandomNotes(playerIdx, eff.countSelf, eff.turns);
    log(S.players[playerIdx].name + " gioca " + card.name + ": freeza " + eff.countSelf + " proprie Note per " + eff.turns + " turni.");
    return {
      ok: true, needsReaction: true, defenderIdx, spellName: card.name,
      baseEffect: { kind: "freeze", count: eff.countEnemy, turns: eff.turns },
      resolve: (mitigation) => {
        let count = eff.countEnemy, turns = eff.turns;
        if (mitigation === "counter") { log(S.players[defenderIdx].name + " annulla la parte offensiva di " + card.name + " con una Reazione."); return; }
        if (mitigation === "mitigate") turns = Math.max(0, turns - 1);
        if (turns > 0) {
          freezeRandomNotes(defenderIdx, count, turns);
          log(S.players[defenderIdx].name + " subisce il freeze: " + count + " Note per " + turns + " turni.");
        }
      }
    };
  }

  return { ok: false, reason: "Effetto non riconosciuto." };
}

function freezeRandomNotes(playerIdx, count, turns) {
  const avail = untappedNotes(playerIdx);
  const chosen = avail.slice(0, count);
  chosen.forEach(n => { n.frozenTurns = Math.max(n.frozenTurns, turns); });
}

// -------------------- CONDIZIONI CANZONI --------------------

function computeUnlockables(playerIdx) {
  const out = [];
  SONGS.forEach(song => {
    if (S.players[playerIdx].unlockedSongs.includes(song.id)) return;
    const res = checkSongCondition(song, playerIdx);
    if (res.satisfied) out.push({ song, components: res.components });
  });
  return out;
}

function checkSongCondition(song, playerIdx) {
  const c = song.condition;
  const mine = S.grid.map((cell, i) => (cell && cell.owner === playerIdx) ? i : -1).filter(i => i >= 0);

  if (c.kind === "centralAtLeast") {
    const found = mine.find(i => S.grid[i].central >= c.min);
    return { satisfied: found !== undefined, components: found !== undefined ? [found] : [] };
  }

  if (c.kind === "adjacentPair" || c.kind === "adjacentPairSum" || c.kind === "adjacentPairSumPlusFreeNotes") {
    for (const i of mine) {
      const neigh = neighborsOf(i).filter(n => n.idx > i && mine.includes(n.idx));
      for (const n of neigh) {
        if (c.kind === "adjacentPair") return { satisfied: true, components: [i, n.idx] };
        const sum = S.grid[i].central + S.grid[n.idx].central;
        if (c.kind === "adjacentPairSum" && sum >= c.min) return { satisfied: true, components: [i, n.idx] };
        if (c.kind === "adjacentPairSumPlusFreeNotes" && sum >= c.min && untappedNotes(playerIdx).length >= c.freeNotes) {
          return { satisfied: true, components: [i, n.idx] };
        }
      }
    }
    return { satisfied: false, components: [] };
  }

  if (c.kind === "lineTripleSum") {
    for (let row = 0; row < 2; row++) {
      for (let startCol = 0; startCol <= 1; startCol++) {
        const idxs = [row*4+startCol, row*4+startCol+1, row*4+startCol+2];
        if (idxs.every(i => mine.includes(i))) {
          const sum = idxs.reduce((a, i) => a + S.grid[i].central, 0);
          if (sum >= c.min) return { satisfied: true, components: idxs };
        }
      }
    }
    return { satisfied: false, components: [] };
  }

  return { satisfied: false, components: [] };
}

function unlockSong(playerIdx, songId) {
  const song = SONGS.find(s => s.id === songId);
  const res = checkSongCondition(song, playerIdx);
  if (!res.satisfied) return { ok: false, reason: "Condizione non più soddisfatta." };
  S.players[playerIdx].unlockedSongs.push(songId);
  S.players[playerIdx].hype += song.hype;
  log(S.players[playerIdx].name + " sblocca \"" + song.name + "\": +" + song.hype + " Hype.");
  if (song.consumes) {
    res.components.slice().sort((a,b)=>b-a).forEach(i => { S.grid[i] = null; });
    log("I Musicisti coinvolti lasciano la griglia (Canzone di tipo consumo).");
  }
  if (S.players[playerIdx].unlockedSongs.length >= S.songsToTrigger) {
    S.over = true;
    log(S.players[playerIdx].name + " ha sbloccato " + S.songsToTrigger + " Canzoni: fine partita!");
    resolveWinner();
  }
  return { ok: true };
}

function resolveWinner() {
  const [pA, pB] = S.players;
  if (pA.hype > pB.hype) S.winner = 0;
  else if (pB.hype > pA.hype) S.winner = 1;
  else S.winner = null; // pareggio
}
