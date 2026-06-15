"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

interface PlanContent {
  title: string;
  price: string;
  description: string;
  basicFeatures: string[];
  fullFeatures: string[];
}

export default function OurPlanPage() {
  const router = useRouter();

  // State for Language: 'en' for English, 'hi' for Hindi
  const [language, setLanguage] = useState<"en" | "hi">("en");

  // State to track "Show More" for each of the two plans
  const [showMorePlan1, setShowMorePlan1] = useState(false);
  const [showMorePlan2, setShowMorePlan2] = useState(false);

  // Content translations
  const content = {
    en: {
      basicsTitle: "The Basics of Our Service",
      basicsDesc: "Raj Dhanvarsha Consumer Products is marketing its consumer products under Direct Selling System. Each individual associates himself with the company and purchases the goods directly from company. The customer pays the price and is given certain discount. In the system, an opportunity is given to interested persons to make the purchases as per the plan of the company by helping others as the benefits of all are interrelated. Consumer takes decision to buy product(s) not due to big advertisement but due to the quality of the product(s) and/or by the opinion and satisfaction of other consumers who are using the product(s). After using the products and feeling satisfied with quality and concept, user share his views with others and thus the group expands day by day. Company does not require any advertisement, any marketing agent, any area distributor or retailer for selling the products. Company saves lot of amount and distributes it to Associate Buyers as per the plan. A perusal of the above would show that the whole marketing system is based not on any positive advertisement, but on creating an acceptability and awareness amongst the society, by actual use of the products by some members of the society and deriving satisfaction out of the same. For example, if “A” purchases a product from RCPPL and feels satisfied with quality and usefulness of the same, he is expected to tell this to others, so that others would also follow his example and purchase the product. However, it may be noted that “A” is not under any obligation to do so. The sales pattern adopted by Consumer is such that it encourages people to propose further in their group and each one’s related group expands. In context to this, the persons may be interested in sharing their view about the product with others, Consumer has devised method by which it is identified that some people have purchased the goods due to sharing of the views about the goods by “A” then “A” gets incentive/discount. Thus, in this way, group for making the purchases is formed on its own.",
      showLess: "Show Less",
      showFull: "Show Full Plan Details",
      getStarted: "Get Started",
      includedTitle: "Included in Full Plan:",
      popularBadge: "Most Popular",
      selectLanguage: "Choose Language:",
      levelBonusTitle: "Level Matrix & Bonuses",
      plan1: {
        title: "Binary Plan",
        price: "Free Entry",
        description: "Apply online through our web application form. Fill in applicant, proposer, and sponsor details to get started instantly.",
        basicFeatures: [
          "No membership fee to join",
          "Activate ID by purchasing 1 S.P. product once",
          "Standard Ratio conversion: 1 S.P. = 600 B.V."
        ],
        fullFeatures: [
          "Initial matching criteria requires 2 SP (Left) : 1 SP (Right) or 1 SP (Left) : 2 SP (Right)",
          "Earn Rs. 150 on initial matching and continuous Rs. 150 on every subsequent 1 S.P. = 1 S.P. match",
          "Daily Capping Limit: Earn up to a maximum bonus of Rs. 4500 per day (at 30 SP : 30 SP status)",
          "Requires at least 1 direct sponsor on the Left and 1 direct sponsor on the Right to unlock matching bonuses",
          "Monthly Club Pool: Access 5% of company's monthly joining turnover by maintaining 5 sponsors on each side and achieving a 350 S.P. matching bonus status",
          "Powerleg system configuration with Carry Forward logic allowed",
          "Required Documentation Placeholder: PAN Card, National ID Proof, Bank Account Passbook/Copy, Passport Size Photograph, and Active Mobile Number"
        ]
      },
      plan2: {
        title: "Dream Plan",
        price: "600 B.V.",
        description: "A comprehensive 12-Level business acceleration matrix allowing up to 10 direct network joinings.",
        basicFeatures: [
          "Existing distributors can join with an additional 600 B.V. purchase",
          "New distributors can enter directly with a 1200 B.V. product purchase",
          "Enables a wider horizon of up to 10 direct customer joinings"
        ],
        fullFeatures: [
          "Self Purchase Generation Bonus: 10%",
          "Level 1: Minimum of 3 distribute sales required to pass. Generates a 10% bonus (Rs. 180 on 3 sales, scales to Rs. 600 on 10 sales)",
          "Level 2: Accessible upon making 3 or more sales. Generates a 7% bonus (Rs. 180 on 3 sales, scales up to Rs. 420 on 10 sales)",
          "Level 3: Generates a 5% system bonus structure",
          "Levels 4 & 5: Generates a stable 4% distribution bonus",
          "Levels 6 & 7: Generates a 3% tier bonus payout",
          "Levels 8, 9 & 10: Tailored with a 2% bonus distribution framework",
          "Levels 11 & 12: Concludes with a 1% network generation incentive"
        ],
        matrix: [
          { level: "Self Purchase", bonus: "10%" },
          { level: "Level 1", bonus: "10%" },
          { level: "Level 2", bonus: "7%" },
          { level: "Level 3", bonus: "5%" },
          { level: "Level 4", bonus: "4%" },
          { level: "Level 5", bonus: "4%" },
          { level: "Level 6", bonus: "3%" },
          { level: "Level 7", bonus: "3%" },
          { level: "Level 8", bonus: "2%" },
          { level: "Level 9", bonus: "2%" },
          { level: "Level 10", bonus: "2%" },
          { level: "Level 11", bonus: "1%" },
          { level: "Level 12", bonus: "1%" }
        ]
      },
    },
    hi: {
      basicsTitle: "हमारी सेवा की बुनियादी बातें",
      basicsDesc: "राज धनवर्षा कंज्यूमर प्रोडक्ट्स डायरेक्ट सेलिंग सिस्टम के तहत अपने उपभोक्ता उत्पादों की मार्केटिंग कर रही है। प्रत्येक व्यक्ति खुद को कंपनी से एसोसिएट करता है और सीधे कंपनी से सामान खरीदता है। ग्राहक कीमत चुकाता है और उसे कुछ छूट दी जाती है। इस प्रणाली में, इच्छुक व्यक्तियों को दूसरों की मदद करके कंपनी की योजना के अनुसार खरीदारी करने का अवसर दिया जाता है क्योंकि सभी के लाभ परस्पर जुड़े हुए हैं। उपभोक्ता उत्पाद /उत्पादों को खरीदने का निर्णय बड़े विज्ञापन के कारण नहीं बल्कि उत्पाद / उत्पादों की गुणवत्ता और/या उत्पाद का उपयोग करने वाले अन्य उपभोक्ताओं की राय और संतुष्टि के कारण करता है। उत्पादों का उपयोग करने और गुणवत्ता और अवधारणा (कांसेप्ट) से संतुष्ट महसूस करने के बाद, उपयोगकर्ता अपने विचार दूसरों के साथ साझा करते हैं और इस प्रकार दिन-ब-दिन समूह बढ़ता जाता है। कंपनी को उत्पादों को बेचने के लिए किसी विज्ञापन, किसी मार्केटिंग एजेंट, किसी क्षेत्र वितरक या रिटेल विक्रेता की आवश्यकता नहीं पड़ती है। इस प्रकार कंपनी बहुत सारी राशि बचाती है और योजना के अनुसार इसे सद्श्ये को वितरित करती है। उपरोक्त के अवलोकन से पता चलता है कि संपूर्ण मार्केटिंग प्रणाली किसी लुभावने विज्ञापन पर आधारित नहीं है, बल्कि समाज के कुछ सदस्यों द्वारा उत्पादों के वास्तविक उपयोग व संतुष्टि द्वारा उत्पन्न स्वीकार्यता और जागरूकता पैदा करने पर आधारित है। उदाहरण के लिए, यदि कोई सद्श्ये उत्पाद खरीदता है और उसकी गुणवत्ता और उपयोगिता से संतुष्ट महसूस करता है, तो यह उम्मीद की जाती है कि वह इसे दूसरों को बताए, ताकि अन्य भी इस उदाहरण का अनुसरण करें और उत्पाद खरीद सकें। हालांकि, यह ध्यान दिये जाने योग्य है कि सद्श्ये ऐसा करने के लिए बाध्य नहीं है। सद्श्ये द्वारा अपनाया गया बिक्री का तरीका ऐसा है कि यह लोगों को अपने समूह में आगे प्रस्ताव करने के लिए प्रोत्साहित करता है और प्रत्येक के संबंधित समूह का विस्तार होता है। इस संदर्भ में, व्यक्ति दूसरों के साथ उत्पाद के बारे में अपने विचार साझा करने में रुचि ले सकते हैं, राज धनवर्षा ने ऐसी विधि तैयार की है जिसके द्वारा यह पहचाना जाता है कि कुछ लोगों ने सद्श्ये द्वारा उत्पाद के बारे में विचारों को साझा करने के कारण सामान खरीदा है। अत: सद्श्ये को प्रोत्साहन राशि / छूट मिलती है। इस प्रकार, खरीददारी करने के लिए समूह अपने आप बनता है।",
      showLess: "कम दिखाएं",
      showFull: "पूरा प्लान देखें",
      getStarted: "शुरू करें",
      includedTitle: "पूरे प्लान में शामिल है:",
      popularBadge: "सबसे लोकप्रिय",
      selectLanguage: "भाषा चुनें:",
      levelBonusTitle: "लेवल मैट्रिक्स और बोनस",
      plan1: {
        title: "बाइनरी प्लान (Binary Plan)",
        price: "मुफ्त सदस्यता",
        description: "वेबसाइट पर उपलब्ध आवेदन फॉर्म के माध्यम से ऑनलाइन आवेदन करें। शुरू करने के लिए आवेदक, प्रस्तावक और प्रायोजक (Sponsor) का विवरण भरें।",
        basicFeatures: [
          "सदस्यता लेने के लिए कोई शुल्क नहीं है",
          "केवल एक बार 1 S.P. का उत्पाद खरीदकर अपनी ID एक्टिवेट करें",
          "मानक अनुपात रूपांतरण: 1 S.P. = 600 B.V."
        ],
        fullFeatures: [
          "प्रारंभिक मैचिंग मानदंड: बाएं 2 SP : दाएं 1 SP या बाएं 1 SP : दाएं 2 SP होना आवश्यक है",
          "शुरुआती मैचिंग पर ₹150 का बोनस और उसके बाद हर अगली 1 S.P. = 1 S.P. मैचिंग पर लगातार ₹150 मिलते रहेंगे",
          "दैनिक कैपिंग सीमा: प्रति दिन अधिकतम ₹4500 तक का बोनस प्राप्त करें (30 SP : 30 SP होने पर)",
          "मैचिंग बोनस प्राप्त करने के लिए लेफ्ट और राइट में एक-एक डायरेक्ट स्पॉन्सर होना अनिवार्य है",
          "मासिक क्लब पूल: हर महीने कंपनी के जॉइनिंग टर्नओवर के 5% हिस्से में शामिल होने के लिए दोनों तरफ 5 स्पॉन्सर और 350 S.P. मैचिंग बोनस स्टेटस आवश्यक है",
          "पावरलेग सिस्टम कॉन्फ़िगरेशन - कैरी फॉरवर्ड (Carry Forward) लागू",
          "आवश्यक दस्तावेज: पैन कार्ड, राष्ट्रीय पहचान प्रमाण पत्र, बैंक पासबुक/कॉपी, पासपोर्ट साइज फोटो और सक्रिय मोबाइल नंबर"
        ]
      },
      plan2: {
        title: "ड्रीम प्लान (Dream Plan)",
        price: "1200 B.V. / 600 B.V.",
        description: "एक व्यापक 12-स्तरीय (12 Level) बिजनेस प्लान, जिसमें आप अधिकतम 10 डायरेक्ट जॉइनिंग करवा सकते हैं।",
        basicFeatures: [
          "पुराने डिस्ट्रीब्यूटर के लिए केवल 600 B.V. का एक और उत्पाद लेना अनिवार्य है",
          "नए डिस्ट्रीब्यूटर के लिए शुरुआत में 1200 B.V. का उत्पाद लेना आवश्यक है",
          "इस प्लान के अंतर्गत आप कुल 10 डायरेक्ट जॉइनिंग (Direct Joinings) करवा सकते हैं"
        ],
        fullFeatures: [
          "सेल्फ परचेज (Self Purchase) बोनस: 10%",
          "लेवल 1: पहला लेवल पास करने के लिए 3 डायरेक्ट सेल अनिवार्य हैं। 3 सेल पर 10% के हिसाब से ₹180 और 10 सेल करने पर ₹600 का बोनस बनता है।",
          "लेवल 2: जाने के लिए हर कोई 3 या 10 से अधिक सेल कर सकता है। इसमें 3 सेल पर 7% के हिसाब से ₹180 और 10 सेल पर ₹420 का बोनस मिलता है।",
          "लेवल 3: इसमें कुल 5% का बोनस निर्धारित किया गया है",
          "लेवल 4 और 5: इसमें स्थिर 4% का बोनस प्राप्त होता है",
          "लेवल 6 और 7: इसमें आपको 3% का टियर बोनस मिलता है",
          "लेवल 8, 9 और 10: इसमें 2% का लेवल बोनस वितरित किया जाता है",
          "लेवल 11 और 12: यह अंतिम स्तर 1% नेटवर्क इंसेंटिव बोनस के साथ समाप्त होता है"
        ],
        matrix: [
          { level: "Self Purchase", bonus: "10%" },
          { level: "Level 1", bonus: "10%" },
          { level: "Level 2", bonus: "7%" },
          { level: "Level 3", bonus: "5%" },
          { level: "Level 4", bonus: "4%" },
          { level: "Level 5", bonus: "4%" },
          { level: "Level 6", bonus: "3%" },
          { level: "Level 7", bonus: "3%" },
          { level: "Level 8", bonus: "2%" },
          { level: "Level 9", bonus: "2%" },
          { level: "Level 10", bonus: "2%" },
          { level: "Level 11", bonus: "1%" },
          { level: "Level 12", bonus: "1%" }
        ]
      },
    },
  };

  const currentText = content[language];

  // Handler for navigation routing
  const handleGetStartedRedirect = () => {
    router.push("/register");
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 text-gray-800">
      <Navbar />

      <main className="flex-grow">
        {/* Hero Section */}
        <div className="relative h-64 md:h-80 w-full overflow-hidden flex items-center justify-center">
          <Image
            src="/photos/page-title.jpg"
            alt="Our Plans Background"
            fill
            priority
            className="object-cover brightness-50"
          />
          <div className="relative z-10 text-center text-white px-4">
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">
              Our Pricing Plans
            </h1>
            <p className="mt-2 text-lg text-gray-200">
              Choose the perfect tier tailored for your needs.
            </p>
          </div>
        </div>

        {/* Language Switcher */}
        <div className="max-w-6xl mx-auto px-4 pt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <span className="text-sm font-semibold text-gray-500 tracking-wide">
            {currentText.selectLanguage}
          </span>
          <div className="inline-flex rounded-xl shadow-md bg-white p-1 border border-gray-200 relative z-30">
            <button
              onClick={() => setLanguage("en")}
              className={`px-5 py-2 rounded-lg text-sm font-bold transition-all duration-200 ${
                language === "en"
                  ? "bg-blue-600 text-white shadow"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              }`}
            >
              English
            </button>
            <button
              onClick={() => setLanguage("hi")}
              className={`px-5 py-2 rounded-lg text-sm font-bold transition-all duration-200 ${
                language === "hi"
                  ? "bg-blue-600 text-white shadow"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              }`}
            >
              हिंदी
            </button>
          </div>
        </div>

        {/* Basics Intro */}
        <section className="max-w-5xl mx-auto text-center py-12 px-4">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
            {currentText.basicsTitle}
          </h2>
          <p className="text-gray-600 leading-relaxed text-base md:text-md text-justify sm:text-center">
            {currentText.basicsDesc}
          </p>
        </section>

        {/* Pricing Cards Section */}
        <section className="w-full px-4 md:px-8 pb-20">
          <div className="flex flex-col gap-10 w-full max-w-none mx-auto">
            
            {/* Plan 2 Card (Dream Plan) - MOVED TO FIRST POSITION */}
            <div className="bg-white rounded-2xl shadow-md p-8 border-2 border-blue-600 relative transition-all duration-300 hover:shadow-lg w-full">
              <span className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-blue-600 text-white text-xs uppercase font-extrabold tracking-widest px-3 py-1 rounded-full">
                {currentText.popularBadge}
              </span>
              <h3 className="text-2xl font-bold text-gray-900 mt-2">{currentText.plan2.title}</h3>
              <p className="text-gray-500 mt-2 text-sm">{currentText.plan2.description}</p>
              <div className="mt-4 flex items-baseline">
                <span className="text-3xl font-extrabold text-blue-600">{currentText.plan2.price}</span>
              </div>

              {/* Core Features */}
              <ul className="mt-6 space-y-3">
                {currentText.plan2.basicFeatures.map((feature, idx) => (
                  <li key={idx} className="flex items-center text-sm text-gray-600">
                    <span className="text-green-500 mr-2">✓</span> {feature}
                  </li>
                ))}
              </ul>

              {/* Toggleable Details */}
              {showMorePlan2 && (
                <div className="mt-6 pt-6 border-t border-gray-100 space-y-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                    <div>
                      <h4 className="font-semibold text-gray-900 text-sm tracking-wide uppercase mb-3">
                        {currentText.includedTitle}
                      </h4>
                      <ul className="space-y-3 mb-6">
                        {currentText.plan2.fullFeatures.map((feature, idx) => (
                          <li key={idx} className="flex items-start text-sm text-gray-600">
                            <span className="text-blue-500 mr-2 mt-0.5">✦</span> 
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="bg-gray-50 p-5 rounded-xl border border-gray-100">
                      <h4 className="font-bold text-gray-900 text-sm tracking-wide uppercase mb-3 text-center">
                        {currentText.levelBonusTitle}
                      </h4>
                      <div className="divide-y divide-gray-200">
                        {currentText.plan2.matrix.map((row, idx) => (
                          <div key={idx} className="flex justify-between py-1.5 text-sm">
                            <span className="text-gray-600 font-medium">{row.level}</span>
                            <span className="text-blue-600 font-bold">{row.bonus}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
                    <div className="flex justify-center">
                      <Image
                        src="/photos/Plan slide-1.png" 
                        alt="Dream Plan Diagram 1"
                        width={400}
                        height={250}
                        priority
                        className="object-contain h-auto max-w-full"
                      />
                    </div>
                    <div className="flex justify-center">
                      <Image
                        src="/photos/Plan slide-2.png" 
                        alt="Dream Plan Diagram 2"
                        width={400}
                        height={250}
                        priority
                        className="object-contain h-auto max-w-full"
                      />
                    </div>
                    <div className="flex justify-center">
                      <Image
                        src="/photos/Plan slide-3.jpg" 
                        alt="Dream Plan Diagram 3"
                        width={400}
                        height={250}
                        priority
                        className="object-contain h-auto max-w-full"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-8 space-y-3">
                <button 
                  onClick={() => setShowMorePlan2(!showMorePlan2)}
                  className="w-full py-2.5 px-4 rounded-xl text-sm font-semibold border border-gray-300 text-gray-700 hover:bg-gray-50 transition"
                >
                  {showMorePlan2 ? currentText.showLess : currentText.showFull}
                </button>
                <button 
                  onClick={handleGetStartedRedirect}
                  className="w-full py-3 px-4 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition"
                >
                  {currentText.getStarted}
                </button>
              </div>
            </div>

            {/* Plan 1 Card (Binary Plan) - MOVED TO SECOND POSITION */}
            <div className="bg-white rounded-2xl shadow-md p-8 border border-gray-100 transition-all duration-300 hover:shadow-lg w-full">
              <h3 className="text-2xl font-bold text-gray-900">{currentText.plan1.title}</h3>
              <p className="text-gray-500 mt-2 text-sm max-w-3xl">{currentText.plan1.description}</p>
              <div className="mt-4 flex items-baseline">
                <span className="text-3xl font-extrabold text-blue-600">{currentText.plan1.price}</span>
              </div>

              <ul className="mt-6 space-y-3">
                {currentText.plan1.basicFeatures.map((feature, idx) => (
                  <li key={idx} className="flex items-center text-sm text-gray-600">
                    <span className="text-green-500 mr-2">✓</span> {feature}
                  </li>
                ))}
              </ul>

              {showMorePlan1 && (
                <div className="mt-6 pt-6 border-t border-gray-100 space-y-6">
                  <div>
                    <h4 className="font-semibold text-gray-900 text-sm tracking-wide uppercase mb-3">
                      {currentText.includedTitle}
                    </h4>
                    <ul className="space-y-3">
                      {currentText.plan1.fullFeatures.map((feature, idx) => (
                        <li key={idx} className="flex items-start text-sm text-gray-600">
                          <span className="text-blue-500 mr-2 mt-0.5">✦</span> 
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="mt-6 flex justify-center w-full">
                    <Image
                      src="/photos/graph.png" 
                      alt="Binary Plan Structure Hierarchy"
                      width={650}
                      height={400}
                      priority
                      className="object-contain h-auto max-w-full"
                    />
                  </div>
                </div>
              )}

              <div className="mt-8 space-y-3">
                <button 
                  onClick={() => setShowMorePlan1(!showMorePlan1)}
                  className="w-full py-2.5 px-4 rounded-xl text-sm font-semibold border border-gray-300 text-gray-700 hover:bg-gray-50 transition"
                >
                  {showMorePlan1 ? currentText.showLess : currentText.showFull}
                </button>
                <button 
                  onClick={handleGetStartedRedirect}
                  className="w-full py-3 px-4 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition"
                >
                  {currentText.getStarted}
                </button>
              </div>
            </div>

          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
