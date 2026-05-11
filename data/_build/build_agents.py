"""
Generates data/agents.json — 1,000 simulated shoppers for Diwali Saturday at a
Bangalore V-Mart Unlimited store.

Arrival times and dwell times are sampled from per-profile chi-square
distributions defined in data/profiles.json. Names, neighborhoods,
occupations, and backstories are drawn from the inline pools below.

Reproducible via SEED — same seed produces the same 1,000 agents in the same
arrival order, so baseline vs optimized policy runs see an identical shopper
sequence.
"""

import json
import random
from pathlib import Path

import numpy as np


SEED = 42
OUT_PATH = Path(__file__).resolve().parent.parent / "agents.json"
PROFILES_PATH = Path(__file__).resolve().parent.parent / "profiles.json"


# ---------------------------------------------------------------------------
# Name pools, ethnically weighted for Bangalore
# ---------------------------------------------------------------------------

NAMES_F = {
    "kannadiga": ["Anitha", "Bhavana", "Chaitra", "Deepa", "Geetha", "Kavitha", "Lakshmi", "Manjula", "Nandini", "Pavithra", "Rashmi", "Shruthi", "Sushma", "Vidya", "Yamuna", "Sahana", "Roopa", "Chitra", "Asha", "Lalitha", "Sowmya", "Triveni", "Anusuya"],
    "tamil": ["Aishwarya", "Bhuvana", "Divya", "Janani", "Kavya", "Lavanya", "Meena", "Priya", "Revathi", "Saranya", "Subbulakshmi", "Vaishnavi", "Indira", "Mythili"],
    "telugu": ["Anusha", "Bhavani", "Deepika", "Harika", "Jyothi", "Madhavi", "Padmaja", "Sirisha", "Sridevi", "Swathi", "Vyjayanti"],
    "north_indian": ["Aarti", "Anjali", "Deepika", "Kavita", "Megha", "Neha", "Pooja", "Priyanka", "Radha", "Riya", "Sunita", "Shreya", "Sneha", "Sonal", "Tanvi", "Nisha", "Komal", "Ritu", "Preeti"],
    "marathi": ["Aishwarya", "Madhuri", "Manisha", "Pallavi", "Rohini", "Swapna", "Snehal"],
    "bengali": ["Ananya", "Indrani", "Mitali", "Riya", "Sumita", "Paramita"],
    "muslim": ["Aisha", "Fatima", "Nafisa", "Nazia", "Rukhsana", "Sabiha", "Sara", "Zainab", "Tabassum"],
    "christian": ["Anita", "Christina", "Glenda", "Jasmine", "Mary", "Sharon", "Beena"],
}

NAMES_M = {
    "kannadiga": ["Ajay", "Arjun", "Basavaraj", "Chandrashekhar", "Ganesh", "Harish", "Kiran", "Lokesh", "Manjunath", "Naveen", "Prakash", "Rakesh", "Shashank", "Suresh", "Vinay", "Ravi", "Mahesh", "Mohan", "Vijay", "Sandeep", "Pradeep", "Nagaraj"],
    "tamil": ["Arun", "Balaji", "Karthik", "Murali", "Praveen", "Ramesh", "Senthil", "Vijay", "Vikram", "Sundar", "Anand"],
    "telugu": ["Anil", "Bhaskar", "Chandra", "Hari", "Krishna", "Mahesh", "Naga", "Ravi", "Srinivas", "Venkat", "Phani"],
    "north_indian": ["Aman", "Amit", "Ankit", "Deepak", "Gaurav", "Manish", "Nikhil", "Pankaj", "Rahul", "Rohit", "Sanjay", "Saurabh", "Sumit", "Vikas", "Vivek", "Karan", "Akash", "Aditya"],
    "marathi": ["Aniket", "Mandar", "Nilesh", "Prasad", "Rohan", "Shrikant", "Tushar"],
    "bengali": ["Arnab", "Debojit", "Saurav", "Sourav", "Subhash", "Rajdeep"],
    "muslim": ["Ahmed", "Asif", "Faraz", "Imran", "Khalid", "Mohammed", "Nadeem", "Salman", "Tariq", "Yusuf"],
    "christian": ["Aaron", "Anthony", "Daniel", "David", "Joseph", "Michael", "Roshan", "Glen"],
}

