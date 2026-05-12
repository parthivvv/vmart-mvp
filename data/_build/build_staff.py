"""
Builds data/staff.json — 18 V-Mart store staff for Diwali Saturday.

Roster (corrected to match Manit's spec, not the brief's inconsistent numbers):
  10 floor staff   (zone-assigned, movable)
   1 trial-room    (role exists; in baseline does floor relief, not at trial)
   4 billing       (1 fixed at counter 1; 3 reactive when queue grows)
   1 security
   1 assistant manager
   1 store manager
  ─────
  18 total. The three fixed roles (security, asst, mgr) don't change between
  baseline and optimized. The 15 movable ones (10 floor + 1 trial + 4 billing)
  get re-allocated in the optimized policy.

Baseline behavior:
- Trial-room attendant role exists but is NOT stationed at trial rooms;
  treated as floor-relief / floating.
- Billing: 1 staff at counter 1 the whole day (B01 morning, B02 evening
  handoff at 14:00). 3 reactive staff (B03, B04) sit on standby and only
  open counters 2/3 when manager calls them in (queue >= ~15).

Deterministic via SEED.
"""

import json
import random
import sys
import time
from pathlib import Path


# Seed: CLI arg if provided, else fresh per run. Saved into staff.json.
if len(sys.argv) > 1:
    SEED = int(sys.argv[1])
else:
    SEED = int(time.time() * 1000) % 1_000_000
print(f"build_staff.py · using seed {SEED}")

OUT_PATH = Path(__file__).resolve().parent.parent / "staff.json"


# ---------------------------------------------------------------------------
# Name pools — Kannadiga-heavy (brief: Kannada-speaking staff)
# ---------------------------------------------------------------------------

NAMES_F_KANNADIGA = ["Lakshmi", "Sushma", "Geetha", "Pavithra", "Sahana", "Bhavana", "Manjula", "Triveni", "Anitha", "Roopa", "Asha", "Shruthi"]
NAMES_F_OTHER = ["Priya", "Divya", "Saranya", "Lavanya", "Aisha", "Aarti", "Sunita", "Neha"]
NAMES_M_KANNADIGA = ["Manjunath", "Suresh", "Naveen", "Prakash", "Lokesh", "Vinay", "Mahesh", "Nagaraj", "Basavaraj", "Pradeep", "Harish", "Ramesh", "Gowtham", "Karthik", "Shashank"]
NAMES_M_OTHER = ["Arun", "Senthil", "Imran", "Mohammed", "Kiran", "Rahul", "Amit", "Murali"]

LAST_KANNADIGA = ["Gowda", "Shetty", "Hegde", "Murthy", "Naidu", "Rao", "Bhat", "Kumar", "Bhandari", "Holla", "Acharya", "Pai", "Hiremath"]
LAST_TAMIL = ["Subramaniam", "Krishnan", "Pillai", "Murugan"]
LAST_TELUGU = ["Reddy", "Naidu", "Goud"]
LAST_HINDI = ["Sharma", "Kumar", "Singh", "Verma", "Yadav"]
LAST_OTHER = ["Khan", "D'Souza", "Hussain"]

NEIGHBORHOODS = [
    "Vidyaranyapura", "Yelahanka", "KR Puram", "Hennur", "RT Nagar",
    "Banashankari", "Rajajinagar", "Vijayanagar", "Marathahalli",
    "Mahadevapura", "Hosur Road", "Bommanahalli", "Kammanahalli",
    "Magadi Road", "Peenya", "Yeshwantpur", "Banaswadi",
    "Hoodi", "Whitefield Junction",
]


# ---------------------------------------------------------------------------
# Floor staff allocation — 10 staff in baseline
# (women's ethnic gets 2 since it's the revenue engine; everyone else gets 1)
# ---------------------------------------------------------------------------

FLOOR_ALLOCATIONS = [
    ("power_wall", 1),
    ("womens_ethnic", 2),
    ("womens_western", 1),
    ("womens_fa", 1),
    ("mens_casual", 1),
    ("mens_formal_ethnic", 1),
    ("mens_fa", 1),
    ("kids", 1),
    ("infants", 1),
]  # 10 total

