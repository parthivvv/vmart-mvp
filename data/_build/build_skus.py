"""
Builds data/skus.json from the V-Mart brief's 100-SKU catalog.

Source: vmart - research.pdf, pages 26-34 (the 100-SKU list) and pages 13-23
(per-zone tables with explicit discount % and margin %).

For each SKU we record MRP (from the 100-list), then infer discount % and
margin % from the per-zone tables — same numbers wherever they overlap,
sub-category averages elsewhere.
"""

import json
from pathlib import Path


# Schema: (num, zone, sub_category, description, mrp, discount_pct, margin_pct,
#          festive, diwali_hero, size_volatile)
SKUS = [
    # WOMEN'S ETHNIC — kurti
    (1,  "womens_ethnic", "kurti",   "Cotton printed straight kurti, 3/4 sleeve, knee-length", 599, 18, 48, False, False, True),
    (2,  "womens_ethnic", "kurti",   "Rayon A-line kurti with embroidered yoke", 799, 18, 46, True, True, True),
    (3,  "womens_ethnic", "kurti",   "Cotton anarkali kurti, floor-length, full sleeve", 999, 18, 45, True, False, True),
    # kurti set
    (4,  "womens_ethnic", "kurti_set", "Kurti + palazzo set, rayon, printed", 1299, 18, 43, True, True, True),
    (5,  "womens_ethnic", "kurti_set", "Kurti + pants + dupatta set, festive print", 1599, 18, 42, True, True, True),
    (6,  "womens_ethnic", "kurti_set", "Kurti + sharara set, embroidered, occasion wear", 1999, 20, 38, True, False, True),
    # saree
    (7,  "womens_ethnic", "saree",   "Cotton printed daily-wear saree with blouse piece", 799, 18, 42, False, False, False),
    (8,  "womens_ethnic", "saree",   "Georgette printed saree with blouse piece", 1299, 18, 40, True, True, False),
    (9,  "womens_ethnic", "saree",   "Banarasi-style art silk saree, festive", 1999, 22, 38, True, True, False),
    (10, "womens_ethnic", "saree",   "Heavy embroidered designer saree, Diwali special", 2999, 23, 35, True, True, False),
    # suit set
    (11, "womens_ethnic", "suit_set","Unstitched cotton salwar suit material, 3-piece", 899, 18, 42, False, False, True),
    (12, "womens_ethnic", "suit_set","Stitched cotton salwar kameez with dupatta", 1499, 18, 40, True, False, True),
    (13, "womens_ethnic", "suit_set","Embroidered georgette suit set, occasion wear", 2299, 20, 38, True, True, True),
    # lehenga
    (14, "womens_ethnic", "lehenga", "Girls/young women's printed lehenga choli set", 1799, 20, 38, True, False, True),
    (15, "womens_ethnic", "lehenga", "Embroidered net lehenga set, Diwali festive", 3499, 22, 35, True, True, True),
    (16, "womens_ethnic", "lehenga", "Heavy occasion lehenga with dupatta, bridal-adjacent", 4999, 25, 33, True, True, True),

    # WOMEN'S WESTERN — tops
    (17, "womens_western", "tops",   "Solid cotton round-neck t-shirt", 299, 20, 50, False, False, True),
    (18, "womens_western", "tops",   "Printed casual top, half sleeve", 499, 20, 48, False, False, True),
    (19, "womens_western", "tops",   "Formal shirt, cotton, full sleeve", 799, 18, 44, False, False, True),
    # dresses
    (20, "womens_western", "dresses","Casual A-line cotton dress, knee-length", 899, 18, 43, False, False, True),
    (21, "womens_western", "dresses","Bodycon party dress, polyester blend", 1299, 20, 40, True, False, True),
    (22, "womens_western", "dresses","Maxi dress, floral print, full-length", 1499, 20, 42, False, False, True),
    # bottoms
    (23, "womens_western", "bottoms","Solid leggings, cotton", 299, 20, 52, False, False, True),
    (24, "womens_western", "bottoms","Printed palazzo pants, rayon", 599, 20, 46, False, False, True),
    (25, "womens_western", "bottoms","Slim-fit jeans, denim", 999, 18, 40, False, False, True),
    (26, "womens_western", "bottoms","Formal trousers, polyester blend", 799, 18, 42, False, False, True),
    # nightwear
    (27, "womens_western", "nightwear", "Cotton nightgown, printed", 499, 20, 48, False, False, False),
    (28, "womens_western", "nightwear", "Pyjama set with matching top", 699, 20, 46, False, False, False),
    # innerwear
    (29, "womens_western", "innerwear", "Cotton bra, basic", 299, 20, 52, False, False, False),
    (30, "womens_western", "innerwear", "3-pack panty set", 399, 20, 54, False, False, False),
    # co-ord
    (31, "womens_western", "co_ord", "Co-ord set, printed top and shorts", 1199, 18, 43, False, True, True),

    # MEN'S CASUAL — tshirt
    (32, "mens_casual", "tshirt", "Solid round-neck cotton t-shirt", 299, 20, 52, False, False, True),
    (33, "mens_casual", "tshirt", "Printed polo t-shirt, cotton blend", 499, 18, 46, False, False, True),
    (34, "mens_casual", "tshirt", "Henley neck full-sleeve t-shirt", 599, 20, 48, False, False, True),
    # shirt
    (35, "mens_casual", "shirt", "Checked casual shirt, cotton, full sleeve", 799, 20, 48, False, False, True),
    (36, "mens_casual", "shirt", "Printed casual shirt, short sleeve", 699, 18, 46, False, False, True),
    (37, "mens_casual", "shirt", "Denim casual shirt, full sleeve", 999, 18, 44, False, False, True),
    # bottoms
    (38, "mens_casual", "bottoms", "Slim-fit jeans, dark wash", 1099, 18, 40, False, False, True),
    (39, "mens_casual", "bottoms", "Chinos, slim fit, cotton", 999, 18, 42, False, False, True),
    (40, "mens_casual", "bottoms", "Cargo trousers, cotton", 1199, 20, 42, False, False, True),

    # MEN'S FORMAL — shirt
    (41, "mens_formal_ethnic", "formal_shirt", "Solid formal shirt, cotton, full sleeve", 899, 18, 44, False, False, True),
    (42, "mens_formal_ethnic", "formal_shirt", "Striped formal shirt, cotton blend", 999, 18, 44, False, False, True),
    # formal trousers
    (43, "mens_formal_ethnic", "formal_trousers", "Formal trousers, polyester blend", 1099, 18, 42, False, False, True),
    (44, "mens_formal_ethnic", "formal_trousers", "Pleated formal trousers, premium fabric", 1299, 18, 42, False, False, True),
    # ethnic kurta
    (45, "mens_formal_ethnic", "kurta", "Cotton straight kurta, solid", 699, 20, 46, True, False, True),
    (46, "mens_formal_ethnic", "kurta", "Printed cotton kurta, full sleeve", 899, 18, 44, True, False, True),
    # kurta set
    (47, "mens_formal_ethnic", "kurta_set", "Kurta-pyjama set, cotton, festive", 1299, 18, 40, True, True, True),
    (48, "mens_formal_ethnic", "kurta_set", "Embroidered kurta-pyjama set, occasion wear", 1799, 20, 38, True, True, True),
    (49, "mens_formal_ethnic", "kurta_set", "Sherwani-style Indo-western kurta set, Diwali", 2499, 22, 36, True, True, True),

    # MEN'S NIGHTWEAR (lives in mens_casual zone in the brief layout)
    (50, "mens_casual", "nightwear", "Cotton pyjama set, printed", 599, 20, 46, False, False, False),
    # men's innerwear
    (51, "mens_casual", "innerwear", "Vest, 3-pack, cotton", 349, 20, 52, False, False, False),
    (52, "mens_casual", "innerwear", "Brief, 3-pack", 399, 20, 54, False, False, False),
    (53, "mens_casual", "innerwear", "Cotton socks, 5-pack", 299, 20, 58, False, False, False),

    # KIDS BOYS 4-8
    (54, "kids", "boys_4_8", "Printed t-shirt and shorts set", 499, 20, 48, False, False, True),
    (55, "kids", "boys_4_8", "Cotton shirt with full pants", 699, 18, 46, False, False, True),
    # BOYS 8-14
    (56, "kids", "boys_8_14", "Graphic t-shirt, full sleeve", 449, 20, 50, False, False, True),
    (57, "kids", "boys_8_14", "Slim-fit jeans for boys", 799, 18, 44, False, False, True),
    # GIRLS 4-8
    (58, "kids", "girls_4_8", "Frock dress, printed, knee-length", 599, 20, 46, False, False, True),
    (59, "kids", "girls_4_8", "Top and leggings set", 549, 18, 48, False, False, True),
    # GIRLS 8-14
    (60, "kids", "girls_8_14", "Printed top with skirt", 699, 18, 46, False, False, True),
    (61, "kids", "girls_8_14", "Jeans and t-shirt combo", 899, 18, 44, False, False, True),

    # INFANT BOYS
    (62, "infants", "infant_boys", "Romper, cotton, printed", 399, 20, 50, False, False, False),
    (63, "infants", "infant_boys", "T-shirt and shorts set", 449, 20, 48, False, False, False),
    # INFANT GIRLS
    (64, "infants", "infant_girls", "Frock with bloomer set", 449, 20, 48, False, False, False),
    (65, "infants", "infant_girls", "Onesie, 2-pack", 499, 20, 50, False, False, False),
    # NEWBORN
    (66, "infants", "newborn", "Cotton wrap set, 5-piece", 599, 20, 48, False, False, False),
    (67, "infants", "newborn", "Mittens, booties, cap set", 349, 20, 56, False, False, False),

    # KIDS ETHNIC — Diwali peak
    (68, "kids", "boys_ethnic", "Kurta-pyjama set, cotton, festive", 799, 20, 44, True, True, True),
    (69, "kids", "boys_ethnic", "Sherwani-style kids set, Diwali", 1299, 22, 40, True, True, True),
    (70, "kids", "girls_ethnic", "Lehenga choli set, kids, festive", 1499, 22, 42, True, True, True),
    (71, "kids", "girls_ethnic", "Anarkali frock, embroidered, occasion", 1099, 20, 42, True, True, True),
    # kids nightwear
    (72, "kids", "nightwear", "Cartoon-print pyjama set, unisex", 499, 20, 48, False, False, False),

    # WOMEN'S FOOTWEAR — flats
    (73, "womens_fa", "footwear_flats", "Basic flat sandal, PU strap", 399, 20, 50, False, False, True),
    (74, "womens_fa", "footwear_flats", "Printed ballerina flats", 599, 20, 48, False, False, True),
    # heels
    (75, "womens_fa", "footwear_heels", "Block heel sandal, party wear", 899, 20, 42, True, True, True),
    (76, "womens_fa", "footwear_heels", "Stiletto heel, festive", 1199, 22, 40, True, False, True),
    # ethnic
    (77, "womens_fa", "footwear_ethnic", "Embroidered jutti, ethnic occasion", 699, 20, 46, True, True, True),
    (78, "womens_fa", "footwear_ethnic", "Mojari-style ethnic flat", 799, 20, 46, True, False, True),

    # MEN'S FOOTWEAR — formal
    (79, "mens_fa", "footwear_formal", "Black formal lace-up shoe, synthetic leather", 999, 20, 40, False, False, True),
    (80, "mens_fa", "footwear_formal", "Brown formal slip-on", 1099, 20, 40, False, False, True),
    # casual
    (81, "mens_fa", "footwear_casual", "White sneakers, lace-up", 899, 20, 44, False, False, True),
    (82, "mens_fa", "footwear_casual", "Canvas casual shoes", 699, 20, 44, False, False, True),
    # ethnic
    (83, "mens_fa", "footwear_ethnic", "Mojari, embroidered, festive", 799, 20, 46, True, True, True),
    (84, "mens_fa", "footwear_ethnic", "Kolhapuri sandal, leather", 699, 20, 46, True, False, True),

    # KIDS FOOTWEAR
    (85, "kids", "footwear", "School shoes, black, lace-up", 599, 20, 46, False, False, True),
    (86, "kids", "footwear", "Sports shoe, kids, velcro", 699, 20, 46, False, False, True),

    # WOMEN'S BAGS
    (87, "womens_fa", "bags", "Sling bag, faux leather", 599, 25, 55, False, False, False),
    (88, "womens_fa", "bags", "Clutch, embroidered, festive", 799, 25, 55, True, True, False),
    (89, "womens_fa", "bags", "Tote bag, canvas", 499, 25, 54, False, False, False),
    # JEWELLERY — highest margin in store
    (90, "womens_fa", "jewellery", "Earring set, artificial, festive", 299, 25, 62, True, True, False),
    (91, "womens_fa", "jewellery", "Necklace set with earrings, occasion wear", 599, 25, 58, True, True, False),
    (92, "womens_fa", "jewellery", "Bangles set, 12-piece, festive", 249, 34, 60, True, True, False),
    # DUPATTAS
    (93, "womens_fa", "dupattas", "Solid chiffon dupatta", 299, 25, 55, False, False, False),
    (94, "womens_fa", "dupattas", "Embroidered net dupatta, festive", 599, 25, 54, True, True, False),
    (95, "womens_fa", "dupattas", "Banarasi-style printed dupatta", 799, 25, 50, True, False, False),

    # MEN'S ACCESSORIES
    (96, "mens_fa", "accessories", "Leather belt, formal", 499, 25, 54, False, False, False),
    (97, "mens_fa", "accessories", "Wallet, bifold, synthetic leather", 599, 25, 52, False, False, False),
    (98, "mens_fa", "accessories", "Tie, polyester, formal", 299, 25, 55, False, False, False),

    # UNISEX (display at power wall / impulse fixtures)
    (99, "power_wall", "unisex_acc", "Sunglasses, plastic frame, UV-protected", 499, 25, 55, False, False, False),
    (100, "power_wall", "unisex_acc", "Cotton cap, printed", 299, 25, 56, False, False, False),
]

