/* ───────────────────────────────────────────────────────────────────────────
 * V-Mart Unlimited · simulation engine
 * Loads agents/zones/staff bundles from window globals (see data-bundle.js).
 * Pure logic, no DOM. Render layer reads sim.activeAgents, sim.counters, etc.
 * ─────────────────────────────────────────────────────────────────────────── */

// Persona display colors (kept in sync with profile IDs from data/profiles.json)
const PERSONA_COLOR = {
  mission_mom:    { body:'#D67BAA', skin:'#F4C9A0', hair:'#3A2418', label:'Mission mom' },
  young_woman:    { body:'#A567C9', skin:'#F8D5B5', hair:'#1A1414', label:'Young woman' },
  family_weekend: { body:'#E5A93C', skin:'#E8BD90', hair:'#2A1A10', label:'Family group' },
  quick_trip_male:{ body:'#4F87BD', skin:'#E0B898', hair:'#1A1A1A', label:'Quick-trip male' },
  browser:        { body:'#898989', skin:'#F0CFA8', hair:'#3D2E20', label:'Browser' },
};

// Probability of using trial rooms by profile (from manit-notes/02-shopper-agents.md)
const TRIAL_PROB = {
  mission_mom: 0.55,
  young_woman: 0.78,
  family_weekend: 0.45,
  quick_trip_male: 0.18,
  browser: 0.04,
};

// Anchor coords on the 1800×1140 canvas (matches store/index.html SVG layout)
const ENTRY_OUT       = { x:1100, y:1080 };
const ENTRY_DOOR      = { x:1100, y:1010 };
const ENTRY_VESTIBULE = { x:1100, y: 970 };

// ═══ AISLE NETWORK — agents only walk along these corridors ═══
// Three horizontal aisles (south, middle, north) × five vertical aisles
const AISLE = {
  // South aisle (just inside the entry, runs east-west across south of store)
  S_FW: { x: 250, y: 870 }, // far west
  S_W:  { x: 400, y: 870 },
  S_C:  { x: 670, y: 870 }, // center
  S_E:  { x: 870, y: 870 },
  S_CE: { x:1100, y: 870 }, // entry vertical
  S_K:  { x:1310, y: 870 },
  S_FE: { x:1450, y: 870 },

  // Middle aisle (between row of zones at y=400-700 and y=700-900)
  M_FW: { x: 250, y: 540 },
  M_W:  { x: 400, y: 700 }, // between ethnic and western
  M_C:  { x: 670, y: 540 },
  M_E:  { x: 870, y: 540 },
  M_CE: { x:1100, y: 540 },
  M_K:  { x:1310, y: 540 },
  M_FE: { x:1450, y: 540 },

  // North aisle (between back-nook items and main zones)
  N_FW: { x: 250, y: 210 },
  N_W:  { x: 400, y: 210 },
  N_C:  { x: 670, y: 210 },
  N_E:  { x: 870, y: 210 },
  N_CE: { x:1100, y: 210 },
  N_K:  { x:1310, y: 210 },
  N_FE: { x:1500, y: 210 },
};

// Aisle entry-point per zone — used by Manhattan router as "exit" from aisle
const ZONE_AISLE_ENTRY = {
  power_wall:         'S_C',
  womens_ethnic:      'M_W',
  womens_western:     'S_W',
  womens_fa:          'S_FW',
  mens_casual:        'M_E',
  mens_formal_ethnic: 'M_CE',
  mens_fa:            'S_CE',
  kids:               'M_K',
  infants:            'M_FE',
  billing:            'S_CE',
};

const TRIAL_HEAD_W    = AISLE.N_C;  // trial bank approached from north-center aisle
const TRIAL_HEAD_M    = AISLE.N_E;

// Zone targets — center coord and a few jitter offsets so agents in same zone don't stack
const ZONE_TARGETS = {
  power_wall:        [[770, 945],[820, 945],[880, 945],[940, 945],[710, 945]],
  womens_ethnic:     [[230, 320],[290, 380],[350, 430],[440, 320],[500, 380],[400, 580],[300, 620],[470, 600]],
  womens_western:    [[210, 770],[290, 800],[380, 800],[470, 770],[550, 800]],
  womens_fa:         [[230, 925],[330, 935],[430, 925],[510, 935],[410, 130]], // accessories strip + nightwear nook
  mens_casual:       [[800, 290],[880, 320],[810, 470],[890, 540],[820, 720],[890, 800]],
  mens_formal_ethnic:[[1050, 290],[1130, 320],[1060, 530],[1140, 560],[1100, 620]],
  mens_fa:           [[1040, 770],[1100, 800],[1160, 770],[1080, 830],[1310, 130]],
  kids:              [[1280, 310],[1370, 320],[1500, 310],[1610, 320],[1290, 490],[1500, 490],[1300, 660],[1300, 780],[1490, 145]],
  infants:           [[1490, 660],[1550, 690],[1610, 660],[1530, 740],[1610, 740]],
  billing:           [[1330, 940]], // not used directly — agents go through queue
};