ZONE_BASE_SKILLS = {
    "power_wall": ["visual_merchandising", "customer_routing"],
    "womens_ethnic": ["womens_ethnic_expert", "size_advisor"],
    "womens_western": ["western_styling", "size_advisor"],
    "womens_fa": ["impulse_upsell", "queue_management"],
    "mens_casual": ["size_advisor"],
    "mens_formal_ethnic": ["mens_ethnic_expert"],
    "mens_fa": ["footwear_advisor"],
    "kids": ["kids_friendly"],
    "infants": ["kids_friendly", "replenishment_capable"],
    "floating": ["queue_management", "replenishment_capable"],
}


# ---------------------------------------------------------------------------
# Break clustering — 10 floor staff + 1 trial-room (acts as floor relief)
# Total bodies on floor in baseline: 11
# Brief targets: 5 off at lunch peak, 4 off at dinner peak
# ---------------------------------------------------------------------------

# 10 floor staff, lunch distribution (peak 5 off at 13:30-14:00)
LUNCH_DIST_FLOOR = (
    ["13:00-13:30"] * 2 +
    ["13:30-14:00"] * 5 +   # peak: 5 off
    ["14:00-14:30"] * 2 +
    ["14:30-15:00"] * 1
)
# Dinner (peak 4 off at 19:30-20:00)
DINNER_DIST_FLOOR = (
    ["19:00-19:30"] * 3 +
    ["19:30-20:00"] * 4 +   # peak
    ["20:00-20:30"] * 3
)


# ---------------------------------------------------------------------------
# Billing — 4 staff. Baseline: 1 fixed on counter 1 (B01 morning, B02 takes
# over at 14:00). B03 + B04 are reactive — only deployed when manager calls.
# ---------------------------------------------------------------------------

BILLING_SHIFTS = [
    # (id_suffix, label,    shift_hours,   baseline_role,    counters_if_deployed)
    ("01", "morning_anchor", "10:00-18:00", "active",   [1]),
    ("02", "evening_anchor", "14:00-22:00", "active",   [1]),  # overlap 14-18, then solo
    ("03", "reactive_1",     "12:00-22:00", "standby",  [2]),  # opens counter 2 when called
    ("04", "reactive_2",     "14:00-22:00", "standby",  [3]),  # opens counter 3 when called
]


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def pick_name(gender, kannadiga_bias=0.55):
    is_kannadiga = random.random() < kannadiga_bias
    if gender == "F":
        first_pool = NAMES_F_KANNADIGA if is_kannadiga else NAMES_F_OTHER
    else:
        first_pool = NAMES_M_KANNADIGA if is_kannadiga else NAMES_M_OTHER
    first = random.choice(first_pool)
    if is_kannadiga:
        ethnicity = "kannadiga"
        last = random.choice(LAST_KANNADIGA)
    else:
        ethnicity = random.choice(["tamil", "telugu", "hindi", "other"])
        last_pool = {
            "tamil": LAST_TAMIL,
            "telugu": LAST_TELUGU,
            "hindi": LAST_HINDI,
            "other": LAST_OTHER,
        }[ethnicity]
        last = random.choice(last_pool)
    return f"{first} {last}", ethnicity


def pick_languages(ethnicity, exp_years):
    langs = ["kannada"]
    if ethnicity in ("hindi", "other") or random.random() < 0.55:
        langs.append("hindi")
    if exp_years >= 3 and random.random() < 0.45:
        langs.append("english")
    if ethnicity == "tamil" or random.random() < 0.20:
        langs.append("tamil")
    if ethnicity == "telugu" or random.random() < 0.18:
        langs.append("telugu")
    return langs


def service_speed(exp_years):
    if exp_years <= 1:
        return round(random.uniform(0.85, 0.95), 2)
    elif exp_years <= 4:
        return round(random.uniform(0.98, 1.10), 2)
    else:
        return round(random.uniform(1.12, 1.28), 2)


def zone_gender_bias(zone):
    if "womens" in zone or zone in ("infants", "kids"):
        return ("F", "M", 0.75)
    if "mens" in zone:
        return ("F", "M", 0.30)
    return ("F", "M", 0.55)


# ---------------------------------------------------------------------------
# Builders
# ---------------------------------------------------------------------------

