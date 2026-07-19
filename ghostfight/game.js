/* GhostFight — seance battle prototype.
   All tunable numbers live in balance.json. */

/* ============================== balance data ============================== */

let B = null; // loaded balance data

const GHOST_META = {
  rue:    { id: 'rue',    name: 'Rue',    role: 'Vengeance', sprite: '👻',  kw: 'Grudge sharpens every strike.' },
  sybil:  { id: 'sybil',  name: 'Sybil',  role: 'Fortune',   sprite: '🔮',  kw: 'Prophecies are sealed fate.' },
  poppy:  { id: 'poppy',  name: 'Poppy',  role: 'Sleep',     sprite: '🌙',  kw: 'Dreams bank into raw tempo.' },
  tallow: { id: 'tallow', name: 'Tallow', role: 'Sacrifice', sprite: '🕯️', kw: 'Burn her cards for fierce power.' },
};

function passiveText(id) {
  const g = B.globals;
  switch (id) {
    case 'rue':    return `Her attacks deal +1 per Grudge. Bench: +${g.grudgePerBenchHit} Grudge whenever a teammate takes unblocked damage.`;
    case 'sybil':  return 'Bench: prophecies keep ticking and fire even while benched.';
    case 'poppy':  return `Bench: +1 Dream each turn she naps (max ${g.dreamsMax}). Her cards spend Dreams for tempo.`;
    case 'tallow': return `Burned cards are gone for the battle only. Bench: her flame steadies — heals ${g.tallowBenchHeal} each turn.`;
  }
}

const card = id => B.cards[id];
const V = id => B.cards[id].v;
const cardText = id => card(id).text.replace(/\{(\w+)\}/g, (_, k) => V(id)[k]);
const deckArray = id => Object.entries(B.ghosts[id].deck).flatMap(([c, n]) => Array(n).fill(c));
const poolArray = id => Object.entries(B.ghosts[id].pool).flatMap(([c, n]) => Array(n).fill(c));

/* ============================== run state ============================== */

let S = null;   // battle state
let RUN = null; // persists across battles until defeat or run completion

function startRun() {
  RUN = {
    id: Math.random().toString(36).slice(2, 8),
    decks: Object.fromEntries(Object.keys(GHOST_META).map(id => [id, deckArray(id)])),
    hp: Object.fromEntries(Object.keys(GHOST_META).map(id => [id, B.ghosts[id].hp])),
    party: [],
    stage: 0,
    wins: 0,
  };
  S = null;
  render();
}

function pickStarter(id) {
  RUN.party = [id];
  newBattle(B.ladder[0]);
}

function chooseRecruit(id) {
  RUN.party.push(id);
  const g = GHOST_META[id];
  sendLog('recruit', { offered: S.recruitOffered, chose: id });
  S.recruit = null;
  log(`${g.sprite} ${g.name} answers the talisman and joins your seance!`, 'good');
  render();
}

function nextBattle() {
  // partial mend between seances (tunable; fainted ghosts re-form at the mend amount)
  for (const g of S.ghosts) {
    RUN.hp[g.id] = Math.min(g.maxHp, Math.max(0, g.hp) + B.globals.betweenBattleHeal);
  }
  RUN.stage++;
  newBattle(B.ladder[RUN.stage]);
}

/* ---------- card rewards: one random participant's deck grows ---------- */

function rollReward() {
  const ghostId = RUN.party[Math.floor(Math.random() * RUN.party.length)];
  const pool = poolArray(ghostId);
  const uniqueIds = new Set(pool);
  const cards = [];
  let guard = 0;
  while (cards.length < Math.min(3, uniqueIds.size) && guard++ < 60) {
    const c = pool[Math.floor(Math.random() * pool.length)];
    if (!cards.includes(c)) cards.push(c);
  }
  return { ghostId, cards };
}

function chooseReward(i) {
  RUN.decks[S.reward.ghostId].push(S.reward.cards[i]);
  sendLog('reward', { ghost: S.reward.ghostId, offered: S.reward.cards, chose: S.reward.cards[i] });
  S.reward = null;
  setupRecruit();
  render();
}

function skipReward() {
  sendLog('reward', { ghost: S.reward.ghostId, offered: S.reward.cards, chose: null });
  S.reward = null;
  setupRecruit();
  render();
}

function setupRecruit() {
  if (!B.recruitAfter.includes(RUN.stage)) return;
  const remaining = Object.keys(GHOST_META).filter(id => !RUN.party.includes(id));
  if (!remaining.length) return;
  const offers = [];
  for (let i = 0; i < 2 && remaining.length; i++) {
    offers.push(remaining.splice(Math.floor(Math.random() * remaining.length), 1)[0]);
  }
  S.recruit = offers;
  S.recruitOffered = offers.slice();
}

/* ============================== playthrough logging ============================== */

function sendLog(type, data) {
  try {
    fetch('/api/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ts: new Date().toISOString(), runId: RUN.id, type, ...data }),
    }).catch(() => {});
  } catch { /* offline / file:// — logging is best-effort */ }
}

function logBattleEnd(result) {
  sendLog('battle', {
    stage: RUN.stage,
    enemy: S.enemy.id,
    result,
    turns: S.turn,
    switches: S.stats.switches,
    cardsPlayed: S.stats.cardsPlayed,
    damageDealt: S.stats.damageDealt,
    damageTaken: S.stats.damageTaken,
    party: S.ghosts.map(g => ({
      id: g.id, hpStart: S.stats.hpStart[g.id], hpEnd: g.hp, deckSize: RUN.decks[g.id].length,
    })),
  });
  if (result === 'lost' || RUN.stage === B.ladder.length - 1) {
    sendLog('run', {
      result: result === 'lost' ? 'lost' : 'won',
      stagesCleared: RUN.wins,
      party: RUN.party,
      finalDecks: Object.fromEntries(RUN.party.map(id => [id, RUN.decks[id].slice()])),
    });
  }
}