const COUNTER_POS = [
  { x:1090, y:920 },   // C1 always open
  { x:1195, y:920 },   // C2 reactive q≥15
  { x:1300, y:920 },   // C3 reactive q≥20
  { x:1405, y:920 },   // C4 shut
  { x:1510, y:920 },   // C5 shut
  { x:1615, y:920 },   // C6 shut
];

// ═══ APPEARANCE — per-agent visual variety ═══
// Cycled by agent index so each unique agent looks distinct (deterministic)
const SKIN_TONES   = ['#F4C9A0','#E8BD90','#D9A878','#C8956E','#B7855C','#E0AE85','#F0C895'];
const HAIR_COLORS  = ['#1A1410','#2A1810','#3A2418','#5A3A20','#1F1108','#48311E','#241410'];
const HAIR_STYLES  = ['short','med','long','tied'];
const DUPATTA_COLS = ['#FFD966','#E54B6A','#A567C9','#5BA66A','#D04C3E','#3F88C5','#F19A50','#E6BC4C'];
const BAG_COLORS   = ['#3D2418','#5A3A20','#7A4528','#A02038','#241410'];

// Per-persona shirt/outfit palette (kept varied within plausible range)
const SHIRT_PALETTES = {
  mission_mom:    ['#D67BAA','#E54B6A','#C8409A','#A23E78','#DC6890','#B22E5A','#FF98A8','#E89BB8','#C26389','#984A6D'],
  young_woman:    ['#A567C9','#7E4FBD','#9A3FBC','#D67BAA','#5A3D9B','#FF9CDB','#3F88C5','#B96FE2','#7A4A9D','#D89AE0'],
  family_weekend: ['#E5A93C','#D08F2C','#B97824','#E54B6A','#9C7438','#D04C3E','#A56500','#D87138','#B85420','#C97A30'],
  quick_trip_male:['#4F87BD','#3D6A98','#2C4D6E','#5D7FA3','#7A4528','#465B7A','#365070','#2A3F5A','#5C7488','#3A6080'],
  browser:        ['#898989','#A8A8A8','#6E6E6E','#897F75','#A89880','#5A554E','#9F9489','#7A6F65','#8B8378','#6A6055'],
};
const PANTS_PALETTES = {
  mission_mom:    ['#3A2A1E','#1F1611','#2C2C2C','#5A3A20','#7A5538'],
  young_woman:    ['#1F1611','#2D3B8F','#3D2418','#2C2C2C','#475472'],
  family_weekend: ['#3A2A1E','#1F1611','#5A3A20','#2C2C2C','#7A5538'],
  quick_trip_male:['#1F1611','#2C2C2C','#3D2A1A','#475472','#2D3B8F'],
  browser:        ['#3A2A1E','#1F1611','#2C2C2C','#3D2418','#5A3A20'],
};

// Outfit type: ethnic_f / western_f / casual_m / formal_m / mixed
function pickOutfit(profile, rng) {
  if (profile === 'quick_trip_male') return rng() < 0.45 ? 'formal_m' : 'casual_m';
  if (profile === 'mission_mom')     return rng() < 0.78 ? 'ethnic_f' : 'western_f';
  if (profile === 'young_woman')     return rng() < 0.42 ? 'ethnic_f' : 'western_f';
  if (profile === 'family_weekend')  {
    const r = rng();
    if (r < 0.55) return 'ethnic_f';
    if (r < 0.75) return 'casual_m';
    return 'western_f';
  }
  // browser
  return rng() < 0.5 ? 'western_f' : 'casual_m';
}

function pick(arr, rng) { return arr[Math.floor(rng() * arr.length)]; }
function rngFromId(id) {
  // Deterministic per-agent RNG from id like "A0042"
  const n = parseInt(String(id).replace(/\D/g, '')) || 1;
  let t = n * 2654435761 >>> 0;
  return function() {
    t |= 0; t = t + 0x6D2B79F5 | 0;
    let r = Math.imul(t ^ t >>> 15, 1 | t);
    r = r + Math.imul(r ^ r >>> 7, 61 | r) ^ r;
    return ((r ^ r >>> 14) >>> 0) / 4294967296;
  };
}

