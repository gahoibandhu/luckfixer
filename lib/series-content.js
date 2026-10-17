// lib/series-content.js — short, original texts for the Pradosh, Purnima and Amavasya series pages (Hindi + English).
// Wording is deliberately "tradition says / मान्यता है": these are observances with regional variation, not scientific or guaranteed claims.
const S = (hi, en) => ({ hi, en });

export const PRADOSH = {
  intro: S('प्रदोष व्रत हर पक्ष की त्रयोदशी को भगवान शिव और माता पार्वती के लिए रखा जाता है। पूजा का समय प्रदोष काल है — सूर्यास्त के आसपास का समय, लगभग सूर्यास्त से 2 घंटे 24 मिनट तक। इसीलिए व्रत उस दिन माना जाता है जिस दिन त्रयोदशी प्रदोष काल में रहती है।',
           'Pradosh vrat is kept on the Trayodashi (13th tithi) of each fortnight for Lord Shiva and Goddess Parvati. The puja time is Pradosh Kaal — the hours around sunset, roughly sunset up to 2 hours 24 minutes after. The vrat is therefore kept on the day when Trayodashi is present in that evening window.'),
  kaal: S('प्रदोष काल का समय शहर के सूर्यास्त पर निर्भर है; नीचे का समय दिल्ली के लिए अनुमानित है। अपने शहर का सूर्यास्त देखकर पूजा का समय तय करें।',
          'Pradosh Kaal depends on your city’s sunset; the times below are approximate, for Delhi. Check your own sunset to fix the puja time.'),
  variants: {
    som: { hi: 'सोम प्रदोष', en: 'Som Pradosh', alt: S('सोमवार को पड़ने वाला प्रदोष', 'Pradosh falling on a Monday'),
      why: S('सोमवार भगवान शिव (और चंद्रमा) का दिन माना जाता है, इसलिए सोम प्रदोष को विशेष शुभ समझा जाता है। मान्यता है कि यह व्रत मन की शांति, स्वास्थ्य और परिवार के सुख की कामना से रखा जाता है।',
             'Monday is considered the day of Lord Shiva (and the Moon), so Som Pradosh is regarded as especially auspicious. Tradition says it is kept for peace of mind, health and family well-being.') },
    bhauma: { hi: 'भौम प्रदोष', en: 'Bhauma Pradosh', alt: S('मंगलवार को पड़ने वाला प्रदोष', 'Pradosh falling on a Tuesday'),
      why: S('मंगलवार (भौम) को पड़ने वाला प्रदोष भौम प्रदोष कहलाता है। परंपरा में इसे कर्ज़ के बोझ और स्वास्थ्य की परेशानियों से राहत की कामना से रखा जाता है; कई लोग इस दिन हनुमान जी का भी स्मरण करते हैं।',
             'Pradosh falling on a Tuesday (Bhauma) is called Bhauma Pradosh. Tradition keeps it with the wish for relief from debt and health worries; many also remember Hanuman ji on this day.') },
    shani: { hi: 'शनि प्रदोष', en: 'Shani Pradosh', alt: S('शनिवार को पड़ने वाला प्रदोष', 'Pradosh falling on a Saturday'),
      why: S('शनिवार को पड़ने वाला प्रदोष शनि प्रदोष कहलाता है। मान्यता है कि यह व्रत संतान की कामना और शनि से जुड़ी परेशानियों में राहत के लिए रखा जाता है।',
             'Pradosh falling on a Saturday is called Shani Pradosh. Tradition says it is kept for the wish for children and for relief from Saturn-related troubles.') },
  },
};

