// lib/ram-shalaka.js
//
// "Ram Shalaka" / Akshar Prashnavali — a traditional practice where a
// person holds a question in mind, opens a sacred text (or, here, picks
// a random letter with eyes closed), and receives a verse as guidance.
//
// IMPORTANT — scope and honesty about this data:
// This is a CURATED starting set, not a reproduction of any specific
// published "Ram Shalaka Prashnavali" book's exact canonical letter-to-
// verse mapping (which varies between published editions and which we
// can't verify verse-for-verse). Instead, each entry here is a verse
// (from Ramcharitmanas or a well-known Sanskrit shloka — both public
// domain, centuries-old classical texts) that we are confident is
// accurately transcribed, indexed simply by its own starting letter.
// Coverage is intentionally partial (not all ~46 Devanagari letters) —
// only letters with a verse we're confident about are shown in the UI,
// rather than filling gaps with uncertain or fabricated content. This
// set can be expanded over time by someone with Sanskrit/Ramcharitmanas
// expertise verifying additional verses.
//
// Each entry:
//   letter      — the Devanagari letter shown on the grid
//   verse       — the verse text (Devanagari)
//   source      — where it's from
//   meaning     — a short, honest paraphrase of what the verse actually
//                 says (not an invented astrological prediction)
//   tone        — 'shubh' (encouraging) | 'dhairya' (patience/caution) |
//                 'saavdhani' (a gentler caution) — reflects the verse's
//                 own sentiment, not a fabricated yes/no prediction
export const RAM_SHALAKA_VERSES = [
  {
    letter: 'अ',
    verse: 'असतो मा सद्गमय। तमसो मा ज्योतिर्गमय। मृत्योर्मा अमृतं गमय॥',
    source: 'बृहदारण्यक उपनिषद',
    meaning: 'असत्य से सत्य की ओर, अंधकार से प्रकाश की ओर बढ़ने की प्रार्थना। यह संकेत है कि अभी जो उलझन या अंधेरा महसूस हो रहा है, वह स्थायी नहीं — रास्ता खुद बनाना होगा, धैर्य के साथ आगे बढ़ें।',
    tone: 'dhairya',
  },
  {
    letter: 'उ',
    verse: 'उद्यमेन हि सिध्यन्ति कार्याणि न मनोरथैः। न हि सुप्तस्य सिंहस्य प्रविशन्ति मुखे मृगाः॥',
    source: 'सुभाषित',
    meaning: 'काम प्रयत्न से सिद्ध होते हैं, केवल कामना से नहीं — जैसे सोए हुए सिंह के मुख में हिरण खुद नहीं आता। अभी सक्रिय प्रयास की ज़रूरत है, प्रतीक्षा की नहीं।',
    tone: 'shubh',
  },
  {
    letter: 'क',
    verse: 'करम प्रधान विश्व करि राखा। जो जस करइ सो तस फल चाखा॥',
    source: 'रामचरितमानस, उत्तरकांड',
    meaning: 'संसार में कर्म ही प्रधान है — जैसा कर्म करोगे, वैसा ही फल मिलेगा। भाग्य से पहले अपने प्रयास और आचरण पर ध्यान दें।',
    tone: 'dhairya',
  },
  {
    letter: 'ग',
    verse: 'गुरु पद रज मृदु मंजुल अंजन। नयन अमिय दृग दोष बिभंजन॥',
    source: 'रामचरितमानस, बालकांड',
    meaning: 'गुरु के चरणों की धूल आंखों का सच्चा अंजन है, जो दृष्टि-दोष मिटाती है। किसी अनुभवी/बड़े का मार्गदर्शन लेने का संकेत — अकेले फैसला लेने की जल्दी न करें।',
    tone: 'shubh',
  },
  {
    letter: 'ज',
    verse: 'जाकी रही भावना जैसी। प्रभु मूरति देखी तिन तैसी॥',
    source: 'रामचरितमानस, उत्तरकांड',
    meaning: 'जैसी जिसकी भावना होती है, वैसी ही उसे हर चीज़ में झलक दिखती है। अभी अपने नज़रिए और सोच पर ध्यान देने का समय है — मन शांत और सकारात्मक रखें।',
    tone: 'shubh',
  },
  {
    letter: 'त',
    verse: 'त्वमेव माता च पिता त्वमेव, त्वमेव बन्धुश्च सखा त्वमेव। त्वमेव विद्या द्रविणं त्वमेव, त्वमेव सर्वं मम देव देव॥',
    source: 'संस्कृत स्तोत्र',
    meaning: 'ईश्वर ही माता, पिता, बंधु, मित्र, विद्या और धन सब कुछ हैं — यह पूर्ण समर्पण का भाव है। संकेत है कि अभी किसी एक सहारे पर बहुत निर्भर होने के बजाय, भीतर की शक्ति और श्रद्धा पर भरोसा करें।',
    tone: 'shubh',
  },
  {
    letter: 'द',
    verse: 'दैहिक दैविक भौतिक तापा। राम राज नहिं काहुहि व्यापा॥',
    source: 'रामचरितमानस, उत्तरकांड',
    meaning: 'राम राज्य में शारीरिक, दैवी और भौतिक — कोई भी संताप किसी को सताता नहीं था। यह एक अच्छे, संतुलित समय का संकेत है — अभी की परिस्थितियां जल्द सामान्य होंगी।',
    tone: 'shubh',
  },
  {
    letter: 'ध',
    verse: 'धीरज धर्म मित्र अरु नारी। आपद काल परखिअहिं चारी॥',
    source: 'रामचरितमानस, किष्किंधाकांड',
    meaning: 'धैर्य, धर्म, मित्र और जीवनसाथी — इन चारों की असली परख विपत्ति के समय ही होती है। अभी धैर्य बनाए रखने और अपने करीबी रिश्तों को समझने का समय है।',
    tone: 'dhairya',
  },
  {
    letter: 'न',
    verse: 'नहिं कोउ अस जनमा जग माहीं। प्रभुता पाइ जाहि मद नाहीं॥',
    source: 'रामचरितमानस',
    meaning: 'संसार में शायद ही कोई ऐसा जन्मा हो जिसे शक्ति/सफलता पाकर अहंकार न आया हो। सफलता के समय विनम्रता बनाए रखने का संकेत।',
    tone: 'saavdhani',
  },
  {
    letter: 'प',
    verse: 'परहित सरिस धर्म नहिं भाई। पर पीड़ा सम नहिं अधमाई॥',
    source: 'रामचरितमानस, उत्तरकांड',
    meaning: 'दूसरों की भलाई से बड़ा कोई धर्म नहीं, और दूसरों को कष्ट पहुंचाने से बड़ी कोई अधमता नहीं। अभी जो भी निर्णय लें, उसमें दूसरों का हित ज़रूर सोचें — यही शुभ फल देगा।',
    tone: 'shubh',
  },
  {
    letter: 'ब',
    verse: 'बिनु सत्संग विवेक न होई। राम कृपा बिनु सुलभ न सोई॥',
    source: 'रामचरितमानस, उत्तरकांड',
    meaning: 'अच्छी संगति के बिना सही समझ नहीं आती। अभी अपने आस-पास के लोगों और संगति पर ध्यान दें — सही सलाहकार/मित्र चुनना ज़रूरी है।',
    tone: 'dhairya',
  },
  {
    letter: 'भ',
    verse: 'भवानी शंकरौ वन्दे श्रद्धाविश्वासरूपिणौ। याभ्यां विना न पश्यन्ति सिद्धाः स्वान्तःस्थमीश्वरम्॥',
    source: 'रामचरितमानस, मंगलाचरण',
    meaning: 'श्रद्धा और विश्वास के बिना, सिद्ध पुरुष भी भीतर बसे ईश्वर को नहीं देख पाते। अभी श्रद्धा और आत्मविश्वास बनाए रखने का संकेत — संदेह मन को कमज़ोर करेगा।',
    tone: 'shubh',
  },
  {
    letter: 'म',
    verse: 'मंगल भवन अमंगल हारी। द्रवहु सो दसरथ अजिर बिहारी॥',
    source: 'रामचरितमानस, बालकांड',
    meaning: 'जो मंगल के घर हैं और अमंगल को हरने वाले हैं — यह एक बहुत शुभ, आशीर्वाद देने वाला संकेत है। जो भी चिंता हो, जल्द दूर होगी।',
    tone: 'shubh',
  },
  {
    letter: 'य',
    verse: 'यत्र नार्यस्तु पूज्यन्ते रमन्ते तत्र देवताः। यत्रैतास्तु न पूज्यन्ते सर्वास्तत्राफलाः क्रियाः॥',
    source: 'मनुस्मृति',
    meaning: 'जहां स्त्रियों का सम्मान होता है, वहां देवता प्रसन्न रहते हैं। घर और रिश्तों में सम्मान और संतुलन बनाए रखने का संकेत।',
    tone: 'shubh',
  },
  {
    letter: 'र',
    verse: 'राम नाम मनि दीप धरु जीह देहरीं द्वार। तुलसी भीतर बाहेरहुं जौं चाहसि उजिआर॥',
    source: 'रामचरितमानस, बालकांड',
    meaning: 'यदि भीतर और बाहर दोनों तरफ प्रकाश चाहिए, तो राम-नाम रूपी दीपक को जीभ रूपी देहरी पर रखो। मन और वाणी दोनों को शुद्ध रखने से रास्ता साफ दिखेगा।',
    tone: 'shubh',
  },
  {
    letter: 'व',
    verse: 'वक्रतुण्ड महाकाय सूर्यकोटि समप्रभ। निर्विघ्नं कुरु मे देव सर्वकार्येषु सर्वदा॥',
    source: 'गणेश स्तोत्र',
    meaning: 'हर कार्य में विघ्न दूर करने की प्रार्थना। अभी शुरू किया गया कोई कार्य बाधाओं के बावजूद पूरा होगा — पूरी श्रद्धा और स्थिरता से आगे बढ़ें।',
    tone: 'shubh',
  },
  {
    letter: 'स',
    verse: 'सिया राममय सब जग जानी। करउं प्रनाम जोरि जुग पानी॥',
    source: 'रामचरितमानस, बालकांड',
    meaning: 'सारा संसार सीता-राम मय है — यह भाव है कि हर चीज़ में, हर व्यक्ति में वही एक शक्ति बसी है। विनम्रता और सम्मान का भाव बनाए रखने का संकेत।',
    tone: 'shubh',
  },
  {
    letter: 'श',
    verse: 'श्रद्धावान् लभते ज्ञानं तत्परः संयतेन्द्रियः। ज्ञानं लब्ध्वा परां शान्तिमचिरेणाधिगच्छति॥',
    source: 'श्रीमद्भगवद्गीता 4.39',
    meaning: 'जो श्रद्धावान और संयमित है, वही सच्चा ज्ञान पाता है, और उस ज्ञान से शीघ्र शांति मिलती है। अभी संयम और श्रद्धा बनाए रखने का समय है — जल्दबाज़ी में उत्तर न ढूंढें।',
    tone: 'dhairya',
  },
  {
    letter: 'ह',
    verse: 'होइहि सोइ जो राम रचि राखा। को करि तर्क बढ़ावै साखा॥',
    source: 'रामचरितमानस, अयोध्याकांड',
    meaning: 'जो राम ने रच रखा है, वही होगा — व्यर्थ तर्क-वितर्क से क्या लाभ। जो चीज़ें हाथ में नहीं हैं, उनकी चिंता छोड़कर, जो हाथ में है उस पर ध्यान दें।',
    tone: 'dhairya',
  },
  {
    letter: 'क्ष',
    verse: 'क्षमा वीरस्य भूषणम्॥',
    source: 'संस्कृत सूक्ति',
    meaning: 'क्षमा वीर पुरुष का आभूषण है। अभी किसी बात को माफ़ करने या छोड़ देने से मन हल्का होगा और रास्ता आसान बनेगा।',
    tone: 'shubh',
  },
];

// Simple, deterministic lookup — no AI call needed since this data is
// curated and static. Returns null if the letter isn't in our set (the
// UI only renders letters that exist here, so this should rarely fire).
export function getVerseForLetter(letter) {
  return RAM_SHALAKA_VERSES.find(v => v.letter === letter) || null;
}