LAST = {
    "kannadiga": ["Gowda", "Hegde", "Shetty", "Iyer", "Bhat", "Rao", "Murthy", "Naidu", "Bhandari", "Kumar", "Shenoy", "Kamath", "Pai", "Acharya", "Holla", "Hiremath"],
    "tamil": ["Subramaniam", "Krishnan", "Iyengar", "Pillai", "Mudaliar", "Reddy", "Venkatesan", "Ramamurthy", "Srinivasan"],
    "telugu": ["Reddy", "Rao", "Naidu", "Sharma", "Choudhary", "Goud", "Yadav"],
    "north_indian": ["Sharma", "Verma", "Gupta", "Singh", "Yadav", "Mishra", "Tiwari", "Pandey", "Agarwal", "Saxena", "Chauhan", "Mehta", "Jain"],
    "marathi": ["Patil", "Deshpande", "Kulkarni", "Joshi", "Bhosale", "Pawar", "Sawant"],
    "bengali": ["Banerjee", "Chatterjee", "Sen", "Das", "Mukherjee", "Bose", "Ghosh"],
    "muslim": ["Khan", "Hussain", "Ali", "Sheikh", "Pathan", "Qureshi", "Ansari"],
    "christian": ["D'Souza", "Lobo", "Fernandes", "Pinto", "Pereira", "Mathew", "Kuruvilla"],
}

ETHNICITY_WEIGHTS = {
    "kannadiga": 0.32,
    "tamil": 0.15,
    "telugu": 0.10,
    "north_indian": 0.22,
    "marathi": 0.05,
    "bengali": 0.04,
    "muslim": 0.07,
    "christian": 0.05,
}

NEIGHBORHOODS = [
    "Indiranagar", "Koramangala", "Whitefield", "HSR Layout", "BTM Layout",
    "Jayanagar", "JP Nagar", "Marathahalli", "Banashankari", "Malleswaram",
    "Rajajinagar", "Yelahanka", "Bellandur", "Sarjapur Road", "Bommanahalli",
    "Hebbal", "Electronics City", "Hennur", "Vijayanagar", "Basavanagudi",
    "Frazer Town", "RT Nagar", "Banaswadi", "Hosur Road", "KR Puram",
    "Domlur", "Ulsoor", "Cox Town", "Wilson Garden", "Kalyan Nagar",
    "Kammanahalli", "Vidyaranyapura", "Mahadevapura",
]

# Occupations split by life-stage so we don't put "stay-at-home mom" on a
# 23-year-old young_woman or "Master's student" on a 40-year-old.
OCCUPATIONS_F_MATURE = [
    "homemaker", "school teacher", "software engineer at an IT park",
    "bank clerk", "nurse at a private hospital", "boutique owner",
    "HR manager", "doctor at a clinic", "tuition teacher",
    "kindergarten teacher", "tailor shop owner", "cashier at a supermarket",
    "yoga instructor", "marketing executive", "junior accountant",
    "stay-at-home mom", "beauty parlour owner", "lab technician",
    "office admin",
]

OCCUPATIONS_F_YOUNG = [
    "software engineer at an IT park", "freelance graphic designer",
    "data analyst at a startup", "marketing executive", "junior accountant",
    "interior design assistant", "BPO night-shift agent",
    "Master's student at Christ University", "lab technician",
    "office admin", "junior consultant", "yoga instructor",
    "boutique owner", "freelance content writer",
]

OCCUPATIONS_M = [
    "software engineer", "auto driver", "shop owner", "delivery executive",
    "BPO team lead", "branch manager at a bank", "civil engineer",
    "auditor", "small business owner", "school principal",
    "sales rep for a pharma company", "Ola/Uber driver", "factory supervisor",
    "freelance photographer", "real estate agent", "junior architect",
    "tea-stall owner", "marketing manager", "police constable", "accountant",
    "electrician", "construction site supervisor", "engineering student",
    "delivery rider for Zomato",
]


# ---------------------------------------------------------------------------
# Backstory phrase pools
# ---------------------------------------------------------------------------

KIDS_PHRASES = [
    "Has a 6-year-old daughter and a 9-year-old son.",
    "Has two daughters, ages 4 and 7.",
    "Has a 5-year-old son who refuses to wear last year's kurta.",
    "Has a 3-year-old daughter she wants to dress in pattu pavadai.",
    "Has an 11-year-old son and a 5-year-old daughter.",
    "Has a 2-year-old in tow; older daughter (8) stayed with grandparents.",
    "Has a 7-year-old son and a 10-year-old daughter, both school-going.",
    "Has a 9-year-old daughter who outgrew last Diwali's lehenga.",
    "Has a 4-year-old son and a 1-year-old daughter she's carrying.",
    "Has a 12-year-old daughter who only wants to pick her own clothes.",
]