/* ============================== battle setup ============================== */

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function newBattle(enemyId) {
  const def = B.enemies[enemyId];
  S = {
    ghosts: RUN.party.map(id => ({
      ...GHOST_META[id], maxHp: B.ghosts[id].hp, hp: RUN.hp[id], passive: passiveText(id),
      draw: shuffle(RUN.decks[id]), discard: [], burned: [],
      hushed: false, hushedNow: false, faintLogged: false,
    })),
    active: 0,
    hand: [],
    energy: B.globals.energyPerTurn,
    block: 0,
    thorns: 0,
    grudge: 0,
    dreams: 0,
    switched: false,
    prophecies: [],
    enemy: {
      id: enemyId, name: def.name, sprite: def.sprite, desc: def.desc, boss: !!def.boss,
      hp: def.hp, maxHp: def.hp, block: 0, strength: 0,
      pattern: def.pattern, patternIdx: 0, queue: [], revealed: 1,
    },
    turn: 0,
    over: null,
    reward: null,
    recruit: null,
    stats: {
      cardsPlayed: {}, switches: 0, damageDealt: 0, damageTaken: 0,
      hpStart: Object.fromEntries(RUN.party.map(id => [id, RUN.hp[id]])),
    },
    log: [],
  };
  const firstAlive = S.ghosts.findIndex(g => g.hp > 0);
  S.active = firstAlive >= 0 ? firstAlive : 0;
  refillQueue();
  log(`${def.boss ? 'The air goes cold. ' : ''}${def.name} materializes! ${def.sprite}`);
  startPlayerTurn();
}

function refillQueue() {
  const e = S.enemy;
  while (e.queue.length < 4) {
    e.queue.push(e.pattern[e.patternIdx % e.pattern.length]);
    e.patternIdx++;
  }
}

/* ============================== helpers ============================== */

function log(msg, cls) { S.log.push({ msg, cls }); }
const activeGhost = () => S.ghosts[S.active];
const benchGhosts = () => S.ghosts.filter((g, i) => i !== S.active);

function drawCards(ghost, n) {
  for (let i = 0; i < n; i++) {
    if (ghost.draw.length === 0) {
      if (ghost.discard.length === 0) break;
      ghost.draw = shuffle(ghost.discard);
      ghost.discard = [];
    }
    S.hand.push(ghost.draw.pop());
  }
}

function discardHand() {
  const g = activeGhost();
  g.discard.push(...S.hand);
  S.hand = [];
}

function dealToEnemy(amount, source) {
  const e = S.enemy;
  const blocked = Math.min(e.block, amount);
  e.block -= blocked;
  const dmg = amount - blocked;
  e.hp = Math.max(0, e.hp - dmg);
  S.stats.damageDealt += dmg;
  log(`${source} hits ${e.name} for ${dmg}${blocked ? ` (${blocked} blocked)` : ''}.`);
  if (e.hp <= 0 && !S.over) {
    S.over = 'won';
    RUN.wins++;
    S.reward = rollReward();
    log(`${e.name} is banished!`, 'good');
    logBattleEnd('won');
  }
}

/* Damage one of our ghosts. Only the active ghost benefits from Block. */
function damageGhost(g, amount, sourceName, useBlock) {
  let dmg = amount;
  let note = '';
  if (useBlock) {
    const blocked = Math.min(S.block, amount);
    S.block -= blocked;
    dmg = amount - blocked;
    if (blocked) note = ` (${blocked} blocked)`;
  }
  g.hp = Math.max(0, g.hp - dmg);
  S.stats.damageTaken += dmg;
  log(`${sourceName} hits ${g.name} for ${dmg}${note}.`, dmg ? 'bad' : undefined);
  if (dmg > 0) {
    const rue = S.ghosts.find(x => x.id === 'rue');
    if (rue && rue.hp > 0 && g.id !== 'rue') {
      S.grudge += B.globals.grudgePerBenchHit;
      log(`Rue seethes. Grudge is now ${S.grudge}.`);
    }
  }
}

function healGhost(g, amount, source) {
  const healed = Math.min(amount, g.maxHp - g.hp);
  if (healed > 0) log(`${source} mends ${g.name} for ${healed}.`, 'good');
  g.hp += healed;
}

function addProphecy(name, turns, effect) {
  S.prophecies.push({ name, turns, effect });
  log(`A prophecy is sealed: ${name} in ${turns} turn${turns > 1 ? 's' : ''}.`);
}

function gainDreams(n) {
  S.dreams = Math.min(B.globals.dreamsMax, S.dreams + n);
}

/* ============================== card effects ============================== */

