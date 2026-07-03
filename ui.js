// ===================================================================
// HEADLINER — UI (vanilla JS, nessuna dipendenza esterna)
// ===================================================================

const app = document.getElementById("app");
let setupChoice = { genreA: "metalcore", genreB: "grunge", songsToTrigger: 3 };
let pending = null;       // { cardId, card, needsTarget, targetSide, needsDirection, targetIndex, direction }
let reactionCtx = null;   // { defenderIdx, spellName, resolve }
let showBothHands = false;
let toastMsg = null;

function showError(msg) {
  toastMsg = msg;
  render();
  setTimeout(() => { toastMsg = null; render(); }, 2600);
}

// -------------------- SETUP SCREEN --------------------

function renderSetup() {
  app.innerHTML = `
    <div class="topbar">
      <div class="brand"><h1>HEADLINER</h1><span class="tag">prototipo playtest</span></div>
    </div>
    <div class="setup-card">
      <h2 style="margin-bottom:14px;">Nuova partita</h2>
      <div class="setup-row">
        <label>Genere Giocatore 1</label>
        <div class="choice-group" id="genreA"></div>
      </div>
      <div class="setup-row">
        <label>Genere Giocatore 2</label>
        <div class="choice-group" id="genreB"></div>
      </div>
      <div class="setup-row">
        <label>Canzoni per fine partita (X)</label>
        <div class="choice-group" id="songsChoice"></div>
      </div>
      <div class="setup-row">
        <label><input type="checkbox" id="showBoth"> Mostra sempre entrambe le mani (comodo per playtest da soli)</label>
      </div>
      <button class="primary" id="startBtn">Inizia partita</button>
      <p class="help-text">Regole implementate: griglia condivisa 2×4, Note con tap generico (costo singolo, Fase 4/7), Musicisti/Spell/Gear/Canzoni (Fase 3), Hype come asse unico (Fase 5), Reazioni a Spell di Sabotaggio (Fase 6), fail-safe su mazzo principale vuoto (Fase 1).</p>
    </div>
  `;
  const genres = [["metalcore","Metalcore"],["grunge","Grunge"]];
  const gA = document.getElementById("genreA");
  const gB = document.getElementById("genreB");
  genres.forEach(([id,label]) => {
    const bA = document.createElement("button");
    bA.textContent = label;
    bA.className = setupChoice.genreA === id ? "selected" : "";
    bA.onclick = () => { setupChoice.genreA = id; renderSetup(); };
    gA.appendChild(bA);
    const bB = document.createElement("button");
    bB.textContent = label;
    bB.className = setupChoice.genreB === id ? "selected" : "";
    bB.onclick = () => { setupChoice.genreB = id; renderSetup(); };
    gB.appendChild(bB);
  });
  const sc = document.getElementById("songsChoice");
  [2,3,4].forEach(n => {
    const b = document.createElement("button");
    b.textContent = n;
    b.className = setupChoice.songsToTrigger === n ? "selected" : "";
    b.onclick = () => { setupChoice.songsToTrigger = n; renderSetup(); };
    sc.appendChild(b);
  });
  document.getElementById("showBoth").checked = showBothHands;
  document.getElementById("showBoth").onchange = (e) => { showBothHands = e.target.checked; };
  document.getElementById("startBtn").onclick = () => {
    initGame(setupChoice.genreA, setupChoice.genreB, setupChoice.songsToTrigger);
    pending = null;
    render();
  };
}

// -------------------- GAME SCREEN --------------------

