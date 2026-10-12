# Chalisa PDFs -> text: what works, what does not (DRAFTS - not on the site)

ocr-drafts/*.txt = raw Hindi OCR of the 14 short PDFs (Hanuman, Shiv, Durga, Ganesh, Gayatri, Santoshi Maa, Laxmi, Krishna, Saraswati,
Shani Dev, Navgraha chalisa, Bajrang Baan, Gajendra Moksha, Shiv Tandav Stotram). They are working copies for review. Do NOT publish as-is.

Findings
 1. Copy/paste from these PDFs is scrambled (legacy fonts), so the PDFs cannot be used directly. OCR from page images works.
 2. OCR accuracy is roughly 95-97% (measured on Hanuman Chalisa vs the verified text already on the site). Typical misses: a dropped word,
    halant/matra slips (e.g. "युद्ध" read as "युदूध"). Not safe for devotional text without a proofreading pass.
 3. The PDFs themselves are web editions with typos/omissions. Shiv Chalisa example: "मुण्माल" (should be मुण्डमाल), and "किया तपहिं भारी"
    has no "भागीरथ" in the PDF; several lines also differ from the common printed version (e.g. "वो फ़ल पाहीं", "अस्तुति केहि विधि करूँ").
    So "same as the PDF" is not the same as "correct". Someone must choose the edition of record and sign off.
Proposed workflow per text: OCR (done) -> I proofread against the page image and mark every doubtful line -> you/your pandit approve -> add as a card.
Cost: about 4 page-views per chalisa. Not started on the site until you say which texts first, and which edition to follow.

Big PDFs (Durga Saptashati 159+150 pages, Sundarkand 21, Vishnu Sahasranama 32, Narayan Kavach 32, Shravan Mahatmya 325, Swar Vigyan 5):
OCR of Sanskrit with this many matras is not reliable enough for stotras/mantras, and hand proofreading hundreds of pages is not realistic.
For these, please send Unicode text if you have it (any source you trust), or decide to offer the PDF itself as a download/reader.
