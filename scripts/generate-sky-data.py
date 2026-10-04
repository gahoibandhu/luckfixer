#!/usr/bin/env python3
"""Generates lib/saturn-ingress.js and lib/vrat-data.js with pyswisseph (Lahiri, Moshier ephemeris).
Run:  pip install pyswisseph && python3 scripts/generate-sky-data.py [START_YEAR] [END_YEAR]
Re-run once a year to extend the vrat calendar. Times are IST (UTC+5:30); udaya = Delhi sunrise."""
import sys, json, datetime as dt, os
import swisseph as swe
swe.set_sid_mode(swe.SIDM_LAHIRI)
IST = dt.timedelta(hours=5, minutes=30)
DELHI = (77.2090, 28.6139, 0.0)
FL = swe.FLG_SIDEREAL

def lon(jd, body): return swe.calc_ut(jd, body, FL)[0][0] % 360
def jd_of(d): return swe.julday(d.year, d.month, d.day, d.hour + d.minute / 60 + d.second / 3600)
def dt_of(jd):
    y, m, d, h = swe.revjul(jd); return dt.datetime(y, m, d) + dt.timedelta(hours=h)
def ist(jd): return (dt_of(jd) + IST)
def elong(jd): return (lon(jd, swe.MOON) - lon(jd, swe.SUN)) % 360
def tithi_no(jd): return int(elong(jd) // 12) + 1          # 1..30

def bisect(f, a, b, target_fn, iters=40):
    for _ in range(iters):
        m = (a + b) / 2
        if target_fn(f(m)): b = m
        else: a = m
    return (a + b) / 2

# ── Saturn sign stays ───────────────────────────────────────────
def saturn_stays(y0, y1):
    """Saturn sidereal sign stays with EXACT ingress days: a stay starts on the IST date of the ingress instant
    and ends on the IST date of the next ingress (so consecutive stays share the boundary date)."""
    ing = []                                              # (sign_after, jd of ingress)
    d = dt.datetime(y0, 1, 1); end = dt.datetime(y1, 12, 31)
    jd = jd_of(d - IST); cur = int(lon(jd, swe.SATURN) // 30)
    first = cur
    while d <= end:
        nxt = d + dt.timedelta(days=1)
        j0, j1 = jd_of(d - IST), jd_of(nxt - IST)
        s1 = int(lon(j1, swe.SATURN) // 30)
        if s1 != cur:
            t = bisect(lambda x: x, j0, j1, lambda x: int(lon(x, swe.SATURN) // 30) == s1)
            ing.append((s1, t)); cur = s1
        d = nxt
    stays, sign, start = [], first, dt.datetime(y0, 1, 1)
    for s1, t in ing:
        day = ist(t).strftime('%Y-%m-%d')
        stays.append({'s': sign, 'from': start.strftime('%Y-%m-%d'), 'to': day}); sign, start = s1, dt.datetime.strptime(day, '%Y-%m-%d')
    stays.append({'s': sign, 'from': start.strftime('%Y-%m-%d'), 'to': end.strftime('%Y-%m-%d')})
    return stays

# ── Tithi boundaries + udaya dates ──────────────────────────────
def tithi_span(k, jd_start, jd_end):
    """all [start,end) JD spans of tithi k inside [jd_start, jd_end]"""
    spans, step = [], 0.25
    jd = jd_start
    while jd < jd_end:
        if tithi_no(jd) != k and tithi_no(jd + step) == k:
            s = bisect(lambda x: x, jd, jd + step, lambda x: tithi_no(x) == k)
            e = s + 0.5
            while tithi_no(e) == k: e += 0.25
            e = bisect(lambda x: x, e - 0.25, e, lambda x: tithi_no(x) != k)
            spans.append((s, e)); jd = e
        else: jd += step
    return spans

def rise_set(date, rising):
    jd0 = swe.julday(date.year, date.month, date.day, 0.0) - 5.5 / 24
    flag = swe.CALC_RISE if rising else swe.CALC_SET
    return swe.rise_trans(jd0, swe.SUN, flag, DELHI, 1013.25, 15.0)[1][0]

def vrat(y0, y1):
    out = []
    start = dt.datetime(y0, 1, 1); end = dt.datetime(y1, 12, 31)
    jd0, jd1 = jd_of(start - IST), jd_of(end - IST)
    kinds = [(11, 'ekadashi', 'shukla'), (26, 'ekadashi', 'krishna'), (15, 'purnima', 'shukla'), (30, 'amavasya', 'krishna'),
             (13, 'pradosh', 'shukla'), (28, 'pradosh', 'krishna')]
    days = [start + dt.timedelta(days=i) for i in range((end - start).days + 1)]
    sunrise_t = {d: tithi_no(rise_set(d, True)) for d in days}
    sunset_t  = {d: tithi_no(rise_set(d, False)) for d in days}
    for k, kind, paksha in kinds:
        for s, e in tithi_span(k, jd0, jd1):
            dates = [d.strftime('%Y-%m-%d') for d in days if (sunset_t[d] if kind == 'pradosh' else sunrise_t[d]) == k]
            # keep only dates that fall inside/near this span (a tithi repeats every ~29.5 days)
            near = [x for x in dates if abs((dt.datetime.strptime(x, '%Y-%m-%d') - ist(s)).days) <= 2]
            fb = 0
            if not near and kind == 'pradosh':
                # tithi begins shortly after sunset and ends before the next one: pradosh kaal is that evening
                near = [ist(s).strftime('%Y-%m-%d')]; fb = 1
            if not near and kind != 'pradosh':
                # kshaya case: the tithi starts after one sunrise and ends before the next -> observed on the day it starts
                st = ist(s); near = [(st if st.hour < 15 else st + dt.timedelta(days=1)).strftime('%Y-%m-%d')]; fb = 1
            out.append({'k': kind, 'p': paksha, 'start': ist(s).strftime('%Y-%m-%d %H:%M'), 'end': ist(e).strftime('%Y-%m-%d %H:%M'), 'dates': near, 'f': fb})
    out.sort(key=lambda r: r['start'])
    return out

def sankranti(y0, y1):
    out = []; jd = jd_of(dt.datetime(y0, 1, 1) - IST); jd_end = jd_of(dt.datetime(y1, 12, 31) - IST)
    prev = int(lon(jd, swe.SUN) // 30)
    while jd < jd_end:
        nxt = jd + 1
        s = int(lon(nxt, swe.SUN) // 30)
        if s != prev:
            t = bisect(lambda x: x, jd, nxt, lambda x: int(lon(x, swe.SUN) // 30) == s)
            out.append({'sign': s, 'at': ist(t).strftime('%Y-%m-%d %H:%M')}); prev = s
        jd = nxt
    return out

if __name__ == '__main__':
    y0 = int(sys.argv[1]) if len(sys.argv) > 1 else 2026
    y1 = int(sys.argv[2]) if len(sys.argv) > 2 else 2028
    root = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'lib')
    sat = saturn_stays(2000, 2070)
    open(os.path.join(root, 'saturn-ingress.js'), 'w', encoding='utf8').write(
        '// GENERATED by scripts/generate-sky-data.py — Saturn sidereal (Lahiri) sign stays, IST dates.\n// s = sign index 0..11 (Aries..Pisces). A sign can appear twice in a row-ish because of retrograde re-entry.\nexport const SATURN_STAYS = ' + json.dumps(sat, separators=(',', ':')) + ';\n')
    v = vrat(y0, y1); sk = sankranti(y0, y1)
    open(os.path.join(root, 'vrat-data.js'), 'w', encoding='utf8').write(
        f'// GENERATED by scripts/generate-sky-data.py for {y0}-{y1} — tithi spans (IST) + Sun sidereal sankranti.\n// dates = civil dates on which the tithi prevails at Delhi sunrise (pradosh: at sunset). Other cities/traditions can differ by a day.\n'
        'export const VRAT_RANGE = ' + json.dumps([y0, y1]) + ';\nexport const VRATS = ' + json.dumps(v, separators=(',', ':'), ensure_ascii=False) + ';\nexport const SANKRANTIS = ' + json.dumps(sk, separators=(',', ':')) + ';\n')
    print('saturn stays', len(sat), '| vrats', len(v), '| sankrantis', len(sk))