const EFFECTS = {
  lashOut:      () => dealToEnemy(V('lashOut').dmg + S.grudge, card('lashOut').name),
  shroud:       () => { S.block += V('shroud').block; log(`${activeGhost().name} gains ${V('shroud').block} Block.`); },
  spite:        () => { S.thorns += V('spite').thorns; log(`${activeGhost().name} bristles with ${V('spite').thorns} Thorns.`); },
  haunt:        () => { dealToEnemy(V('haunt').dmg + S.grudge, card('haunt').name); S.grudge += V('haunt').grudge; log(`Grudge is now ${S.grudge}.`); },
  grimPatience: () => { S.block += V('grimPatience').block; S.grudge += V('grimPatience').grudge; log(`${activeGhost().name} gains ${V('grimPatience').block} Block. Grudge is now ${S.grudge}.`); },
  simmer:       () => { S.grudge += V('simmer').grudge; log(`Grudge is now ${S.grudge}.`); },
  retribution:  () => {
    const dmg = S.grudge * V('retribution').mult;
    log(`Rue unleashes ${S.grudge} Grudge!`);
    S.grudge = 0;
    dealToEnemy(dmg, card('retribution').name);
  },

  portent:      () => addProphecy(`Deal ${V('portent').dmg}`, V('portent').turns, () => dealToEnemy(V('portent').dmg, 'The Portent')),
  doomsay:      () => addProphecy(`Deal ${V('doomsay').dmg}`, V('doomsay').turns, () => dealToEnemy(V('doomsay').dmg, 'The Doomsaying')),
  inevitability:() => addProphecy(`Deal ${V('inevitability').dmg}`, V('inevitability').turns, () => dealToEnemy(V('inevitability').dmg, 'The Inevitable')),
  mendFate:     () => addProphecy(`Heal active ${V('mendFate').heal}`, V('mendFate').turns, () => healGhost(activeGhost(), V('mendFate').heal, 'Fate')),
  glimpse:      () => { S.enemy.revealed = V('glimpse').reveal; log('The next intents shimmer into view.'); },
  twistOfFate:  () => {
    const q = S.enemy.queue;
    [q[0], q[1]] = [q[1], q[0]];
    log(`Fate twists! ${S.enemy.name}'s next two intents are swapped.`);
  },
  veil:         () => { S.block += V('veil').block; log(`${activeGhost().name} gains ${V('veil').block} Block.`); },
  secondSight:  () => { drawCards(activeGhost(), V('secondSight').draw); log(`${activeGhost().name} draws ${V('secondSight').draw}.`); },

  lullaby:      () => {
    S.enemy.queue.unshift({ kind: 'doze', name: 'Dozing 💤' });
    log(`${S.enemy.name} grows heavy-lidded — its next action is delayed.`);
  },
  dreamEater:   () => dealToEnemy(V('dreamEater').dmg + S.dreams, card('dreamEater').name),
  wake:         () => {
    S.energy += S.dreams;
    log(`Poppy wakes! ${S.dreams} Dream${S.dreams === 1 ? '' : 's'} become energy.`);
    S.dreams = 0;
  },
  nightcap:     () => { S.block += V('nightcap').block; gainDreams(V('nightcap').dreams); log(`Poppy gains ${V('nightcap').block} Block. Dreams: ${S.dreams}.`); },
  snooze:       () => { gainDreams(V('snooze').dreams); log(`Poppy dozes off. Dreams: ${S.dreams}.`); },
  sandSprinkle: () => dealToEnemy(V('sandSprinkle').dmg, card('sandSprinkle').name),
  pillowFort:   () => { S.block += V('pillowFort').block; log(`Poppy gains ${V('pillowFort').block} Block.`); },
  sweetDream:   () => { drawCards(activeGhost(), V('sweetDream').draw); gainDreams(V('sweetDream').dreams); log(`Poppy draws ${V('sweetDream').draw}. Dreams: ${S.dreams}.`); },

  kindle:       () => dealToEnemy(V('kindle').dmg, card('kindle').name),
  flare:        () => dealToEnemy(V('flare').dmg, card('flare').name),
  waxShield:    () => { S.block += V('waxShield').block; log(`Tallow gains ${V('waxShield').block} Block.`); },
  melt:         () => { S.energy += V('melt').energy; log(`Tallow melts a little. +${V('melt').energy} energy.`); },
  votive:       () => healGhost(activeGhost(), V('votive').heal, card('votive').name),
  flicker:      () => dealToEnemy(V('flicker').dmg, card('flicker').name),
  drip:         () => { S.block += V('drip').block; log(`Tallow gains ${V('drip').block} Block.`); },
  rekindle:     () => {
    const g = activeGhost();
    log(`Rekindle returns ${g.burned.length} burned card${g.burned.length === 1 ? '' : 's'}.`);
    g.discard.push(...g.burned);
    g.burned = [];
  },
};

/* ============================== turn flow ============================== */

function startPlayerTurn() {
  S.turn++;
  S.energy = B.globals.energyPerTurn;
  S.block = 0;
  S.thorns = 0;
  S.switched = false;
  S.enemy.revealed = 1;
  log(`— Turn ${S.turn} —`, 'turn-mark');

  // hush lands on the turn after it's inflicted
  S.ghosts.forEach(g => { g.hushedNow = g.hushed; g.hushed = false; });
  if (activeGhost().hushedNow) log(`${activeGhost().name} is Hushed — their cards are sealed this turn!`, 'bad');

  // bench passives
  for (const g of benchGhosts()) {
    if (g.hp <= 0) continue;
    if (g.id === 'poppy' && S.dreams < B.globals.dreamsMax) {
      gainDreams(1);
      log(`Poppy naps on the bench. Dreams: ${S.dreams}.`);
    }
    if (g.id === 'tallow') healGhost(g, B.globals.tallowBenchHeal, "Tallow's steady flame");
  }

  // prophecies tick at the start of the turn and always fire at 0
  const remaining = [];
  for (const p of S.prophecies) {
    p.turns--;
    if (p.turns <= 0) {
      log(`⏳ Prophecy fulfilled: ${p.name}!`);
      p.effect();
    } else {
      remaining.push(p);
    }
  }
  S.prophecies = remaining;

  if (!S.over) drawCards(activeGhost(), B.globals.handSize - S.hand.length);
  render();
}

