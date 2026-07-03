// ===================================================================
// HEADLINER — Catalogo carte del prototipo (Fase 7, bozza playtest)
// Numeri e testi sono placeholder di bilanciamento, pensati per
// validare il LOOP del sistema (Fasi 1-6 + X), non per il gioco finale.
// ===================================================================

const NOTE_COLOR_PALETTE = {
  "Do":  "#C2432D", "Do#": "#3FA796", "Re":  "#E3B23C", "Re#": "#8B5E83",
  "Mi":  "#5C7A99", "Fa":  "#B5793A", "Fa#": "#C2432D", "Sol": "#3FA796",
  "Sol#":"#E3B23C", "La":  "#8B5E83", "La#": "#5C7A99", "Si":  "#B5793A",
};

// Mazzi-note fissi (12 carte) per i due generi del primo playtest
// (Fase 2: il giocatore sceglie i semitoni in base all'identità del Frontman).
const NOTE_DECKS = {
  metalcore: ["Mi","Mi","Mi","Mi","Sol","Sol","Sol","Sol","Si","Si","Si","Si"],
  grunge:    ["Re","Re","Re","Re","Fa","Fa","Fa","Fa","La","La","La","La"],
};

// -------------------------------------------------------------------
// MUSICISTI — 5 valori: central + N/E/S/O (scala 1-9, stile Triple Triad)
// -------------------------------------------------------------------
const MUSICIANS = [
  // --- Metalcore ---
  { id:"mc_riff_cleaner",    name:"Riff Cleaner",       genre:"metalcore", type:"musician", cost:2, qty:2,
    central:5, N:3, E:4, S:3, O:4, flavor:"Palm-mute pulito, tempo solido." },
  { id:"mc_breakdown_riley", name:"Breakdown Riley",    genre:"metalcore", type:"musician", cost:3, qty:2,
    central:6, N:6, E:2, S:6, O:2, flavor:"Vive per il breakdown a metà canzone." },
  { id:"mc_clean_vocal_sera",name:"Clean Vocal Sera",   genre:"metalcore", type:"musician", cost:2, qty:2,
    central:4, N:2, E:5, S:2, O:5, flavor:"Il contrasto melodico che serve dopo lo scream." },
  { id:"mc_double_bass_nico",name:"Double Bass Nico",   genre:"metalcore", type:"musician", cost:4, qty:1,
    central:7, N:5, E:5, S:3, O:3, flavor:"Blast beat controllato, resistenza da maratoneta." },
  { id:"mc_melodic_lead_vale",name:"Melodic Lead Vale", genre:"metalcore", type:"musician", cost:3, qty:2,
    central:5, N:4, E:4, S:4, O:4, flavor:"Assolo equilibrato su ogni lato del palco." },
  { id:"mc_scream_cage",     name:"Scream Cage",        genre:"metalcore", type:"musician", cost:4, qty:1,
    central:8, N:7, E:2, S:7, O:2, flavor:"Frontman honorario, voce che spacca il PA.", rare:true },

  // --- Grunge ---
  { id:"gr_fuzz_bassist_kurt", name:"Fuzz Bassist Kurt", genre:"grunge", type:"musician", cost:2, qty:2,
    central:5, N:4, E:3, S:4, O:3, flavor:"Basso sporco, effetto fuzz sempre acceso." },
  { id:"gr_flannel_drummer_moll", name:"Flannel Drummer Moll", genre:"grunge", type:"musician", cost:3, qty:2,
    central:6, N:3, E:6, S:3, O:6, flavor:"Groove dinoccolato ma inarrestabile." },
  { id:"gr_feedback_howler", name:"Feedback Howler",    genre:"grunge", type:"musician", cost:2, qty:2,
    central:4, N:6, E:1, S:6, O:1, flavor:"Vive di feedback e distorsione incontrollata." },
  { id:"gr_slacker_riffer",  name:"Slacker Riffer",      genre:"grunge", type:"musician", cost:4, qty:1,
    central:7, N:4, E:4, S:4, O:4, flavor:"Svogliato in apparenza, letale sul palco." },
  { id:"gr_angsty_frontkid", name:"Angsty Frontkid",     genre:"grunge", type:"musician", cost:3, qty:2,
    central:5, N:5, E:5, S:2, O:2, flavor:"Tutta la rabbia riversata in due direzioni." },
  { id:"gr_distortion_duke", name:"Distortion Duke",     genre:"grunge", type:"musician", cost:4, qty:1,
    central:8, N:8, E:1, S:8, O:1, flavor:"Wall of sound umano.", rare:true },
];