function render() {
  if (!S) { renderSetup(); return; }
  if (S.over) { renderGameOver(); return; }

  const active = S.active;
  const p0 = S.players[0], p1 = S.players[1];
  const unlockables = computeUnlockables(active);

  app.innerHTML = `
    <div class="topbar">
      <div class="brand"><h1>HEADLINER</h1><span class="tag">prototipo playtest</span></div>
      <button class="small" id="resetBtn">Nuova partita</button>
    </div>

    <div class="scoreboard">
      ${scoreBoxHtml(0, active===0)}
      <div class="center-info">
        <div class="turn">Turno ${S.turn}</div>
        <div class="target">Obiettivo: ${S.songsToTrigger} Canzoni sbloccate</div>
        <label style="font-size:.7rem;color:var(--text-dim);margin-top:6px;">
          <input type="checkbox" id="toggleBoth" ${showBothHands?"checked":""}> mostra entrambe le mani
        </label>
      </div>
      ${scoreBoxHtml(1, active===1)}
    </div>

    <div class="main-grid">
      <div class="board-panel">
        <div class="stage-grid" id="stageGrid"></div>
        <div class="legend">
          <span><span class="dot p0"></span>${p0.name} — ${genreLabel(p0.genre)}</span>
          <span><span class="dot p1"></span>${p1.name} — ${genreLabel(p1.genre)}</span>
        </div>
        ${noteSectionHtml(0)}
        ${noteSectionHtml(1)}
      </div>

      <div class="side-panel">
        <div class="panel-box">
          <h4>Mano — ${S.players[active].name}</h4>
          <div class="hand-list" id="handList"></div>
          <div id="actionBox" class="action-box"></div>
        </div>

        ${unlockables.length ? `
        <div class="panel-box">
          <h4>Canzoni sbloccabili ora</h4>
          <div class="unlock-list" id="unlockList"></div>
        </div>` : ""}

        <div class="panel-box">
          <h4>Registro partita</h4>
          <div class="log-panel">${S.log.map(l => `<div>${escapeHtml(l)}</div>`).join("")}</div>
        </div>

        <button class="primary" id="endTurnBtn">Fine turno</button>
      </div>
    </div>

    <p class="footer-note">Costo singolo generico (Fase 7): ogni carta si paga tappando N Note qualsiasi, senza vincolo di colore.</p>
    ${toastMsg ? `<div class="error-toast">${escapeHtml(toastMsg)}</div>` : ""}
  `;

  document.getElementById("resetBtn").onclick = () => { S = null; pending = null; render(); };
  document.getElementById("toggleBoth").onchange = (e) => { showBothHands = e.target.checked; render(); };
  document.getElementById("endTurnBtn").onclick = () => { pending = null; endTurn(); render(); };

  renderGrid();
  renderHand(active);
  renderActionBox();
  if (unlockables.length) renderUnlocks(unlockables, active);
  if (reactionCtx) renderReactionModal();
}

function scoreBoxHtml(idx, isActive) {
  const p = S.players[idx];
  return `
    <div class="score-box ${isActive?"active":""}">
      <div class="genre">${genreLabel(p.genre)}</div>
      <h3>${p.name}</h3>
      <div class="hype mono">${p.hype} Hype</div>
      <div class="songs">${p.unlockedSongs.length} / ${S.songsToTrigger} Canzoni sbloccate</div>
    </div>
  `;
}

function noteSectionHtml(idx) {
  const p = S.players[idx];
  return `
    <div class="note-section">
      <h4>Note — ${p.name} (${untappedNotes(idx).length} libere / ${p.notePool.length} totali)</h4>
      <div class="note-pool">
        ${p.notePool.map(n => {
          const cls = ["note-token"];
          if (n.tapped) cls.push("tapped");
          if (n.frozenTurns > 0) cls.push("frozen");
          const bg = NOTE_COLOR_PALETTE[n.color] || "#888";
          const label = n.frozenTurns > 0 ? "❄" : n.color.slice(0,2);
          return `<span class="${cls.join(" ")}" style="background:${bg}" title="${n.color}${n.frozenTurns>0?(" · freeze "+n.frozenTurns+" turni"):(n.tapped?" · tappata":" · libera")}">${label}</span>`;
        }).join("")}
      </div>
    </div>
  `;
}