export const AMAVASYA = {
  intro: S('अमावस्या कृष्ण पक्ष की अंतिम तिथि है, जब चंद्रमा दिखाई नहीं देता। यह दिन पितरों के स्मरण, तर्पण, दान तथा जप-ध्यान के लिए उपयुक्त माना जाता है।',
           'Amavasya is the last tithi of the dark fortnight, when the Moon is not visible. Tradition holds it suitable for remembering ancestors, tarpan, giving, and japa and meditation.'),
  somvati: { hi: 'सोमवती अमावस्या', en: 'Somvati Amavasya', why: S('सोमवार को पड़ने वाली अमावस्या सोमवती अमावस्या कहलाती है और विशेष पुण्यदायी मानी जाती है। परंपरा में स्त्रियाँ इस दिन पीपल या वट की परिक्रमा करके परिवार की मंगल-कामना करती हैं।', 'An Amavasya falling on a Monday is called Somvati Amavasya and is held especially meritorious. By tradition women circumambulate a peepal or banyan tree on this day for the family’s well-being.') },
  shani: { hi: 'शनि अमावस्या', en: 'Shani Amavasya', why: S('शनिवार को पड़ने वाली अमावस्या शनि अमावस्या कहलाती है। इस दिन शनि-संबंधी पूजा, काले तिल या तेल का दान और पितरों के स्मरण की परंपरा है।', 'An Amavasya falling on a Saturday is called Shani Amavasya. The tradition is Saturn worship, giving black sesame or oil, and remembering ancestors.') },
};

