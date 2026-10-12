import type { CoreValues } from "@/lib/about/schema";

// PENDING CLIENT APPROVAL: text is verbatim from docs/content-source/about/core-values.txt.
export const coreValues: CoreValues = {
  heading: "Our Core Values",
  subheading: "The Principles That Guide Every Step",
  intro: "At Metroville Campus, our core values inspire every lesson, every decision, and every achievement. They guide our students to become confident learners, responsible citizens, and compassionate individuals.",
  values: [
    {
      id: "leadership",
      name: "Leadership",
      description: "Leading with confidence, integrity, and vision.",
      icon: "compass"
    },
    {
      id: "responsibility",
      name: "Responsibility",
      description: "Being accountable for our actions and decisions.",
      icon: "shield-check"
    },
    {
      id: "commitment",
      name: "Commitment",
      description: "Remaining dedicated to learning, growth, and excellence.",
      icon: "target"
    },
    {
      id: "excellence",
      name: "Excellence",
      description: "Striving for the highest standards in everything we do.",
      icon: "award"
    },
    {
      id: "respect",
      name: "Respect",
      description: "Showing respect for faith, family, teachers, and society.",
      icon: "heart-handshake"
    },
    {
      id: "citizenship",
      name: "Citizenship",
      description: "Serving the community with responsibility and pride.",
      icon: "landmark"
    }
  ],
  urdu: {
    lang: "ur",
    heading: "ہماری بنیادی اقدار",
    subheading: "وہ اصول جو ہماری رہنمائی کرتے ہیں",
    intro: "ہماری بنیادی اقدار ہماری شناخت اور تعلیمی فلسفے کی بنیاد ہیں۔ یہی اقدار ہمارے طلبا کو باکردار، ذمہ دار، بااعتماد اور بہترین شہری بننے کی ترغیب دیتی ہیں۔",
    values: [
      {
        id: "leadership",
        name: "قیادت",
        description: "اعتماد، دیانت اور مثبت سوچ کے ساتھ رہنمائی کرنا۔"
      },
      {
        id: "responsibility",
        name: "ذمہ داری",
        description: "اپنی ذمہ داریوں کو احساس اور دیانت داری سے نبھانا۔"
      },
      {
        id: "commitment",
        name: "عزم",
        description: "سیکھنے، ترقی اور بہترین کارکردگی کے لیے ثابت قدم رہنا۔"
      },
      {
        id: "excellence",
        name: "اعلیٰ معیار",
        description: "ہر کام بہترین انداز میں انجام دینے کی کوشش کرنا۔"
      },
      {
        id: "respect",
        name: "احترام",
        description: "اللہ تعالیٰ، والدین، اساتذہ اور معاشرے کا احترام کرنا۔"
      },
      {
        id: "citizenship",
        name: "شہری ذمہ داری",
        description: "اپنے معاشرے اور وطن کی خدمت کے جذبے کو فروغ دینا۔"
      }
    ]
  }
};

export const review = {
  status: "pending-client-approval" as const,
  notes: [
    "T4: 'طلبا' vs 'طلبہ' in the Urdu is pending the client.",
    "T6: the heading wording is pending the client.",
    "Finding 5: the Respect wording differs between English and Urdu.",
    "The tagline 'Creating Thinkers with Integrity' is left out (Finding 1)."
  ],
};