// -------------------------------------------------------------------
// SPELL — Supporto / Sabotaggio / Reazione
// -------------------------------------------------------------------
const SPELLS = [
  // --- Metalcore ---
  { id:"mc_breakdown_stomp", name:"Breakdown Stomp", genre:"metalcore", type:"spell", subtype:"sabotaggio",
    cost:2, qty:2, effect:{ kind:"directionalMod", delta:-2, targetSide:"enemy", permanent:true },
    desc:"-2 permanente a un valore direzionale a scelta di un Musicista avversario in griglia." },
  { id:"mc_clean_interlude", name:"Clean Interlude", genre:"metalcore", type:"spell", subtype:"supporto",
    cost:1, qty:2, effect:{ kind:"directHype", amount:1 },
    desc:"+1 Hype diretto." },
  { id:"mc_circle_pit", name:"Circle Pit", genre:"metalcore", type:"spell", subtype:"supporto",
    cost:2, qty:2, effect:{ kind:"centralMod", delta:2, targetSide:"own", permanent:true },
    desc:"+2 permanente al valore centrale di un tuo Musicista in griglia." },
  { id:"mc_no_sellout", name:"No Sellout", genre:"metalcore", type:"spell", subtype:"reazione",
    cost:1, qty:2, effect:{ kind:"counterSabotage" },
    desc:"Annulla completamente l'ultima Spell di Sabotaggio dichiarata contro di te." },

  // --- Grunge ---
  { id:"gr_self_loathing_riff", name:"Self-Loathing Riff", genre:"grunge", type:"spell", subtype:"sabotaggio",
    cost:2, qty:2, effect:{ kind:"doubleEdgeFreeze", countSelf:2, countEnemy:2, turns:2 },
    desc:"Freeza 2 tue Note libere e 2 Note libere avversarie per 2 turni (doppio taglio)." },
  { id:"gr_unplugged_session", name:"Unplugged Session", genre:"grunge", type:"spell", subtype:"supporto",
    cost:1, qty:2, effect:{ kind:"directHype", amount:2 },
    desc:"+2 Hype diretto." },
  { id:"gr_distorted_truth", name:"Distorted Truth", genre:"grunge", type:"spell", subtype:"sabotaggio",
    cost:3, qty:2, effect:{ kind:"selfRiskTrade", directionDelta:-3, centralDelta:3 },
    desc:"Su un tuo Musicista: -3 permanente a una direzione a scelta, +3 permanente al valore centrale (rischio a tuo carico)." },
  { id:"gr_feedback_loop", name:"Feedback Loop", genre:"grunge", type:"spell", subtype:"reazione",
    cost:1, qty:2, effect:{ kind:"mitigateSabotage" },
    desc:"Attenua l'ultimo sabotaggio subito: dimezza l'effetto numerico o -1 turno di freeze." },
];

// -------------------------------------------------------------------
// GEAR — 1 slot per Musicista, effetto diverso se su alleato o avversario
// -------------------------------------------------------------------
const GEAR = [
  { id:"mc_spiked_wristband", name:"Spiked Wristband", genre:"metalcore", type:"gear", cost:2, qty:2,
    ownEffect:{ direction:2 }, enemyEffect:{ direction:-2 },
    desc:"Su un tuo Musicista: +2 a una direzione a scelta. Su un avversario: -2 a una direzione a scelta." },
  { id:"gr_ripped_flannel", name:"Ripped Flannel", genre:"grunge", type:"gear", cost:2, qty:2,
    ownEffect:{ central:3, allDirections:-1 }, enemyEffect:{ central:-2 },
    desc:"Su un tuo Musicista: +3 centrale, -1 a tutte le direzioni. Su un avversario: -2 centrale." },
];

// -------------------------------------------------------------------
// CANZONI — pool neutrale condiviso, condizioni su griglia + pool Note
// -------------------------------------------------------------------
const SONGS = [
  { id:"sng_garage_show", name:"Garage Show", hype:3, consumes:false,
    condition:{ kind:"centralAtLeast", min:5 },
    desc:"Almeno un tuo Musicista in griglia con valore centrale ≥ 5." },
  { id:"sng_local_gig", name:"Local Gig", hype:4, consumes:false,
    condition:{ kind:"adjacentPair" },
    desc:"Due tuoi Musicisti ortogonalmente adiacenti (qualsiasi valore)." },
  { id:"sng_club_headline", name:"Club Headline", hype:6, consumes:false,
    condition:{ kind:"adjacentPairSum", min:10 },
    desc:"Due tuoi Musicisti adiacenti con somma dei valori centrali ≥ 10." },
  { id:"sng_festival_slot", name:"Festival Slot", hype:8, consumes:true,
    condition:{ kind:"adjacentPairSumPlusFreeNotes", min:12, freeNotes:3 },
    desc:"Due tuoi Musicisti adiacenti con somma centrale ≥ 12 e almeno 3 Note libere nel tuo pool. Consuma i due Musicisti." },
  { id:"sng_arena_headliner", name:"Arena Headliner", hype:10, consumes:true,
    condition:{ kind:"lineTripleSum", min:18 },
    desc:"Tre tuoi Musicisti consecutivi nella stessa riga (la griglia ha solo 2 righe, quindi la linea è sempre orizzontale) con somma centrale ≥ 18. Consuma i tre Musicisti." },
];

function buildMainDeck(genre) {
  const pool = [...MUSICIANS, ...SPELLS, ...GEAR].filter(c => c.genre === genre);
  const deck = [];
  pool.forEach(card => {
    for (let i = 0; i < card.qty; i++) deck.push(card.id);
  });
  return deck;
}

function buildNoteDeck(genre) {
  return [...NOTE_DECKS[genre]];
}

function findCard(id) {
  return MUSICIANS.find(c => c.id === id) || SPELLS.find(c => c.id === id) || GEAR.find(c => c.id === id);
}