function playCard(handIdx) {
  if (S.over || activeGhost().hushedNow) return;
  const id = S.hand[handIdx];
  if (card(id).cost > S.energy) return;
  S.energy -= card(id).cost;
  S.hand.splice(handIdx, 1);
  S.stats.cardsPlayed[id] = (S.stats.cardsPlayed[id] || 0) + 1;
  if (card(id).burn) {
    activeGhost().burned.push(id);
    log(`${card(id).name} burns away.`);
  } else {
    activeGhost().discard.push(id);
  }
  EFFECTS[id]();
  render();
}

function doSwitch(idx) {
  if (S.over || S.switched || S.energy < B.globals.switchCost) return;
  const target = S.ghosts[idx];
  if (!target || idx === S.active || target.hp <= 0) return;
  S.energy -= B.globals.switchCost;
  S.switched = true;
  S.stats.switches++;
  discardHand();
  const prev = activeGhost().name;
  S.active = idx;
  drawCards(activeGhost(), B.globals.handSize);
  log(`${prev} drifts back — ${activeGhost().name} takes the field!`);
  render();
}

function endTurn() {
  if (S.over) return;
  discardHand();
  S.ghosts.forEach(g => { g.hushedNow = false; });
  enemyAct();
  if (S.over) { render(); return; }
  startPlayerTurn();
}

function enemyAct() {
  const e = S.enemy;
  e.block = 0; // enemy block protects through the player's turn, clears when it acts
  const action = e.queue.shift();
  refillQueue();
  switch (action.kind) {
    case 'attack':
      damageGhost(activeGhost(), action.amount + e.strength, `${e.name}'s ${action.name}`, true);
      if (S.thorns > 0 && !S.over) dealToEnemy(S.thorns, `${activeGhost().name}'s thorns`);
      break;
    case 'aoe':
      log(`${e.name}'s ${action.name} rings through the whole party!`, 'bad');
      for (const g of S.ghosts) {
        if (g.hp <= 0) continue;
        damageGhost(g, action.amount + e.strength, action.name, g === activeGhost());
        if (S.over) break;
      }
      break;
    case 'hush':
      activeGhost().hushed = true;
      log(`${e.name} hushes ${activeGhost().name} — their cards will be sealed next turn!`, 'bad');
      break;
    case 'heal': {
      const healed = Math.min(action.amount, e.maxHp - e.hp);
      e.hp += healed;
      log(`${e.name} sobs and recovers ${healed} HP.`);
      if (action.buff) {
        e.strength += action.buff;
        log(`Its grief deepens! Strength is now ${e.strength}.`, 'bad');
      }
      break;
    }
    case 'buff':
      e.strength += action.amount;
      log(`${e.name} swells with power! Strength is now ${e.strength}.`, 'bad');
      break;
    case 'block':
      e.block += action.amount;
      log(`${e.name} guards for ${action.amount} Block.`);
      break;
    case 'windup':
      log(`${e.name} winds up for something enormous…`, 'bad');
      break;
    case 'doze':
      log(`${e.name} dozes, lost in the lullaby. It does nothing.`, 'good');
      break;
  }

  // faints & forced switch
  for (const g of S.ghosts) {
    if (g.hp <= 0 && !g.faintLogged) {
      g.faintLogged = true;
      log(`${g.name} faints!`, 'bad');
    }
  }
  if (activeGhost().hp <= 0) {
    const next = S.ghosts.findIndex(g => g.hp > 0);
    if (next >= 0) {
      S.active = next;
      log(`${activeGhost().name} is forced onto the field.`);
    } else if (!S.over) {
      S.over = 'lost';
      log('Your seance is broken. All ghosts are down.', 'bad');
      logBattleEnd('lost');
    }
  }
}

/* ============================== render ============================== */
/* Storybook Grimoire twilight theme — screens follow the Claude Design
   storybooks: battle (2b), starter draw (3a), card reward (3b), road (3c). */

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];

let logOpen = false;
function toggleLog() { logOpen = !logOpen; render(); }

function banishedEyebrow(name) {
  return `⁂ THE ${name.replace(/^The\s+/i, '').toUpperCase()} IS BANISHED ⁂`;
}

function starsHtml() {
  return `
    <div class="star" style="top:64px; left:44px; font-size:13px;">✦</div>
    <div class="star" style="top:104px; right:60px; font-size:10px; animation-duration:3.1s;">✦</div>
    <div class="star" style="top:150px; left:70px; font-size:8px; animation-duration:2.2s;">✦</div>
    <div class="star" style="top:196px; right:84px; font-size:8px; animation-duration:3.4s;">✦</div>`;
}

function constellationsHtml() {
  return `
    <svg class="constellations" viewBox="0 0 390 340" width="390" height="340" aria-hidden="true">
      <g stroke="#37305a" stroke-width="1" fill="none" opacity="0.85">
        <polyline points="52,150 96,120 138,150 120,196 150,232"></polyline>
        <polyline points="150,232 214,214"></polyline>
        <polyline points="300,86 332,120 322,166 286,158 300,86"></polyline>
        <polyline points="286,158 250,190"></polyline>
        <polyline points="70,64 110,52 96,96"></polyline>
      </g>
      <g fill="#453c6e">
        <circle cx="52" cy="150" r="2.2"></circle><circle cx="96" cy="120" r="2.6"></circle>
        <circle cx="138" cy="150" r="2.2"></circle><circle cx="120" cy="196" r="2"></circle>
        <circle cx="150" cy="232" r="2.4"></circle><circle cx="214" cy="214" r="2"></circle>
        <circle cx="300" cy="86" r="2.6"></circle><circle cx="332" cy="120" r="2.2"></circle>
        <circle cx="322" cy="166" r="2"></circle><circle cx="286" cy="158" r="2.4"></circle>
        <circle cx="250" cy="190" r="1.8"></circle><circle cx="70" cy="64" r="2"></circle>
        <circle cx="110" cy="52" r="2.2"></circle><circle cx="96" cy="96" r="1.8"></circle>
      </g>
    </svg>`;
}