// Trial cubicle visual positions (matches the SVG store-model fixtures)
// Original SVG: trial bank starts at (530, 110), each cubicle 36px wide, divider after 7th
const TRIAL_CUBICLES = [
  // 7 women's cubicles (W1..W7)
  { x:546, y:158, bank:'w' },
  { x:582, y:158, bank:'w' },
  { x:618, y:158, bank:'w' },
  { x:654, y:158, bank:'w' },
  { x:690, y:158, bank:'w' },
  { x:726, y:158, bank:'w' },
  { x:762, y:158, bank:'w' },
  // 3 men's cubicles (M1..M3)
  { x:810, y:158, bank:'m' },
  { x:846, y:158, bank:'m' },
  { x:876, y:158, bank:'m' },
];

// Billing queue snake — single straight queue feeding counters (BASELINE policy)
// Head of queue is at the first open counter. Queue grows north then wraps east.
function billingQueuePosition(idx) {
  // First row: directly in front of counters, 11 slots
  if (idx < 11) return { x:1080 + idx*30, y:885 };
  // Second row going west-to-east, 11 slots
  if (idx < 22) return { x:1390 - (idx-11)*30, y:858 };
  // Third row
  if (idx < 33) return { x:1080 + (idx-22)*30, y:830 };
  // Fourth row
  if (idx < 44) return { x:1390 - (idx-33)*30, y:803 };
  return { x:1080, y:780 };
}

// Trial queue positions in front of cubicle bank
function trialQueuePosition(idx, bank) {
  if (bank === 'w') {
    const row = Math.floor(idx / 9);
    const col = idx % 9;
    return { x:550 + col*28, y:200 + row*16 };
  }
  // men's
  const row = Math.floor(idx / 3);
  const col = idx % 3;
  return { x:810 + col*28, y:200 + row*16 };
}

// ─────────────────────────── Agent ───────────────────────────
class Agent {
  constructor(data) {
    Object.assign(this, data);
    this.state = 'pending';
    this.x = ENTRY_OUT.x;
    this.y = ENTRY_OUT.y;
    this.targetX = this.x;
    this.targetY = this.y;
    this.path = [];
    this.target_state = null;
    this.zone_plan = [].concat(data.primary_zones, data.secondary_zones);
    this.zone_idx = 0;
    this.zone_dwell_share = data.planned_dwell_minutes / Math.max(1, this.zone_plan.length);
    this.current_zone = null;
    this.dwell_remaining = 0;
    this.basket = [];
    this.basket_value = 0;
    this.queue_wait = 0;
    this._reduced = false;
    this._cubicle = null;
    this._counter = null;
    this.entered_at = null;
    this.exited_at = null;
    this.exit_reason = null;
    this.persona = PERSONA_COLOR[this.profile];
    this.color = this.persona.body;
    this.walk_phase = Math.random() * Math.PI * 2;

    // Per-agent appearance (deterministic by id so the same shopper always looks identical)
    const rng = rngFromId(data.id);
    const outfit = pickOutfit(data.profile, rng);
    this.appearance = {
      outfit,
      shirt:    pick(SHIRT_PALETTES[data.profile], rng),
      pants:    pick(PANTS_PALETTES[data.profile], rng),
      skin:     pick(SKIN_TONES, rng),
      hair:     pick(HAIR_COLORS, rng),
      hairStyle:pick(HAIR_STYLES, rng),
      hasDupatta: outfit === 'ethnic_f' && rng() < 0.65,
      dupattaColor: pick(DUPATTA_COLS, rng),
      hasBag: rng() < (data.profile === 'browser' ? 0.20 : 0.42),
      bagColor: pick(BAG_COLORS, rng),
      hasGlasses: rng() < 0.15,
      facingTimer: 0,
    };
  }

  setPath(points, finalState) {
    this.path = points.slice();
    this.target_state = finalState;
    this.state = 'walking';
    if (this.path.length) {
      const wp = this.path.shift();
      this.targetX = wp.x;
      this.targetY = wp.y;
    } else {
      this.state = finalState;
    }
  }

  moveStep(distancePerMin, dtMin) {
    const dist = distancePerMin * dtMin;
    const dx = this.targetX - this.x;
    const dy = this.targetY - this.y;
    const d = Math.hypot(dx, dy);
    if (d <= dist) {
      this.x = this.targetX;
      this.y = this.targetY;
      if (this.path && this.path.length) {
        const wp = this.path.shift();
        this.targetX = wp.x;
        this.targetY = wp.y;
        return false;
      }
      this.state = this.target_state;
      return true;
    }
    this.x += (dx / d) * dist;
    this.y += (dy / d) * dist;
    this.walk_phase += dtMin * 6;
    return false;
  }
}