// Purnima by lunar month. `fk` = festival key in lib/festivals.js (links to /tyohar and shows that festival's own date).
const F = (hi, en, fk) => ({ hi, en, fk });
export const PURNIMA = {
  chaitra:   { hi: 'चैत्र पूर्णिमा', en: 'Chaitra Purnima', fests: [F('हनुमान जयंती', 'Hanuman Jayanti', 'hanuman_jayanti')],
    why: S('हिंदू नववर्ष के पहले महीने की पूर्णिमा। उत्तर भारत में इसी दिन हनुमान जयंती मनाई जाती है।', 'The full moon of the first month of the Hindu year. In North India Hanuman Jayanti is celebrated on this day.') },
  vaishakha: { hi: 'वैशाख पूर्णिमा', en: 'Vaishakha Purnima', fests: [F('बुद्ध पूर्णिमा', 'Buddha Purnima')],
    why: S('वैशाख पूर्णिमा को बुद्ध पूर्णिमा के रूप में जाना जाता है। इस महीने में नदी-स्नान और दान का विशेष महत्त्व बताया गया है।', 'Vaishakha Purnima is known as Buddha Purnima. Bathing in rivers and giving in this month are held especially meritorious.') },
  jyeshtha:  { hi: 'ज्येष्ठ पूर्णिमा', en: 'Jyeshtha Purnima', fests: [F('वट पूर्णिमा (महाराष्ट्र, गुजरात, दक्षिण भारत में)', 'Vat Purnima (Maharashtra, Gujarat, South India)')],
    why: S('कई क्षेत्रों में सुहागिनें इस दिन वट सावित्री का व्रत रखती हैं। गंगा-स्नान और जल-दान की परंपरा भी है।', 'In several regions married women keep the Vat Savitri vrat on this day. Bathing in the Ganga and giving water are also traditional.') },
  ashadha:   { hi: 'आषाढ़ पूर्णिमा', en: 'Ashadha Purnima', fests: [F('गुरु पूर्णिमा / व्यास पूर्णिमा', 'Guru Purnima / Vyasa Purnima', 'guru_purnima')],
    why: S('गुरु पूर्णिमा पर गुरुजनों के प्रति श्रद्धा और कृतज्ञता प्रकट की जाती है। इसे महर्षि वेदव्यास से जोड़ा जाता है।', 'On Guru Purnima respect and gratitude are offered to teachers. It is associated with the sage Vedavyasa.') },
  shravana:  { hi: 'श्रावण पूर्णिमा', en: 'Shravana Purnima', fests: [F('रक्षाबंधन', 'Raksha Bandhan', 'raksha_bandhan'), F('श्रावणी उपाकर्म', 'Shravani Upakarma'), F('नारली पूर्णिमा (महाराष्ट्र)', 'Narali Purnima (Maharashtra)')],
    why: S('श्रावण की पूर्णिमा पर रक्षाबंधन मनाया जाता है। कई परंपराओं में इसी दिन श्रावणी उपाकर्म (जनेऊ बदलने) की रीति होती है।', 'Raksha Bandhan is celebrated on the Shravana full moon. In many traditions Shravani Upakarma (changing the sacred thread) is also done on this day.') },
  bhadrapada:{ hi: 'भाद्रपद पूर्णिमा', en: 'Bhadrapada Purnima', fests: [F('उमा-महेश्वर व्रत', 'Uma-Maheshwar vrat'), F('पितृ पक्ष का आरंभ अगले दिन', 'Pitru Paksha begins the next day', 'pitru_start')],
    why: S('इस पूर्णिमा के अगले दिन से पितृ पक्ष शुरू होता है। इस दिन सत्यनारायण कथा और दान की परंपरा भी है।', 'Pitru Paksha begins the day after this full moon. Satyanarayan katha and giving are also traditional on the day.') },
  ashwin:    { hi: 'आश्विन पूर्णिमा', en: 'Ashwin Purnima', fests: [F('शरद पूर्णिमा / कोजागरी', 'Sharad Purnima / Kojagari', 'sharad_purnima')],
    why: S('शरद पूर्णिमा पर चंद्रमा को वर्ष का सबसे उज्ज्वल माना जाता है। परंपरा में खीर चाँदनी में रखकर प्रसाद के रूप में ली जाती है और देवी लक्ष्मी की पूजा होती है।', 'On Sharad Purnima the Moon is held to be at its brightest of the year. By tradition kheer is kept in the moonlight and taken as prasad, and Goddess Lakshmi is worshipped.') },
  kartik:    { hi: 'कार्तिक पूर्णिमा', en: 'Kartik Purnima', fests: [F('कार्तिक पूर्णिमा / देव दीपावली', 'Kartik Purnima / Dev Deepawali', 'kartik_purnima'), F('गुरु नानक जयंती', 'Guru Nanak Jayanti')],
    why: S('कार्तिक मास का समापन। गंगा-स्नान और दीपदान का विशेष महत्त्व है; काशी में देव दीपावली मनाई जाती है और यही दिन गुरु नानक जयंती भी है।', 'The close of the month of Kartik. Bathing in the Ganga and lighting lamps are especially important; Kashi celebrates Dev Deepawali and the day is also Guru Nanak Jayanti.') },
  margashirsha: { hi: 'मार्गशीर्ष पूर्णिमा', en: 'Margashirsha Purnima', fests: [F('दत्तात्रेय जयंती', 'Dattatreya Jayanti')],
    why: S('इस पूर्णिमा पर दत्तात्रेय जयंती मनाई जाती है। अन्न और वस्त्र के दान तथा तीर्थ-स्नान की परंपरा है।', 'Dattatreya Jayanti is celebrated on this full moon. Giving food and clothes and bathing at tirthas are traditional.') },
  pausha:    { hi: 'पौष पूर्णिमा', en: 'Pausha Purnima', fests: [F('शाकंभरी पूर्णिमा', 'Shakambhari Purnima')],
    why: S('पौष पूर्णिमा से माघ-स्नान का आरंभ माना जाता है; प्रयागराज में माघ मेला इसी के आसपास शुरू होता है। देवी शाकंभरी की जयंती भी इसी दिन मानी जाती है।', 'Magha snan is considered to begin from Pausha Purnima; the Magha Mela at Prayagraj starts around it. Goddess Shakambhari’s Jayanti is also observed on this day.') },
  magha:     { hi: 'माघ पूर्णिमा', en: 'Magha Purnima', fests: [F('माघ स्नान की पूर्णता', 'End of Magha snan'), F('गुरु रविदास जयंती', 'Guru Ravidas Jayanti')],
    why: S('माघ पूर्णिमा पर माघ-स्नान और कल्पवास का समापन होता है। इसे तीर्थ-स्नान के लिए अत्यंत पुण्यदायी माना जाता है।', 'Magha snan and kalpavas conclude on Magha Purnima, which is held very meritorious for bathing at tirthas.') },
  phalguna:  { hi: 'फाल्गुन पूर्णिमा', en: 'Phalguna Purnima', fests: [F('होलिका दहन', 'Holika Dahan', 'holika_dahan'), F('होली अगले दिन', 'Holi the next day')],
    why: S('फाल्गुन पूर्णिमा की संध्या पर होलिका दहन होता है और अगले दिन रंगों की होली खेली जाती है।', 'Holika Dahan is performed on the evening of Phalguna Purnima and the festival of colours follows the next day.') },
  adhik:     { hi: 'अधिक मास की पूर्णिमा', en: 'Purnima of the adhika masa', fests: [],
    why: S('यह पूर्णिमा केवल अधिक मास (पुरुषोत्तम मास) में आती है, लगभग तीन वर्ष में एक बार। इस मास में जप, दान और कथा-श्रवण का विशेष फल बताया गया है।', 'This Purnima falls only in an adhika masa (Purushottam month), roughly once in three years. Japa, giving and listening to kathas are said to carry special merit in this month.') },
};

