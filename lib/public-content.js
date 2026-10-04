// lib/public-content.js — ORIGINAL generic content for the no-login public pages.
// Written for this project (not copied from other sites). General guidance only — no guarantees,
// no health/financial/legal predictions, no "lucky number" gambling language.

// ── 12 rashis (Vedic / sidereal Moon-sign names) ────────────────────────────
export const RASHIS = [
  { slug: 'mesh', idx: 0, sym: '♈', hi: 'मेष', en: 'Aries', lord: { hi: 'मंगल', en: 'Mars' }, element: { hi: 'अग्नि', en: 'Fire' }, mode: { hi: 'चर', en: 'Movable' },
    summary: { hi: 'मेष राशि शुरुआत की राशि है — सीधी, ऊर्जावान और तुरंत कदम उठाने वाली।', en: 'Aries is the sign of beginnings — direct, energetic and quick to act.' },
    strengths: { hi: 'साहस, पहल करने की क्षमता, नेतृत्व और स्पष्टवादिता।', en: 'Courage, initiative, leadership and straight talk.' },
    watch: { hi: 'जल्दबाज़ी, तेज़ गुस्सा, और काम शुरू करके बीच में छोड़ देने की आदत।', en: 'Impatience, a quick temper, and starting more than you finish.' },
    career: { hi: 'सेना/पुलिस, खेल, इंजीनियरिंग, उद्यमिता, तकनीकी और फील्ड वाले काम।', en: 'Defence or police, sports, engineering, entrepreneurship, technical and field roles.' },
    love: { hi: 'ईमानदार और जोशीले साथी; रिश्ते में सुनने की आदत सबसे ज़्यादा काम आती है।', en: 'A passionate, honest partner; listening is the habit that helps most.' },
    upay: { hi: 'मंगलवार को हनुमान जी के दर्शन या सेवा करें, और प्रतिक्रिया देने से पहले दस साँसें गिनने की आदत डालें।', en: 'Visit or serve at a Hanuman temple on Tuesdays, and pause for ten breaths before reacting.' } },
  { slug: 'vrishabh', idx: 1, sym: '♉', hi: 'वृषभ', en: 'Taurus', lord: { hi: 'शुक्र', en: 'Venus' }, element: { hi: 'पृथ्वी', en: 'Earth' }, mode: { hi: 'स्थिर', en: 'Fixed' },
    summary: { hi: 'स्थिरता, सुंदरता और सुख-सुविधा को महत्व देने वाली राशि।', en: 'A sign that values stability, beauty and comfort.' },
    strengths: { hi: 'धैर्य, भरोसेमंद स्वभाव, लगातार मेहनत और कला/स्वाद की समझ।', en: 'Patience, reliability, steady effort and a sense of art and taste.' },
    watch: { hi: 'ज़िद, बदलाव से झिझक और आराम में अटक जाना।', en: 'Stubbornness, resisting change and getting stuck in comfort.' },
    career: { hi: 'बैंकिंग/वित्त, कला, फैशन, खान-पान, कृषि, संपत्ति और संगीत।', en: 'Banking and finance, arts, fashion, food, agriculture, property and music.' },
    love: { hi: 'वफ़ादार और स्थिर साथी; भरोसा बनने में समय लेते हैं।', en: 'A loyal, steady partner who takes time to trust.' },
    upay: { hi: 'शुक्रवार को साफ़-सफ़ाई करें या ज़रूरतमंद को भोजन/वस्त्र दें, और खर्च का एक सरल बजट बनाएँ।', en: 'On Fridays do some cleaning or give food or clothes to someone in need, and keep a simple budget.' } },
  { slug: 'mithun', idx: 2, sym: '♊', hi: 'मिथुन', en: 'Gemini', lord: { hi: 'बुध', en: 'Mercury' }, element: { hi: 'वायु', en: 'Air' }, mode: { hi: 'द्विस्वभाव', en: 'Dual' },
    summary: { hi: 'जिज्ञासा, संवाद और बहुमुखी प्रतिभा की राशि।', en: 'The sign of curiosity, communication and versatility.' },
    strengths: { hi: 'तेज़ समझ, बोलने-लिखने की कला, अनुकूलन और सीखने की चाह।', en: 'Quick mind, skill with words, adaptability and love of learning.' },
    watch: { hi: 'ध्यान का बँटना, अधूरे काम और मन का बार-बार बदलना।', en: 'Scattered focus, unfinished tasks and a changeable mind.' },
    career: { hi: 'लेखन, मीडिया, शिक्षण, व्यापार, सेल्स, तकनीक और परामर्श।', en: 'Writing, media, teaching, trade, sales, technology and consulting.' },
    love: { hi: 'बातचीत और हँसी-मज़ाक पसंद करने वाले साथी; एक बात पर टिकना सीखना होता है।', en: 'A talkative, playful partner; the lesson is staying with one thing.' },
    upay: { hi: 'बुधवार को पढ़ाई से जुड़ी चीज़ दान करें (किताब, कॉपी) और रोज़ एक सूची का काम पूरा करें।', en: 'On Wednesdays donate something for learning (a book, notebooks) and finish one listed task daily.' } },
  { slug: 'kark', idx: 3, sym: '♋', hi: 'कर्क', en: 'Cancer', lord: { hi: 'चंद्रमा', en: 'Moon' }, element: { hi: 'जल', en: 'Water' }, mode: { hi: 'चर', en: 'Movable' },
    summary: { hi: 'भावना, देखभाल और घर-परिवार से जुड़ी राशि।', en: 'The sign of feeling, care and home.' },
    strengths: { hi: 'संवेदनशीलता, याददाश्त, पालन-पोषण का भाव और परिवार के प्रति समर्पण।', en: 'Sensitivity, memory, a nurturing instinct and devotion to family.' },
    watch: { hi: 'ज़्यादा भावुक होना, पुरानी बातों में अटकना और मूड का उतार-चढ़ाव।', en: 'Over-sensitivity, dwelling on the past and mood swings.' },
    career: { hi: 'शिक्षा, स्वास्थ्य-सेवा, होटल/खान-पान, रियल एस्टेट, समाज-सेवा और ग्राहक-देखभाल।', en: 'Education, healthcare, hospitality, real estate, social work and customer care.' },
    love: { hi: 'गहरा जुड़ाव चाहने वाले साथी; भावनाएँ खुलकर कहना रिश्ते को मज़बूत करता है।', en: 'A partner who wants deep bonding; saying feelings aloud strengthens the bond.' },
    upay: { hi: 'सोमवार को शिव जी को जल चढ़ाएँ या माँ/बुज़ुर्ग महिला की सेवा करें, और सोने का नियमित समय रखें।', en: 'On Mondays offer water to Shiva or serve your mother or an elderly woman, and keep a regular sleep time.' } },
  { slug: 'simha', idx: 4, sym: '♌', hi: 'सिंह', en: 'Leo', lord: { hi: 'सूर्य', en: 'Sun' }, element: { hi: 'अग्नि', en: 'Fire' }, mode: { hi: 'स्थिर', en: 'Fixed' },
    summary: { hi: 'आत्मविश्वास, गरिमा और नेतृत्व की राशि।', en: 'The sign of confidence, dignity and leadership.' },
    strengths: { hi: 'उदारता, आत्मसम्मान, प्रेरित करने की क्षमता और ज़िम्मेदारी निभाना।', en: 'Generosity, self-respect, the ability to inspire and to carry responsibility.' },
    watch: { hi: 'अहंकार, तारीफ़ की चाह और आलोचना बर्दाश्त न कर पाना।', en: 'Pride, craving praise and finding criticism hard.' },
    career: { hi: 'प्रशासन, राजनीति, मंच/मीडिया, प्रबंधन, सरकारी सेवा और रचनात्मक नेतृत्व।', en: 'Administration, politics, stage and media, management, government service and creative leadership.' },
    love: { hi: 'उदार और वफ़ादार साथी; सम्मान और गर्मजोशी दोनों चाहते हैं।', en: 'A generous, loyal partner who wants both respect and warmth.' },
    upay: { hi: 'रविवार को सूर्य को जल दें, पिता/गुरु का आशीर्वाद लें और सुनने के लिए रोज़ कुछ समय रखें।', en: 'On Sundays offer water to the Sun, seek the blessing of a father or teacher, and set aside time to listen.' } },
  { slug: 'kanya', idx: 5, sym: '♍', hi: 'कन्या', en: 'Virgo', lord: { hi: 'बुध', en: 'Mercury' }, element: { hi: 'पृथ्वी', en: 'Earth' }, mode: { hi: 'द्विस्वभाव', en: 'Dual' },
    summary: { hi: 'विश्लेषण, सेवा और बारीकी की राशि।', en: 'The sign of analysis, service and detail.' },
    strengths: { hi: 'व्यवस्थित सोच, मेहनत, सेवा-भाव और समस्या सुलझाने की क्षमता।', en: 'Orderly thinking, hard work, service and problem-solving.' },
    watch: { hi: 'ज़्यादा चिंता, आलोचना की आदत और खुद पर कठोर होना।', en: 'Over-worry, a critical streak and being hard on yourself.' },
    career: { hi: 'लेखा-वित्त, स्वास्थ्य, शोध, संपादन, आईटी, गुणवत्ता और प्रशासन।', en: 'Accounts and finance, health, research, editing, IT, quality and administration.' },
    love: { hi: 'देखभाल करने वाले साथी; छोटी कमियों को माफ़ करना रिश्ते को हल्का करता है।', en: 'A caring partner; forgiving small flaws makes the bond lighter.' },
    upay: { hi: 'बुधवार को पक्षियों/गाय को दाना डालें और रोज़ पाँच मिनट चिंताएँ कागज़ पर लिखकर छोड़ दें।', en: 'Feed birds or cows on Wednesdays, and write your worries on paper for five minutes daily and let them go.' } },
  { slug: 'tula', idx: 6, sym: '♎', hi: 'तुला', en: 'Libra', lord: { hi: 'शुक्र', en: 'Venus' }, element: { hi: 'वायु', en: 'Air' }, mode: { hi: 'चर', en: 'Movable' },
    summary: { hi: 'संतुलन, न्याय और रिश्तों की राशि।', en: 'The sign of balance, fairness and relationships.' },
    strengths: { hi: 'सामंजस्य, कूटनीति, सौंदर्य-बोध और निष्पक्षता।', en: 'Harmony, diplomacy, aesthetic sense and fairness.' },
    watch: { hi: 'फैसले में देरी, टकराव से बचना और दूसरों को खुश रखने का दबाव।', en: 'Delayed decisions, avoiding conflict and pressure to please.' },
    career: { hi: 'कानून, डिज़ाइन, कला, परामर्श, फैशन, जनसंपर्क और कूटनीति।', en: 'Law, design, arts, counselling, fashion, public relations and diplomacy.' },
    love: { hi: 'साझेदारी को महत्व देने वाले साथी; अपनी बात साफ़ कहना ज़रूरी है।', en: 'A partner who values partnership; clearly stating your own view is key.' },
    upay: { hi: 'शुक्रवार को देवी की आराधना करें या घर की सफ़ाई/सजावट करें, और छोटे फैसले समय-सीमा देकर लें।', en: 'Worship the Goddess on Fridays or tidy and decorate the home, and give small decisions a deadline.' } },
  { slug: 'vrishchik', idx: 7, sym: '♏', hi: 'वृश्चिक', en: 'Scorpio', lord: { hi: 'मंगल', en: 'Mars' }, element: { hi: 'जल', en: 'Water' }, mode: { hi: 'स्थिर', en: 'Fixed' },
    summary: { hi: 'गहराई, दृढ़ता और रहस्य की राशि।', en: 'The sign of depth, determination and mystery.' },
    strengths: { hi: 'दृढ़ इच्छाशक्ति, गहन शोध, गोपनीयता और संकट में टिके रहना।', en: 'Strong will, deep research, discretion and staying steady in a crisis.' },
    watch: { hi: 'शक की प्रवृत्ति, पुरानी बातें दिल में रखना और बहुत ज़्यादा नियंत्रण।', en: 'Suspicion, holding grudges and too much control.' },
    career: { hi: 'शोध, जाँच, चिकित्सा, बीमा, खनन, मनोविज्ञान और रणनीति।', en: 'Research, investigation, medicine, insurance, mining, psychology and strategy.' },
    love: { hi: 'गहरे और वफ़ादार साथी; भरोसा खुलकर करना और क्षमा करना ज़रूरी सीख है।', en: 'A deep, loyal partner; trusting openly and forgiving are the lessons.' },
    upay: { hi: 'मंगलवार को हनुमान चालीसा पढ़ें या ज़रूरतमंद की सेवा करें, और मन की बात किसी भरोसेमंद से साझा करें।', en: 'Read the Hanuman Chalisa or serve someone in need on Tuesdays, and share what weighs on you with someone trusted.' } },
  { slug: 'dhanu', idx: 8, sym: '♐', hi: 'धनु', en: 'Sagittarius', lord: { hi: 'गुरु (बृहस्पति)', en: 'Jupiter' }, element: { hi: 'अग्नि', en: 'Fire' }, mode: { hi: 'द्विस्वभाव', en: 'Dual' },
    summary: { hi: 'ज्ञान, आशावाद और खोज की राशि।', en: 'The sign of knowledge, optimism and exploration.' },
    strengths: { hi: 'आशावादी दृष्टि, ईमानदारी, उच्च शिक्षा की रुचि और मार्गदर्शन की क्षमता।', en: 'An optimistic outlook, honesty, love of learning and the ability to guide.' },
    watch: { hi: 'बिना सोचे वादे, लापरवाही और ज़रूरत से ज़्यादा स्पष्टवादिता।', en: 'Careless promises, restlessness and too much bluntness.' },
    career: { hi: 'शिक्षण, कानून, परामर्श, यात्रा/पर्यटन, प्रकाशन, खेल और आध्यात्मिक कार्य।', en: 'Teaching, law, advising, travel, publishing, sports and spiritual work.' },
    love: { hi: 'स्वतंत्रता पसंद करने वाले साथी; वादे निभाना रिश्ते की कुंजी है।', en: 'A freedom-loving partner; keeping promises is the key.' },
    upay: { hi: 'गुरुवार को गुरु/शिक्षक का सम्मान करें और पीली चीज़ (चना, केला) दान करें; हर वादा लिखकर रखें।', en: 'Honour a teacher on Thursdays and donate something yellow (gram, bananas); note every promise you make.' } },
  { slug: 'makar', idx: 9, sym: '♑', hi: 'मकर', en: 'Capricorn', lord: { hi: 'शनि', en: 'Saturn' }, element: { hi: 'पृथ्वी', en: 'Earth' }, mode: { hi: 'चर', en: 'Movable' },
    summary: { hi: 'अनुशासन, मेहनत और दीर्घकालिक लक्ष्य की राशि।', en: 'The sign of discipline, hard work and long-term goals.' },
    strengths: { hi: 'धैर्य, ज़िम्मेदारी, योजना और धीरे-धीरे ऊपर उठने की क्षमता।', en: 'Patience, responsibility, planning and a steady rise.' },
    watch: { hi: 'ज़्यादा गंभीरता, काम में डूबकर आराम भूल जाना और निराशावाद।', en: 'Excess seriousness, overworking and pessimism.' },
    career: { hi: 'प्रशासन, उद्योग, निर्माण, इंजीनियरिंग, वित्त, सरकारी सेवा और प्रबंधन।', en: 'Administration, industry, construction, engineering, finance, government service and management.' },
    love: { hi: 'भरोसेमंद, ज़िम्मेदार साथी; भावनाएँ ज़ाहिर करना सीखना रिश्ते को गर्म रखता है।', en: 'A dependable partner; learning to express feeling keeps the bond warm.' },
    upay: { hi: 'शनिवार को श्रमिक/सफ़ाईकर्मी की सहायता करें या सरसों का तेल दान करें, और हफ़्ते में एक दिन पूरा आराम रखें।', en: 'Help a worker or sanitation staff on Saturdays or donate mustard oil, and keep one real rest day each week.' } },
  { slug: 'kumbh', idx: 10, sym: '♒', hi: 'कुंभ', en: 'Aquarius', lord: { hi: 'शनि', en: 'Saturn' }, element: { hi: 'वायु', en: 'Air' }, mode: { hi: 'स्थिर', en: 'Fixed' },
    summary: { hi: 'नए विचार, समाज और स्वतंत्र सोच की राशि।', en: 'The sign of fresh ideas, community and independent thinking.' },
    strengths: { hi: 'मौलिक सोच, मानवीय दृष्टि, तकनीक की समझ और मित्रता।', en: 'Original thinking, a humanitarian outlook, a feel for technology and friendship.' },
    watch: { hi: 'भावनात्मक दूरी, ज़िद भरी असहमति और अकेले पड़ जाना।', en: 'Emotional distance, stubborn disagreement and isolation.' },
    career: { hi: 'तकनीक, शोध, समाज-सेवा, विज्ञान, मीडिया, स्टार्टअप और नेटवर्किंग।', en: 'Technology, research, social work, science, media, startups and networking.' },
    love: { hi: 'दोस्त जैसे साथी; भावनाओं को शब्द देना रिश्ते में नज़दीकी लाता है।', en: 'A friend-like partner; putting feelings into words brings closeness.' },
    upay: { hi: 'शनिवार को किसी ज़रूरतमंद की मदद करें और महीने में एक बार सामाजिक सेवा के लिए समय निकालें।', en: 'Help someone in need on Saturdays and give time to community service once a month.' } },
  { slug: 'meen', idx: 11, sym: '♓', hi: 'मीन', en: 'Pisces', lord: { hi: 'गुरु (बृहस्पति)', en: 'Jupiter' }, element: { hi: 'जल', en: 'Water' }, mode: { hi: 'द्विस्वभाव', en: 'Dual' },
    summary: { hi: 'करुणा, कल्पना और आध्यात्मिकता की राशि।', en: 'The sign of compassion, imagination and spirituality.' },
    strengths: { hi: 'सहानुभूति, रचनात्मकता, अंतर्ज्ञान और सेवा-भाव।', en: 'Empathy, creativity, intuition and a spirit of service.' },
    watch: { hi: 'सीमाएँ तय न कर पाना, पलायन की प्रवृत्ति और भ्रम में पड़ना।', en: 'Weak boundaries, escapism and confusion.' },
    career: { hi: 'कला, संगीत, चिकित्सा/देखभाल, आध्यात्मिक कार्य, फ़िल्म, लेखन और समाज-सेवा।', en: 'Arts, music, healthcare, spiritual work, film, writing and social service.' },
    love: { hi: 'संवेदनशील और समर्पित साथी; अपनी ज़रूरतें साफ़ कहना सीखना चाहिए।', en: 'A sensitive, devoted partner who should learn to state their own needs.' },
    upay: { hi: 'गुरुवार को विष्णु जी का स्मरण करें, भोजन/ज्ञान का दान दें और रोज़ कुछ समय शांत बैठें।', en: 'Remember Vishnu on Thursdays, donate food or learning, and sit quietly for a few minutes daily.' } },
];