HUSBAND_PHRASES = [
    "Husband is at work in Whitefield; she's running this on her own",
    "Husband is parking the car and will join in 20 minutes",
    "Husband stayed home with the in-laws",
    "Husband is busy with Diwali office calls and asked her to handle the shopping",
    "Husband works night shifts; sent her with a budget and a list",
    "Single mom — managing the Diwali list herself",
    "Husband dropped her off and went to the supermarket",
    "Husband is travelling for work; this is the only window before Diwali",
]

MOM_MISSIONS = [
    "Needs a kurta-pyjama for the boy and a lehenga or frock for the girl before lunch.",
    "Wants a saree for herself and Diwali outfits for both kids.",
    "Has a relative's pre-Diwali get-together on Tuesday; needs full family ethnic.",
    "Diwali at the in-laws' this year, so she needs an embroidered suit and kids' kurta sets.",
    "Doing the entire Diwali shopping in one trip — kids, herself, plus a kurta for her brother.",
    "Looking for matching ethnic for the kids, has a fixed budget under ₹3,000.",
    "Wants the kids in pattu pavadai or kurta and herself in a new saree, simple and quick.",
    "Needs a new salwar suit for herself and party-ready outfits for the kids' school function.",
    "Targeting BOGO ethnic — wants maximum mileage from the Diwali Dhamaka offer.",
]

YW_COMPANIONS = [
    "Came alone, treating herself before meeting friends for dinner",
    "Shopping with her best friend who's also looking for a Diwali outfit",
    "Solo trip — used the metro to get here",
    "With her younger sister who's visiting from Hyderabad",
    "Came alone after work — has 90 minutes before her cab",
    "With a college friend, both looking for kurtas",
    "Came with her roommate — both new to Bangalore",
    "Solo, plans to meet her boyfriend at the food court after",
]

YW_MISSIONS = [
    "Browsing for a Diwali kurta — saw a reel on Instagram and wants something similar.",
    "Looking for a party dress for a Diwali bash at her friend's place.",
    "Hunting for a kurta + palazzo set under ₹1,500; usually shops at Zudio but heard about the Mahabachat sale.",
    "Wants an ethnic outfit for the office Diwali function; loves checking the power wall first.",
    "Picking up a saree for the first time — needs guidance.",
    "Light shopping for a co-ord set; nothing she has to buy today.",
    "Looking for a bodycon dress and matching heels for Saturday night.",
    "Comparison shopping — checked Zudio yesterday, wants to see V-Mart's festive range.",
    "Wants to try on five kurtis just to see what suits her this season.",
]

FW_LEAD_PHRASES = [
    "Led by the mother-in-law, who decides what gets bought",
    "Led by the husband-wife pair in their late 30s",
    "Multi-generational — grandparents in their 60s, parents in their mid-30s, kids in tow",
    "Patriarch in his late 60s leads, son pays, daughter-in-law actually decides",
    "Couple in their 40s with a teenage daughter and elderly father",
    "Two siblings and their spouses making it a joint Diwali run",
    "Mother (in her 50s) leading the trip with her adult daughters",
    "Father-in-law using the trip to pick up a sherwani; rest of family along for the day",
    "Wife-led group with extended family from out of town",
]

FW_COMPOSITION = [
    "Shopping for Diwali outfits for everyone plus a wedding next month",
    "Group needs ethnic wear across all ages — toddler to elderly",
    "Half the group wants ethnic, half wants western; constant negotiation",
    "Multiple sarees, two kurtas, and Diwali outfits for the grandkids on the list",
    "Diwali pooja outfits plus an outfit for a cousin's engagement in two weeks",
    "Two birthdays in the family this month — combined occasion shopping",
    "Wedding in the extended family next weekend; needs full wardrobes",
    "Cousins visiting from Bombay; doing Diwali shopping together as a family event",
]

FW_MISSIONS = [
    "Plans to be here for at least two hours; happy to wait in line if needed.",
    "Will hit women's ethnic first, then men's, then kids — practiced flow.",
    "Group is patient but heat-sensitive; if AC drops they'll cut the trip short.",
    "Aim is ₹5,000-7,000 spend; at most one major SKU per person.",
    "Has a budget around ₹6,000; will return tomorrow for whatever's missed.",
    "Wants Diwali photos coordinated — everyone in similar colour family.",
    "Grandmother specifically wants to see sarees in person before deciding.",
]