function intentText(action, strength) {
  switch (action.kind) {
    case 'attack': return `${action.name} — deals ${action.amount + strength}`;
    case 'aoe':    return `${action.name} — ${action.amount + strength} to ALL ghosts, bench included`;
    case 'hush':   return `${action.name} — seals the active ghost's cards next turn`;
    case 'heal':   return `${action.name} — heals ${action.amount}${action.buff ? `, +${action.buff} Strength` : ''}`;
    case 'buff':   return `${action.name} — +${action.amount} Strength`;
    case 'block':  return `${action.name} — blocks ${action.amount}`;
    case 'windup': return `${action.name} — winding up for something enormous`;
    case 'doze':   return `${action.name} — lost in the lullaby, does nothing`;
  }
}

function intentPillHtml(action, strength, small) {
  let kind = 'calm', ic = '❔', val = '', sub = '';
  switch (action.kind) {
    case 'attack': kind = 'hit';  ic = '⚔️'; val = action.amount + strength; break;
    case 'aoe':    kind = 'hit';  ic = '🔔'; val = action.amount + strength; sub = 'ALL'; break;
    case 'hush':   kind = 'calm'; ic = '🤫'; sub = 'HUSH'; break;
    case 'heal':   kind = 'mend'; ic = '💚'; val = action.amount; break;
    case 'buff':   kind = 'hit';  ic = '💢'; val = '+' + action.amount; sub = 'STR'; break;
    case 'block':  kind = 'calm'; ic = '🛡️'; val = action.amount; break;
    case 'windup': kind = 'calm'; ic = '🌀'; sub = 'WINDS UP'; break;
    case 'doze':   kind = 'mend'; ic = '💤'; sub = 'DOZES'; break;
  }
  return `
    <div class="intent-pill ${kind}${small ? ' small' : ''}" title="${intentText(action, strength)}">
      <span class="ic">${ic}</span>
      ${val !== '' ? `<span class="val">${val}</span>` : ''}
      ${sub ? `<span class="sub">${sub}</span>` : ''}
    </div>`;
}

function ghostChips(g, idx) {
  const isActive = idx === S.active;
  const c = [];
  if (isActive && S.block)  c.push(`<span class="chip block" title="Block — absorbs damage this turn">🛡️ ${S.block}</span>`);
  if (isActive && S.thorns) c.push(`<span class="chip thorns" title="Thorns — melee attackers take ${S.thorns} back">✸ ${S.thorns}</span>`);
  if (isActive && g.hushedNow) c.push(`<span class="chip hush" title="Hushed — cards sealed this turn">🤫</span>`);
  if (g.id === 'rue' && S.grudge)    c.push(`<span class="chip grudge" title="Grudge — adds +${S.grudge} to Rue's attacks">✦ ${S.grudge}</span>`);
  if (g.id === 'poppy' && S.dreams)  c.push(`<span class="chip dream" title="Dreams — Poppy banks these into energy">☾ ${S.dreams}</span>`);
  if (g.id === 'tallow' && g.burned.length) c.push(`<span class="chip burn" title="Burned cards — gone until the battle ends">🔥 ${g.burned.length}</span>`);
  return c.join('');
}

function ghostSlot(g, idx, pos) {
  const isActive = idx === S.active;
  const dead = g.hp <= 0;
  const canSwitch = !isActive && !dead && !S.over && !S.switched && S.energy >= B.globals.switchCost;
  const hint = !isActive && !dead
    ? `<div><span class="switch-hint ${canSwitch ? '' : 'off'}">${S.switched ? 'switched' : `tap · ${B.globals.switchCost}⚡`}</span></div>`
    : dead ? '<div><span class="switch-hint off">fainted</span></div>' : '';
  const pct = Math.max(0, (g.hp / g.maxHp) * 100);
  return `
    <div class="gslot pos-${pos} ${dead ? 'fainted' : ''} ${canSwitch ? 'bench-btn' : ''}"
         ${canSwitch ? `onclick="doSwitch(${idx})" title="Switch ${g.name} in — costs ${B.globals.switchCost} energy, discards your hand"` : ''}>
      <div class="gportrait-wrap">
        <div class="gportrait">${g.sprite}</div>
        <div class="chips">${ghostChips(g, idx)}</div>
      </div>
      <div class="gname">${g.name}</div>
      <div class="hpbar ghost"><div class="fill" style="width:${pct}%"></div></div>
      <div class="hp-num">${g.hp} / ${g.maxHp}</div>
      ${hint}
    </div>`;
}

function handHtml() {
  const n = S.hand.length;
  if (!n) return '<span class="empty-note">No cards in hand.</span>';
  const hushed = activeGhost().hushedNow;
  const step = n > 1 ? Math.min(11, 48 / (n - 1)) : 0;
  const overlap = n > 1 ? Math.max(18, Math.ceil((86 * n - 350) / (2 * (n - 1)))) : 0;
  return S.hand.map((id, i) => {
    const ang = (i - (n - 1) / 2) * step;
    const ty = Math.pow(ang / 11, 2) * 4;
    const playable = card(id).cost <= S.energy && !S.over && !hushed;
    return `
      <div class="ccard ${playable ? '' : 'dead'}" data-idx="${i}"
           style="margin:0 ${-overlap}px; transform:rotate(${ang.toFixed(1)}deg) translateY(${ty.toFixed(1)}px); z-index:${i + 1};">
        <div class="top"><span class="cost">${card(id).cost}</span><span class="pip">${card(id).burn ? '🔥' : '✦'}</span></div>
        <div class="art">${activeGhost().sprite}</div>
        <div class="nm">${card(id).name}</div>
        <div class="tx">${cardText(id)}</div>
      </div>`;
  }).join('');
}

