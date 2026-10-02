# Reverse-mapping: what actually triggered the known events?

Uses the TRUE birth time of confirmed cases (edit CASES in analyze.py) and pyswisseph (`pip install pyswisseph`):

- `python3 analyze.py`   — per event: MD/AD/PD lord links to the event houses + Jupiter/Saturn/Mars/Rahu transits
- `python3 rank.py`      — scores all 12 Lagnas with fixed criteria sets (dasha / transit / both / either) and prints where the TRUE Lagna ranks
- `python3 perevent.py`  — for each event, how many of the 12 Lagnas explain it as well as the true one (specificity)

Finding so far (2 cases, 9 events): events ARE explained in the true chart, but most events are explained equally well by
many wrong Lagnas, so rectification from 4-5 events can shortlist Lagnas, not pick a single time window.
Add more confirmed cases before changing the production scoring.