export const rashiBySlug = (slug) => RASHIS.find(r => r.slug === slug) || null;

// Traditional element friendship: fire<->air, earth<->water (same element also fine).
const FRIENDS = { 'Fire': ['Fire', 'Air'], 'Air': ['Air', 'Fire'], 'Earth': ['Earth', 'Water'], 'Water': ['Water', 'Earth'] };
export function friendlyRashis(r) {
  return RASHIS.filter(o => o.slug !== r.slug && FRIENDS[r.element.en].includes(o.element.en));
}

// ── 9 moolank (birth-day number) ────────────────────────────────────────────
export const MOOLANK = {
  1: { planet: { hi: 'सूर्य', en: 'Sun' }, days: [1, 10, 19, 28],
    summary: { hi: 'नेतृत्व, आत्मविश्वास और स्वतंत्रता का अंक।', en: 'The number of leadership, confidence and independence.' },
    strengths: { hi: 'पहल, आत्मबल, निर्णय क्षमता और गरिमा।', en: 'Initiative, self-belief, decisiveness and dignity.' },
    watch: { hi: 'अहंकार, ज़िद और दूसरों की सलाह न सुनना।', en: 'Pride, stubbornness and not hearing others out.' },
    career: { hi: 'प्रशासन, प्रबंधन, राजनीति, उद्यमिता, सरकारी सेवा।', en: 'Administration, management, politics, entrepreneurship, government service.' },
    love: { hi: 'वफ़ादार, पर सम्मान चाहने वाले साथी।', en: 'Loyal partners who also want respect.' },
    upay: { hi: 'रविवार को सूर्य को जल दें और सुबह जल्दी उठने की आदत बनाएँ।', en: 'Offer water to the Sun on Sundays and build an early-rising habit.' } },
  2: { planet: { hi: 'चंद्रमा', en: 'Moon' }, days: [2, 11, 20, 29],
    summary: { hi: 'भावुकता, सहयोग और कल्पना का अंक।', en: 'The number of feeling, cooperation and imagination.' },
    strengths: { hi: 'संवेदनशीलता, मेल-मिलाप, कला और अंतर्ज्ञान।', en: 'Sensitivity, harmony, artistry and intuition.' },
    watch: { hi: 'मूड का बदलना, अनिर्णय और ज़्यादा चिंता।', en: 'Mood changes, indecision and over-worry.' },
    career: { hi: 'शिक्षा, कला, परामर्श, देखभाल, यात्रा और खान-पान।', en: 'Education, arts, counselling, care work, travel and food.' },
    love: { hi: 'स्नेही और देखभाल करने वाले साथी।', en: 'Affectionate, caring partners.' },
    upay: { hi: 'सोमवार को शिव जी को जल चढ़ाएँ और नींद का नियमित समय रखें।', en: 'Offer water to Shiva on Mondays and keep a regular sleep time.' } },
  3: { planet: { hi: 'गुरु (बृहस्पति)', en: 'Jupiter' }, days: [3, 12, 21, 30],
    summary: { hi: 'ज्ञान, रचनात्मकता और मार्गदर्शन का अंक।', en: 'The number of knowledge, creativity and guidance.' },
    strengths: { hi: 'आशावाद, बुद्धि, शिक्षण क्षमता और ईमानदारी।', en: 'Optimism, intellect, a gift for teaching and honesty.' },
    watch: { hi: 'अति-आत्मविश्वास, उपदेश देने की आदत और बिखराव।', en: 'Overconfidence, a habit of preaching and scattered effort.' },
    career: { hi: 'शिक्षण, कानून, सलाहकारी, लेखन और समाज/धर्म से जुड़े कार्य।', en: 'Teaching, law, advising, writing and community or religious work.' },
    love: { hi: 'उदार साथी जो सम्मान देते हैं।', en: 'Generous partners who give respect.' },
    upay: { hi: 'गुरुवार को गुरु/शिक्षक का सम्मान करें और पीली चीज़ दान करें।', en: 'Honour a teacher on Thursdays and donate something yellow.' } },
  4: { planet: { hi: 'राहु', en: 'Rahu' }, days: [4, 13, 22, 31],
    summary: { hi: 'अलग सोच, मेहनत और अनिश्चितता से जूझने का अंक।', en: 'The number of unconventional thinking, effort and coping with uncertainty.' },
    strengths: { hi: 'व्यावहारिकता, तकनीकी समझ, परिश्रम और नए रास्ते खोजना।', en: 'Practicality, technical sense, hard work and finding new routes.' },
    watch: { hi: 'अनिश्चितता, ज़िद, अचानक बदलाव और उलझन।', en: 'Uncertainty, stubbornness, sudden changes and confusion.' },
    career: { hi: 'तकनीक, इंजीनियरिंग, शोध, विदेश-संबंधी काम और मीडिया।', en: 'Technology, engineering, research, overseas-related work and media.' },
    love: { hi: 'अलग ढंग के पर वफ़ादार साथी; भरोसा बनाने में समय लगता है।', en: 'Unconventional but loyal partners; trust takes time.' },
    upay: { hi: 'रोज़ का एक नियम तय करें और शनिवार को ज़रूरतमंद की सेवा करें।', en: 'Fix one daily routine and serve someone in need on Saturdays.' } },
  5: { planet: { hi: 'बुध', en: 'Mercury' }, days: [5, 14, 23],
    summary: { hi: 'संवाद, चतुराई और गति का अंक।', en: 'The number of communication, wit and speed.' },
    strengths: { hi: 'तेज़ बुद्धि, अनुकूलन, व्यापारिक समझ और बोलने की कला।', en: 'Quick mind, adaptability, business sense and a way with words.' },
    watch: { hi: 'बेचैनी, जल्दबाज़ी और ध्यान बँटना।', en: 'Restlessness, haste and scattered attention.' },
    career: { hi: 'व्यापार, मीडिया, सेल्स, आईटी, लेखन और अकाउंट्स।', en: 'Trade, media, sales, IT, writing and accounts.' },
    love: { hi: 'मिलनसार साथी, पर बँधने में देर लगाने वाले।', en: 'Sociable partners who take time to commit.' },
    upay: { hi: 'बुधवार को किताब/हरी चीज़ का दान करें और रोज़ दस मिनट शांत बैठें।', en: 'Donate a book or something green on Wednesdays and sit quietly for ten minutes daily.' } },
  6: { planet: { hi: 'शुक्र', en: 'Venus' }, days: [6, 15, 24],
    summary: { hi: 'सौंदर्य, सुख और रिश्तों का अंक।', en: 'The number of beauty, comfort and relationships.' },
    strengths: { hi: 'आकर्षण, कला, सहयोग और स्वाद की समझ।', en: 'Charm, artistry, cooperation and good taste.' },
    watch: { hi: 'आराम पर ज़्यादा खर्च, दिखावा और रिश्तों में ऊँची अपेक्षाएँ।', en: 'Overspending on comfort, show and high expectations in relationships.' },
    career: { hi: 'कला, फैशन, डिज़ाइन, होटल, मनोरंजन और सौंदर्य क्षेत्र।', en: 'Arts, fashion, design, hospitality, entertainment and beauty.' },
    love: { hi: 'रोमांटिक और परिवार-प्रेमी साथी।', en: 'Romantic, family-loving partners.' },
    upay: { hi: 'शुक्रवार को सफ़ाई/सजावट करें और ज़रूरतमंद को वस्त्र दें।', en: 'Tidy and decorate on Fridays and give clothes to someone in need.' } },
  7: { planet: { hi: 'केतु', en: 'Ketu' }, days: [7, 16, 25],
    summary: { hi: 'आत्मचिंतन, शोध और आध्यात्मिकता का अंक।', en: 'The number of introspection, research and spirituality.' },
    strengths: { hi: 'गहरी सोच, अंतर्ज्ञान, शोध और एकाग्रता।', en: 'Deep thought, intuition, research and concentration.' },
    watch: { hi: 'अलगाव, संदेह और अकेलापन।', en: 'Withdrawal, doubt and loneliness.' },
    career: { hi: 'शोध, दर्शन, चिकित्सा, तकनीक और आध्यात्मिक कार्य।', en: 'Research, philosophy, medicine, technology and spiritual work.' },
    love: { hi: 'शांत और गहरे साथी; खुलकर बात करना ज़रूरी है।', en: 'Quiet, deep partners; speaking openly is important.' },
    upay: { hi: 'रोज़ कुछ समय मौन/ध्यान करें और गणेश जी का स्मरण करें।', en: 'Keep some daily time for silence or meditation and remember Ganesha.' } },
  8: { planet: { hi: 'शनि', en: 'Saturn' }, days: [8, 17, 26],
    summary: { hi: 'अनुशासन, कर्म और धैर्य का अंक।', en: 'The number of discipline, karma and patience.' },
    strengths: { hi: 'धैर्य, परिश्रम, ज़िम्मेदारी और दीर्घकालिक सोच।', en: 'Patience, hard work, responsibility and long-range thinking.' },
    watch: { hi: 'निराशा, देरी से झुंझलाहट और ज़्यादा कठोरता।', en: 'Gloom, frustration with delays and too much strictness.' },
    career: { hi: 'प्रशासन, उद्योग, न्याय, निर्माण, खनन और सेवा क्षेत्र।', en: 'Administration, industry, justice, construction, mining and service sectors.' },
    love: { hi: 'निष्ठावान पर गंभीर साथी।', en: 'Faithful but serious partners.' },
    upay: { hi: 'शनिवार को श्रमिक/ज़रूरतमंद की मदद करें और समय की पाबंदी रखें।', en: 'Help a worker or someone in need on Saturdays and keep to time.' } },
  9: { planet: { hi: 'मंगल', en: 'Mars' }, days: [9, 18, 27],
    summary: { hi: 'ऊर्जा, साहस और कर्मठता का अंक।', en: 'The number of energy, courage and drive.' },
    strengths: { hi: 'साहस, ऊर्जा, नेतृत्व और तुरंत काम करने की क्षमता।', en: 'Courage, energy, leadership and quick action.' },
    watch: { hi: 'गुस्सा, जल्दबाज़ी और टकराव।', en: 'Anger, haste and confrontation.' },
    career: { hi: 'सेना/पुलिस, खेल, इंजीनियरिंग, सर्जरी और ज़मीन-जायदाद।', en: 'Defence or police, sports, engineering, surgery and real estate.' },
    love: { hi: 'जोशीले और सुरक्षा देने वाले साथी।', en: 'Passionate, protective partners.' },
    upay: { hi: 'मंगलवार को हनुमान जी की सेवा करें, व्यायाम करें और गुस्से में कुछ पल रुकें।', en: 'Serve Hanuman on Tuesdays, exercise, and pause for a moment when angry.' } },
};

