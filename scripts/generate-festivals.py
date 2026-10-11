#!/usr/bin/env python3
"""Generates lib/festival-data.js — civil dates (IST, Delhi reference) of the lunisolar festivals, with pyswisseph.
Run: pip install pyswisseph && python3 scripts/generate-festivals.py [START_YEAR] [END_YEAR]

Method (standard Drik-style):
  * Lunar month (amanta) = counted from new moon to new moon and NAMED after the sidereal sign the Sun is in at the
    starting new moon (Sun in Pisces -> Chaitra, Aries -> Vaishakha ...). Two new moons in one sign => the first month is
    Adhika (no festivals are placed in it). The Purnimanta name (used by the North Indian festival lists) equals the amanta
    name in Shukla paksha and the NEXT month's name in Krishna paksha.
  * Each festival has a tithi and an 'at' moment of the day (sunrise, midday, aparahna, pradosh, midnight, moonrise, sunset);
    the festival is on the civil day on which that tithi prevails at that moment (first such day if two).
  * If no day qualifies (kshaya tithi) the tithi's starting day is used.
Delhi sunrise/sunset/moonrise are used; other cities and traditions can differ by a day."""
import sys, os, json, datetime as dt
import swisseph as swe
swe.set_sid_mode(swe.SIDM_LAHIRI)
FL = swe.FLG_SIDEREAL
IST = dt.timedelta(hours=5, minutes=30)
DELHI = (77.2090, 28.6139, 0.0)
MONTHS = ['chaitra','vaishakha','jyeshtha','ashadha','shravana','bhadrapada','ashvina','kartika','margashirsha','pausha','magha','phalguna']

