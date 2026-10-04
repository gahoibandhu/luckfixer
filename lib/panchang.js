// lib/panchang.js — pure functions: sunrise/sunset (NOAA algorithm), Rahukaal, Abhijit, Choghadiya.
// No network, no AI. Times are returned in minutes-from-midnight IST (Asia/Kolkata, UTC+5:30).

const rad = (d) => (d * Math.PI) / 180;
const deg = (r) => (r * 180) / Math.PI;

function julianDay(y, m, d) {            // 0h UT Julian day of a Gregorian date
  if (m <= 2) { y -= 1; m += 12; }
  const A = Math.floor(y / 100), B = 2 - A + Math.floor(A / 4);
  return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + d + B - 1524.5;
}

function sunEvent(y, m, d, lat, lng, rising) {
  // NOAA solar position approximation; solar zenith 90.833 deg (refraction + solar radius)
  const jd0 = julianDay(y, m, d);
  const calc = (tMin) => {
    const jc = (jd0 + tMin / 1440 - 2451545) / 36525;
    const L0 = (280.46646 + jc * (36000.76983 + jc * 0.0003032)) % 360;
    const M = 357.52911 + jc * (35999.05029 - 0.0001537 * jc);
    const e = 0.016708634 - jc * (0.000042037 + 0.0000001267 * jc);
    const C = Math.sin(rad(M)) * (1.914602 - jc * (0.004817 + 0.000014 * jc)) + Math.sin(rad(2 * M)) * (0.019993 - 0.000101 * jc) + Math.sin(rad(3 * M)) * 0.000289;
    const trueLong = L0 + C;
    const omega = 125.04 - 1934.136 * jc;
    const lambda = trueLong - 0.00569 - 0.00478 * Math.sin(rad(omega));
    const eps0 = 23 + (26 + (21.448 - jc * (46.815 + jc * (0.00059 - jc * 0.001813))) / 60) / 60;
    const eps = eps0 + 0.00256 * Math.cos(rad(omega));
    const decl = deg(Math.asin(Math.sin(rad(eps)) * Math.sin(rad(lambda))));
    const y2 = Math.tan(rad(eps / 2)) ** 2;
    const eqTime = 4 * deg(y2 * Math.sin(2 * rad(L0)) - 2 * e * Math.sin(rad(M)) + 4 * e * y2 * Math.sin(rad(M)) * Math.cos(2 * rad(L0)) - 0.5 * y2 * y2 * Math.sin(4 * rad(L0)) - 1.25 * e * e * Math.sin(2 * rad(M)));
    const ha = deg(Math.acos(Math.cos(rad(90.833)) / (Math.cos(rad(lat)) * Math.cos(rad(decl))) - Math.tan(rad(lat)) * Math.tan(rad(decl))));
    return { eqTime, ha: rising ? ha : -ha };
  };
  let t = 720, r = calc(t);                       // refine twice around the first estimate
  for (let i = 0; i < 2; i++) {
    t = 720 - 4 * (lng + r.ha) - r.eqTime;        // minutes UT
    r = calc(t);
  }
  const utMin = 720 - 4 * (lng + r.ha) - r.eqTime;
  return (utMin + 330 + 1440) % 1440;             // -> IST minutes from midnight
}

export const sunrise = (y, m, d, lat, lng) => sunEvent(y, m, d, lat, lng, true);
export const sunset  = (y, m, d, lat, lng) => sunEvent(y, m, d, lat, lng, false);

export function fmt(min) {
  const m = Math.round(min);
  const h = Math.floor(((m % 1440) + 1440) % 1440 / 60), mm = ((m % 60) + 60) % 60;
  const ap = h >= 12 ? 'PM' : 'AM';
  return `${((h + 11) % 12) + 1}:${String(mm).padStart(2, '0')} ${ap}`;
}

// Rahukaal = which eighth of the day-light (counted from sunrise) belongs to Rahu, by weekday (0 = Sunday)
const RAHU_SLOT = [8, 2, 7, 5, 6, 4, 3];
const YAMA_SLOT = [5, 4, 3, 2, 1, 7, 6];   // Yamaganda: Sun..Sat
const GULIKA_SLOT = [7, 6, 5, 4, 3, 2, 1];  // Gulika Kaal: Sun..Sat
// Choghadiya cycle and the first day-slot for each weekday
const CHO = [
  { hi: 'उद्वेग', en: 'Udveg', q: 'avoid' }, { hi: 'चल', en: 'Chal', q: 'neutral' }, { hi: 'लाभ', en: 'Labh', q: 'good' },
  { hi: 'अमृत', en: 'Amrit', q: 'good' }, { hi: 'काल', en: 'Kaal', q: 'avoid' }, { hi: 'शुभ', en: 'Shubh', q: 'good' }, { hi: 'रोग', en: 'Rog', q: 'avoid' },
];
const CHO_DAY_START = [0, 3, 6, 2, 5, 1, 4];   // Sun Udveg, Mon Amrit, Tue Rog, Wed Labh, Thu Shubh, Fri Chal, Sat Kaal