def build_floor_staff():
    staff = []
    fid = 1
    lunch_pool = LUNCH_DIST_FLOOR[:]
    dinner_pool = DINNER_DIST_FLOOR[:]
    random.shuffle(lunch_pool)
    random.shuffle(dinner_pool)
    idx = 0
    for zone, count in FLOOR_ALLOCATIONS:
        for _ in range(count):
            g_f, g_m, f_weight = zone_gender_bias(zone)
            gender = random.choices([g_f, g_m], weights=[f_weight, 1 - f_weight])[0]
            name, ethnicity = pick_name(gender)
            age = random.randint(20, 45)
            exp_years = max(1, min(age - 19, random.randint(1, 9)))
            neighborhood = random.choice(NEIGHBORHOODS)
            langs = pick_languages(ethnicity, exp_years)
            skills = ZONE_BASE_SKILLS[zone][:]
            billing_xt = random.random() < 0.5
            if billing_xt:
                skills.append("billing_cross_trained")
            if exp_years >= 5 and random.random() < 0.6:
                extra = random.choice(["replenishment_capable", "queue_management", "size_advisor", "impulse_upsell"])
                if extra not in skills:
                    skills.append(extra)
            backstory = (
                f"{name} ({age}, from {neighborhood}). "
                f"{exp_years} year{'s' if exp_years != 1 else ''} at V-Mart. "
                f"Speaks {', '.join(langs)}. "
                f"Assigned to {zone.replace('_', ' ')} for the day."
            )
            staff.append({
                "id": f"F{fid:02d}",
                "name": name,
                "age": age,
                "gender": gender,
                "ethnicity": ethnicity,
                "neighborhood": neighborhood,
                "role": "floor",
                "zone": zone,
                "experience_years": exp_years,
                "languages": langs,
                "skills": skills,
                "billing_cross_trained": billing_xt,
                "shift": "10:00-22:00",
                "lunch_break": lunch_pool[idx],
                "dinner_break": dinner_pool[idx],
                "service_speed_multiplier": service_speed(exp_years),
                "backstory": backstory,
            })
            idx += 1
            fid += 1
    return staff


def build_trial_room_staff():
    """1 staff. Role designation = trial-room attendant. In baseline they're
    *not* at trial rooms (per brief: 'no staff stationed at the trial room
    entrance'); they act as floor relief instead."""
    gender = random.choices(["F", "M"], weights=[0.75, 0.25])[0]  # women's bank focus
    name, ethnicity = pick_name(gender)
    age = random.randint(23, 38)
    exp_years = max(2, min(age - 19, random.randint(2, 7)))
    neighborhood = random.choice(NEIGHBORHOODS)
    langs = pick_languages(ethnicity, exp_years)
    skills = ["trial_room_attendant", "queue_management", "size_advisor"]
    if random.random() < 0.5:
        skills.append("billing_cross_trained")
    backstory = (
        f"{name} ({age}, from {neighborhood}). "
        f"{exp_years} years at V-Mart. Trial-room attendant by designation, "
        f"but in baseline policy isn't stationed at the trial rooms — drifts "
        f"between zones as floor relief. Lever 3 in optimized policy puts them "
        f"actually at the women's trial bank with item-count enforcement."
    )
    return {
        "id": "T01",
        "name": name,
        "age": age,
        "gender": gender,
        "ethnicity": ethnicity,
        "neighborhood": neighborhood,
        "role": "trial_room",
        "default_role": "trial_room_attendant",
        "baseline_assignment": "floor_relief",  # not at trial rooms in baseline
        "experience_years": exp_years,
        "languages": langs,
        "skills": skills,
        "shift": "10:00-22:00",
        "lunch_break": random.choice(["13:00-13:30", "14:00-14:30", "14:30-15:00"]),
        "dinner_break": random.choice(["19:00-19:30", "20:00-20:30"]),
        "service_speed_multiplier": service_speed(exp_years),
        "backstory": backstory,
    }