# Sub-category cross-merch graph: which categories pair well together. Used by
# lever 5 (cross-merch adjacency) to decide attach probabilities.
CROSS_MERCH = {
    "saree":          ["dupattas", "footwear_ethnic", "jewellery", "bags"],
    "kurti":          ["bottoms", "dupattas", "footwear_ethnic", "jewellery"],
    "kurti_set":      ["dupattas", "footwear_ethnic", "jewellery"],
    "suit_set":       ["dupattas", "footwear_ethnic", "jewellery"],
    "lehenga":        ["jewellery", "footwear_ethnic", "bags"],
    "kurta":          ["footwear_ethnic"],
    "kurta_set":      ["footwear_ethnic"],
    "boys_ethnic":    ["footwear_ethnic"],
    "girls_ethnic":   ["jewellery", "footwear_ethnic"],
    "dresses":        ["footwear_heels", "bags"],
    "tops":           ["bottoms"],
    "formal_shirt":   ["formal_trousers", "footwear_formal", "accessories"],
    "shirt":          ["bottoms", "footwear_casual"],
    "infant_girls":   ["newborn"],
    "infant_boys":    ["newborn"],
}


def diwali_price(mrp, discount_pct):
    return round(mrp * (1 - discount_pct / 100))


def sku_id(num):
    return f"S{num:03d}"