function battleHtml() {
  const e = S.enemy;
  const g = activeGhost();
  const epct = Math.max(0, (e.hp / e.maxHp) * 100);
  const intents = e.queue.slice(0, Math.max(1, e.revealed))
    .map((a, i) => intentPillHtml(a, e.strength, i > 0)).join('');
  const enemyChips = [];
  if (e.block)    enemyChips.push(`<span class="chip block" title="Block">🛡️ ${e.block}</span>`);
  if (e.strength) enemyChips.push(`<span class="chip str" title="Strength — added to every attack">💢 ${e.strength}</span>`);
  const bench = S.ghosts.map((gh, i) => ({ gh, i })).filter(x => x.i !== S.active);
  const slots = [
    ghostSlot(g, S.active, 'active'),
    bench[0] ? ghostSlot(bench[0].gh, bench[0].i, 'left') : '',
    bench[1] ? ghostSlot(bench[1].gh, bench[1].i, 'right') : '',
  ].join('');
  const omens = S.prophecies.map(p => `
    <div class="omen" title="Sealed prophecy — ${p.name} in ${p.turns} turn${p.turns > 1 ? 's' : ''}. It fires no matter what.">
      <span class="glyph">☾</span><span class="what">${p.name}</span><span class="count">${p.turns}</span>
    </div>`).join('');

  return `
    <div class="screen">
      <div class="sky"></div>
      ${constellationsHtml()}
      ${starsHtml()}
      <div class="hud">
        <span>SEANCE ${ROMAN[RUN.stage]} OF ${ROMAN[B.ladder.length - 1]}</span>
        <span style="display:flex; gap:8px; align-items:center;">
          <button class="hud-btn" onclick="toggleLog()" title="Seance log">📜 T${S.turn}</button>
        </span>
      </div>
      <div class="omens">${omens}</div>
      <div class="field">
        <div class="circle"><div class="glow"></div><div class="rim"></div><div class="rim2"></div></div>
        <div class="enemy-slot">
          <div class="ename">${e.name}</div>
          <div class="eportrait-wrap">
            <div class="eportrait">${e.sprite}</div>
            <div class="intent-stack">${intents}</div>
          </div>
          <div class="hpbar enemy"><div class="fill" style="width:${epct}%"></div><span class="num">♥ ${e.hp} / ${e.maxHp}</span></div>
          <div class="enemy-chips">${enemyChips.join('')}</div>
        </div>
        ${slots}
      </div>
      <div class="controls">
        <div class="energy-orb ${S.energy ? '' : 'empty'}" title="Energy · ${S.energy} of ${B.globals.energyPerTurn}">${S.energy}</div>
        <button class="btn-gold" onclick="endTurn()" ${S.over ? 'disabled' : ''}>End Turn</button>
      </div>
      <div class="piles-row">
        <div class="pile" title="${g.name}'s draw pile"><div class="mini-cards"><i></i><i></i></div><span class="cnt">${g.draw.length}</span><span class="lbl">DRAW</span></div>
        ${g.burned.length ? `<div class="pile" title="Burned — gone until the battle ends"><span class="cnt">🔥 ${g.burned.length}</span><span class="lbl">BURNED</span></div>` : ''}
        <div class="pile" title="${g.name}'s discard pile"><span class="lbl">DISCARD</span><span class="cnt">${g.discard.length}</span><div class="mini-card-single"></div></div>
      </div>
      ${g.hushedNow ? '<div class="hush-banner">🤫 Hushed — cards are sealed this turn. Switching is the escape.</div>' : ''}
      <div class="hand">${handHtml()}</div>
    </div>`;
}

/* ============================== hand gestures ============================== */
/* Drag horizontally along the fan to browse cards at readable size; swipe the
   selected card up past the threshold and release to cast it. Tap = preview. */

const CAST_AT = -80;   // upward drag (px) that arms a cast on release
const LOCK_AT = -30;   // beyond this rise, horizontal drift no longer changes selection
const GESTURE = { pid: null, idx: -1, el: null, centers: [], startY: 0, dy: 0, armed: false, appRect: null };

function canPlayIdx(i) {
  const id = S.hand[i];
  return id !== undefined && !S.over && !activeGhost().hushedNow && card(id).cost <= S.energy;
}

function nearestIdx(x) {
  let best = 0, bd = Infinity;
  GESTURE.centers.forEach((c, i) => {
    const d = Math.abs(c - x);
    if (d < bd) { bd = d; best = i; }
  });
  return best;
}

function positionSelected() {
  const el = GESTURE.el;
  if (!el) return;
  // keep the enlarged card fully on screen at the fan's edges
  const cx = GESTURE.centers[GESTURE.idx];
  const half = 74;
  const target = Math.min(Math.max(cx, GESTURE.appRect.left + half), GESTURE.appRect.right - half);
  const tx = target - cx;
  const ty = -104 + Math.max(-150, Math.min(30, GESTURE.dy));
  el.style.zIndex = 100;
  el.style.transform = `translate(${tx.toFixed(1)}px, ${ty.toFixed(1)}px) scale(1.6)`;
  GESTURE.armed = GESTURE.dy < CAST_AT;
  el.classList.toggle('armed', GESTURE.armed && canPlayIdx(GESTURE.idx));
}