QM_DROP_OFF = [
    "Wife dropped him off; she's at the salon next door",
    "Got dropped by a friend on the way home from the office",
    "Auto-ed in alone after work; needs to leave in 20 minutes",
    "Family is at the food court; he's the runner",
    "Wife asked him to grab one thing while she shops next floor",
    "Drove himself; double-parked, has 15 minutes",
    "Took an Uber here straight from the metro; cab is waiting",
    "Wife is at the kids' section; sent him to pick his own kurta",
]

QM_MISSIONS = [
    "Needs a kurta for the Diwali pooja on Sunday.",
    "Wants formal trousers for an office event tomorrow.",
    "Quick replacement for a torn shirt; whatever fits.",
    "Looking for a Nehru jacket to layer over an existing kurta.",
    "Needs a kurta-pyjama set under ₹1,500 — no fuss, no try-on if possible.",
    "Wants a polo shirt for the weekend; in and out.",
    "Picking up a sherwani-style set for a relative's pre-Diwali function.",
    "Needs a formal shirt and tie for a Monday interview.",
    "Wife's instruction: one kurta, white, full-sleeve, in his size. Nothing else.",
]

BROWSER_REASONS = [
    "Window-shopping after a movie at the mall multiplex.",
    "Killing 30 minutes before meeting a friend at the food court.",
    "Walked in because of the Mahabachat banners outside.",
    "Was passing by, curious about the festive display.",
    "Came in mostly for the AC — Bangalore Saturday heat.",
    "Following a friend who's actually shopping; not buying.",
    "Looked at the power wall, might pick up one thing if it's cheap.",
    "Just exited the supermarket next door; thought to check briefly.",
    "Bored, drove past, decided to check the Diwali range.",
    "Heard about the BOGO from a colleague; sceptical but curious.",
]


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def weighted_choice(d):
    keys = list(d.keys())
    weights = [d[k] for k in keys]
    return random.choices(keys, weights=weights, k=1)[0]


def pick_name(gender, ethnicity):
    pool = NAMES_F if gender == "F" else NAMES_M
    first_pool = pool.get(ethnicity, pool["north_indian"])
    last_pool = LAST.get(ethnicity, LAST["north_indian"])
    return f"{random.choice(first_pool)} {random.choice(last_pool)}"


def chi2_clipped(df, scale, shift, lo, hi, rng, max_attempts=30):
    """Sample chi^2(df)*scale+shift, resampling if out of [lo, hi] to avoid
    bunching at the bounds. Falls back to a clipped value after max_attempts."""
    x = 0.0
    for _ in range(max_attempts):
        x = rng.chisquare(df) * scale + shift
        if lo <= x <= hi:
            return float(x)
    return float(max(lo, min(hi, x)))


def minutes_to_hhmm(m):
    """m is minutes from 10am. 10am = 600 minutes from midnight."""
    total = 600 + int(m)
    return f"{total // 60:02d}:{total % 60:02d}"


def sample_group_size(dist):
    values = [d["value"] for d in dist]
    weights = [d["weight"] for d in dist]
    return random.choices(values, weights=weights, k=1)[0]


# ---------------------------------------------------------------------------
# Per-profile backstory assembly
# ---------------------------------------------------------------------------