// ─────────────────────────── Sim ───────────────────────────
class Sim {
  constructor() {
    const A = window.AGENTS;
    const Z = window.ZONES;
    const SF = window.STAFF;

    this.agents = A.agents.map(a => new Agent(a));
    this.activeAgents = [];
    this.exitedAgents = [];

    this.zonesMeta = {};
    Z.zones.forEach(z => { this.zonesMeta[z.id] = z; });

    // Trial banks
    this.trial_cubicles = TRIAL_CUBICLES.map((c, i) => ({
      ...c, idx:i, busy:null, finishAt:0,
    }));
    this.trial_queue_w = [];
    this.trial_queue_m = [];
    this.trial_attendant_present = false; // baseline: false (T01 is doing floor relief)

    // Billing counters
    this.counters = COUNTER_POS.map((p, i) => ({
      ...p, idx:i, open: i === 0, busy:null, finishAt:0, openedAt: i === 0 ? 0 : null,
    }));
    this.billing_queue = [];

    // Staff (visualisation only — fixed positions, lunch/dinner breaks toggle visibility)
    this.staff = [];
    SF.floor_staff.forEach(s => this.staff.push({ ...s, x:0, y:0, on_floor:true }));
    (SF.billing_staff || []).forEach(s => this.staff.push({ ...s, x:0, y:0, on_floor:true }));
    if (SF.managers) SF.managers.forEach(s => this.staff.push({ ...s, x:0, y:0, on_floor:true }));
    // Place each at their zone
    this._placeStaff();

    this.simMin = 0;
    this.totalMin = 720;

    // Metrics
    this.metrics = {
      footfall: 0,
      revenue: 0,
      memos: 0,
      walkouts: 0,
      abandonments_trial: 0,
      abandonments_bill: 0,
      no_purchase_walkouts: 0,
      trial_waits: [],
      bill_waits: [],
      basket_when_abandoned: [],
      walked_thru_browser: 0,
      // by-zone snapshot
      zone_density: {},
      by_minute: [],
    };
    Object.keys(ZONE_TARGETS).forEach(z => this.metrics.zone_density[z] = 0);

    // Audit log of recent events for UI
    this.events = []; // recent (last 80) events to surface in side panel
  }

  _placeStaff() {
    const zonePos = {
      power_wall: [810, 940],
      womens_ethnic: [310, 460],
      womens_western: [310, 800],
      womens_fa: [380, 925],
      mens_casual: [830, 530],
      mens_formal_ethnic: [1100, 460],
      mens_fa: [1100, 790],
      kids: [1350, 460],
      infants: [1560, 690],
      billing: [1090, 950],
      billing_c1: [1090, 950],
      billing_c2: [1195, 950],
      billing_c3: [1300, 950],
      floor: [690, 540],
    };
    for (const s of this.staff) {
      const p = zonePos[s.zone] || zonePos.floor;
      // Add jitter so multiple staff in same zone don't stack
      s.x = p[0] + (Math.random() - 0.5) * 20;
      s.y = p[1] + (Math.random() - 0.5) * 12;
    }
  }

  parseClock(hhmm) {
    if (!hhmm) return null;
    const [h, m] = hhmm.split(':').map(Number);
    return (h - 10) * 60 + m;
  }

  staffOnBreak(staff) {
    // baseline: lunch ~13:00-15:00 cluster, dinner ~19:00-20:30
    if (!staff.lunch_break || !staff.dinner_break) return false;
    const [ls, le] = staff.lunch_break.split('-').map(t => this.parseClock(t));
    const [ds, de] = staff.dinner_break.split('-').map(t => this.parseClock(t));
    if (this.simMin >= ls && this.simMin < le) return 'lunch';
    if (this.simMin >= ds && this.simMin < de) return 'dinner';
    return false;
  }

  emit(type, agent, detail) {
    this.events.push({
      type,
      simMin: this.simMin,
      agentId: agent ? agent.id : null,
      agentName: agent ? agent.name : null,
      profile: agent ? agent.profile : null,
      detail: detail || '',
    });
    if (this.events.length > 80) this.events.shift();
  }

  tick(dtMin) {
    this.simMin = Math.min(this.totalMin, this.simMin + dtMin);

    // 1. Spawn arriving agents
    for (const a of this.agents) {
      if (a.state === 'pending' && this.simMin >= a.arrival_minute) {
        this._spawn(a);
      }
    }

    // 2. Tick each active agent (state machine)
    for (const a of this.activeAgents) {
      this._tickAgent(a, dtMin);
    }

    // 3. Resolve trial cubicles
    this._tickTrial(dtMin);

    // 4. Resolve billing
    this._tickBilling(dtMin);

    // 5. Remove finished
    const stillActive = [];
    for (const a of this.activeAgents) {
      if (a.state === 'departed' || a.state === 'walked_out') {
        this.exitedAgents.push(a);
      } else {
        stillActive.push(a);
      }
    }
    this.activeAgents = stillActive;

    // 6. Snapshot per-minute metrics every sim-minute crossed
    this._maybeSnapshot();
  }

