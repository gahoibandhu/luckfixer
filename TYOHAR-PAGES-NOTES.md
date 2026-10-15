# Autumn festival pages (overlay on astrobharat-admin-warning-fix.zip)

New pages /tyohar/<slug> (10): dussehra, karwa-chauth, ahoi-ashtami, dhanteras, choti-diwali, diwali, govardhan-puja, bhai-dooj, chhath, tulsi-vivah.
Each: dates 2026-2028 + tithi window (computed data), computed sunset / pradosh window / sunrise for Delhi, significance, samagri, vidhi steps, mantra, short katha, note.
Chhath shows the four days (Nahay-Khay, Kharna, Sandhya Arghya with sunset, Usha Arghya with sunrise) from the computed date.
Also: calendar + /tyohar index link to the pages; 20 new search cards (katha + vidhi per festival, with Hindi/Roman aliases: "दिवाली", Deepavali, Karva Chauth, Roop Chaudas...);
sitemap; search ranking improved (exact word beats prefix; the card's own name leads).

DRAFT FOR REVIEW - text is written by Claude from widely published traditional accounts (not from a source you supplied). Please have it read by someone who knows your tradition. Things to check:
 - Karwa Chauth katha: the Veeravati version is used; other versions (Karva dhobin, Savitri) exist. Moonrise is NOT computed (not in the data) - the page says "check your city's moonrise".
 - Bhai Dooj (10/11 Nov 2026) and Naraka Chaturdashi (7/8 Nov): the tithi spans two days; the page shows both and says "follow your local panchang". The primary date shown is the computed one.
 - Diwali: sthir-lagna muhurta is NOT computed; the page gives sunset + pradosh window and asks to check the local panchang.
 - Dussehra: only the afternoon (aparahna) guidance, no exact minute window.
 - Tulsi Vivah has no fixed single date (any day Dev Uthani..Kartik Purnima); it links to the Dev Uthani Ekadashi page.
 - Health notes were added for the waterless fasts (Karwa Chauth, Ahoi, Chhath).
Verified here: build OK; all 10 pages load; computed times look right (e.g. Diwali 8 Nov 2026 Delhi sunset 5:31 PM, pradosh to 7:55 PM; Chhath sandhya arghya 15 Nov sunset 5:28 PM);
search tests 16/16 (new) and 20/20 (old) pass. No SQL, no npm install.