def main():
    skus = []
    for (n, zone, sub_cat, desc, mrp, disc, margin, festive, hero, vol) in SKUS:
        skus.append({
            "id": sku_id(n),
            "num": n,
            "zone": zone,
            "sub_category": sub_cat,
            "description": desc,
            "mrp": mrp,
            "discount_pct": disc,
            "diwali_price": diwali_price(mrp, disc),
            "margin_pct": margin,
            "festive": festive,
            "diwali_hero": hero,
            "size_volatile": vol,
        })

    # Sanity: every SKU has a unique num and id
    assert len(skus) == 100, f"Expected 100 SKUs, got {len(skus)}"
    assert len({s["num"] for s in skus}) == 100
    assert len({s["id"] for s in skus}) == 100

    # Group counts for sanity
    by_zone = {}
    for s in skus:
        by_zone[s["zone"]] = by_zone.get(s["zone"], 0) + 1

    output = {
        "n_skus": len(skus),
        "skus": skus,
        "cross_merchandising_attach_groups": CROSS_MERCH,
        "by_zone_count": by_zone,
        "notes": "Discount % and margin % drawn from the per-zone tables (pp. 13-23) where available, sub-category average elsewhere. Diwali price = round(MRP * (1 - discount/100)).",
    }

    out_path = Path(__file__).resolve().parent.parent / "skus.json"
    out_path.write_text(json.dumps(output, indent=2))
    print(f"wrote {out_path}")
    print(f"  {len(skus)} SKUs")
    print(f"  by zone: {by_zone}")
    print(f"  price range: ₹{min(s['mrp'] for s in skus)}-₹{max(s['mrp'] for s in skus)}")


if __name__ == "__main__":
    main()