function renderGrid() {
  const grid = document.getElementById("stageGrid");
  grid.innerHTML = "";
  for (let i = 0; i < 8; i++) {
    const cell = S.grid[i];
    const div = document.createElement("div");
    div.className = "slot";
    div.innerHTML = `<span class="idx">${i+1}</span>`;

    if (cell) {
      const card = findCard(cell.cardId);
      const mc = document.createElement("div");
      mc.className = "musician-card owner-" + cell.owner;
      mc.innerHTML = `
        <div class="dv N">${cell.N}</div>
        <div class="dv O">${cell.O}</div>
        <div class="central-val">${cell.central}</div>
        <div class="dv E">${cell.E}</div>
        <div class="dv S">${cell.S}</div>
        <div class="name">${card.name}</div>
        ${cell.gear ? `<div class="gear-badge" title="${findCard(cell.gear.cardId).name}">⚙</div>` : ""}
      `;
      div.appendChild(mc);
    } else {
      div.classList.add("empty");
    }

    // targetability
    if (pending && pending.type === "musician" && !cell) {
      div.classList.add("selectable");
      div.onclick = () => attemptPlaceMusician(i);
    } else if (pending && pending.type === "gear" && cell && !cell.gear) {
      div.classList.add("targetable");
      div.onclick = () => attemptEquipGear(i);
    } else if (pending && pending.type === "spell" && pending.targetIndex === null && cell) {
      const wantsSide = pending.targetSide;
      const ownerMatches = (wantsSide === "own" && cell.owner === S.active) || (wantsSide === "enemy" && cell.owner !== S.active);
      if (ownerMatches) {
        div.classList.add("targetable");
        div.onclick = () => { pending.targetIndex = i; renderActionBox(); };
      }
    }

    grid.appendChild(div);
  }
}

function renderHand(activeIdx) {
  const list = document.getElementById("handList");
  list.innerHTML = "";
  const playersToShow = showBothHands ? [0,1] : [activeIdx];
  playersToShow.forEach(pi => {
    const p = S.players[pi];
    if (showBothHands) {
      const hdr = document.createElement("div");
      hdr.style.cssText = "font-size:.7rem;color:var(--text-dim);margin:6px 0 2px;text-transform:uppercase;";
      hdr.textContent = p.name;
      list.appendChild(hdr);
    }
    p.hand.forEach(cardId => {
      const card = findCard(cardId);
      const div = document.createElement("div");
      const isReaction = card.type === "spell" && card.subtype === "reazione";
      const isMine = pi === activeIdx;
      const disabled = !isMine || isReaction || !canPay(pi, card.cost);
      div.className = "hand-card" + (disabled ? " disabled" : "") + (pending && pending.cardId === cardId ? " selected" : "");
      div.innerHTML = `
        <div class="hc-top"><span class="hc-name">${card.name}</span><span class="hc-cost">${card.cost}♪</span></div>
        <div class="hc-meta">${typeLabel(card)}${card.rare?" · rara":""}</div>
        <div class="hc-desc">${card.desc || card.flavor || ""}</div>
        ${isReaction ? `<div class="hc-desc" style="color:var(--red);margin-top:4px;">Giocabile solo in risposta a un Sabotaggio subito.</div>` : ""}
      `;
      if (!disabled) div.onclick = () => selectHandCard(cardId);
      list.appendChild(div);
    });
    if (p.hand.length === 0) {
      const empty = document.createElement("div");
      empty.className = "help-text";
      empty.textContent = "Mano vuota.";
      list.appendChild(empty);
    }
  });
}

function typeLabel(card) {
  if (card.type === "musician") return "Musicista" + (card.rare ? " · Rara" : "");
  if (card.type === "gear") return "Gear";
  if (card.type === "spell") return "Spell · " + card.subtype[0].toUpperCase() + card.subtype.slice(1);
  return card.type;
}

