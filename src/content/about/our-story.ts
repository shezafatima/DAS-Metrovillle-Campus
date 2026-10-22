import type { OurStory } from "@/lib/about/schema";

// PENDING CLIENT APPROVAL: text is verbatim from docs/content-source/about/our-story.txt.
export const ourStory: OurStory = {
  heading: "Our Story",
  subheading: "Building a Legacy of Excellence Since 2021",
  body: "Established in 2021, Metroville Campus was founded with a vision to provide quality education in SITE Town, rooted in Islamic values, academic excellence, and character development.\n\nAs a proud member of the Dar-e-Arqam Schools network, our campus is committed to creating a nurturing environment where every child is encouraged to learn, grow, and succeed.\n\nWe believe that education is more than academic achievement—it is about developing confident learners, responsible citizens, and individuals of strong moral character who are prepared for success in this world and the Hereafter.",
  // The real Our Story photo (owner, 2026-10-20), served from /public. Set to null to show the emblem.
  image: { url: "/images/about/ourstory.webp", publicId: "local-ourstory", width: 941, height: 1672 },
  imageAlt: "The front of the Dar-e-Arqam Metroville Campus building: a white and blue two-storey school with a glass entrance, its logo on the wall, and trees and flower beds in the foreground under a blue sky.",
  urdu: {
    lang: "ur",
    heading: "ہماری کہانی",
    subheading: "2021 سے بہترین تعلیم کی جانب سفر",
    body: "میٹروول کیمپس کا قیام 2021 میں اس عزم کے ساتھ عمل میں آیا کہ سائٹ ٹاون اور گرد و نواح میں طلبہ کو اسلامی اقدار، جدید معیاری تعلیم اور بہترین اخلاقی تربیت پر مبنی تعلیمی ماحول فراہم کیا جائے۔\n\nدارِ ارقم کے تعلیمی نیٹ ورک کا حصہ ہونے کے ناطے، ہمارا مقصد ہر بچے کی علمی، اخلاقی اور شخصی صلاحیتوں کو نکھارنا ہے تاکہ وہ اعتماد کے ساتھ زندگی کے ہر میدان میں کامیابی حاصل کر سکے۔\n\nہمارے نزدیک تعلیم صرف امتحان میں کامیابی کا نام نہیں بلکہ ایک باکردار، ذمہ دار اور باعمل انسان کی تشکیل کا ذریعہ ہے۔"
  }
};

export const review = {
  status: "pending-client-approval" as const,
  notes: [
    "T5: the spelling of the Urdu place name (سائٹ ٹاون) is pending the client.",
    "Finding 5: the English and Urdu texts differ in wording; the Urdu is stored, not shown.",
    "The tagline 'Knowledge That Inspires' is left out (Finding 1)."
  ],
};
