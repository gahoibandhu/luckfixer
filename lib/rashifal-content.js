// lib/rashifal-content.js — reviewed text tables behind the daily rashifal. Everything is general guidance for reflection:
// no predictions of illness, money or relationship outcomes. Indexed by "house of today's Moon counted from your rashi".
const S = (hi, en) => ({ hi, en });

// [career, money, love & family, wellbeing] star ratings (1-5) per house — a gentle direction, not a forecast
export const DOMAIN_STARS = {
  1: [3, 3, 3, 3], 2: [3, 2, 3, 3], 3: [4, 3, 3, 4], 4: [2, 3, 3, 2], 5: [3, 2, 4, 3], 6: [4, 4, 3, 4],
  7: [4, 3, 5, 3], 8: [2, 2, 2, 2], 9: [3, 3, 3, 3], 10: [5, 4, 3, 3], 11: [4, 5, 4, 4], 12: [2, 2, 3, 2],
};
export const DOMAINS = [
  { key: 'career', i: 0, g: '💼', t: S('करियर', 'Career') },
  { key: 'money', i: 1, g: '₹', t: S('धन', 'Money') },
  { key: 'love', i: 2, g: '♡', t: S('रिश्ते और परिवार', 'Love & family') },
  { key: 'well', i: 3, g: '🌿', t: S('सेहत और मन', 'Wellbeing') },
];

