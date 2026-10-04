# Accuracy audit for the public pages

`bash scripts/audit/run.sh` (needs `pip install pyswisseph`, Node 20+)

1. **panchang-reference.cjs** — Delhi, Sat 3 Oct 2026, compared with values published online (sunrise, Rahu Kaal,
   Yamaganda, Gulika, tithi/nakshatra/yoga/karana end-times, Moon sign). Tolerance: 3 minutes.
2. **panchang-random** — 300 random (date, city) pairs 2026-2028: the element prevailing at the city's sunrise from our tables
   vs a direct Swiss Ephemeris computation at that instant.
3. **sunrise-vs-swisseph.py** — our NOAA sunrise/sunset vs Swiss Ephemeris `rise_trans` for 5 cities x 3 dates (tolerance 1 min).

Not covered here: the generated vrat/saturn data (see scripts/generate-sky-data.py) and the logged-in app's Ashtakoota engine.
Add a reference block to panchang-reference.cjs every time you find a trustworthy published panchang for another date/city.
