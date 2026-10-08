/**
 * Home page static sections (006, data-model.md "Static content"). Every
 * section is a typed record in the shape a database row would take, so
 * feature 014 can move any of them to the database without changing the
 * components (FR-026). Wording is the reference's own, extracted verbatim
 * from https://das.edu.pk/ (research/tokens/home-sections-*.json,
 * home-details-*.json); `placeholder: true` marks wording the client has not
 * confirmed (001 precedent). Images are the reference's assets saved under
 * public/images/home/ (research/design-tokens.md "Home sections (006)").
 */

export interface ContentImage {
  src: string;
  /** "" = decorative. */
  alt: string;
  width: number;
  height: number;
}

export type QuickAccessTone = "admission" | "salient" | "branch" | "curriculum";

export interface QuickAccessCard {
  id: string;
  title: string;
  text: string;
  icon: ContentImage;
  href: string;
  tone: QuickAccessTone;
}

export interface SalientFeature {
  id: string;
  title: string;
  image: ContentImage;
}

export interface Partner {
  id: string;
  name: string;
  logo: ContentImage;
  href?: string;
}

export type StatKey = "students" | "books" | "teachers" | "campuses";

export const homeContent = {
  /** The reference has no h1; this one is visually hidden (SC-006). */
  pageHeading: "Dar-e-Arqam Schools — Metroville Campus",
  metadata: {
    title: "Dar-e-Arqam Schools — Metroville Campus",
    description:
      "Dar-e-Arqam Schools Metroville Campus: admissions, academics, campuses, news and resources from a school network of 700+ branches across Pakistan.",
    placeholder: true,
  },

  hero: {
    label: "Highlights",
    scrollCue: "Scroll to the content",
    goTo: (n: number) => `Show slide ${n}`,
  },

  quickAccess: {
    label: "Quick links",
    /** Visible heading above the cards. */
    heading: "Explore Dar-e-Arqam Schools",
    readMore: "Read More",
    /** Accessible name of the button that turns a card over. */
    flip: (title: string) => `${title}: show details`,
    cards: [
      {
        id: "admission",
        title: "Admission Procedure",
        text: "There is no written test for pre-school. The admission test for primary and secondary school is based on the following subjects and classes",
        icon: { src: "/images/home/quick-admission.gif", alt: "", width: 100, height: 99 },
        href: "/admission/admission-procedure",
        tone: "admission",
      },
      {
        id: "salient-features",
        title: "Salient Features",
        text: "Dar-e-Arqam is one of a few pioneer schools of formal education where you may witness quite comfortably, a sublime blend of high standard",
        icon: { src: "/images/home/quick-salient-features.gif", alt: "", width: 110, height: 101 },
        href: "/about/salient-features",
        tone: "salient",
      },
      {
        id: "branch-network",
        title: "Branch Network",
        text: "There are 700+ Branches of Dar-e-Arqam Schools with more than 300,000+ Students in 150+ cities of Pakistan.",
        icon: { src: "/images/home/quick-branch-network.gif", alt: "", width: 119, height: 100 },
        href: "/campuses",
        tone: "branch",
      },
      {
        id: "education-curriculum",
        title: "Education Curriculum",
        text: "Curriculum is seen as whole teaching-learning activity both inside & outside classroom of the schools",
        icon: { src: "/images/home/quick-curriculum.gif", alt: "", width: 100, height: 100 },
        href: "/academics",
        tone: "curriculum",
      },
    ] satisfies QuickAccessCard[],
  },

  inspiration: {
    heading: "Inspired By Excellence & Innovation",
    line: "We offer a wide range of high quality of teaching and extra-curricular activities.",
  },

  whyChoose: {
    heading: "Why Choose Dar-e-Arqam Schools?",
    paragraphs: [
      "We offer a range of training packages in a range of subject areas and can offer blended learning opportunities to best meet your needs. If sitting in a room with a trainer and having the opportunity for discussion with other learners sounds good to you then we can offer this. If you prefer to study in your own time and at your own speed then one of our world class facilities.",
      "If you prefer to study in your own time and at your own speed then one of our e-learning packages may be right up your street. There is a third option, which is you like the sound of both but perhaps can’t attend all training sessions, this is when blended learning comes into its own.",
    ],
    video: { play: "Play the school video", title: "Dar-e-Arqam Schools video" },
  },

  latestNews: {
    // PENDING CLIENT APPROVAL: this heading was supplied by the project owner and has not been approved by the client yet.
    heading: "Latest News and Highlights from Our Campus",
    /** The small pill above the heading. */
    label: "News",
    line: "Covering topics from classes to events and students to teachers activities.",
    viewAll: { label: "View all news", href: "/news" },
  },

  /**
   * The Books band: heading, text and a fixed set of 10 covers
   * (not admin-managed — owner's decision, 2026-10-01). Put the cover images
   * in public/images/home/books/ as book-01.jpg … book-10.jpg; a file that is
   * not there yet is simply left out (with none, the strip is not drawn and the
   * text takes the section). PLACEHOLDER: the alt text, until the real book titles are known.
   */
  books: {
    // PENDING CLIENT APPROVAL: the heading and supporting text below were supplied by the project owner and have not been approved by the client yet.
    heading: "Explore Our Course Books",
    line: "Our carefully selected course books support every stage of learning, from early years to senior classes. Each one is chosen to build strong foundations, spark curiosity and help students grow with confidence.",
    covers: [
      { id: "book-01", src: "/images/home/books/book-01.jpg", alt: "Dar-e-Arqam book 1", width: 400, height: 508 },
      { id: "book-02", src: "/images/home/books/book-02.jpg", alt: "Dar-e-Arqam book 2", width: 400, height: 508 },
      { id: "book-03", src: "/images/home/books/book-03.jpg", alt: "Dar-e-Arqam book 3", width: 400, height: 508 },
      { id: "book-04", src: "/images/home/books/book-04.jpg", alt: "Dar-e-Arqam book 4", width: 400, height: 508 },
      { id: "book-05", src: "/images/home/books/book-05.jpg", alt: "Dar-e-Arqam book 5", width: 400, height: 508 },
      { id: "book-06", src: "/images/home/books/book-06.jpg", alt: "Dar-e-Arqam book 6", width: 400, height: 508 },
      { id: "book-07", src: "/images/home/books/book-07.jpg", alt: "Dar-e-Arqam book 7", width: 400, height: 508 },
      { id: "book-08", src: "/images/home/books/book-08.jpg", alt: "Dar-e-Arqam book 8", width: 400, height: 508 },
      { id: "book-09", src: "/images/home/books/book-09.jpg", alt: "Dar-e-Arqam book 9", width: 400, height: 508 },
      { id: "book-10", src: "/images/home/books/book-10.jpg", alt: "Dar-e-Arqam book 10", width: 400, height: 508 },
    ] satisfies (ContentImage & { id: string })[],
  },

  salientFeatures: {
    heading: "Salient Features of Dar-e-Arqam Schools",
    // PENDING CLIENT APPROVAL: the paragraph below was supplied by the project owner and has not been approved by the client yet.
    paragraph:
      "Dar-e-Arqam Schools strive for the good of this world and the hereafter. Alongside meaningful education, our teachers focus on each student's personality development. Talented students can join our Hifz Quran-e-Kareem programme, our teachers train regularly in workshops held on the 2nd and 4th Saturday of every month, and students take part in sports competitions, educational trips, quizzes and debates.",
    readMore: { label: "Read more", href: "/about" },
    /** Just the sun-and-book emblem (cropped from the school logo: no wordmark), small in the middle of the circle. Decorative: the school's name is in the page. */
    logo: { src: "/images/logo-emblem.svg", alt: "", width: 636, height: 676 },
    items: [
      {
        id: "personality-development",
        title: "Personality Development",
        image: { src: "/images/personality_development-1.svg", alt: "", width: 120, height: 120 },
      },
      {
        id: "teachers-training",
        title: "Teachers Training",
        image: { src: "/images/teachers-training.svg", alt: "", width: 120, height: 120 },
      },
      {
        id: "hifz-quran",
        title: "Hifz Quran-e-Kareem",
        image: { src: "/images/hifz-e-quran.svg", alt: "", width: 120, height: 120 },
      },
      {
        id: "co-curricular",
        title: "Co-Curricular Activities",
        image: { src: "/images/co-curricular.svg", alt: "", width: 120, height: 120 },
      },
    ] satisfies SalientFeature[],
  },

  progressDashboard: {
    heading: "Dar-e-Arqam Schools – Progress Dashboard",
    line: "31 Years of Excellence & Experience",
    stats: [
      { key: "students", title: "Students" },
      { key: "books", title: "Books" },
      { key: "teachers", title: "Teachers" },
      { key: "campuses", title: "Campuses" },
    ] satisfies { key: StatKey; title: string }[],
  },

  /** The 004 signup band's heading and supporting line, with a button instead of the form (PRD §5.1). */
  careersCta: {
    heading: { before: "Join Over ", highlight: "300,000 Students", after: " Enjoying Dar-e-Arqam School Now", placeholder: true },
    supporting: { text: "Become Part of Dar-e-Arqam Schools to Further Your Career.", placeholder: true },
    button: { label: "Join Now", href: "/careers" },
    // Decorative banner behind the section (the client's own picture, 1772 x 592); the heading carries the meaning.
    background: { src: "/images/home/carrer.jpg", alt: "", width: 1772, height: 592 },
  },

  partners: {
    heading: "Our Partners",
    items: [
      { id: "youth", name: "Dar-e-Arqam Youth", logo: { src: "/images/home/partners/youth.png", alt: "Dar-e-Arqam Youth", width: 398, height: 398 } },
      { id: "uswa", name: "Uswa Publications", logo: { src: "/images/home/partners/uswa.png", alt: "Uswa Publications", width: 398, height: 398 } },
      { id: "tcdp", name: "TCDP", logo: { src: "/images/home/partners/tcdp.png", alt: "TCDP", width: 398, height: 398 } },
      { id: "parenting", name: "Parenting", logo: { src: "/images/home/partners/parenting.png", alt: "Parenting", width: 398, height: 398 } },
      { id: "nazra", name: "Nazra & Hifz", logo: { src: "/images/home/partners/nazra.png", alt: "Nazra & Hifz", width: 398, height: 398 } },
      { id: "inclusive-education", name: "Inclusive Education", logo: { src: "/images/home/partners/inclusive-education.png", alt: "Inclusive Education", width: 398, height: 398 } },
      { id: "da-international", name: "Dar-e-Arqam International", logo: { src: "/images/home/partners/da-international.png", alt: "Dar-e-Arqam International", width: 398, height: 398 } },
      { id: "da-colleges", name: "Dar-e-Arqam Colleges", logo: { src: "/images/home/partners/da-colleges.png", alt: "Dar-e-Arqam Colleges", width: 398, height: 398 } },
    ] as Partner[],
  },

  carousel: {
    previous: (label: string) => `Previous — ${label}`,
    next: (label: string) => `Next — ${label}`,
    position: (n: number, total: number) => `${n} of ${total}`,
  },
} as const;