function selectHandCard(cardId) {
  const card = findCard(cardId);
  if (card.type === "musician") {
    pending = { cardId, card, type: "musician" };
  } else if (card.type === "gear") {
    pending = { cardId, card, type: "gear" };
  } else if (card.type === "spell") {
    const eff = card.effect;
    let targetSide = null, needsDirection = false, needsTarget = false;
    if (eff.kind === "directionalMod") { needsTarget = true; targetSide = eff.targetSide; needsDirection = true; }
    else if (eff.kind === "centralMod") { needsTarget = true; targetSide = eff.targetSide; }
    else if (eff.kind === "selfRiskTrade") { needsTarget = true; targetSide = "own"; needsDirection = true; }
    pending = { cardId, card, type: "spell", needsTarget, targetSide, needsDirection, targetIndex: null, direction: null };
  }
  render();
}

function renderActionBox() {
  const box = document.getElementById("actionBox");
  if (!box) return;
  if (!pending) { box.innerHTML = ""; return; }

  if (pending.type === "musician") {
    box.innerHTML = `<p class="help-text">Clicca uno slot vuoto della griglia per piazzare <b>${pending.card.name}</b>. Il piazzamento sarà bloccato se non rispetta le regole verso i Musicisti adiacenti.</p>
      <button class="small" id="cancelSel">Annulla selezione</button>`;
    document.getElementById("cancelSel").onclick = () => { pending = null; render(); };
    return;
  }

  if (pending.type === "gear") {
    box.innerHTML = `<p class="help-text">Clicca un Musicista in griglia (tuo o avversario) per equipaggiare <b>${pending.card.name}</b>.</p>
      <button class="small" id="cancelSel">Annulla selezione</button>`;
    document.getElementById("cancelSel").onclick = () => { pending = null; render(); };
    return;
  }

  if (pending.type === "spell") {
    let html = "";
    if (pending.needsTarget && pending.targetIndex === null) {
      html += `<p class="help-text">Clicca un Musicista ${pending.targetSide === "own" ? "tuo" : "avversario"} in griglia come bersaglio.</p>`;
    } else if (pending.needsDirection && !pending.direction) {
      html += `<p class="help-text">Scegli la direzione da modificare:</p>
        <div class="dir-picker">
          ${["N","E","S","O"].map(d => `<button data-dir="${d}">${d}</button>`).join("")}
        </div>`;
    } else {
      html += `<p class="help-text">Pronto a giocare <b>${pending.card.name}</b>.</p>
        <button class="primary" id="confirmSpell">Conferma</button>`;
    }
    html += `<button class="small" id="cancelSel">Annulla selezione</button>`;
    box.innerHTML = html;

    box.querySelectorAll("[data-dir]").forEach(btn => {
      btn.onclick = () => { pending.direction = btn.dataset.dir; renderActionBox(); };
    });
    const confirmBtn = document.getElementById("confirmSpell");
    if (confirmBtn) confirmBtn.onclick = () => confirmSpell();
    document.getElementById("cancelSel").onclick = () => { pending = null; render(); };
  }
}

function attemptPlaceMusician(index) {
  const res = placeMusician(index, S.active, pending.cardId);
  if (!res.ok) { showError(res.reason); return; }
  pending = null;
  render();
}

function attemptEquipGear(index) {
  const cardId = pending.cardId;
  const res = equipGear(index, S.active, cardId);
  if (res.needsDirection) {
    // nessun costo pagato finché non si sceglie la direzione: flusso atomico
    pending = { type: "gearDirection", index, cardId, cardName: res.card.name };
    render();
    const box = document.getElementById("actionBox");
    box.innerHTML = `<p class="help-text">Scegli la direzione da modificare con <b>${res.card.name}</b>:</p>
      <div class="dir-picker">${["N","E","S","O"].map(d => `<button data-dir="${d}">${d}</button>`).join("")}</div>
      <button class="small" id="cancelGear">Annulla selezione</button>`;
    box.querySelectorAll("[data-dir]").forEach(btn => {
      btn.onclick = () => {
        const final = equipGear(index, S.active, cardId, btn.dataset.dir);
        if (!final.ok) { showError(final.reason); }
        pending = null;
        render();
      };
    });
    document.getElementById("cancelGear").onclick = () => { pending = null; render(); };
    return;
  }
  if (!res.ok) { showError(res.reason); return; }
  pending = null;
  render();
}