  _spawn(a) {
    a.entered_at = this.simMin;
    this.metrics.footfall++;
    // Spread entry positions across the 120-px-wide door so agents don't stack
    const doorOffset = (Math.random() - 0.5) * 100; // ±50 px along door
    a.x = ENTRY_OUT.x + doorOffset + (Math.random() - 0.5) * 16;
    a.y = ENTRY_OUT.y + Math.random() * 30;

    const firstZone = a.zone_plan[0];
    const target = this._pickZoneTarget(firstZone);
    a.current_zone = firstZone;

    // Build full Manhattan path through aisles
    const path = this._routeManhattan(
      { x: ENTRY_OUT.x + doorOffset, y: ENTRY_OUT.y },
      firstZone,
      target,
      true /* fromOutside */
    );
    a.setPath(path, 'browsing');
    a.dwell_remaining = a.zone_dwell_share * (0.7 + Math.random() * 0.6);
    this.activeAgents.push(a);
    this.emit('arrive', a, 'entered store');
  }

  // Build a Manhattan path from current pos → zone target, going via aisles.
  // Adds a small jitter to each waypoint so paths through the same corridor
  // don't visually overlap.
  _routeManhattan(fromXY, toZoneId, finalTarget, fromOutside) {
    const path = [];
    // Step 0: if outside, enter through door
    if (fromOutside) {
      path.push({ x: fromXY.x, y: 1015 });          // through doorway
      path.push({ x: fromXY.x, y: 985 });           // vestibule
    }
    // Step 1: pick the agent's "current aisle X" — depending on where they are now
    const fromAisleKey = this._nearestAisleX(fromXY.x);
    const fromAisleX = AISLE['S_' + fromAisleKey].x;
    // Step 2: get to the south aisle Y if not already there
    const onAnyAisle = this._isOnAisleY(fromXY.y);
    if (!onAnyAisle) {
      // come out of zone onto nearest aisle Y
      const aisleY = this._nearestAisleY(fromXY.y);
      path.push({ x: fromXY.x, y: aisleY });
    }
    // Step 3: horizontal travel along the chosen aisle to the target zone's aisle column
    const tgtAisleKey = ZONE_AISLE_ENTRY[toZoneId] || 'S_C';
    const tgtAisle = AISLE[tgtAisleKey];
    // Use south aisle for horizontal travel (the main racetrack)
    path.push({ x: fromAisleX, y: 870 });          // get on south aisle
    // jitter
    const jitter = (Math.random() - 0.5) * 12;
    path.push({ x: tgtAisle.x + jitter, y: 870 }); // travel along south aisle
    // Step 4: vertical travel up the target aisle
    if (tgtAisle.y !== 870) {
      path.push({ x: tgtAisle.x + jitter, y: tgtAisle.y });
    }
    // Step 5: walk to the actual browse target inside the zone
    path.push({ x: finalTarget.x, y: finalTarget.y });
    return path;
  }

  // Routing to TRIAL — agents go via center aisle to north
  _routeToTrialPath(fromXY, bank) {
    const path = [];
    const fromAisleX = AISLE['S_' + this._nearestAisleX(fromXY.x)].x;
    const aisleY = this._nearestAisleY(fromXY.y);
    if (!this._isOnAisleY(fromXY.y)) {
      path.push({ x: fromXY.x, y: aisleY });
    }
    // Travel via south aisle then up center
    path.push({ x: fromAisleX, y: 870 });
    const j = (Math.random() - 0.5) * 12;
    const colX = bank === 'w' ? 670 : 870;
    path.push({ x: colX + j, y: 870 });
    path.push({ x: colX + j, y: 540 });
    path.push({ x: colX + j, y: 210 });
    return path;
  }

  // Routing to BILLING — agents go via south aisle to the queue tail
  _routeToBillingPath(fromXY, tailPos) {
    const path = [];
    const fromAisleX = AISLE['S_' + this._nearestAisleX(fromXY.x)].x;
    if (!this._isOnAisleY(fromXY.y)) {
      path.push({ x: fromXY.x, y: this._nearestAisleY(fromXY.y) });
    }
    path.push({ x: fromAisleX, y: 870 });
    path.push({ x: tailPos.x, y: 870 });
    path.push({ x: tailPos.x, y: tailPos.y });
    return path;
  }