const digitSum = (n) => String(n).split('').reduce((s, d) => s + Number(d), 0);
export function reduceTo9(n) { while (n > 9) n = digitSum(n); return n; }

/** Moolank: the birth DAY reduced to 1-9. */
export function moolankOf(isoDob) { return reduceTo9(Number(isoDob.split('-')[2])); }
/** Bhagyank: every digit of the full date of birth added and reduced to 1-9. */
export function bhagyankOf(isoDob) { return reduceTo9(digitSum(isoDob.replace(/-/g, ''))); }
/** Lo Shu grid: how many times each digit 1-9 appears in the date of birth. */
export function loShuOf(isoDob) {
  const counts = {};
  for (let i = 1; i <= 9; i++) counts[i] = 0;
  isoDob.replace(/-/g, '').split('').map(Number).forEach(d => { if (d >= 1 && d <= 9) counts[d]++; });
  return counts;
}
export const LO_SHU_LAYOUT = [[4, 9, 2], [3, 5, 7], [8, 1, 6]];

// ── Daily rashifal building blocks ──────────────────────────────────────────
// Chandra gochar: where today's Moon sits counted from YOUR Moon sign (rashi).
// tone: 'good' | 'mixed' | 'careful' — a gentle direction, not a prediction.
export const CHANDRA_GOCHAR = {
  1: { tone: 'mixed', head: { hi: 'अपने भीतर झाँकने का दिन', en: 'A day to look inward' },
    body: { hi: 'चंद्रमा आपकी अपनी राशि में है — मन संवेदनशील रहेगा, पर आत्म-चिंतन और नई शुरुआत के लिए अच्छा समय है। खान-पान और नींद का ध्यान रखें।', en: 'The Moon is in your own sign — you may feel more sensitive, but it is a good time for reflection and fresh starts. Mind your food and sleep.' } },
  2: { tone: 'careful', head: { hi: 'बोल-चाल और खर्च में संयम', en: 'Go easy on words and spending' },
    body: { hi: 'आज खर्च और बोली पर ध्यान रखें; पैसों के फैसले सोच-समझकर लें और परिवार में शांत भाषा रखें।', en: 'Watch spending and speech today; take money decisions thoughtfully and keep your tone calm at home.' } },
  3: { tone: 'good', head: { hi: 'साहस और पहल का दिन', en: 'A day for courage and initiative' },
    body: { hi: 'छोटे प्रयास, मेल-जोल और भाई-बहनों/पड़ोसियों से सहयोग फल देंगे। रुके हुए संदेश या बातचीत शुरू करने का अच्छा समय।', en: 'Small efforts, networking and help from siblings or neighbours can pay off. A good time to restart a pending conversation.' } },
  4: { tone: 'careful', head: { hi: 'घर और मन को शांत रखें', en: 'Keep home and mind calm' },
    body: { hi: 'मन में बेचैनी या घर-परिवार की चिंता रह सकती है; आज बड़े फैसले टालें और घर में कुछ समय बिताएँ।', en: 'You may feel restless or concerned about home; postpone big decisions and spend some time at home.' } },
  5: { tone: 'mixed', head: { hi: 'ध्यान बँट सकता है — एक काम पर टिकें', en: 'Attention may scatter — stay with one task' },
    body: { hi: 'पढ़ाई या रचनात्मक काम में एकाग्रता रखें और बच्चों से जुड़ी बातों में धैर्य रखें।', en: 'Keep your focus in study or creative work, and be patient in matters involving children.' } },
  6: { tone: 'good', head: { hi: 'रुकावटें सुलझाने का दिन', en: 'A day to clear obstacles' },
    body: { hi: 'बकाया काम निपटाने और दिनचर्या सुधारने के लिए अच्छा दिन। मेहनत का परिणाम दिख सकता है।', en: 'A good day to clear pending work and tidy your routine. Effort can show results.' } },
  7: { tone: 'good', head: { hi: 'साझेदारी और मुलाक़ात के लिए अच्छा', en: 'Good for partnerships and meetings' },
    body: { hi: 'बातचीत, मुलाक़ात और साझेदारी के कामों में सहयोग मिल सकता है; रिश्तों में गर्मजोशी रखें।', en: 'You may find cooperation in talks, meetings and joint work; keep relationships warm.' } },
  8: { tone: 'careful', head: { hi: 'जोखिम और बहस से बचें', en: 'Avoid risks and arguments' },
    body: { hi: 'धैर्य रखें, जोखिम भरे फैसले और बहस से बचें; ज़रूरी हो तभी नया काम शुरू करें।', en: 'Stay patient, avoid risky decisions and arguments, and begin something new only if you must.' } },
  9: { tone: 'mixed', head: { hi: 'थोड़ी देरी — बड़ों की सलाह लें', en: 'Some delay — seek elders’ advice' },
    body: { hi: 'काम में थोड़ी देरी लग सकती है; बड़ों/गुरु की सलाह लें और यात्रा की योजना सावधानी से बनाएँ।', en: 'Work may run a little late; seek advice from elders or a teacher and plan travel carefully.' } },
  10: { tone: 'good', head: { hi: 'काम में सक्रियता का दिन', en: 'An active day at work' },
    body: { hi: 'कामकाज में पहचान और सराहना मिल सकती है; ज़िम्मेदारी निभाने पर ध्यान दें।', en: 'You may be recognised at work; focus on carrying your responsibilities well.' } },
  11: { tone: 'good', head: { hi: 'सहयोग और लाभ की संभावना', en: 'Support and gains are possible' },
    body: { hi: 'मित्रों/नेटवर्क से मदद और इच्छित काम आगे बढ़ने की संभावना है; खर्च का हिसाब ज़रूर रखें।', en: 'Friends or your network may help and wished-for plans can move ahead; do keep track of spending.' } },
  12: { tone: 'careful', head: { hi: 'आराम और सेवा का दिन', en: 'A day for rest and service' },
    body: { hi: 'खर्च और थकान ज़्यादा रह सकती है; आराम, एकांत और दान/सेवा के लिए अच्छा समय है। बड़े लेन-देन टालें।', en: 'Spending and tiredness may run high; good time for rest, quiet and giving. Postpone large transactions.' } },
};