function selectCard(i) {
  if (i === GESTURE.idx) return;
  deselectCard();
  const el = document.querySelectorAll('.hand .ccard')[i];
  if (!el) return;
  if (el.dataset.baseT === undefined) {
    el.dataset.baseT = el.style.transform;
    el.dataset.baseZ = el.style.zIndex;
  }
  GESTURE.idx = i;
  GESTURE.el = el;
  el.classList.add('selected');
  positionSelected();
}

function deselectCard() {
  const el = GESTURE.el;
  if (el) {
    el.classList.remove('selected', 'armed');
    el.style.transform = el.dataset.baseT;
    el.style.zIndex = el.dataset.baseZ;
  }
  GESTURE.idx = -1;
  GESTURE.el = null;
  GESTURE.armed = false;
}

function handDown(e) {
  if (!S || S.over || logOpen || !e.isPrimary) return;
  if (!e.target.closest('.hand')) return;
  const els = Array.from(document.querySelectorAll('.hand .ccard'));
  if (!els.length) return;
  e.preventDefault();
  GESTURE.pid = e.pointerId;
  GESTURE.startY = e.clientY;
  GESTURE.dy = 0;
  GESTURE.appRect = document.getElementById('app').getBoundingClientRect();
  GESTURE.centers = els.map(el => {
    const r = el.getBoundingClientRect();
    return r.left + r.width / 2;
  });
  selectCard(nearestIdx(e.clientX));
}

function handMove(e) {
  if (e.pointerId !== GESTURE.pid || GESTURE.idx < 0) return;
  e.preventDefault();
  GESTURE.dy = e.clientY - GESTURE.startY;
  if (GESTURE.dy > LOCK_AT) {
    const i = nearestIdx(e.clientX);
    if (i !== GESTURE.idx) selectCard(i);
  }
  positionSelected();
}

function handUp(e) {
  if (e.pointerId !== GESTURE.pid) return;
  GESTURE.pid = null;
  const i = GESTURE.idx;
  if (i >= 0 && GESTURE.dy < CAST_AT) {
    if (canPlayIdx(i)) {
      GESTURE.idx = -1; GESTURE.el = null; GESTURE.armed = false;
      playCard(i); // re-renders the hand
      return;
    }
    // can't afford it (or hushed): flash and snap back
    const el = GESTURE.el;
    el.classList.add('denied');
    setTimeout(() => el.classList.remove('denied'), 300);
  }
  deselectCard();
}

document.addEventListener('pointerdown', handDown, { passive: false });
document.addEventListener('pointermove', handMove, { passive: false });
document.addEventListener('pointerup', handUp);
document.addEventListener('pointercancel', handUp);

/* ---------- full-screen flow pages ---------- */

function ghostCardHtml(id, onclick) {
  const g = GHOST_META[id];
  return `
    <div class="tarot" onclick="${onclick}" title="${passiveText(id)}">
      <div class="art">${g.sprite}</div>
      <div class="ttl">${g.name}</div>
      <div class="who">${g.role}</div>
      <div class="kw">${g.kw}</div>
    </div>`;
}

function starterHtml() {
  const cards = Object.keys(GHOST_META).map(id => ghostCardHtml(id, `pickStarter('${id}')`)).join('');
  return `
    <div class="screen">
      <div class="sky"></div>${starsHtml()}
      <div class="hud"><span>GHOSTFIGHT</span></div>
      <div class="page-head">
        <div class="eyebrow">⁂ THE SEANCE BEGINS ALONE ⁂</div>
        <div class="ptitle">Draw Your First Ghost</div>
        <div class="psub">One joins you now. Talismans call the others along the road. Ghosts mend only ${B.globals.betweenBattleHeal} between seances.</div>
        <div class="rule"></div>
      </div>
      <div class="tarot-grid">${cards}</div>
    </div>`;
}

function rewardHtml() {
  const owner = GHOST_META[S.reward.ghostId];
  const n = S.reward.cards.length;
  const cards = S.reward.cards.map((id, i) => {
    const ang = (i - (n - 1) / 2) * 8;
    const ty = Math.abs(i - (n - 1) / 2) * 12;
    return `
      <div class="rcard" style="transform:rotate(${ang}deg) translateY(${ty}px);" onclick="chooseReward(${i})">
        <div class="top"><span class="cost">${card(id).cost}</span><span class="pip">${card(id).burn ? '🔥' : '✦'}</span></div>
        <div class="art">${owner.sprite}</div>
        <div class="nm">${card(id).name}</div>
        <div class="tx">${cardText(id)}</div>
      </div>`;
  }).join('');
  return `
    <div class="screen deep">
      ${starsHtml()}
      <div class="page-body">
        <div class="spirit-ring">${owner.sprite}</div>
        <div class="page-head" style="padding-top:16px;">
          <div class="eyebrow gold">${banishedEyebrow(S.enemy.name)}</div>
          <div class="ptitle">A Restless Memory</div>
          <div class="psub">A spirit offers <span class="gold-name">${owner.name}</span> one card. Take it into their deck — or take nothing.</div>
        </div>
        <div class="reward-fan">${cards}</div>
        <div class="page-spacer"></div>
        <div class="page-foot"><button class="btn-quiet" onclick="skipReward()">Take Nothing</button></div>
      </div>
    </div>`;
}