  _routeToExitPath(fromXY) {
    const path = [];
    const fromAisleX = AISLE['S_' + this._nearestAisleX(fromXY.x)].x;
    if (!this._isOnAisleY(fromXY.y)) {
      path.push({ x: fromXY.x, y: this._nearestAisleY(fromXY.y) });
    }
    path.push({ x: fromAisleX, y: 870 });
    path.push({ x: ENTRY_DOOR.x + (Math.random() - 0.5) * 60, y: 870 });
    path.push({ x: ENTRY_DOOR.x, y: 985 });
    path.push({ x: ENTRY_DOOR.x, y: 1015 });
    path.push({ x: ENTRY_OUT.x + (Math.random() - 0.5) * 100, y: ENTRY_OUT.y });
    return path;
  }

  _nearestAisleX(x) {
    // Vertical aisle columns at x = 250, 400, 670, 870, 1100, 1310, 1500
    const cols = [['FW',250],['W',400],['C',670],['E',870],['CE',1100],['K',1310],['FE',1500]];
    let best = cols[0]; let bestD = Math.abs(x - cols[0][1]);
    for (const c of cols) {
      const d = Math.abs(x - c[1]);
      if (d < bestD) { bestD = d; best = c; }
    }
    return best[0];
  }
  _nearestAisleY(y) {
    // Horizontal aisle bands at y=210, 540, 870
    const ys = [210, 540, 870];
    let best = ys[0]; let bestD = Math.abs(y - ys[0]);
    for (const ay of ys) {
      const d = Math.abs(y - ay);
      if (d < bestD) { bestD = d; best = ay; }
    }
    return best;
  }
  _isOnAisleY(y) {
    return Math.abs(y - 210) < 30 || Math.abs(y - 540) < 30 || Math.abs(y - 870) < 30;
  }

  _pickZoneTarget(zoneId) {
    const pool = ZONE_TARGETS[zoneId];
    if (!pool || pool.length === 0) return { x:AISLE_MID.x, y:AISLE_MID.y };
    const p = pool[Math.floor(Math.random() * pool.length)];
    return { x: p[0] + (Math.random() - 0.5) * 18, y: p[1] + (Math.random() - 0.5) * 14 };
  }

  _tickAgent(a, dt) {
    if (a.state === 'walking') {
      a.moveStep(120, dt);
      return;
    }
    if (a.state === 'browsing') {
      a.dwell_remaining -= dt;
      // Basket builds probabilistically
      if (a.basket.length < a.basket_size_target &&
          Math.random() < dt * 0.22 * a.intent_strength) {
        const item = {
          zone: a.current_zone,
          value: 180 + Math.random() * 980,
        };
        a.basket.push(item);
        a.basket_value += item.value;
      }
      if (a.dwell_remaining <= 0) {
        this._zoneDecision(a);
      }
      return;
    }
    if (a.state === 'trial_queue') {
      a.queue_wait += dt;
      if (a.queue_wait > a.queue_tolerance_min.abandon_at) {
        this.emit('abandon_trial', a, `wait ${a.queue_wait.toFixed(1)}m`);
        const q = a._trial_bank === 'w' ? this.trial_queue_w : this.trial_queue_m;
        const i = q.indexOf(a); if (i >= 0) q.splice(i, 1);
        this.metrics.abandonments_trial++;
        this.metrics.basket_when_abandoned.push(a.basket_value);
        this._walkOut(a, 'abandoned_trial');
      } else if (a.queue_wait > a.queue_tolerance_min.reduce_at && !a._reduced && a.basket.length > 1) {
        if (Math.random() < dt * 0.10) {
          const removed = a.basket.pop();
          a.basket_value -= removed.value;
          a._reduced = true;
        }
      } else {
        // While waiting, render position in queue
        const q = a._trial_bank === 'w' ? this.trial_queue_w : this.trial_queue_m;
        const idx = q.indexOf(a);
        if (idx >= 0) {
          const pos = trialQueuePosition(idx, a._trial_bank);
          a.x += (pos.x - a.x) * 0.25;
          a.y += (pos.y - a.y) * 0.25;
        }
      }
      return;
    }
    if (a.state === 'trial') {
      a.dwell_remaining -= dt;
      if (a.dwell_remaining <= 0) {
        if (a._cubicle) a._cubicle.busy = null;
        a._cubicle = null;
        this.metrics.trial_waits.push(a.queue_wait);
        // post-trial decision
        if (Math.random() < 0.58) {
          this._routeToBilling(a);
        } else {
          // drop 1 item
          if (a.basket.length > 0) {
            const removed = a.basket.pop();
            a.basket_value -= removed.value;
          }
          if (a.basket.length > 0) this._routeToBilling(a);
          else { this.emit('tried_no_buy', a, 'dropped all in trial'); this._walkOut(a, 'tried_no_buy'); }
        }
      }
      return;
    }
    if (a.state === 'bill_queue') {
      a.queue_wait += dt;
      const idx = this.billing_queue.indexOf(a);
      if (idx >= 0) {
        const pos = billingQueuePosition(idx);
        a.x += (pos.x - a.x) * 0.30;
        a.y += (pos.y - a.y) * 0.30;
      }
      if (a.queue_wait > a.queue_tolerance_min.abandon_at) {
        this.emit('abandon_bill', a, `wait ${a.queue_wait.toFixed(1)}m`);
        if (idx >= 0) this.billing_queue.splice(idx, 1);
        this.metrics.abandonments_bill++;
        this.metrics.basket_when_abandoned.push(a.basket_value);
        this._walkOut(a, 'abandoned_billing');
      } else if (a.queue_wait > a.queue_tolerance_min.reduce_at && !a._reduced && a.basket.length > 1) {
        if (Math.random() < dt * 0.08) {
          const removed = a.basket.pop();
          a.basket_value -= removed.value;
          a._reduced = true;
        }
      }
      return;
    }
    if (a.state === 'at_counter') {
      a.dwell_remaining -= dt;
      if (a.dwell_remaining <= 0) {
        // Impulse buys near billing (bangles/earrings/makeup/sunglasses) — happens ~28%
        if (Math.random() < 0.28) {
          const it = { zone:'billing', value: 60 + Math.random() * 280 };
          a.basket.push(it);
          a.basket_value += it.value;
        }
        this.metrics.revenue += a.basket_value;
        this.metrics.memos += 1;
        this.metrics.bill_waits.push(a.queue_wait);
        if (a._counter) a._counter.busy = null;
        a._counter = null;
        a.exited_at = this.simMin;
        a.exit_reason = 'purchased';
        this.emit('purchase', a, '₹' + Math.round(a.basket_value));
        a.setPath(this._routeToExitPath({ x:a.x, y:a.y }), 'departed');
      }
      return;
    }
  }