// Weekday (0 = Sunday) — ruling planet and a gentle practice.
export const VAAR = [
  { hi: 'रविवार', en: 'Sunday', planet: { hi: 'सूर्य', en: 'Sun' }, tip: { hi: 'सुबह की धूप और अनुशासन से दिन शुरू करें।', en: 'Start the day with morning light and discipline.' } },
  { hi: 'सोमवार', en: 'Monday', planet: { hi: 'चंद्रमा', en: 'Moon' }, tip: { hi: 'मन को शांत रखें; शिव जी का स्मरण करें।', en: 'Keep the mind calm; remember Shiva.' } },
  { hi: 'मंगलवार', en: 'Tuesday', planet: { hi: 'मंगल', en: 'Mars' }, tip: { hi: 'ऊर्जा को व्यायाम या सेवा में लगाएँ; गुस्से पर विराम रखें।', en: 'Channel energy into exercise or service; pause before anger.' } },
  { hi: 'बुधवार', en: 'Wednesday', planet: { hi: 'बुध', en: 'Mercury' }, tip: { hi: 'पढ़ने-लिखने और ज़रूरी बातचीत के लिए अच्छा दिन।', en: 'A good day for reading, writing and important conversations.' } },
  { hi: 'गुरुवार', en: 'Thursday', planet: { hi: 'गुरु', en: 'Jupiter' }, tip: { hi: 'गुरुजनों का सम्मान करें और कुछ नया सीखें।', en: 'Honour your teachers and learn something new.' } },
  { hi: 'शुक्रवार', en: 'Friday', planet: { hi: 'शुक्र', en: 'Venus' }, tip: { hi: 'घर और रिश्तों में सुंदरता और मधुरता बढ़ाएँ।', en: 'Add beauty and sweetness to home and relationships.' } },
  { hi: 'शनिवार', en: 'Saturday', planet: { hi: 'शनि', en: 'Saturn' }, tip: { hi: 'अनुशासन, सेवा और अधूरे ज़िम्मेदारी वाले काम निपटाएँ।', en: 'Practise discipline, service and finish pending duties.' } },
];

