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
const AISLE_S         = { x: 690, y: 940 };
const AISLE_MID       = { x: 690, y: 540 };
const AISLE_N         = { x: 690, y: 250 };
const AISLE_E_MID     = { x: 880, y: 540 };
const TRIAL_HEAD_W    = { x: 690, y: 220 };
const TRIAL_HEAD_M    = { x: 830, y: 220 };

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
    // Walk in: outside → door → vestibule → first zone
    const firstZone = a.zone_plan[0];
    const target = this._pickZoneTarget(firstZone);
    a.current_zone = firstZone;
    a.setPath([ENTRY_DOOR, ENTRY_VESTIBULE, target], 'browsing');
    a.dwell_remaining = a.zone_dwell_share * (0.7 + Math.random() * 0.6);
    this.activeAgents.push(a);
    this.emit('arrive', a, 'entered store');
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
        // walk to exit
        a.setPath([ENTRY_VESTIBULE, ENTRY_DOOR, ENTRY_OUT], 'departed');
      }
      return;
    }
  }

  _zoneDecision(a) {
    a.zone_idx++;
    const remaining = a.zone_plan.length - a.zone_idx;
    // Continue to next zone with probability based on profile + how many we've done
    const continueProb = a.profile === 'browser' ? 0.40
                      : a.profile === 'quick_trip_male' ? 0.30
                      : a.profile === 'mission_mom' ? 0.75
                      : a.profile === 'young_woman' ? 0.62
                      : 0.80; // family
    if (remaining > 0 && Math.random() < continueProb) {
      const next = a.zone_plan[a.zone_idx];
      a.current_zone = next;
      const target = this._pickZoneTarget(next);
      a.dwell_remaining = a.zone_dwell_share * (0.7 + Math.random() * 0.6);
      a.setPath([target], 'browsing');
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
    // Pick bank by gendered intent (rough: male → 'm', else 'w'; quick_trip_male always 'm')
    const bank = a.profile === 'quick_trip_male' ? 'm' :
                 (a.profile === 'family_weekend' && Math.random() < 0.30) ? 'm' : 'w';
    a._trial_bank = bank;
    const head = bank === 'w' ? TRIAL_HEAD_W : TRIAL_HEAD_M;
    a.queue_wait = 0;
    a._reduced = false;
    a.setPath([AISLE_MID, head], 'trial_queue');
    if (bank === 'w') this.trial_queue_w.push(a);
    else this.trial_queue_m.push(a);
  }

  _routeToBilling(a) {
    a.queue_wait = 0;
    a._reduced = false;
    // Path: current → aisle south → billing queue tail
    const tail = billingQueuePosition(this.billing_queue.length);
    a.setPath([AISLE_S, tail], 'bill_queue');
    this.billing_queue.push(a);
  }

  _walkOut(a, reason) {
    a.exit_reason = reason;
    a.exited_at = this.simMin;
    if (reason === 'no_purchase') this.metrics.walkouts++;
    a.setPath([ENTRY_VESTIBULE, ENTRY_DOOR, ENTRY_OUT], 'walked_out');
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