export const DOMAIN_TEXT = {
  1: { career: S('योजना बनाने और अपनी बात रखने के लिए अच्छा; बड़े वादों में जल्दबाज़ी न करें।', 'Good for planning and putting your view across; avoid rushing big commitments.'),
       money: S('दिन सामान्य है; भावनाओं में आकर ख़रीदारी न करें।', 'A steady day; avoid emotional purchases.'),
       love: S('मन संवेदनशील रहेगा; अपनी बात नरमी से कहें।', 'You may feel sensitive; say what you feel gently.'),
       well: S('खान-पान और नींद नियमित रखें; थोड़ी सैर अच्छी रहेगी।', 'Keep meals and sleep regular; a short walk helps.'),
       tip: S('दिन की शुरुआत कुछ शांत मिनटों से करें।', 'Begin the day with a few quiet minutes.') },
  2: { career: S('बैठकों में शब्द सोच-समझकर चुनें; छोटी बातों पर बहस से बचें।', 'Choose your words carefully in meetings; avoid arguing over small things.'),
       money: S('ख़र्च और उधार-लेन-देन पर नज़र रखें; हर ख़र्च लिख लें।', 'Watch spending and lending; note every expense.'),
       love: S('घर में बोली शांत रखें; साथ बैठकर खाना अपनापन बढ़ाएगा।', 'Keep your tone calm at home; a shared meal brings warmth.'),
       well: S('हल्का भोजन करें और भोजन छोड़ें नहीं।', 'Eat light and do not skip meals.'),
       tip: S('ग़ुस्से में जवाब देने से पहले दस तक गिनें।', 'Count to ten before replying in anger.') },
  3: { career: S('पहल का फल मिलेगा; रुका हुआ संदेश या प्रस्ताव भेज दें।', 'Initiative pays off; send that pending message or proposal.'),
       money: S('छोटे-छोटे प्रयास जुड़ते हैं; अतिरिक्त आय के विचार सूझ सकते हैं।', 'Small steady efforts add up; ideas for extra income may appear.'),
       love: S('भाई-बहनों और मित्रों से मिलने-बात करने का अच्छा दिन।', 'A good day to catch up with siblings and friends.'),
       well: S('ऊर्जा अच्छी रहेगी; उसे व्यायाम में लगाएँ।', 'Energy is good; channel it into exercise.'),
       tip: S('जो एक काम टाल रहे थे, उसे आज कर डालें।', 'Do the one task you have been postponing.') },
  4: { career: S('एकाग्रता कम हो सकती है; नियमित काम निपटाएँ और बड़े फैसले टालें।', 'Concentration may dip; handle routine work and postpone big decisions.'),
       money: S('आज संपत्ति या बड़ी ख़रीद के फैसले न लें।', 'Avoid property or large-purchase decisions today.'),
       love: S('घर की बातों में धैर्य चाहिए; बोलने से ज़्यादा सुनें।', 'Home matters need patience; listen more than you speak.'),
       well: S('मन बेचैन रह सकता है; आराम और शांत शाम मददगार रहेगी।', 'The mind may feel restless; rest and a quiet evening help.'),
       tip: S('थोड़ा समय परिवार के साथ या किसी शांत जगह बिताएँ।', 'Spend a little time with family or in a calm place.') },
  5: { career: S('रचनात्मक काम बनेगा, पर ध्यान भटक सकता है; एक समय में एक काम पूरा करें।', 'Creative work flows but focus may wander; finish one thing at a time.'),
       money: S('अटकल या आवेग में पैसा लगाने से बचें।', 'Avoid speculative or impulsive spending.'),
       love: S('रिश्तों और बच्चों के साथ समय के लिए अच्छा; बात साफ़ रखें।', 'Good for time with loved ones and children; keep your meaning clear.'),
       well: S('मन सक्रिय है; स्क्रीन से थोड़ा विराम दें।', 'The mind is active; give it a break from screens.'),
       tip: S('बीस मिनट कुछ पढ़ें या रचें।', 'Read or create something for twenty minutes.') },
  6: { career: S('बकाया काम निपटाने और कठिन कामों से जूझने का अच्छा दिन।', 'A good day to clear backlog and tackle difficult tasks.'),
       money: S('बकाया चुकाएँ, बिल-क़र्ज़ सुलझाएँ; बचत की आदत काम आएगी।', 'Pay dues and sort bills or loans; a saving habit will help.'),
       love: S('धैर्य से मनमुटाव सुलझ सकता है।', 'Patience can settle a misunderstanding.'),
       well: S('दिनचर्या, खान-पान और व्यायाम सुधारने के लिए अच्छा।', 'Good for fixing routine, diet and exercise.'),
       tip: S('काम की जगह साफ़ करें और तीन प्राथमिकताएँ लिखें।', 'Tidy your workspace and write down three priorities.') },
  7: { career: S('साझेदारी, बैठकें और बातचीत अच्छी रहेंगी।', 'Partnerships, meetings and negotiations go well.'),
       money: S('साझा काम आगे बढ़ सकते हैं; सहमति से पहले शर्तें पढ़ें।', 'Joint ventures may move; read the terms before agreeing.'),
       love: S('जीवनसाथी के साथ समय या सार्थक बातचीत के लिए बहुत अच्छा।', 'Excellent for time with a partner or a meaningful talk.'),
       well: S('संतुलित दिन; किसी के साथ भोजन करें।', 'A balanced day; share a meal with someone.'),
       tip: S('किसी अपने से संपर्क करें।', 'Reach out to someone you value.') },
  8: { career: S('जोखिम भरे क़दम, टकराव और जल्दबाज़ी की मंज़ूरी से बचें।', 'Avoid risky moves, confrontation and rushed approvals.'),
       money: S('उधार न दें, जुआ-सट्टा न करें और अस्पष्ट काग़ज़ों पर दस्तख़त न करें।', 'Do not lend, gamble or sign unclear papers.'),
       love: S('शब्द इरादे से ज़्यादा चुभ सकते हैं; प्रतिक्रिया से पहले रुकें।', 'Words can hurt more than intended; pause before reacting.'),
       well: S('आराम से चलें; तनाव, तेज़ी और भारी मेहनत से बचें।', 'Take it easy; avoid strain, speed and heavy exertion.'),
       tip: S('धैर्य रखें और दिन सादा रखें।', 'Stay patient and keep the day simple.') },
  9: { career: S('प्रगति धीमी रह सकती है; किसी वरिष्ठ या गुरु की सलाह लें।', 'Progress may be slower; seek the advice of a senior or teacher.'),
       money: S('सामान्य दिन; आज लंबे समय की प्रतिबद्धता से बचें।', 'A steady day; avoid long-term commitments today.'),
       love: S('बड़ों की राय का सम्मान करें; परिवार का आशीर्वाद सहायक रहेगा।', 'Respect elders’ views; a family blessing helps.'),
       well: S('यात्रा का समय और सावधानी का अतिरिक्त ध्यान रखें।', 'Allow extra time and care when travelling.'),
       tip: S('कुछ प्रेरक पढ़ें या पूजा-स्थल जाएँ।', 'Read something uplifting or visit a place of worship.') },
  10: { career: S('पहचान और सराहना मिल सकती है; ज़िम्मेदारी निभाएँ।', 'Recognition is possible; take up responsibility.'),
        money: S('काम से जुड़ी आय स्थिर दिखती है।', 'Work-related income looks steady.'),
        love: S('काम के बीच अपनों को न भूलें।', 'Do not let work crowd out the people who matter.'),
        well: S('सक्रिय दिन; पानी और विराम का ध्यान रखें।', 'An active day; keep water and breaks in the schedule.'),
        tip: S('सबसे ज़रूरी काम सबसे पहले करें।', 'Do your most important task first.') },
  11: { career: S('नेटवर्क और टीम का सहयोग मिलेगा; योजनाएँ साझा करने के लिए अच्छा।', 'Network and team support help; good for sharing plans.'),
        money: S('लाभ और मनचाहे काम आगे बढ़ सकते हैं; फिर भी ख़र्च का हिसाब रखें।', 'Gains and wished-for plans can move ahead; still keep track of spending.'),
        love: S('मित्रों और मेल-जोल से मन प्रसन्न रहेगा।', 'Friends and social time lift your mood.'),
        well: S('मन अच्छा रहेगा; स्वस्थ आदतें बनाए रखें।', 'Mood is good; keep healthy habits steady.'),
        tip: S('हाल में जिसने मदद की, उसे धन्यवाद कहें।', 'Thank someone who helped you recently.') },
  12: { career: S('पर्दे के पीछे का काम करें; नए शुभारंभ या बड़ी बैठकों से बचें।', 'Work behind the scenes; avoid new launches or big meetings.'),
        money: S('ख़र्च ज़्यादा हो सकता है; बड़े लेन-देन टालें।', 'Expenses may run high; postpone large transactions.'),
        love: S('शांत समय और छोटी सेवा शब्दों से ज़्यादा मायने रखती है।', 'Quiet time and small acts of service mean more than words.'),
        well: S('आराम और नींद को प्राथमिकता दें; रात में स्क्रीन बंद रखें।', 'Prioritise rest and sleep; keep screens off at night.'),
        tip: S('किसी ज़रूरतमंद को कुछ छोटा दान करें।', 'Give something small to someone in need.') },
};

