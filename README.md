# Headliner — Prototipo Playtest

Web app statica (HTML/CSS/JS puro, nessuna build) per testare il **loop base** del gioco di
carte descritto nei documenti di design (Fasi 1-7 + Fase X, Roster Generi). Pensata per
partite hotseat a 2 giocatori sullo stesso schermo/dispositivo.

È una **Progressive Web App**: si può aprire da browser o "installare" su telefono/tablet
tramite il manifest incluso, per giocarci anche offline dopo il primo caricamento.

## Come pubblicarla su GitHub Pages

1. Crea un nuovo repository su GitHub (es. `headliner-playtest`), pubblico.
2. Carica tutti i file di questa cartella nella root del repo:
   `index.html`, `style.css`, `cards.js`, `engine.js`, `ui.js`, `manifest.json`, `sw.js`,
   la cartella `icons/` (con `icon-192.png` e `icon-512.png`).
   - Più semplice da web: sulla pagina del repo, "Add file → Upload files", trascina tutto,
     poi "Commit changes".
   - Oppure da terminale:
     ```
     git init
     git add .
     git commit -m "Prototipo playtest Headliner"
     git branch -M main
     git remote add origin https://github.com/<tuo-utente>/headliner-playtest.git
     git push -u origin main
     ```
3. Nel repo: **Settings → Pages → Build and deployment → Source: Deploy from a branch**,
   branch `main`, cartella `/ (root)`. Salva.
4. Dopo un minuto la app è live su `https://<tuo-utente>.github.io/headliner-playtest/`.
5. Da telefono, apri quel link e usa "Aggiungi a schermata Home" per installarla come app.

Nessun altro servizio è richiesto: non c'è backend, tutto lo stato vive in memoria nel
browser (una partita per volta, si perde se ricarichi la pagina — è voluto, per ora, dato
che è solo per playtest rapidi).

## Cosa implementa (collegato ai documenti di progetto)

- **Griglia condivisa 2×4** con regole di piazzamento direzionali stile Triple Triad
  (Fase X): verso l'avversario serve un valore maggiore, verso l'alleato un valore
  minore o uguale, solo adiacenze ortogonali.
- **Risorsa Note**: mazzo-note da 12 carte per giocatore, pesca 2/turno, pool permanente,
  tap generico per pagare i costi (Fase 2 + Fase 4/7 — il prototipo usa **costo singolo**,
  come suggerito in Fase 7 punto 5, quindi il colore delle Note è solo estetico/flavor in
  questa versione, non ancora un requisito di pagamento).
- **Tassonomia carte** (Fase 3): Musicisti (5 valori), Spell (Supporto/Sabotaggio/Reazione),
  Gear (1 slot per Musicista, effetto diverso su alleato/avversario), Canzoni (condizioni
  su griglia + pool Note, alcune consumano i componenti).
- **Hype come asse unico** (Fase 5): Canzoni come fonte primaria, Spell Supporto come
  bonus minore (+1/+2).
- **Interazione e Reazioni** (Fase 6): le Spell di Sabotaggio che colpiscono l'avversario
  aprono una finestra di reazione — l'avversario può annullare (Reazione tipo "counter")
  o attenuare (dimezza l'effetto numerico o -1 turno di freeze) prima che l'effetto si
  applichi.
- **Condizione di vittoria e fail-safe** (Fase 1): la partita finisce quando un giocatore
  sblocca X Canzoni (2/3/4, scelto a inizio partita) o quando un giocatore deve pescare dal
  mazzo principale vuoto; vince chi ha più Hype totale.
- **Due generi giocabili**: Metalcore e Grunge (i due generi confermati per il primo
  playtest nel documento Roster Generi), ciascuno con un mini-mazzo di ~20 carte + mazzo
  Note da 12.

## Cosa NON è ancora implementato (scelte di scope per l'MVP)

Tutti questi punti sono già segnalati come aperti/da bilanciare nei documenti di fase — qui
sotto solo lo stato di implementazione nel prototipo:

- **Costo doppio (generico + colore)**: Fase 4/7 lo rimanda esplicitamente a dopo la
  validazione del loop base con costo singolo. Non implementato.
- **Freeze "colorato" per pagare costi forti**: conseguenza del punto sopra, non serve
  finché il costo resta generico. Il freeze *offensivo* (sabotaggio) invece è implementato.
  Idea #7 (Cambio di Tonalità) non implementata.
- **Gear piazzato su slot vuoto prima del Musicista** (Idea #8, doc idee random): il
  prototipo equipaggia Gear solo su Musicisti già in campo.
- **Rimozione dalla griglia, board-wipe per parità, auto-rimozione** (Idee #8/#9/#10/#11):
  non implementate — l'unico modo per un Musicista di lasciare la griglia è una Canzone che
  consuma componenti.
- **Vincoli di sequenza tra Canzoni, bonus di sequenza tra Spell tematiche** (Fase 5,
  Idea #12): non implementati in questo MVP.
- **Carte multi-genere**: non incluse nel mini-mazzo del primo playtest.
- **Frontman**: non è ancora una carta giocabile con effetto numerico proprio (Fase 7
  punto 2 è ancora aperto nei documenti); qui l'identità di genere determina solo il
  mazzo Note e il mazzo principale.
- **Solo 4 generi mancanti** (Heavy Metal, Death Metal, Hard Rock, Power Metal) rispetto
  al roster completo a 6: il playtest parte con i due confermati (Metalcore + Grunge).

Numeri di carte, costi, valori di griglia e Hype in `cards.js` sono **bozze di
bilanciamento per il playtest**, non decisioni finali — modificali liberamente editando
quel file (è un unico posto, ben commentato, con tutte le carte).

## Come modificare le carte

Tutto il catalogo carte vive in `cards.js`: `MUSICIANS`, `SPELLS`, `GEAR`, `SONGS`,
`NOTE_DECKS`. Cambiare un valore lì si riflette subito nel gioco al refresh della pagina,
nessuna build necessaria. La logica delle regole (piazzamento, costi, condizioni, Hype,
reazioni) è in `engine.js`; il rendering e gli eventi click sono in `ui.js`.

## Struttura dei file

```
index.html      punto di ingresso
style.css       tema visivo
cards.js        catalogo carte (dati, editabile senza toccare la logica)
engine.js       motore di gioco (stato, regole, risoluzione azioni)
ui.js           rendering DOM ed eventi
manifest.json   manifest PWA
sw.js           service worker minimale (cache offline)
icons/          icone PWA (192px, 512px)
```