function confirmSpell() {
  const ctx = { targetIndex: pending.targetIndex, direction: pending.direction };
  const result = castSpell(S.active, pending.cardId, ctx);
  if (!result.ok) { showError(result.reason); return; }
  pending = null;
  if (result.needsReaction) {
    reactionCtx = { defenderIdx: result.defenderIdx, spellName: result.spellName, resolve: result.resolve };
  }
  render();
}

function renderReactionModal() {
  const defender = S.players[reactionCtx.defenderIdx];
  const reactionCards = defender.hand.filter(id => {
    const c = findCard(id);
    return c.type === "spell" && c.subtype === "reazione" && canPay(reactionCtx.defenderIdx, c.cost);
  });
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  overlay.innerHTML = `
    <div class="modal">
      <h3>Finestra di Reazione</h3>
      <p><b>${defender.name}</b> sta per subire <b>${escapeHtml(reactionCtx.spellName)}</b>. Vuoi reagire?</p>
      <div class="modal-actions" id="reactionActions"></div>
    </div>
  `;
  document.body.appendChild(overlay);
  const actions = overlay.querySelector("#reactionActions");
  reactionCards.forEach(id => {
    const c = findCard(id);
    const btn = document.createElement("button");
    btn.className = "primary";
    btn.textContent = `Gioca ${c.name} (${c.cost}♪) — ${c.effect.kind === "counterSabotage" ? "annulla" : "attenua"}`;
    btn.onclick = () => {
      payCost(reactionCtx.defenderIdx, c.cost);
      removeFromHand(reactionCtx.defenderIdx, id);
      log(defender.name + " reagisce con " + c.name + ".");
      reactionCtx.resolve(c.effect.kind === "counterSabotage" ? "counter" : "mitigate");
      document.body.removeChild(overlay);
      reactionCtx = null;
      render();
    };
    actions.appendChild(btn);
  });
  const passBtn = document.createElement("button");
  passBtn.textContent = "Non reagire";
  passBtn.onclick = () => {
    reactionCtx.resolve();
    document.body.removeChild(overlay);
    reactionCtx = null;
    render();
  };
  actions.appendChild(passBtn);
}

function renderUnlocks(unlockables, activeIdx) {
  const list = document.getElementById("unlockList");
  list.innerHTML = "";
  unlockables.forEach(u => {
    const div = document.createElement("div");
    div.className = "unlock-chip";
    div.innerHTML = `
      <div class="uc-top"><span>${u.song.name}</span><span class="mono">+${u.song.hype} Hype</span></div>
      <div class="uc-desc">${u.song.desc}</div>
      <button class="primary small" data-song="${u.song.id}">Sblocca</button>
    `;
    div.querySelector("button").onclick = () => {
      const res = unlockSong(activeIdx, u.song.id);
      if (!res.ok) showError(res.reason);
      else render();
    };
    list.appendChild(div);
  });
}

function renderGameOver() {
  const [p0, p1] = S.players;
  const winnerText = S.winner === null ? "Pareggio!" : (S.players[S.winner].name + " vince!");
  app.innerHTML = `
    <div class="topbar">
      <div class="brand"><h1>HEADLINER</h1><span class="tag">prototipo playtest</span></div>
    </div>
    <div class="setup-card">
      <h2 style="color:var(--amber);margin-bottom:6px;">Partita conclusa</h2>
      <h3 style="margin-bottom:16px;">${winnerText}</h3>
      <div class="scoreboard" style="grid-template-columns:1fr 1fr;">
        ${scoreBoxHtml(0,false)}${scoreBoxHtml(1,false)}
      </div>
      <div class="panel-box" style="margin-top:16px;">
        <h4>Registro partita</h4>
        <div class="log-panel">${S.log.map(l => `<div>${escapeHtml(l)}</div>`).join("")}</div>
      </div>
      <button class="primary" style="margin-top:16px;" id="newGameBtn">Nuova partita</button>
    </div>
  `;
  document.getElementById("newGameBtn").onclick = () => { S = null; pending = null; render(); };
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
}

render();