function recruitHtml() {
  const cards = S.recruit.map(id => ghostCardHtml(id, `chooseRecruit('${id}')`)).join('');
  return `
    <div class="screen">
      <div class="sky"></div>${starsHtml()}
      <div class="page-head" style="padding-top:34px;">
        <div class="eyebrow">⁂ A TALISMAN HUMS ⁂</div>
        <div class="ptitle">Another Ghost Answers</div>
        <div class="psub">A second voice can join your seance. Choose who takes the talisman.</div>
        <div class="rule"></div>
      </div>
      <div class="tarot-grid duo">${cards}</div>
    </div>`;
}

function roadHtml() {
  const nodes = B.ladder.map((id, i) => {
    const def = B.enemies[id];
    let ring, op, state, stc;
    if (i <= RUN.stage) {
      ring = 'var(--green-deep)'; op = .5; stc = 'var(--green)';
      state = B.recruitAfter.includes(i) ? 'CLEARED · TALISMAN' : 'BANISHED';
    } else if (i === RUN.stage + 1) {
      ring = 'var(--gold)'; op = 1; stc = 'var(--gold)';
      state = def.boss ? 'NEXT · THE BOSS' : 'NEXT';
    } else {
      ring = 'var(--ring)'; op = .9; stc = 'var(--dim)'; state = 'AWAITS';
    }
    return `
      <div class="road-node">
        <div class="frame" style="box-shadow:inset 0 0 0 2.5px ${ring}; opacity:${op};">${def.sprite}</div>
        <div style="opacity:${op};">
          <div style="display:flex; align-items:baseline; gap:7px;">
            <span class="r-num">${ROMAN[i]}</span><span class="r-name">${def.name}</span>
          </div>
          <div class="r-state" style="color:${stc};">${state}</div>
          <div class="r-note">${def.desc}</div>
        </div>
      </div>`;
  }).join('');
  return `
    <div class="screen">
      <div class="sky"></div>${starsHtml()}
      <div class="hud">
        <span>SEANCE ${ROMAN[RUN.stage]} CLEARED</span>
        <button class="hud-btn" onclick="toggleLog()" title="Seance log">📜</button>
      </div>
      <div class="page-head" style="padding-top:6px;">
        <div class="eyebrow green">${banishedEyebrow(S.enemy.name)}</div>
        <div class="ptitle">The Road Ahead</div>
        <div class="psub">Each ghost mends <b>${B.globals.betweenBattleHeal}</b> between seances.</div>
      </div>
      <div class="road"><div class="rail"></div>${nodes}</div>
      <div class="page-spacer"></div>
      <button class="btn-gold big" onclick="nextBattle()">Continue the Seance</button>
    </div>`;
}

function victoryHtml() {
  const party = RUN.party.map(id => `
    <div class="member"><div class="frame">${GHOST_META[id].sprite}</div><div class="nm">${GHOST_META[id].name}</div></div>`).join('');
  return `
    <div class="screen deep">
      ${starsHtml()}
      <div class="page-body">
        <div class="spirit-ring">🔔</div>
        <div class="page-head" style="padding-top:16px;">
          <div class="eyebrow gold">${banishedEyebrow(S.enemy.name)}</div>
          <div class="ptitle">The Seance Is Complete</div>
          <div class="psub">Your troupe carried the light through all ${B.ladder.length} seances.</div>
        </div>
        <div class="party-row">${party}</div>
        <div class="page-spacer"></div>
        <div class="page-foot"><button class="btn-gold" onclick="startRun()">Begin a New Seance</button></div>
      </div>
    </div>`;
}

function defeatHtml() {
  return `
    <div class="screen deep">
      ${starsHtml()}
      <div class="page-body">
        <div class="spirit-ring" style="box-shadow:inset 0 0 0 3px var(--pink), 0 0 34px #e0607f33;">${S.enemy.sprite}</div>
        <div class="page-head" style="padding-top:16px;">
          <div class="eyebrow">⁂ THE CANDLES GUTTER OUT ⁂</div>
          <div class="ptitle">The Seance Is Broken</div>
          <div class="psub">All your ghosts are down at seance ${ROMAN[RUN.stage]}. They return to their starter decks.</div>
        </div>
        <div class="page-spacer"></div>
        <div class="page-foot"><button class="btn-gold" onclick="startRun()">Begin a New Seance</button></div>
      </div>
    </div>`;
}

function logSheetHtml() {
  if (!S) return '';
  const lines = S.log.slice(-120).map(l => `<div class="${l.cls || ''}">${l.msg}</div>`).join('');
  return `
    <div class="logsheet" onclick="if (event.target === this) toggleLog()">
      <div class="sheet">
        <h3>SEANCE LOG</h3>
        <div class="log-lines" id="log-lines">${lines}</div>
      </div>
    </div>`;
}

function render() {
  const app = document.getElementById('app');
  let html;
  if (!S) {
    html = starterHtml();
  } else if (S.over === 'lost') {
    html = defeatHtml();
  } else if (S.over === 'won') {
    if (S.reward) html = rewardHtml();
    else if (S.recruit) html = recruitHtml();
    else if (RUN.stage === B.ladder.length - 1) html = victoryHtml();
    else html = roadHtml();
  } else {
    html = battleHtml();
  }
  app.innerHTML = html + (logOpen ? logSheetHtml() : '');
  const ll = document.getElementById('log-lines');
  if (ll) ll.scrollTop = ll.scrollHeight;
}

/* ============================== boot ============================== */

async function boot() {
  try {
    B = await (await fetch('/api/balance')).json();
  } catch {
    try {
      B = await (await fetch('balance.json')).json();
    } catch {
      B = await (await fetch('balance.defaults.json')).json();
    }
  }
  startRun();
}
boot();
