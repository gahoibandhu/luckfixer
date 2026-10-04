import json, sys, swisseph as swe
swe.set_sid_mode(swe.SIDM_LAHIRI); FL = swe.FLG_SIDEREAL
rows = json.load(open('/tmp/audit-batch.json')); n = bad = 0
for r in rows:
    if r.get('none'): print('out of range', r); bad += 1; continue
    jd = swe.julday(r['y'], r['m'], r['d'], 0.0) + (r['sr'] - 330) / 1440.0
    mo = swe.calc_ut(jd, swe.MOON, FL)[0][0] % 360; su = swe.calc_ut(jd, swe.SUN, FL)[0][0] % 360
    exp = {'t': int(((mo - su) % 360) // 12), 'kr': int(((mo - su) % 360) // 6), 'nk': int(mo // (360 / 27)), 'yg': int(((mo + su) % 360) // (360 / 27)), 'ms': int(mo // 30), 'ss': int(su // 30)}
    n += 1
    if any(exp[k] != r[k] for k in exp): bad += 1; print('MISMATCH', r)
print(f'{n} random (date, city) pairs: {bad} mismatches'); sys.exit(1 if bad else 0)