  _zoneDecision(a) {
    a.zone_idx++;
    const remaining = a.zone_plan.length - a.zone_idx;
    const continueProb = a.profile === 'browser' ? 0.40
                      : a.profile === 'quick_trip_male' ? 0.30
                      : a.profile === 'mission_mom' ? 0.75
                      : a.profile === 'young_woman' ? 0.62
                      : 0.80;
    if (remaining > 0 && Math.random() < continueProb) {
      const next = a.zone_plan[a.zone_idx];
      a.current_zone = next;
      const target = this._pickZoneTarget(next);
      a.dwell_remaining = a.zone_dwell_share * (0.7 + Math.random() * 0.6);
      const path = this._routeManhattan({x:a.x, y:a.y}, next, target, false);
      a.setPath(path, 'browsing');
      return;
    }
    // Decide: trial → bill → exit
    if (a.basket.length > 0 && Math.random() < TRIAL_PROB[a.profile]) {
      this._routeToTrial(a);
    } else if (a.basket.length > 0) {
      this._routeToBilling(a);
    } else {
      // walk out without buying
      this.emit('walk_out', a, 'no basket');
      this.metrics.no_purchase_walkouts++;
      this._walkOut(a, 'no_purchase');
    }
  }

  _routeToTrial(a) {
    const bank = a.profile === 'quick_trip_male' ? 'm' :
                 (a.profile === 'family_weekend' && Math.random() < 0.30) ? 'm' : 'w';
    a._trial_bank = bank;
    a.queue_wait = 0;
    a._reduced = false;
    const path = this._routeToTrialPath({ x:a.x, y:a.y }, bank);
    a.setPath(path, 'trial_queue');
    if (bank === 'w') this.trial_queue_w.push(a);
    else this.trial_queue_m.push(a);
  }

  _routeToBilling(a) {
    a.queue_wait = 0;
    a._reduced = false;
    const tail = billingQueuePosition(this.billing_queue.length);
    a.setPath(this._routeToBillingPath({ x:a.x, y:a.y }, tail), 'bill_queue');
    this.billing_queue.push(a);
  }

  _walkOut(a, reason) {
    a.exit_reason = reason;
    a.exited_at = this.simMin;
    if (reason === 'no_purchase') this.metrics.walkouts++;
    a.setPath(this._routeToExitPath({ x:a.x, y:a.y }), 'walked_out');
  }