def make_agent(profile_name, profile_cfg, rng):
    arr = profile_cfg["arrival_minute_dist"]
    dwl = profile_cfg["dwell_minute_dist"]
    arrival_minute = chi2_clipped(arr["df"], arr["scale"], arr["shift"], arr["min"], arr["max"], rng)
    dwell = chi2_clipped(dwl["df"], dwl["scale"], dwl["shift"], dwl["min"], dwl["max"], rng)
    group_size = sample_group_size(profile_cfg["group_size_dist"])
    ethnicity = weighted_choice(ETHNICITY_WEIGHTS)
    neighborhood = random.choice(NEIGHBORHOODS)

    if profile_name == "mission_mom":
        gender = "F"
        age = random.randint(28, 44)
        occupation = random.choice(OCCUPATIONS_F_MATURE)
        name = pick_name(gender, ethnicity)
        backstory = (
            f"{name} ({age}, {neighborhood}), {occupation}. "
            f"{random.choice(KIDS_PHRASES)} {random.choice(HUSBAND_PHRASES)}. "
            f"{random.choice(MOM_MISSIONS)}"
        )
    elif profile_name == "young_woman":
        gender = "F"
        age = random.randint(20, 32)
        occupation = random.choice(OCCUPATIONS_F_YOUNG)
        name = pick_name(gender, ethnicity)
        backstory = (
            f"{name} ({age}, {neighborhood}), {occupation}. "
            f"{random.choice(YW_COMPANIONS)}. {random.choice(YW_MISSIONS)}"
        )
    elif profile_name == "family_weekend":
        # The "agent" represents the whole group; lead-decision-maker's gender is random.
        gender = random.choice(["F", "M"])
        age = random.randint(32, 55)
        surname = random.choice(LAST.get(ethnicity, LAST["north_indian"]))
        name = f"{surname} family"
        occupation = None
        backstory = (
            f"The {surname} family ({group_size} members) from {neighborhood}. "
            f"{random.choice(FW_LEAD_PHRASES)}. {random.choice(FW_COMPOSITION)}. "
            f"{random.choice(FW_MISSIONS)}"
        )
    elif profile_name == "quick_trip_male":
        gender = "M"
        age = random.randint(24, 50)
        occupation = random.choice(OCCUPATIONS_M)
        name = pick_name(gender, ethnicity)
        backstory = (
            f"{name} ({age}, {neighborhood}), {occupation}. "
            f"{random.choice(QM_DROP_OFF)}. {random.choice(QM_MISSIONS)}"
        )
    else:  # browser
        gender = random.choice(["F", "M"])
        age = random.randint(18, 58)
        if gender == "F":
            occupation = random.choice(
                OCCUPATIONS_F_YOUNG if age < 33 else OCCUPATIONS_F_MATURE
            )
        else:
            occupation = random.choice(OCCUPATIONS_M)
        name = pick_name(gender, ethnicity)
        backstory = (
            f"{name} ({age}, {neighborhood}), {occupation}. "
            f"{random.choice(BROWSER_REASONS)}"
        )

    qt = profile_cfg["queue_tolerance_min"]
    bs = profile_cfg["basket_size_target"]

    return {
        "profile": profile_name,
        "name": name,
        "age": age,
        "gender": gender,
        "ethnicity": ethnicity,
        "neighborhood": neighborhood,
        "occupation": occupation,
        "group_size": group_size,
        "arrival_minute": round(arrival_minute, 1),
        "arrival_time": minutes_to_hhmm(arrival_minute),
        "planned_dwell_minutes": round(dwell, 1),
        "primary_zones": profile_cfg["primary_zones"],
        "secondary_zones": profile_cfg["secondary_zones"],
        "queue_tolerance_min": {"reduce_at": qt["reduce_at"], "abandon_at": qt["abandon_at"]},
        "basket_size_target": random.randint(bs["min"], bs["max"]),
        "intent_strength": profile_cfg["intent_strength"],
        "backstory": backstory,
    }


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    random.seed(SEED)
    rng = np.random.default_rng(SEED)

    cfg = json.loads(PROFILES_PATH.read_text())
    profiles = cfg["profiles"]
    N = cfg["total_agents"]

    # Integer per-profile counts that sum to N
    counts = {p: int(round(N * profiles[p]["weight"])) for p in profiles}
    diff = N - sum(counts.values())
    if diff != 0:
        biggest = max(counts, key=counts.get)
        counts[biggest] += diff
    assert sum(counts.values()) == N

    agents = []
    for profile_name in profiles:
        for _ in range(counts[profile_name]):
            agents.append(make_agent(profile_name, profiles[profile_name], rng))

    # Sort by arrival time → assign final IDs in that order
    agents.sort(key=lambda a: a["arrival_minute"])
    for i, a in enumerate(agents):
        a["id"] = f"A{i + 1:04d}"
    # Reorder so id comes first
    agents = [{"id": a.pop("id"), **a} for a in agents]

    # Slot bucket summary (12 hours × 2 = 24 slots of 30 min each)
    slot_counts = [0] * 24
    for a in agents:
        slot = min(23, int(a["arrival_minute"] // 30))
        slot_counts[slot] += 1

    output = {
        "seed": SEED,
        "n_agents": len(agents),
        "profile_counts": counts,
        "arrivals_by_slot": slot_counts,
        "agents": agents,
    }

    OUT_PATH.write_text(json.dumps(output, indent=2))

    print(f"wrote {OUT_PATH}")
    print(f"  {len(agents)} agents")
    print(f"  profile counts: {counts}")
    print(f"  arrivals by 30-min slot (10am..10pm):")
    for i, c in enumerate(slot_counts):
        hh = 10 + i // 2
        mm = "30" if i % 2 else "00"
        bar = "#" * (c // 4)
        print(f"    {hh:02d}:{mm}  {c:4d}  {bar}")


if __name__ == "__main__":
    main()