export const SANKASHTI = {
  intro: S('संकष्टी चतुर्थी हर महीने कृष्ण पक्ष की चतुर्थी को भगवान गणेश के लिए रखा जाने वाला व्रत है। व्रत वाले दिन वह माना जाता है जिस दिन चंद्रोदय के समय चतुर्थी तिथि हो। व्रती दिन भर उपवास (प्रायः फलाहार) रखते हैं, संध्या को गणेश जी की पूजा करते हैं और चंद्रोदय के बाद चंद्रमा को अर्घ्य देकर व्रत खोलते हैं।',
           'Sankashti Chaturthi is a vrat kept every month on the Chaturthi of the Krishna paksha for Lord Ganesh. The vrat day is the one on which Chaturthi is present at moonrise. Devotees fast through the day (often on fruit), worship Ganesh ji in the evening and break the fast after offering arghya to the Moon once it rises.'),
  angarki: S('मंगलवार को पड़ने वाली संकष्टी चतुर्थी को अंगारकी चतुर्थी कहा जाता है; मान्यता है कि इसका विशेष पुण्य होता है।', 'A Sankashti Chaturthi that falls on a Tuesday is called Angarki Chaturthi; tradition holds it to be especially meritorious.'),
  vidhi: [
    S('सुबह स्नान करके व्रत का संकल्प लें और दिन भर उपवास रखें (स्वास्थ्य के अनुसार फलाहार लिया जा सकता है)।', 'Bathe in the morning, take the vrat sankalp and fast through the day (fruit may be taken as your health requires).'),
    S('संध्या को साफ़ स्थान पर गणेश जी की प्रतिमा या चित्र स्थापित करें और दीपक जलाएँ।', 'In the evening set up an idol or picture of Ganesh ji at a clean spot and light a lamp.'),
    S('दूर्वा, लाल फूल, रोली, अक्षत चढ़ाएँ और मोदक या लड्डू का भोग लगाएँ।', 'Offer durva grass, red flowers, roli and rice, and offer modak or laddu.'),
    S('“ॐ गं गणपतये नमः” का जप करें और गणेश जी की आरती करें।', 'Chant “Om Gam Ganapataye Namah” and perform Ganesh ji’s aarti.'),
    S('चंद्रोदय होने पर चंद्रमा को जल से अर्घ्य दें, फिर प्रसाद लेकर व्रत खोलें।', 'When the Moon rises offer arghya of water to it, then break the fast with prasad.'),
  ],
  note: S('चंद्रोदय का समय शहर के अनुसार बदलता है; नीचे दिल्ली का समय दिया है। अपने शहर का चंद्रोदय देखकर ही व्रत खोलें। जो उपवास कठिन हो, उसे अपने स्वास्थ्य के अनुसार हल्का कर सकते हैं।', 'Moonrise differs by city; Delhi’s time is shown below. Break the fast by your own city’s moonrise. If a fast is hard, lighten it as your health requires.'),
};