  _tickTrial(dt) {
    // Cubicle service: assign next from queue
    for (const c of this.trial_cubicles) {
      if (c.busy) {
        // service handled by agent dwell countdown
        if (c.busy.state !== 'trial') c.busy = null;
        continue;
      }
      const q = c.bank === 'w' ? this.trial_queue_w : this.trial_queue_m;
      if (q.length === 0) continue;
      const a = q.shift();
      // baseline: cubicle turnover 4-7 normal, 8-12 at peak
      // peak ≈ 6:00-9:00 PM (sim min 480-660)
      const isPeak = this.simMin >= 480 && this.simMin <= 660;
      const dwell = isPeak ? (8 + Math.random() * 4) : (4 + Math.random() * 3);
      c.busy = a;
      c.finishAt = this.simMin + dwell;
      a.state = 'trial';
      a._cubicle = c;
      a.dwell_remaining = dwell;
      a.x = c.x; a.y = c.y + 18;
      a.targetX = a.x; a.targetY = a.y;
      this.emit('start_trial', a, c.bank.toUpperCase() + (c.idx + 1));
    }
  }

  _tickBilling(dt) {
    // Reactively open counters per baseline policy
    if (this.billing_queue.length >= 15 && !this.counters[1].open) {
      this.counters[1].open = true;
      this.counters[1].openedAt = this.simMin;
      this.emit('counter_open', null, 'C2 opened (queue ≥ 15)');
    }
    if (this.billing_queue.length >= 20 && !this.counters[2].open) {
      this.counters[2].open = true;
      this.counters[2].openedAt = this.simMin;
      this.emit('counter_open', null, 'C3 opened (queue ≥ 20)');
    }

    // Assign queue head to free open counter
    for (const c of this.counters) {
      if (!c.open) continue;
      if (c.busy) {
        if (c.busy.state !== 'at_counter') c.busy = null;
        continue;
      }
      if (this.billing_queue.length === 0) continue;
      const a = this.billing_queue.shift();
      // Service time: 2-3 min on Diwali + per-item adjustment
      const serv = 1.8 + Math.random() * 1.4 + a.basket.length * 0.15;
      c.busy = a;
      c.finishAt = this.simMin + serv;
      a.state = 'at_counter';
      a._counter = c;
      a.dwell_remaining = serv;
      a.x = c.x; a.y = c.y - 18;
      a.targetX = a.x; a.targetY = a.y;
    }
  }

  _maybeSnapshot() {
    // Snapshot every sim-minute boundary
    const m = Math.floor(this.simMin);
    if (this.metrics.by_minute.length > m) return;
    while (this.metrics.by_minute.length <= m) {
      const i = this.metrics.by_minute.length;
      this.metrics.by_minute.push({
        m: i,
        in_store: this.activeAgents.length,
        bill_q: this.billing_queue.length,
        trial_q_w: this.trial_queue_w.length,
        trial_q_m: this.trial_queue_m.length,
        revenue: this.metrics.revenue,
        memos: this.metrics.memos,
        walkouts: this.metrics.walkouts,
      });
    }
    // Update zone density (instantaneous)
    Object.keys(this.metrics.zone_density).forEach(k => this.metrics.zone_density[k] = 0);
    for (const a of this.activeAgents) {
      if (a.current_zone && this.metrics.zone_density.hasOwnProperty(a.current_zone)) {
        this.metrics.zone_density[a.current_zone]++;
      }
    }
  }

  // Convenient KPI computations
  kpis() {
    const memos = this.metrics.memos;
    const walked = this.metrics.walkouts + this.metrics.abandonments_trial + this.metrics.abandonments_bill;
    const conv = memos / Math.max(1, memos + walked);
    const trialW = this.metrics.trial_waits.length
      ? this.metrics.trial_waits.reduce((s,x)=>s+x,0) / this.metrics.trial_waits.length : 0;
    const billW = this.metrics.bill_waits.length
      ? this.metrics.bill_waits.reduce((s,x)=>s+x,0) / this.metrics.bill_waits.length : 0;
    return {
      footfall: this.metrics.footfall,
      revenue: this.metrics.revenue,
      memos,
      conversion: conv,
      avg_ticket: this.metrics.revenue / Math.max(1, memos),
      bill_q: this.billing_queue.length,
      trial_q: this.trial_queue_w.length + this.trial_queue_m.length,
      bill_wait: billW,
      trial_wait: trialW,
      walkouts: walked,
      abandon_pct: walked / Math.max(1, this.metrics.footfall),
    };
  }
}

// Expose to window
window.PERSONA_COLOR = PERSONA_COLOR;
window.ZONE_TARGETS = ZONE_TARGETS;
window.TRIAL_CUBICLES = TRIAL_CUBICLES;
window.COUNTER_POS = COUNTER_POS;
window.Sim = Sim;
window.billingQueuePosition = billingQueuePosition;
window.trialQueuePosition = trialQueuePosition;
