import type { VisionMission } from "@/lib/about/schema";

// PENDING CLIENT APPROVAL: text is verbatim from docs/content-source/about/vision-mission.txt.
export const visionMission: VisionMission = {
  heading: "Our Vision & Mission",
  subheading: "Guided by Faith, Driven by Excellence",
  vision: {
    heading: "Vision",
    tagline: "Excellence in this World and the Hereafter",
    body: "We aspire to nurture knowledgeable, confident, and morally responsible individuals who achieve success in both this world and the Hereafter."
  },
  mission: {
    heading: "Mission",
    body: "To provide quality education that integrates academic excellence with Islamic values while developing confident learners, responsible citizens, and compassionate future leaders."
  },
  urdu: {
    lang: "ur",
    vision: {
      heading: "ہمارا وژن",
      tagline: {
        lang: "ar",
        text: "فِي الدُّنْيَا حَسَنَةً وَفِي الْآخِرَةِ حَسَنَةً"
      },
      body: "ہم ایسے باعلم، بااعتماد اور باکردار افراد کی تربیت کے خواہاں ہیں جو دنیا اور آخرت دونوں میں کامیابی حاصل کریں۔"
    },
    mission: {
      heading: "ہمارا مشن",
      body: "اعلیٰ معیار کی تعلیم کو اسلامی اقدار کے ساتھ ہم آہنگ کرتے ہوئے ایسے طلبہ کی تربیت کرنا جو علم، کردار، اعتماد اور ذمہ داری کا بہترین نمونہ ہوں۔"
    }
  }
};

export const review = {
  status: "pending-client-approval" as const,
  notes: [
    "T6: the heading wording is pending the client.",
    "Finding 4: the Vision tagline in Urdu is Arabic (a Qur'anic phrase), marked lang 'ar'.",
    "Finding 5: the English and Urdu texts differ in wording; the Urdu is stored, not shown.",
    "The tagline 'Excellence Rooted in Values' is left out (Finding 1)."
  ],
};