def build_billing_staff():
    staff = []
    for suffix, label, shift_hours, baseline_role, counters in BILLING_SHIFTS:
        gender = random.choices(["F", "M"], weights=[0.55, 0.45])[0]
        name, ethnicity = pick_name(gender, kannadiga_bias=0.55)
        age = random.randint(22, 40)
        exp_years = max(1, min(age - 19, random.randint(1, 6)))
        neighborhood = random.choice(NEIGHBORHOODS)
        langs = pick_languages(ethnicity, exp_years)
        base = random.uniform(2.4, 3.0)
        throughput = round(max(1.8, base - exp_years * 0.08), 2)
        skills = ["billing_proficient"]
        if exp_years >= 3:
            skills.append("upsell_at_counter")
        backstory = (
            f"{name} ({age}, {neighborhood}). "
            f"{exp_years} year{'s' if exp_years != 1 else ''} on billing at V-Mart. "
            f"{label.replace('_', ' ').capitalize()} role ({shift_hours}). "
            f"Speaks {', '.join(langs)}. "
            + (
                f"Anchors counter {counters[0]} in baseline."
                if baseline_role == "active"
                else f"On standby in baseline; deployed to counter {counters[0]} only when store manager opens it (queue ~15)."
            )
        )
        staff.append({
            "id": f"B{suffix}",
            "name": name,
            "age": age,
            "gender": gender,
            "ethnicity": ethnicity,
            "neighborhood": neighborhood,
            "role": "billing",
            "shift": shift_hours,
            "shift_label": label,
            "baseline_role": baseline_role,    # "active" or "standby"
            "deployed_counter": counters[0] if baseline_role == "active" else None,
            "standby_counter": counters[0] if baseline_role == "standby" else None,
            "experience_years": exp_years,
            "languages": langs,
            "skills": skills,
            "throughput_min_per_memo": throughput,
            "backstory": backstory,
        })
    return staff


def build_managers():
    return [
        {
            "id": "M01",
            "name": "Ravi Murthy",
            "age": 48,
            "gender": "M",
            "ethnicity": "kannadiga",
            "neighborhood": "Basavanagudi",
            "role": "store_manager",
            "experience_years": 14,
            "languages": ["kannada", "hindi", "english", "tamil"],
            "skills": ["floor_management", "billing_oversight", "vendor_negotiation", "staff_management"],
            "shift": "10:00-22:00",
            "fixed_in_optimized": True,
            "decision_responsibilities": [
                "counter_opening",
                "staff_escalations",
                "stockout_response",
                "cash_reconciliation",
            ],
            "baseline_decision_pattern": "Walks floor every 25-30 min. Opens additional billing counter when queue reaches ~15 shoppers (5-10 min staffing delay). Stationed near billing 17:00-21:00.",
            "baseline_schedule": {
                "10:00-11:00": "open store, confirm positions",
                "11:00-13:00": "ad-hoc issues (customer complaints, stockout queries)",
                "13:00-15:00": "monitor lunch rotation",
                "15:00-17:00": "walk floor, eyeball queues",
                "17:00-21:00": "stationed near billing, opens counters reactively",
                "21:00-22:00": "closing routine, cash reconciliation",
            },
            "decision_quality_score": 0.78,
            "backstory": "Ravi Murthy (48, Basavanagudi). 14 years at V-Mart, last 4 as store manager at this branch. Started as floor staff at the Mysuru store in 2010. Runs the store on intuition built over a decade of festive seasons — good, but not optimal.",
        },
        {
            "id": "M02",
            "name": "Deepa Hegde",
            "age": 33,
            "gender": "F",
            "ethnicity": "kannadiga",
            "neighborhood": "Malleswaram",
            "role": "assistant_manager",
            "experience_years": 7,
            "languages": ["kannada", "hindi", "english"],
            "skills": ["floor_management", "trial_room_oversight", "complaint_resolution"],
            "shift": "10:00-22:00",
            "fixed_in_optimized": True,
            "decision_responsibilities": [
                "trial_room_disputes",
                "ad_hoc_floor_issues",
                "lunch_rotation_oversight",
            ],
            "baseline_decision_pattern": "Roves the floor. Handles customer escalations. Manages lunch break rotation 13:00-15:00.",
            "decision_quality_score": 0.72,
            "backstory": "Deepa Hegde (33, Malleswaram). 7 years at V-Mart, promoted to assistant manager 18 months ago. Background in retail visual merchandising. Better at customer-facing escalations than the store manager.",
        },
    ]


