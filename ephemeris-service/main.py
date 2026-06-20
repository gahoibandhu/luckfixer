# ephemeris-service/main.py
#
# Real Swiss Ephemeris microservice using pyswisseph.
# Deploy this on Render.com (free tier) as a SEPARATE service from the
# main Next.js app.
#
# Endpoint: POST /positions
# Body: {"dob":"1984-03-06","time":"10:30","lat":28.6139,"lng":77.2090,"ayanamsa":"lahiri"}
# Returns: { "engine": "pyswisseph", "planets": [ ... ] }
#
# Each planet object matches the shape expected by lib/astro-facts.js:
#   name, nameHi, degree, sign, signHi, inSign, nakshatra, pada,
#   combust, retro, d9Sign

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import swisseph as swe

app = FastAPI(title="Luckfixer Ephemeris Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

AYANAMSA_MODES = {
    "lahiri": swe.SIDM_LAHIRI,
    "raman": swe.SIDM_RAMAN,
    "kp": swe.SIDM_KRISHNAMURTI,
    "fagan": swe.SIDM_FAGAN_BRADLEY,
}

PLANET_CODES = {
    "Sun": swe.SUN,
    "Moon": swe.MOON,
    "Mercury": swe.MERCURY,
    "Venus": swe.VENUS,
    "Mars": swe.MARS,
    "Jupiter": swe.JUPITER,
    "Saturn": swe.SATURN,
    "Rahu": swe.MEAN_NODE,
}

SIGNS = ['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces']
SIGNS_HI = ['मेष','वृषभ','मिथुन','कर्क','सिंह','कन्या','तुला','वृश्चिक','धनु','मकर','कुम्भ','मीन']
NAKSHATRAS = ['Ashwini','Bharani','Krittika','Rohini','Mrigashira','Ardra','Punarvasu','Pushya','Ashlesha','Magha','Purva Phalguni','Uttara Phalguni','Hasta','Chitra','Swati','Vishakha','Anuradha','Jyeshtha','Moola','Purva Ashadha','Uttara Ashadha','Shravana','Dhanishtha','Shatabhisha','Purva Bhadrapada','Uttara Bhadrapada','Revati']
PLANETS_HI = {'Sun':'सूर्य','Moon':'चंद्र','Mercury':'बुध','Venus':'शुक्र','Mars':'मंगल','Jupiter':'बृहस्पति','Saturn':'शनि','Rahu':'राहु','Ketu':'केतु'}


class PositionsRequest(BaseModel):
    dob: str        # "YYYY-MM-DD"
    time: str       # "HH:MM" (local clock time at birth place)
    lat: float
    lng: float
    ayanamsa: str = "lahiri"


def navamsa_sign_index(sidereal_deg: float) -> int:
    """D9 (Navamsa) sign index — each 30 deg sign divided into 9 parts of 3deg20'."""
    sign_idx = int(sidereal_deg // 30)
    part_idx = int((sidereal_deg % 30) // (30.0 / 9))
    return (sign_idx * 9 + part_idx) % 12


def planet_obj(name, sidereal_deg, retro):
    sign_idx = int(sidereal_deg // 30)
    in_sign = sidereal_deg % 30
    nak_idx = int(sidereal_deg // (360.0 / 27))
    pada = int((sidereal_deg % (360.0 / 27)) // ((360.0 / 27) / 4)) + 1
    return {
        "name": name,
        "nameHi": PLANETS_HI[name],
        "degree": round(sidereal_deg, 7),
        "sign": SIGNS[sign_idx],
        "signHi": SIGNS_HI[sign_idx],
        "inSign": round(in_sign, 4),
        "nakshatra": NAKSHATRAS[nak_idx],
        "pada": pada,
        "retro": retro,
        "d9Sign": SIGNS[navamsa_sign_index(sidereal_deg)],
    }


@app.get("/")
def health():
    return {"status": "ok", "service": "luckfixer-ephemeris", "engine": "pyswisseph"}


@app.post("/positions")
def get_positions(req: PositionsRequest):
    try:
        y, m, d = map(int, req.dob.split("-")[:3])
        time_parts = req.time.split(":")
        h, mi = int(time_parts[0]), int(time_parts[1])

        # Local Mean Time -> UT approximation using longitude
        # (matches the convention used by the other ephemeris tiers,
        # since no explicit timezone is collected from the user)
        ut_hour = (h + mi / 60.0) - (req.lng / 15.0)

        jd = swe.julday(y, m, d, ut_hour)

        ayanamsa_const = AYANAMSA_MODES.get(req.ayanamsa.lower(), swe.SIDM_LAHIRI)
        swe.set_sid_mode(ayanamsa_const, 0, 0)

        results = []
        for name, code in PLANET_CODES.items():
            pos, _ = swe.calc_ut(jd, code, swe.FLG_SIDEREAL | swe.FLG_SPEED)
            sidereal_deg = pos[0] % 360
            retro = pos[3] < 0
            results.append(planet_obj(name, sidereal_deg, retro))

        # Ketu = Rahu + 180 deg
        rahu = next(p for p in results if p["name"] == "Rahu")
        ketu_deg = (rahu["degree"] + 180) % 360
        ketu = planet_obj("Ketu", ketu_deg, rahu["retro"])
        results.append(ketu)

        # Combustion: within 6 deg of Sun (excluding Sun/Moon/Rahu/Ketu)
        sun_deg = next(p["degree"] for p in results if p["name"] == "Sun")
        for p in results:
            if p["name"] in ("Sun", "Moon", "Rahu", "Ketu"):
                p["combust"] = False
            else:
                diff = abs(p["degree"] - sun_deg)
                diff = min(diff, 360 - diff)
                p["combust"] = diff < 6

        # ── Ascendant (Lagna) ─────────────────────────────────
        # swe.houses returns (cusps, ascmc); ascmc[0] = Ascendant (tropical)
        # Apply same sidereal correction (ayanamsa) as planets
        ayanamsa_value = swe.get_ayanamsa_ut(jd)
        _, ascmc = swe.houses(jd, req.lat, req.lng, b'P')  # Placidus house system
        asc_tropical = ascmc[0]
        asc_sidereal = (asc_tropical - ayanamsa_value) % 360

        lagna_sign_idx = int(asc_sidereal // 30)
        lagna_in_sign = asc_sidereal % 30
        lagna_nak_idx = int(asc_sidereal // (360.0 / 27))
        lagna_pada = int((asc_sidereal % (360.0 / 27)) // ((360.0 / 27) / 4)) + 1

        lagna = {
            "sign": SIGNS[lagna_sign_idx],
            "signHi": SIGNS_HI[lagna_sign_idx],
            "degree": round(asc_sidereal, 7),
            "inSign": round(lagna_in_sign, 4),
            "nakshatra": NAKSHATRAS[lagna_nak_idx],
            "pada": lagna_pada,
            "d9Sign": SIGNS[navamsa_sign_index(asc_sidereal)],
        }

        return {"engine": "pyswisseph", "planets": results, "lagna": lagna}

    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