// Nakshatra "nature" (the classical seven groups) — index 0..26 = Ashwini..Revati
export const NAK_CAT = ['kshipra','ugra','mishra','dhruva','mridu','tikshna','chara','kshipra','tikshna','ugra','ugra','dhruva','kshipra','mridu','chara','mishra','mridu','tikshna','tikshna','ugra','dhruva','chara','chara','chara','ugra','dhruva','mridu'];
export const NAK_CAT_NOTE = {
  kshipra: { name: S('क्षिप्र (शीघ्र)', 'Kshipra (swift)'), t: S('जल्दी शुरू होने वाले काम, व्यापार, यात्रा और कोई हुनर सीखने के लिए अच्छा।', 'Good for quick starts, trade, travel and learning a skill.') },
  mridu: { name: S('मृदु (कोमल)', 'Mridu (soft)'), t: S('कला, मित्रता, सीखने और कोमल बातचीत के लिए अच्छा।', 'Good for the arts, friendships, learning and gentle conversations.') },
  dhruva: { name: S('ध्रुव (स्थिर)', 'Dhruva (fixed)'), t: S('नींव, लंबे समय की प्रतिबद्धता और टिकाऊ काम के लिए अच्छा।', 'Good for foundations, long-term commitments and lasting work.') },
  chara: { name: S('चर (गतिशील)', 'Chara (movable)'), t: S('यात्रा, ख़रीदारी, आवाजाही और दिनचर्या बदलने के लिए अच्छा।', 'Good for travel, buying, moving and changing a routine.') },
  ugra: { name: S('उग्र', 'Ugra (fierce)'), t: S('साहसिक या कठिन काम के लिए ठीक; कोमल, शुभ कार्य की शुरुआत से बचें।', 'Better for bold or hard tasks; avoid starting gentle, auspicious ventures.') },
  tikshna: { name: S('तीक्ष्ण', 'Tikshna (sharp)'), t: S('शोध, समस्याएँ सुलझाने और पुरानी आदतें तोड़ने के लिए अच्छा; नए शुभ कार्य टालें।', 'Good for research, solving problems and breaking old habits; postpone fresh auspicious beginnings.') },
  mishra: { name: S('मिश्र', 'Mishra (mixed)'), t: S('नियमित काम और साधारण लेन-देन के लिए ठीक।', 'Fine for routine work and ordinary dealings.') },
};

// Tithi groups: Nanda 1,6,11 · Bhadra 2,7,12 · Jaya 3,8,13 · Rikta 4,9,14 · Purna 5,10,15/30
export const TITHI_CAT = ['nanda', 'bhadra', 'jaya', 'rikta', 'purna'];
export const TITHI_CAT_NOTE = {
  nanda: { name: S('नंदा', 'Nanda'), t: S('आनंद की तिथि — उत्सव, कला और ख़ुशी के कामों के लिए अच्छी।', 'A joyful tithi — good for celebrations, the arts and happy occasions.') },
  bhadra: { name: S('भद्रा', 'Bhadra'), t: S('स्थिर और सहयोगी — दिनचर्या, सेहत की आदतों और व्यावहारिक कामों के लिए अच्छी।', 'Steady and supportive — good for routines, wellbeing habits and practical work.') },
  jaya: { name: S('जया', 'Jaya'), t: S('जीत की तिथि — प्रतियोगिता, बातचीत और काम निपटाने के लिए अनुकूल।', 'A tithi of success — favours competition, negotiation and getting things done.') },
  rikta: { name: S('रिक्ता', 'Rikta'), t: S('“रिक्त” तिथि — नया काम शुरू करने से बचें; निपटाने और सफ़ाई के लिए ठीक।', 'The “empty” tithi — avoid starting new ventures; fine for finishing and clearing out.') },
  purna: { name: S('पूर्णा', 'Purna'), t: S('पूर्णता की तिथि — काम पूरे करने, सीखने और शुभ कार्यों के लिए अच्छी।', 'A tithi of completion — good for finishing work, learning and auspicious tasks.') },
};