export function dayTimings(y, m, d, weekday, lat, lng) {
  const sr = sunrise(y, m, d, lat, lng), ss = sunset(y, m, d, lat, lng);
  const day = ss - sr, slot = day / 8;
  const rs = sr + slot * (RAHU_SLOT[weekday] - 1);
  const noon = sr + day / 2;
  const dayCho = Array.from({ length: 8 }, (_, i) => ({ ...CHO[(CHO_DAY_START[weekday] + i) % 7], from: sr + slot * i, to: sr + slot * (i + 1) }));
  return {
    sunrise: sr, sunset: ss,
    rahukaal: { from: rs, to: rs + slot },
    yamaganda: { from: sr + slot * (YAMA_SLOT[weekday] - 1), to: sr + slot * YAMA_SLOT[weekday] },
    gulika: { from: sr + slot * (GULIKA_SLOT[weekday] - 1), to: sr + slot * GULIKA_SLOT[weekday] },
    abhijit: { from: sr + (day / 15) * 7, to: sr + (day / 15) * 8 },     // 8th of 15 daytime muhurtas
    dayCho,                       // night choghadiya intentionally omitted: its sequence differs between almanacs
  };
}

// 27 yogas / nakshatras (names only; positions come from the ephemeris service)
export const YOGAS = [
  ['विष्कम्भ','Vishkambha'],['प्रीति','Priti'],['आयुष्मान','Ayushman'],['सौभाग्य','Saubhagya'],['शोभन','Shobhana'],['अतिगण्ड','Atiganda'],
  ['सुकर्मा','Sukarma'],['धृति','Dhriti'],['शूल','Shula'],['गण्ड','Ganda'],['वृद्धि','Vriddhi'],['ध्रुव','Dhruva'],['व्याघात','Vyaghata'],
  ['हर्षण','Harshana'],['वज्र','Vajra'],['सिद्धि','Siddhi'],['व्यतीपात','Vyatipata'],['वरीयान','Variyana'],['परिघ','Parigha'],['शिव','Shiva'],
  ['सिद्ध','Siddha'],['साध्य','Sadhya'],['शुभ','Shubha'],['शुक्ल','Shukla'],['ब्रह्म','Brahma'],['इन्द्र','Indra'],['वैधृति','Vaidhriti'],
].map(([hi, en]) => ({ hi, en }));
export const yogaIndex = (sunDeg, moonDeg) => Math.floor((((sunDeg + moonDeg) % 360) + 360) % 360 / (360 / 27));

export const CITIES = [
  { slug: 'delhi', hi: 'दिल्ली', en: 'Delhi', lat: 28.6139, lng: 77.2090 }, { slug: 'mumbai', hi: 'मुंबई', en: 'Mumbai', lat: 19.0760, lng: 72.8777 },
  { slug: 'kolkata', hi: 'कोलकाता', en: 'Kolkata', lat: 22.5726, lng: 88.3639 }, { slug: 'chennai', hi: 'चेन्नई', en: 'Chennai', lat: 13.0827, lng: 80.2707 },
  { slug: 'bengaluru', hi: 'बेंगलुरु', en: 'Bengaluru', lat: 12.9716, lng: 77.5946 }, { slug: 'hyderabad', hi: 'हैदराबाद', en: 'Hyderabad', lat: 17.3850, lng: 78.4867 },
  { slug: 'ahmedabad', hi: 'अहमदाबाद', en: 'Ahmedabad', lat: 23.0225, lng: 72.5714 }, { slug: 'pune', hi: 'पुणे', en: 'Pune', lat: 18.5204, lng: 73.8567 },
  { slug: 'jaipur', hi: 'जयपुर', en: 'Jaipur', lat: 26.9124, lng: 75.7873 }, { slug: 'lucknow', hi: 'लखनऊ', en: 'Lucknow', lat: 26.8467, lng: 80.9462 },
  { slug: 'bhopal', hi: 'भोपाल', en: 'Bhopal', lat: 23.2599, lng: 77.4126 }, { slug: 'patna', hi: 'पटना', en: 'Patna', lat: 25.5941, lng: 85.1376 },
  { slug: 'bhubaneswar', hi: 'भुवनेश्वर', en: 'Bhubaneswar', lat: 20.2961, lng: 85.8245 }, { slug: 'rourkela', hi: 'राउरकेला', en: 'Rourkela', lat: 22.2604, lng: 84.8536 },
  { slug: 'jhansi', hi: 'झाँसी', en: 'Jhansi', lat: 25.4484, lng: 78.5685 }, { slug: 'kanpur', hi: 'कानपुर', en: 'Kanpur', lat: 26.4499, lng: 80.3319 },
  { slug: 'varanasi', hi: 'वाराणसी', en: 'Varanasi', lat: 25.3176, lng: 82.9739 }, { slug: 'indore', hi: 'इंदौर', en: 'Indore', lat: 22.7196, lng: 75.8577 },
  { slug: 'nagpur', hi: 'नागपुर', en: 'Nagpur', lat: 21.1458, lng: 79.0882 }, { slug: 'guwahati', hi: 'गुवाहाटी', en: 'Guwahati', lat: 26.1445, lng: 91.7362 },
];
export const cityBySlug = (s) => CITIES.find(c => c.slug === s) || null;