def build_security():
    return [
        {
            "id": "S01",
            "name": "Sundar Naidu",
            "age": 42,
            "gender": "M",
            "ethnicity": "telugu",
            "neighborhood": "Peenya",
            "role": "security",
            "position": "entry_exit",
            "shift": "10:00-22:00",
            "fixed_in_optimized": True,
            "languages": ["kannada", "hindi", "telugu"],
            "backstory": "Ex-army, 12 years in retail security. Stationed at the main entrance, also handles exit tag-check.",
        }
    ]


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    random.seed(SEED)
    floor = build_floor_staff()
    trial_room = build_trial_room_staff()
    billing = build_billing_staff()
    managers = build_managers()
    security = build_security()

    output = {
        "seed": SEED,
        "n_staff": len(floor) + 1 + len(billing) + len(managers) + len(security),
        "summary": {
            "floor": len(floor),
            "trial_room": 1,
            "billing": len(billing),
            "managers": len(managers),
            "security": len(security),
            "movable_in_optimized": len(floor) + 1 + len(billing),  # 15
            "fixed_in_optimized": len(managers) + len(security),    # 3
        },
        "floor_staff": floor,
        "trial_room_staff": [trial_room],
        "billing_staff": billing,
        "managers": managers,
        "security": security,
        "baseline_break_clusters": {
            "lunch_window": "13:00-15:00",
            "lunch_peak_off": 5,
            "lunch_peak_slot": "13:30-14:00",
            "dinner_window": "19:00-20:30",
            "dinner_peak_off": 4,
            "dinner_peak_slot": "19:30-20:00",
            "note": "Lever 2 in optimized policy de-clusters these. Brief specifies these clusters as the source of revenue leak at peak.",
        },
        "baseline_billing": {
            "counters_total": 6,
            "always_open": [1],
            "reactive_counters": [2, 3, 4, 5, 6],
            "reactive_trigger": "queue >= 15 shoppers, 5-10 min staffing delay",
            "fixed_anchor_staff": ["B01", "B02"],
            "standby_staff": ["B03", "B04"],
            "note": "Baseline has only 1 billing counter open by default. Manager calls in B03/B04 when queue grows.",
        },
        "baseline_trial_rooms": {
            "attendant_stationed": False,
            "note": "T01 exists as a trial-room attendant by role, but in baseline policy is NOT at the trial rooms (per brief). They act as floor relief.",
        },
    }

    OUT_PATH.write_text(json.dumps(output, indent=2))

    print(f"wrote {OUT_PATH}")
    print(f"  total: {output['n_staff']}  ({output['summary']['movable_in_optimized']} movable + {output['summary']['fixed_in_optimized']} fixed)")
    print(f"  floor: {len(floor)} | trial: 1 | billing: {len(billing)} | mgrs: {len(managers)} | sec: {len(security)}")

    print("\n  floor by zone:")
    by_zone = {}
    for s in floor:
        by_zone[s["zone"]] = by_zone.get(s["zone"], 0) + 1
    for zone, count in by_zone.items():
        print(f"    {zone}: {count}")

    print(f"\n  billing-cross-trained on floor: {sum(1 for s in floor if s['billing_cross_trained'])} / {len(floor)}")

    print("\n  baseline billing:")
    for s in billing:
        marker = "ACTIVE  " if s["baseline_role"] == "active" else "standby "
        ctr = s["deployed_counter"] if s["baseline_role"] == "active" else f"→{s['standby_counter']}"
        print(f"    {s['id']} {marker}{s['shift']:>13}  counter {ctr}  {s['throughput_min_per_memo']}min/memo")

    print("\n  lunch break clustering (10 floor + 1 trial):")
    all_lunch_takers = floor + [trial_room]
    for slot in ["13:00-13:30", "13:30-14:00", "14:00-14:30", "14:30-15:00"]:
        count = sum(1 for s in all_lunch_takers if s.get("lunch_break") == slot)
        print(f"    {slot}  {count}  {'#' * count}")

    print("\n  dinner break clustering:")
    for slot in ["19:00-19:30", "19:30-20:00", "20:00-20:30"]:
        count = sum(1 for s in all_lunch_takers if s.get("dinner_break") == slot)
        print(f"    {slot}  {count}  {'#' * count}")


if __name__ == "__main__":
    main()
