import json, subprocess, sys, swisseph as swe
cities = {'Delhi': (28.6139, 77.2090), 'Mumbai': (19.0760, 72.8777), 'Rourkela': (22.2604, 84.8536), 'Guwahati': (26.1445, 91.7362), 'Chennai': (13.0827, 80.2707)}
dates = [(2026, 10, 2), (2026, 12, 21), (2027, 6, 21)]
js = "const p=require('/tmp/audit-pg.cjs');const out={};const C=%s;const D=%s;for(const [n,[la,lo]] of Object.entries(C))for(const [y,m,d] of D){out[n+y+'-'+m+'-'+d]=[p.sunrise(y,m,d,la,lo),p.sunset(y,m,d,la,lo)];}console.log(JSON.stringify(out));" % (json.dumps(cities), json.dumps(dates))
res = json.loads(subprocess.run(['node', '-e', js], capture_output=True, text=True).stdout)
worst = 0
for n, (la, lo) in cities.items():
    for (y, m, d) in dates:
        jd0 = swe.julday(y, m, d, 0.0) - 5.5 / 24
        r = swe.rise_trans(jd0, swe.SUN, swe.CALC_RISE, (lo, la, 0.0), 1013.25, 15.0)[1][0]
        s = swe.rise_trans(jd0, swe.SUN, swe.CALC_SET, (lo, la, 0.0), 1013.25, 15.0)[1][0]
        a = res[f'{n}{y}-{m}-{d}']
        worst = max(worst, abs(a[0] - (r - jd0) * 1440), abs(a[1] - (s - jd0) * 1440))
print('worst sunrise/sunset difference vs Swiss Ephemeris: %.2f min' % worst); sys.exit(1 if worst > 1.0 else 0)