moon = lambda jd: swe.calc_ut(jd, swe.MOON, FL)[0][0] % 360
sun = lambda jd: swe.calc_ut(jd, swe.SUN, FL)[0][0] % 360
elong = lambda jd: (moon(jd) - sun(jd)) % 360
tithi_n = lambda jd: int(elong(jd) // 12) + 1                       # 1..30
jd_of = lambda d: swe.julday(d.year, d.month, d.day, d.hour + d.minute / 60 + d.second / 3600)
def ist_of(jd):
    y, m, d, h = swe.revjul(jd); return dt.datetime(y, m, d) + dt.timedelta(hours=h) + IST

def new_moons(d0, d1):
    out, jd, end = [], jd_of(d0 - IST), jd_of(d1 - IST)
    prev = elong(jd)
    while jd < end:
        n = jd + 0.25; e = elong(n)
        if e < prev - 180:                                       # wrapped 360 -> 0 : a new moon in (jd, n]
            lo, hi = jd, n
            for _ in range(40):
                mid = (lo + hi) / 2
                if elong(mid) > 180: lo = mid
                else: hi = mid
            out.append(hi)
        prev, jd = e, n
    return out

def build(y0, y1):
    nms = new_moons(dt.datetime(y0 - 1, 1, 1), dt.datetime(y1 + 1, 6, 30))
    signs = [int(sun(t) // 30) for t in nms]
    months = []                                                    # (start_jd, end_jd, name_idx, adhika)
    for i in range(len(nms) - 1):
        months.append((nms[i], nms[i + 1], (signs[i] + 1) % 12, signs[i] == signs[i + 1]))
    return months

def month_at(months, jd):
    for s, e, name, adhik in months:
        if s <= jd < e: return name, adhik
    return None, False

def rise_set(day, which):
    jd0 = swe.julday(day.year, day.month, day.day, 0.0) - 5.5 / 24
    flag = {'sunrise': (swe.SUN, swe.CALC_RISE), 'sunset': (swe.SUN, swe.CALC_SET), 'moonrise': (swe.MOON, swe.CALC_RISE)}[which]
    r = swe.rise_trans(jd0, flag[0], flag[1], DELHI, 1013.25, 15.0)
    return r[1][0] if r[0] == 0 else None

def instants(day, nxt):
    sr, ss, sr2 = rise_set(day, 'sunrise'), rise_set(day, 'sunset'), rise_set(nxt, 'sunrise')
    mr = rise_set(day, 'moonrise')
    L = ss - sr
    return {'sunrise': sr + 0.02, 'madhyahna': sr + L * 0.5, 'aparahna': sr + L * 0.7, 'sunset': ss - 0.01, 'pradosh': ss + 1 / 24,
            'nishita': (ss + sr2) / 2, 'moonrise': (mr if mr else ss + 0.12) }

# id: (purnimanta month, paksha, tithi within paksha 1-15, 'at')
RULES = {
 'chaitra_navratri': ('chaitra','shukla',1,'sunrise'), 'chaitra_navami': ('chaitra','shukla',9,'madhyahna'), 'gangaur': ('chaitra','shukla',3,'sunrise'),
 'hanuman_jayanti': ('chaitra','shukla',15,'sunrise'), 'sheetala_ashtami': ('chaitra','krishna',8,'sunrise'),
 'sita_navami': ('vaishakha','shukla',9,'madhyahna'), 'akshaya_tritiya': ('vaishakha','shukla',3,'madhyahna'), 'narasimha_jayanti': ('vaishakha','shukla',14,'pradosh'),
 'vat_savitri': ('jyeshtha','krishna',15,'madhyahna'), 'ganga_dussehra': ('jyeshtha','shukla',10,'sunrise'), 'nirjala_ekadashi': ('jyeshtha','shukla',11,'sunrise'),
 'rath_yatra': ('ashadha','shukla',2,'sunrise'), 'devshayani': ('ashadha','shukla',11,'sunrise'), 'guru_purnima': ('ashadha','shukla',15,'sunrise'),
 'nag_panchami': ('shravana','shukla',5,'madhyahna'), 'hariyali_teej': ('shravana','shukla',3,'sunrise'), 'raksha_bandhan': ('shravana','shukla',15,'aparahna'),
 'kajari_teej': ('bhadrapada','krishna',3,'sunrise'), 'halashashthi': ('bhadrapada','krishna',6,'sunrise'), 'janmashtami': ('bhadrapada','krishna',8,'nishita'),
 'hartalika_teej': ('bhadrapada','shukla',3,'sunrise'), 'ganesh_chaturthi': ('bhadrapada','shukla',4,'madhyahna'), 'rishi_panchami': ('bhadrapada','shukla',5,'madhyahna'),
 'santan_saptami': ('bhadrapada','shukla',7,'madhyahna'), 'radhashtami': ('bhadrapada','shukla',8,'madhyahna'), 'anant_chaturdashi': ('bhadrapada','shukla',14,'sunrise'),
 'pitru_start': ('bhadrapada','shukla',15,'aparahna'), 'pitru_end': ('ashvina','krishna',15,'aparahna'), 'jivitputrika': ('ashvina','krishna',8,'pradosh'),
 'sharad_navratri': ('ashvina','shukla',1,'sunrise'), 'sharad_navami': ('ashvina','shukla',9,'madhyahna'), 'dussehra': ('ashvina','shukla',10,'aparahna'), 'sharad_purnima': ('ashvina','shukla',15,'moonrise'),
 'karwa_chauth': ('kartika','krishna',4,'moonrise'), 'ahoi_ashtami': ('kartika','krishna',8,'pradosh'), 'dhanteras': ('kartika','krishna',13,'pradosh'),
 'naraka_chaturdashi': ('kartika','krishna',14,'moonrise'), 'diwali': ('kartika','krishna',15,'pradosh'), 'govardhan': ('kartika','shukla',1,'sunrise'),
 'bhai_dooj': ('kartika','shukla',2,'aparahna'), 'chhath_sandhya': ('kartika','shukla',6,'sunset'), 'dev_uthani': ('kartika','shukla',11,'sunrise'), 'kartik_purnima': ('kartika','shukla',15,'pradosh'),
 'vivah_panchami': ('margashirsha','shukla',5,'madhyahna'), 'sakat_chauth': ('magha','krishna',4,'moonrise'), 'mauni_amavasya': ('magha','krishna',15,'sunrise'),
 'basant_panchami': ('magha','shukla',5,'madhyahna'), 'maha_shivratri': ('phalguna','krishna',14,'nishita'), 'holika_dahan': ('phalguna','shukla',15,'pradosh'),
}

def tithi_span_around(jd):
    """exact start/end (IST strings) of the tithi that is running at jd"""
    n = tithi_n(jd)
    lo, hi = jd - 1.3, jd
    for _ in range(40):
        mid = (lo + hi) / 2
        if tithi_n(mid) == n: hi = mid
        else: lo = mid
    start = hi
    lo, hi = jd, jd + 1.3
    for _ in range(40):
        mid = (lo + hi) / 2
        if tithi_n(mid) == n: lo = mid
        else: hi = mid
    return ist_of(start).strftime('%Y-%m-%d %H:%M'), ist_of(hi).strftime('%Y-%m-%d %H:%M')

KINDS = ['sunrise', 'madhyahna', 'aparahna', 'sunset', 'pradosh', 'nishita', 'moonrise']

def run(y0, y1):
    months = build(y0, y1)
    day0, day1 = dt.datetime(y0, 1, 1), dt.datetime(y1, 12, 31)
    days = [day0 + dt.timedelta(days=i) for i in range((day1 - day0).days + 1)]
    inst = {d: instants(d, d + dt.timedelta(days=1)) for d in days}
    out = {}
    for key, (mon, paksha, tip, at) in RULES.items():
        want_month = MONTHS.index(mon); want = tip if paksha == 'shukla' else tip + 15
        per_kind = {}
        for kind in KINDS:
            hits = []
            for d in days:
                t = inst[d][kind]
                if tithi_n(t) != want: continue
                name, adhik = month_at(months, t)
                purn = name if want <= 15 else (name + 1) % 12
                if adhik or purn != want_month: continue
                hits.append(d)
            per_kind[kind] = hits
        # one entry per festival occurrence (group the primary-rule hits; fall back to the day the tithi starts)
        prim = per_kind[at]
        occ = [h for i, h in enumerate(prim) if i == 0 or (h - prim[i - 1]).days > 2]
        rows = []
        for h in occ:
            cands = sorted({x for k in KINDS for x in per_kind[k] if abs((x - h).days) <= 2})
            t = inst[h][at]
            s_, e_ = tithi_span_around(t)
            rows.append({'p': h.strftime('%Y-%m-%d'), 'c': [c.strftime('%Y-%m-%d') for c in cands], 's': s_, 'e': e_, 'f': 0})
        # lunar months where the tithi never prevails at the chosen moment (kshaya): use the day it begins
        jd, end = jd_of(day0 - IST), jd_of(day1 - IST)
        while jd < end:
            if tithi_n(jd) != want and tithi_n(jd + 0.25) == want:
                lo, hi = jd, jd + 0.25
                for _ in range(30):
                    mid = (lo + hi) / 2
                    if tithi_n(mid) == want: hi = mid
                    else: lo = mid
                start = hi
                name, adhik = month_at(months, start + 0.4)
                purn = name if want <= 15 else (name + 1) % 12
                if name is not None and not adhik and purn == want_month:
                    sd = ist_of(start)
                    if not any(abs((dt.datetime.strptime(r['p'], '%Y-%m-%d') - sd).days) <= 2 for r in rows):
                        day = sd if sd.hour < 15 else sd + dt.timedelta(days=1)
                        s_, e_ = tithi_span_around(start + 0.1)
                        rows.append({'p': day.strftime('%Y-%m-%d'), 'c': [day.strftime('%Y-%m-%d')], 's': s_, 'e': e_, 'f': 1})
                jd = start + 1
            else: jd += 0.25
        rows.sort(key=lambda r: r['p'])
        out[key] = rows
    adhik = [(ist_of(s).strftime('%Y-%m-%d'), ist_of(e).strftime('%Y-%m-%d'), MONTHS[n]) for s, e, n, a in months if a and y0 <= ist_of(s).year <= y1]
    return out, adhik

if __name__ == '__main__':
    y0 = int(sys.argv[1]) if len(sys.argv) > 1 else 2026
    y1 = int(sys.argv[2]) if len(sys.argv) > 2 else 2028
    res, adhik = run(y0, y1)
    root = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'lib')
    with open(os.path.join(root, 'festival-data.js'), 'w', encoding='utf8') as fh:
        fh.write(f'// GENERATED by scripts/generate-festivals.py for {y0}-{y1} — Delhi reference, IST civil dates (p = date by the usual rule, c = every day other common rules would pick, s/e = the tithi exact start and end, f = 1 when the tithi never prevails at the usual moment).\n'
                 f'export const FESTIVAL_RANGE = {json.dumps([y0, y1])};\nexport const ADHIKA = {json.dumps(adhik)};\n'
                 f'export const FESTIVAL_DATES = {json.dumps(res, indent=0, separators=(",", ":"))};\n')
    print('adhika:', adhik); print({k: len(v) for k, v in res.items()})