export const TITHI_NAMES = [
  { hi: 'प्रतिपदा', en: 'Pratipada' }, { hi: 'द्वितीया', en: 'Dwitiya' }, { hi: 'तृतीया', en: 'Tritiya' }, { hi: 'चतुर्थी', en: 'Chaturthi' },
  { hi: 'पंचमी', en: 'Panchami' }, { hi: 'षष्ठी', en: 'Shashthi' }, { hi: 'सप्तमी', en: 'Saptami' }, { hi: 'अष्टमी', en: 'Ashtami' },
  { hi: 'नवमी', en: 'Navami' }, { hi: 'दशमी', en: 'Dashami' }, { hi: 'एकादशी', en: 'Ekadashi' }, { hi: 'द्वादशी', en: 'Dwadashi' },
  { hi: 'त्रयोदशी', en: 'Trayodashi' }, { hi: 'चतुर्दशी', en: 'Chaturdashi' }, { hi: 'पूर्णिमा/अमावस्या', en: 'Purnima / Amavasya' },
];

export const DISCLAIMER = {
  hi: 'यह सामान्य मार्गदर्शन है, चिकित्सा, कानूनी या वित्तीय सलाह नहीं। व्यक्तिगत फल पूरी कुंडली पर निर्भर करते हैं।',
  en: 'This is general guidance, not medical, legal or financial advice. Personal results depend on your full kundli.',
};
